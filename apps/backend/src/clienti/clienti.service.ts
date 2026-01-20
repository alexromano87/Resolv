import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Pratica } from '../pratiche/pratica.entity';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { Avvocato } from '../avvocati/avvocato.entity';
import { normalizePagination, type PaginationOptions } from '../common/pagination';

@Injectable()
export class ClientiService {
  constructor(
    @InjectRepository(Cliente)
    private readonly repo: Repository<Cliente>,
    @InjectRepository(Pratica)
    private readonly praticheRepo: Repository<Pratica>,
    @InjectRepository(Avvocato)
    private readonly avvocatiRepo: Repository<Avvocato>,
  ) {}

  async create(data: CreateClienteDto) {
    // Verifica duplicati per P.IVA
    if (data.partitaIva) {
      const existing = await this.repo.findOne({
        where: { partitaIva: data.partitaIva },
      });
      if (existing) {
        throw new ConflictException(
          'Esiste già un cliente con questa Partita IVA',
        );
      }
    }

    const cliente = this.repo.create(data);
    return this.repo.save(cliente);
  }

  /**
   * Restituisce tutti i clienti.
   * @param includeInactive - se true, include anche i clienti disattivati
   * @param studioId - se presente, filtra per studio (undefined = tutti per admin)
   */
  async findAll(includeInactive = false, studioId?: string, pagination?: PaginationOptions) {
    const where: any = includeInactive ? {} : { attivo: true };

    // Se studioId è definito, filtra per studio
    if (studioId !== undefined) {
      where.studioId = studioId;
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.repo.find({
      where,
      order: { ragioneSociale: 'ASC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    });
  }

  async findAllForUser(user: CurrentUserData, includeInactive = false, pagination?: PaginationOptions) {
    if (user.ruolo === 'admin') {
      return this.findAll(includeInactive, undefined, pagination);
    }

    if (user.ruolo === 'cliente') {
      if (!user.clienteId) return [];
      const where: any = { id: user.clienteId };
      if (!includeInactive) {
        where.attivo = true;
      }
      const cliente = await this.repo.findOne({ where });
      return cliente ? [cliente] : [];
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
  ) {
    const query = this.repo.createQueryBuilder('cliente');
    query.leftJoin(Pratica, 'pratica', 'pratica.clienteId = cliente.id');

    if (!includeInactive) {
      query.andWhere('cliente.attivo = :attivo', { attivo: true });
      query.andWhere('pratica.attivo = :praticaAttiva', { praticaAttiva: true });
    }

    if (user.studioId) {
      query.andWhere('cliente.studioId = :studioId', { studioId: user.studioId });
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
    query.orderBy('cliente.ragioneSociale', 'ASC');
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findOne(id: string) {
    const cliente = await this.repo.findOne({
      where: { id },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} non trovato`);
    }
    return cliente;
  }

  async update(id: string, data: UpdateClienteDto) {
    const cliente = await this.findOne(id);

    // Se sta cambiando P.IVA, verifica duplicati
    if (data.partitaIva && data.partitaIva !== cliente.partitaIva) {
      const existing = await this.repo.findOne({
        where: { partitaIva: data.partitaIva },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Esiste già un cliente con questa Partita IVA',
        );
      }
    }

    await this.repo.update({ id }, data);
    return this.findOne(id);
  }

  /**
   * Disattiva un cliente (soft-delete).
   * Non elimina fisicamente il record.
   */
  async deactivate(id: string) {
    const cliente = await this.findOne(id);

    const praticheAperte = await this.praticheRepo.count({
      where: { clienteId: id, aperta: true, attivo: true },
    });
    if (praticheAperte > 0) {
      throw new ConflictException(
        `Impossibile disattivare: il cliente ha ${praticheAperte} pratiche aperte`,
      );
    }

    await this.repo.update({ id }, { attivo: false });
    return { ...cliente, attivo: false };
  }

  /**
   * Riattiva un cliente precedentemente disattivato.
   */
  async reactivate(id: string) {
    const cliente = await this.findOne(id);
    await this.repo.update({ id }, { attivo: true });
    return { ...cliente, attivo: true };
  }

  /**
   * Elimina fisicamente un cliente.
   * ATTENZIONE: Usare solo se non ci sono relazioni.
   * Preferire deactivate() nella maggior parte dei casi.
   */
  async remove(id: string) {
    const cliente = await this.findOne(id);

    const praticheCollegate = await this.praticheRepo.count({
      where: { clienteId: id },
    });
    if (praticheCollegate > 0) {
      throw new ConflictException(
        `Impossibile eliminare: il cliente è collegato a ${praticheCollegate} pratiche`,
      );
    }

    await this.repo.delete({ id });
    return cliente;
  }

  /**
   * Conta le pratiche collegate a un cliente.
   * Per ora ritorna 0, verrà implementato quando avremo l'entity Pratica.
   */
  async countPraticheCollegate(id: string): Promise<number> {
    return this.praticheRepo.count({ where: { clienteId: id } });
  }

  async canAccessCliente(user: CurrentUserData, clienteId: string): Promise<boolean> {
    if (user.ruolo === 'admin') return true;
    if (user.ruolo === 'cliente') {
      return Boolean(user.clienteId && user.clienteId === clienteId);
    }
    if (!user.studioId) return false;

    if (user.ruolo === 'avvocato') {
      const access = await this.getAvvocatoAccess(user.email, user.studioId);
      if (access === 'tutte') {
        const cliente = await this.findOne(clienteId);
        return cliente.studioId === user.studioId;
      }
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;
      const count = await this.praticheRepo
        .createQueryBuilder('pratica')
        .leftJoin('pratica.avvocati', 'avvocato_access')
        .where('pratica.clienteId = :clienteId', { clienteId })
        .andWhere('pratica.studioId = :studioId', { studioId: user.studioId })
        .andWhere('LOWER(avvocato_access.email) = :email', { email })
        .getCount();
      return count > 0;
    }

    if (user.ruolo === 'collaboratore') {
      const count = await this.praticheRepo
        .createQueryBuilder('pratica')
        .leftJoin('pratica.collaboratori', 'collaboratore_access')
        .where('pratica.clienteId = :clienteId', { clienteId })
        .andWhere('pratica.studioId = :studioId', { studioId: user.studioId })
        .andWhere('collaboratore_access.id = :userId', { userId: user.id })
        .getCount();
      return count > 0;
    }

    const cliente = await this.findOne(clienteId);
    return cliente.studioId === user.studioId;
  }

  /**
   * Ottiene la configurazione di condivisione dashboard per un cliente.
   */
  async getConfigurazioneCondivisione(id: string) {
    const cliente = await this.findOne(id);

    // Se non esiste configurazione, restituisci una configurazione di default
    if (!cliente.configurazioneCondivisione) {
      return {
        abilitata: false,
        dashboard: {
          stats: false,
          kpi: false,
        },
        pratiche: {
          elenco: false,
          dettagli: false,
          documenti: false,
          movimentiFinanziari: false,
          timeline: false,
        },
      };
    }

    return cliente.configurazioneCondivisione;
  }

  /**
   * Aggiorna la configurazione di condivisione dashboard per un cliente.
   */
  async updateConfigurazioneCondivisione(id: string, configurazione: any) {
    const cliente = await this.findOne(id);

    await this.repo.update(
      { id },
      { configurazioneCondivisione: configurazione }
    );

    return this.findOne(id);
  }
}
