// src/debitori/debitori.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Debitore } from './debitore.entity';
import { CreateDebitoreDto } from './dto/create-debitore.dto';
import { UpdateDebitoreDto } from './dto/update-debitore.dto';
import { ClientiDebitoriService } from '../relazioni/clienti-debitori.service';
import { Pratica } from '../pratiche/pratica.entity';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { Avvocato } from '../avvocati/avvocato.entity';
import { normalizePagination, type PaginationOptions } from '../common/pagination';

@Injectable()
export class DebitoriService {
  constructor(
    @InjectRepository(Debitore)
    private readonly repo: Repository<Debitore>,
    private readonly clientiDebitoriService: ClientiDebitoriService,
    @InjectRepository(Pratica)
    private readonly praticheRepo: Repository<Pratica>,
    @InjectRepository(Avvocato)
    private readonly avvocatiRepo: Repository<Avvocato>,
  ) {}

  /**
   * Restituisce tutti i debitori.
   * @param includeInactive - se true, include anche i debitori disattivati
   * @param studioId - se presente, filtra per studio (undefined = tutti per admin)
   */
  async findAll(
    includeInactive = false,
    studioId?: string,
    pagination?: PaginationOptions,
  ): Promise<Debitore[]> {
    const where: any = includeInactive ? {} : { attivo: true };

    // Se studioId è definito, filtra per studio
    if (studioId !== undefined) {
      where.studioId = studioId;
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    });
  }

  async findAllForUser(
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Debitore[]> {
    if (user.ruolo === 'admin') {
      return this.findAll(includeInactive, undefined, pagination);
    }

    if (user.ruolo === 'cliente') {
      if (!user.clienteId) return [];
      const praticaWhere: any = { clienteId: user.clienteId };
      if (!includeInactive) {
        praticaWhere.attivo = true;
      }
      const pratiche = await this.praticheRepo.find({ where: praticaWhere });
      const debitoreIds = Array.from(new Set(pratiche.map((p) => p.debitoreId)));
      if (debitoreIds.length === 0) return [];
      const page = normalizePagination(pagination?.page, pagination?.limit);
      return this.repo.find({
        where: {
          id: In(debitoreIds),
          ...(includeInactive ? {} : { attivo: true }),
        },
        order: { createdAt: 'DESC' },
        ...(page ? { skip: page.skip, take: page.take } : {}),
      });
    }

    if (!user.studioId) return [];

    if (user.ruolo === 'avvocato') {
      const access = await this.getAvvocatoAccess(user.email, user.studioId);
      if (access === 'tutte') {
        return this.findAll(includeInactive, user.studioId, pagination);
      }
    }

    if (user.ruolo === 'avvocato' || user.ruolo === 'collaboratore') {
      return this.findAllAssigned(user, includeInactive, pagination);
    }

    return this.findAll(includeInactive, user.studioId, pagination);
  }

  async findAllWithClientiCountForUser(
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<(Debitore & { clientiCount: number })[]> {
    if (user.ruolo === 'admin') {
      return this.findAllWithClientiCount(includeInactive, undefined, pagination);
    }

    if (user.ruolo === 'cliente') {
      const debitori = await this.findAllForUser(user, includeInactive, pagination);
      const results = await Promise.all(
        debitori.map(async (d) => {
          const clientiIds =
            await this.clientiDebitoriService.getClientiByDebitore(d.id);
          return {
            ...d,
            clientiCount: clientiIds.length,
          };
        }),
      );
      return results;
    }

    if (!user.studioId) return [];

    if (user.ruolo === 'avvocato') {
      const access = await this.getAvvocatoAccess(user.email, user.studioId);
      if (access === 'tutte') {
        return this.findAllWithClientiCount(includeInactive, user.studioId, pagination);
      }
    }

    if (user.ruolo === 'avvocato' || user.ruolo === 'collaboratore') {
      const debitori = await this.findAllAssigned(user, includeInactive, pagination);
      const results = await Promise.all(
        debitori.map(async (d) => {
          const clientiIds =
            await this.clientiDebitoriService.getClientiByDebitore(d.id);
          return {
            ...d,
            clientiCount: clientiIds.length,
          };
        }),
      );
      return results;
    }

    return this.findAllWithClientiCount(includeInactive, user.studioId, pagination);
  }

  private async getAvvocatoAccess(email?: string | null, studioId?: string | null) {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail || !studioId) return null;
    const avvocato = await this.avvocatiRepo.findOne({
      where: { email: normalizedEmail, studioId },
    });
    return avvocato?.livelloAccessoPratiche ?? null;
  }

  private async findAllAssigned(
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Debitore[]> {
    const query = this.repo.createQueryBuilder('debitore');
    query.leftJoin(Pratica, 'pratica', 'pratica.debitoreId = debitore.id');

    if (!includeInactive) {
      query.andWhere('debitore.attivo = :attivo', { attivo: true });
      query.andWhere('pratica.attivo = :praticaAttiva', { praticaAttiva: true });
    }

    if (user.studioId) {
      query.andWhere('debitore.studioId = :studioId', { studioId: user.studioId });
    }

    if (user.ruolo === 'avvocato') {
      const email = user.email?.toLowerCase().trim();
      if (!email) return [];
      query.leftJoin('pratica.avvocati', 'avvocato_access');
      query.andWhere('LOWER(avvocato_access.email) = :email', { email });
    } else if (user.ruolo === 'collaboratore') {
      query.leftJoin('pratica.collaboratori', 'collaboratore_access');
      query.andWhere('collaboratore_access.id = :userId', { userId: user.id });
    }

    query.distinct(true);
    query.orderBy('debitore.createdAt', 'DESC');
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  /**
   * Restituisce tutti i debitori con il conteggio dei clienti collegati.
   * Utile per la pagina di ricerca per mostrare se un debitore è "orfano".
   * @param includeInactive - se true, include anche i debitori disattivati
   * @param studioId - se presente, filtra per studio (undefined = tutti per admin)
   */
  async findAllWithClientiCount(
    includeInactive = false,
    studioId?: string,
    pagination?: PaginationOptions,
  ): Promise<(Debitore & { clientiCount: number })[]> {
    const where: any = includeInactive ? {} : { attivo: true };

    // Se studioId è definito, filtra per studio
    if (studioId !== undefined) {
      where.studioId = studioId;
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    const debitori = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    });

    // Per ogni debitore, conta i clienti collegati
    const results = await Promise.all(
      debitori.map(async (d) => {
        const clientiIds =
          await this.clientiDebitoriService.getClientiByDebitore(d.id);
        return {
          ...d,
          clientiCount: clientiIds.length,
        };
      }),
    );

    return results;
  }

  async findOne(id: string): Promise<Debitore> {
    const debitore = await this.repo.findOne({ where: { id } });
    if (!debitore) {
      throw new NotFoundException(`Debitore con ID ${id} non trovato`);
    }
    return debitore;
  }

  async create(dto: CreateDebitoreDto): Promise<Debitore> {
    const { clientiIds, ...rest } = dto;

    // Verifica duplicati per Codice Fiscale
    if (rest.codiceFiscale) {
      const existing = await this.repo.findOne({
        where: { codiceFiscale: rest.codiceFiscale },
      });
      if (existing) {
        throw new ConflictException(
          'Esiste già un debitore con questo Codice Fiscale',
        );
      }
    }

    const debitore = this.repo.create({
      ...rest,
      dataNascita: rest.dataNascita ? new Date(rest.dataNascita) : undefined,
    });

    const saved = await this.repo.save(debitore);

    // Collega ai clienti se specificati
    if (clientiIds && clientiIds.length > 0) {
      for (const clienteId of clientiIds) {
        await this.clientiDebitoriService.linkDebitoreToCliente(
          clienteId,
          saved.id,
        );
      }
    }

    return saved;
  }

  async update(id: string, dto: UpdateDebitoreDto): Promise<Debitore> {
    const debitore = await this.findOne(id);
    const { clientiIds, ...rest } = dto;

    // Se sta cambiando CF, verifica duplicati
    if (rest.codiceFiscale && rest.codiceFiscale !== debitore.codiceFiscale) {
      const existing = await this.repo.findOne({
        where: { codiceFiscale: rest.codiceFiscale },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Esiste già un debitore con questo Codice Fiscale',
        );
      }
    }

    await this.repo.update(
      { id },
      {
        ...rest,
        dataNascita: rest.dataNascita ? new Date(rest.dataNascita) : undefined,
      },
    );

    // Gestione clientiIds se specificati (opzionale)
    // Per ora lasciamo la gestione dei link a /clienti/:id/debitori

    return this.findOne(id);
  }

  /**
   * Disattiva un debitore (soft-delete).
   */
  async deactivate(id: string): Promise<Debitore> {
    const debitore = await this.findOne(id);

    const praticheAperte = await this.praticheRepo.count({
      where: { debitoreId: id, aperta: true, attivo: true },
    });
    if (praticheAperte > 0) {
      throw new ConflictException(
        `Impossibile disattivare: il debitore ha ${praticheAperte} pratiche aperte`,
      );
    }

    await this.repo.update({ id }, { attivo: false });
    return { ...debitore, attivo: false };
  }

  /**
   * Riattiva un debitore precedentemente disattivato.
   */
  async reactivate(id: string): Promise<Debitore> {
    const debitore = await this.findOne(id);
    await this.repo.update({ id }, { attivo: true });
    return { ...debitore, attivo: true };
  }

  /**
   * Elimina fisicamente un debitore.
   * ATTENZIONE: Usare solo se non ci sono relazioni.
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id); // Verifica esistenza

    const praticheCollegate = await this.praticheRepo.count({
      where: { debitoreId: id },
    });
    if (praticheCollegate > 0) {
      throw new ConflictException(
        `Impossibile eliminare: il debitore è collegato a ${praticheCollegate} pratiche`,
      );
    }

    await this.repo.delete({ id });
  }

  /**
   * Conta le pratiche collegate a un debitore.
   * Per ora ritorna 0, verrà implementato quando avremo l'entity Pratica.
   */
  async countPraticheCollegate(id: string): Promise<number> {
    return this.praticheRepo.count({ where: { debitoreId: id } });
  }

  async canAccessDebitore(user: CurrentUserData, debitoreId: string): Promise<boolean> {
    if (user.ruolo === 'admin') return true;
    if (user.ruolo === 'cliente') {
      if (!user.clienteId) return false;
      const count = await this.praticheRepo.count({
        where: { debitoreId, clienteId: user.clienteId },
      });
      return count > 0;
    }
    if (!user.studioId) return false;

    if (user.ruolo === 'avvocato') {
      const access = await this.getAvvocatoAccess(user.email, user.studioId);
      if (access === 'tutte') {
        const debitore = await this.findOne(debitoreId);
        return debitore.studioId === user.studioId;
      }
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;
      const count = await this.praticheRepo
        .createQueryBuilder('pratica')
        .leftJoin('pratica.avvocati', 'avvocato_access')
        .where('pratica.debitoreId = :debitoreId', { debitoreId })
        .andWhere('pratica.studioId = :studioId', { studioId: user.studioId })
        .andWhere('LOWER(avvocato_access.email) = :email', { email })
        .getCount();
      return count > 0;
    }

    if (user.ruolo === 'collaboratore') {
      const count = await this.praticheRepo
        .createQueryBuilder('pratica')
        .leftJoin('pratica.collaboratori', 'collaboratore_access')
        .where('pratica.debitoreId = :debitoreId', { debitoreId })
        .andWhere('pratica.studioId = :studioId', { studioId: user.studioId })
        .andWhere('collaboratore_access.id = :userId', { userId: user.id })
        .getCount();
      return count > 0;
    }

    const debitore = await this.findOne(debitoreId);
    return debitore.studioId === user.studioId;
  }
}
