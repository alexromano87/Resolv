// apps/backend/src/cartelle/cartelle.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Cartella } from './cartella.entity';
import { CreateCartellaDto } from './dto/create-cartella.dto';
import { UpdateCartellaDto } from './dto/update-cartella.dto';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { Avvocato } from '../avvocati/avvocato.entity';
import { normalizePagination, type PaginationOptions } from '../common/pagination';

@Injectable()
export class CartelleService {
  constructor(
    @InjectRepository(Cartella)
    private cartelleRepository: TreeRepository<Cartella>,
    @InjectRepository(Avvocato)
    private avvocatiRepository: Repository<Avvocato>,
  ) {}

  async create(createDto: CreateCartellaDto): Promise<Cartella> {
    const cartella = this.cartelleRepository.create({
      nome: createDto.nome,
      descrizione: createDto.descrizione,
      colore: createDto.colore,
      tipologia: createDto.tipologia,
      praticaId: createDto.praticaId,
      studioId: createDto.studioId,
    });

    // If there's a parent folder, set the relationship
    if (createDto.cartellaParentId) {
      const parent = await this.findOne(createDto.cartellaParentId);
      cartella.cartellaParent = parent;
    }

    return this.cartelleRepository.save(cartella);
  }

  async findAll(
    includeInactive = false,
    studioId?: string,
    pagination?: PaginationOptions,
  ): Promise<Cartella[]> {
    const where: any = includeInactive ? {} : { attivo: true };

    if (studioId !== undefined) {
      where.studioId = studioId;
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.cartelleRepository.find({
      where,
      relations: ['pratica', 'pratica.cliente', 'documenti'],
      order: { dataCreazione: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    });
  }

  async findAllForUser(
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Cartella[]> {
    const query = this.cartelleRepository
      .createQueryBuilder('cartella')
      .leftJoinAndSelect('cartella.cartellaParent', 'cartellaParent')
      .leftJoinAndSelect('cartella.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('cartella.documenti', 'documenti')
      .orderBy('cartella.dataCreazione', 'DESC');

    if (!includeInactive) {
      query.andWhere('cartella.attivo = :attivo', { attivo: true });
    }

    await this.applyAccessFilter(query, user);
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findByPratica(
    praticaId: string,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Cartella[]> {
    const where = includeInactive
      ? { praticaId }
      : { praticaId, attivo: true };
    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.cartelleRepository.find({
      where,
      relations: ['cartellaParent', 'documenti', 'sottoCartelle', 'pratica', 'pratica.cliente'],
      order: { dataCreazione: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    });
  }

  async findTree(praticaId?: string): Promise<Cartella[]> {
    // Get all root folders (folders without a parent)
    const roots = await this.cartelleRepository.find({
      where: praticaId
        ? { praticaId, cartellaParent: null as any, attivo: true }
        : { cartellaParent: null as any, attivo: true },
      relations: ['documenti'],
    });

    // For each root, get the tree
    const trees = await Promise.all(
      roots.map((root) =>
        this.cartelleRepository.findDescendantsTree(root),
      ),
    );

    return trees;
  }

  async findOne(id: string): Promise<Cartella> {
    const cartella = await this.cartelleRepository.findOne({
      where: { id },
      relations: ['pratica', 'documenti', 'cartellaParent', 'sottoCartelle'],
    });
    if (!cartella) {
      throw new NotFoundException(`Cartella con ID ${id} non trovata`);
    }
    return cartella;
  }

  async findDescendants(id: string): Promise<Cartella[]> {
    const cartella = await this.findOne(id);
    return this.cartelleRepository.findDescendants(cartella);
  }

  async findAncestors(id: string): Promise<Cartella[]> {
    const cartella = await this.findOne(id);
    return this.cartelleRepository.findAncestors(cartella);
  }

  async update(id: string, updateDto: UpdateCartellaDto): Promise<Cartella> {
    const cartella = await this.findOne(id);

    // Update basic fields
    if (updateDto.nome) cartella.nome = updateDto.nome;
    if (updateDto.descrizione !== undefined) cartella.descrizione = updateDto.descrizione;
    if (updateDto.colore !== undefined) cartella.colore = updateDto.colore;
    if (updateDto.tipologia !== undefined) cartella.tipologia = updateDto.tipologia;

    // Update parent if provided
    if (updateDto.cartellaParentId !== undefined) {
      if (updateDto.cartellaParentId === null) {
        cartella.cartellaParent = null;
      } else {
        const parent = await this.findOne(updateDto.cartellaParentId);
        cartella.cartellaParent = parent;
      }
    }

    return this.cartelleRepository.save(cartella);
  }

  async deactivate(id: string): Promise<Cartella> {
    const cartella = await this.findOne(id);
    cartella.attivo = false;
    return this.cartelleRepository.save(cartella);
  }

  async reactivate(id: string): Promise<Cartella> {
    const cartella = await this.cartelleRepository.findOne({
      where: { id },
      relations: ['pratica', 'documenti'],
    });
    if (!cartella) {
      throw new NotFoundException(`Cartella con ID ${id} non trovata`);
    }
    cartella.attivo = true;
    return this.cartelleRepository.save(cartella);
  }

  async remove(id: string): Promise<void> {
    const cartella = await this.cartelleRepository.findOne({
      where: { id },
      relations: ['documenti', 'sottoCartelle'],
    });

    if (!cartella) {
      throw new NotFoundException(`Cartella con ID ${id} non trovata`);
    }

    // Controlla se la cartella contiene documenti
    if (cartella.documenti && cartella.documenti.length > 0) {
      throw new BadRequestException(
        `Impossibile eliminare la cartella: contiene ${cartella.documenti.length} documento/i. Rimuovere prima i documenti.`
      );
    }

    // Controlla se la cartella contiene sottocartelle
    if (cartella.sottoCartelle && cartella.sottoCartelle.length > 0) {
      throw new BadRequestException(
        `Impossibile eliminare la cartella: contiene ${cartella.sottoCartelle.length} sottocartella/e. Rimuovere prima le sottocartelle.`
      );
    }

    await this.cartelleRepository.remove(cartella);
  }

  private async applyAccessFilter(
    query: ReturnType<Repository<Cartella>['createQueryBuilder']>,
    user: CurrentUserData,
  ) {
    if (user.ruolo === 'admin') {
      return;
    }

    if (user.ruolo === 'cliente') {
      if (!user.clienteId) {
        query.andWhere('1 = 0');
        return;
      }
      query.andWhere('pratica.clienteId = :clienteId', { clienteId: user.clienteId });
      return;
    }

    if (user.ruolo === 'avvocato') {
      const canSeeAll = await this.canAvvocatoSeeAll(user);
      if (canSeeAll) {
        if (user.studioId) {
          query.andWhere('cartella.studioId = :studioId', { studioId: user.studioId });
          return;
        }
        query.andWhere('1 = 0');
        return;
      }
      const email = user.email?.toLowerCase().trim();
      if (!email) {
        query.andWhere('1 = 0');
        return;
      }
      query.andWhere('cartella.praticaId IS NOT NULL');
      query
        .leftJoin('pratica.avvocati', 'avvocato_access')
        .andWhere('LOWER(avvocato_access.email) = :email', { email });
      return;
    }

    if (user.ruolo === 'collaboratore') {
      query.andWhere('cartella.praticaId IS NOT NULL');
      query
        .leftJoin('pratica.collaboratori', 'collaboratore_access')
        .andWhere('collaboratore_access.id = :userId', { userId: user.id });
      return;
    }

    if (!user.studioId) {
      query.andWhere('1 = 0');
      return;
    }

    query.andWhere('cartella.studioId = :studioId', { studioId: user.studioId });
  }

  private async canAvvocatoSeeAll(user: CurrentUserData): Promise<boolean> {
    if (user.ruolo !== 'avvocato') return false;
    const email = user.email?.toLowerCase().trim();
    if (!email || !user.studioId) return false;
    const avvocato = await this.avvocatiRepository.findOne({
      where: { email, studioId: user.studioId },
    });
    return avvocato?.livelloAccessoPratiche === 'tutte';
  }

  /**
   * Crea le 6 cartelle predefinite per una pratica
   * Queste cartelle sono: Cliente, Stragiudiziale, Ingiunzione, Esecuzione, Pagamenti, Altro
   */
  async createDefaultFoldersForPratica(praticaId: string, studioId?: string | null): Promise<Cartella[]> {
    const DEFAULT_FOLDERS = [
      { nome: 'Cliente', colore: '#3b82f6', descrizione: 'Documenti relativi al cliente', tipologia: 'Cliente' as const },
      { nome: 'Stragiudiziale', colore: '#8b5cf6', descrizione: 'Documenti fase stragiudiziale', tipologia: 'Stragiudiziale' as const },
      { nome: 'Ingiunzione', colore: '#f59e0b', descrizione: 'Documenti decreto ingiuntivo', tipologia: 'Ingiunzione' as const },
      { nome: 'Esecuzione', colore: '#ef4444', descrizione: 'Documenti esecuzione forzata', tipologia: 'Esecuzione' as const },
      { nome: 'Pagamenti', colore: '#10b981', descrizione: 'Documenti pagamenti e transazioni', tipologia: 'Pagamenti' as const },
      { nome: 'Altro', colore: '#64748b', descrizione: 'Altri documenti', tipologia: 'Altro' as const },
    ];

    const cartelle: Cartella[] = [];

    for (const folder of DEFAULT_FOLDERS) {
      const cartella = this.cartelleRepository.create({
        nome: folder.nome,
        descrizione: folder.descrizione,
        colore: folder.colore,
        tipologia: folder.tipologia,
        praticaId,
        studioId,
      });
      const saved = await this.cartelleRepository.save(cartella);
      cartelle.push(saved);
    }

    return cartelle;
  }
}
