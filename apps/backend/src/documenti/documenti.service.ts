// apps/backend/src/documenti/documenti.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from './documento.entity';
import { Cartella } from '../cartelle/cartella.entity';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { NotificationsService } from '../notifications/notifications.service';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { normalizePagination, type PaginationOptions } from '../common/pagination';
import { Avvocato } from '../avvocati/avvocato.entity';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class DocumentiService {
  private readonly logger = new Logger(DocumentiService.name);

  constructor(
    @InjectRepository(Documento)
    private documentiRepository: Repository<Documento>,
    @InjectRepository(Avvocato)
    private avvocatiRepository: Repository<Avvocato>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    createDto: CreateDocumentoDto,
    options?: { uploaderRole?: string },
  ): Promise<Documento> {
    const documento = this.documentiRepository.create(createDto);
    const saved = await this.documentiRepository.save(documento);
    await this.notificationsService.notifyDocumentAdded(saved, {
      uploaderRole: options?.uploaderRole,
    });
    return saved;
  }

  async findAll(
    includeInactive = false,
    studioId?: string,
    pagination?: PaginationOptions,
  ): Promise<Documento[]> {
    const where: any = includeInactive ? {} : { attivo: true };

    if (studioId !== undefined) {
      where.studioId = studioId;
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.documentiRepository.find({
      where,
      relations: ['pratica', 'cartella'],
      order: { dataCreazione: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    });
  }

  async findAllForUser(
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Documento[]> {
    const query = this.documentiRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.pratica', 'pratica')
      .leftJoinAndSelect('documento.cartella', 'cartella')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('documento.dataCreazione', 'DESC');

    if (!includeInactive) {
      query.andWhere('documento.attivo = :attivo', { attivo: true });
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
  ): Promise<Documento[]> {
    const where = includeInactive
      ? { praticaId }
      : { praticaId, attivo: true };
    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.documentiRepository.find({
      where,
      relations: ['cartella'],
      order: { dataCreazione: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    });
  }

  async findByCartella(
    cartellaId: string,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Documento[]> {
    const where = includeInactive
      ? { cartellaId }
      : { cartellaId, attivo: true };
    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.documentiRepository.find({
      where,
      order: { dataCreazione: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    });
  }

  async findOne(id: string): Promise<Documento> {
    const documento = await this.documentiRepository.findOne({
      where: { id },
      relations: ['pratica', 'cartella'],
    });
    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} non trovato`);
    }
    return documento;
  }

  async update(id: string, updateDto: UpdateDocumentoDto): Promise<Documento> {
    const documento = await this.findOne(id);
    if (updateDto.nome !== undefined) {
      documento.nome = updateDto.nome;
    }
    if (updateDto.descrizione !== undefined) {
      documento.descrizione = updateDto.descrizione;
    }
    if (updateDto.cartellaId !== undefined) {
      if (updateDto.cartellaId === null) {
        documento.cartella = null;
        documento.cartellaId = null;
      } else {
        documento.cartellaId = updateDto.cartellaId;
        documento.cartella = { id: updateDto.cartellaId } as Cartella;
      }
    }
    return this.documentiRepository.save(documento);
  }

  async deactivate(id: string): Promise<Documento> {
    const documento = await this.findOne(id);
    documento.attivo = false;
    return this.documentiRepository.save(documento);
  }

  async reactivate(id: string): Promise<Documento> {
    const documento = await this.documentiRepository.findOne({
      where: { id },
      relations: ['pratica', 'cartella'],
    });
    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} non trovato`);
    }
    documento.attivo = true;
    return this.documentiRepository.save(documento);
  }

  async remove(id: string): Promise<void> {
    const documento = await this.findOne(id);

    // Delete the physical file from disk
    try {
      if (fs.existsSync(documento.percorsoFile)) {
        await unlinkAsync(documento.percorsoFile);
      }
    } catch (error) {
      this.logger.error(`Error deleting file: ${documento.percorsoFile}`, error);
    }

    await this.documentiRepository.remove(documento);
  }

  async getFileStream(id: string): Promise<{ stream: fs.ReadStream; documento: Documento }> {
    const documento = await this.findOne(id);

    if (!fs.existsSync(documento.percorsoFile)) {
      throw new NotFoundException(`File fisico non trovato: ${documento.percorsoFile}`);
    }

    const stream = fs.createReadStream(documento.percorsoFile);
    return { stream, documento };
  }

  private async applyAccessFilter(
    query: ReturnType<Repository<Documento>['createQueryBuilder']>,
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
          query.andWhere('documento.studioId = :studioId', { studioId: user.studioId });
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
      query.andWhere('documento.praticaId IS NOT NULL');
      query
        .leftJoin('pratica.avvocati', 'avvocato_access')
        .andWhere('LOWER(avvocato_access.email) = :email', { email });
      return;
    }

    if (user.ruolo === 'collaboratore') {
      query.andWhere('documento.praticaId IS NOT NULL');
      query
        .leftJoin('pratica.collaboratori', 'collaboratore_access')
        .andWhere('collaboratore_access.id = :userId', { userId: user.id });
      return;
    }

    if (!user.studioId) {
      query.andWhere('1 = 0');
      return;
    }

    query.andWhere('documento.studioId = :studioId', { studioId: user.studioId });
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
}
