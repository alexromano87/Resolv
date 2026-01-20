// apps/backend/src/tickets/tickets.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, MessaggioTicket, type TicketStato } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddMessaggioDto } from './dto/add-messaggio.dto';
import { v4 as uuidv4 } from 'uuid';
import { Studio } from '../studi/studio.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateAlertDto } from '../alerts/dto/create-alert.dto';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { normalizePagination, type PaginationOptions } from '../common/pagination';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Pratica)
    private praticaRepository: Repository<Pratica>,
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
    @InjectRepository(Avvocato)
    private avvocatiRepository: Repository<Avvocato>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly alertsService: AlertsService,
  ) {}

  async create(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      priorita: createTicketDto.priorita ?? 'normale',
      messaggi: [],
    });
    const saved = await this.ticketRepository.save(ticket);
    await this.sendTicketEmail(saved);
    const alert = await this.triggerTicketAlert(saved);
    if (alert) {
      saved.alertId = alert.id;
      await this.ticketRepository.save(saved);
    }
    return saved;
  }

  async createForUser(user: CurrentUserData, createTicketDto: CreateTicketDto): Promise<Ticket> {
    if (user.ruolo !== 'cliente') {
      throw new ForbiddenException('Solo il cliente può aprire un ticket');
    }
    if (!user.clienteId) {
      throw new ForbiddenException('Cliente non associato');
    }
    if (!createTicketDto.praticaId) {
      throw new BadRequestException('Pratica obbligatoria per aprire un ticket');
    }
    const pratica = await this.praticaRepository.findOne({
      where: { id: createTicketDto.praticaId },
    });
    if (!pratica || pratica.clienteId !== user.clienteId) {
      throw new ForbiddenException('Pratica non associata al cliente');
    }
    createTicketDto.studioId = pratica.studioId ?? createTicketDto.studioId ?? null;
    const saved = await this.create(createTicketDto);
    await this.notificationsService.notifyTicketOpened(saved);
    return saved;
  }

  async findAll(
    includeInactive = false,
    studioId?: string,
    pagination?: PaginationOptions,
  ): Promise<Ticket[]> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('ticket.dataCreazione', 'DESC');

    if (!includeInactive) {
      query.andWhere('ticket.attivo = :attivo', { attivo: true });
    }

    if (studioId !== undefined) {
      query.andWhere('ticket.studioId = :studioId', { studioId });
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllForUser(
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Ticket[]> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('ticket.dataCreazione', 'DESC');

    if (!includeInactive) {
      query.andWhere('ticket.attivo = :attivo', { attivo: true });
    }

    await this.applyAccessFilter(query, user);
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllByPratica(
    praticaId: string,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Ticket[]> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.praticaId = :praticaId', { praticaId })
      .leftJoinAndSelect('ticket.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('ticket.dataCreazione', 'DESC');

    if (!includeInactive) {
      query.andWhere('ticket.attivo = :attivo', { attivo: true });
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllByPraticaForUser(
    praticaId: string,
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Ticket[]> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.praticaId = :praticaId', { praticaId })
      .leftJoinAndSelect('ticket.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('ticket.dataCreazione', 'DESC');

    if (!includeInactive) {
      query.andWhere('ticket.attivo = :attivo', { attivo: true });
    }

    await this.applyAccessFilter(query, user);
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllByStato(
    stato: 'aperto' | 'in_gestione' | 'chiuso',
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Ticket[]> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.stato = :stato', { stato })
      .leftJoinAndSelect('ticket.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('ticket.dataCreazione', 'DESC');

    if (!includeInactive) {
      query.andWhere('ticket.attivo = :attivo', { attivo: true });
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findAllByStatoForUser(
    stato: 'aperto' | 'in_gestione' | 'chiuso',
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Ticket[]> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.stato = :stato', { stato })
      .leftJoinAndSelect('ticket.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .orderBy('ticket.dataCreazione', 'DESC');

    if (!includeInactive) {
      query.andWhere('ticket.attivo = :attivo', { attivo: true });
    }

    await this.applyAccessFilter(query, user);
    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    return query.getMany();
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['pratica', 'pratica.cliente', 'pratica.debitore'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${id} non trovato`);
    }

    return ticket;
  }

  async findOneForUser(id: string, user: CurrentUserData): Promise<Ticket> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.id = :id', { id })
      .leftJoinAndSelect('ticket.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore');

    await this.applyAccessFilter(query, user);
    const ticket = await query.getOne();
    if (!ticket) {
      throw new NotFoundException(`Ticket con ID ${id} non trovato`);
    }
    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto, user?: CurrentUserData): Promise<Ticket> {
    const ticket = user ? await this.findOneForUser(id, user) : await this.findOne(id);

    if (updateTicketDto.stato && !this.isValidStatusTransition(ticket.stato, updateTicketDto.stato)) {
      throw new BadRequestException(`Transizione stato non valida: ${ticket.stato} -> ${updateTicketDto.stato}`);
    }

    // Se si sta chiudendo il ticket, imposta dataChiusura
    if (updateTicketDto.stato === 'chiuso' && ticket.stato !== 'chiuso') {
      Object.assign(ticket, updateTicketDto, { dataChiusura: new Date() });
    } else if (updateTicketDto.stato !== 'chiuso' && ticket.stato === 'chiuso') {
      // Se si riapre il ticket, rimuovi dataChiusura
      Object.assign(ticket, updateTicketDto, { dataChiusura: null });
    } else {
      Object.assign(ticket, updateTicketDto);
    }

    return this.ticketRepository.save(ticket);
  }

  async deactivate(id: string, user?: CurrentUserData): Promise<Ticket> {
    const ticket = user ? await this.findOneForUser(id, user) : await this.findOne(id);
    ticket.attivo = false;
    return this.ticketRepository.save(ticket);
  }

  async reactivate(id: string, user?: CurrentUserData): Promise<Ticket> {
    const ticket = user ? await this.findOneForUser(id, user) : await this.findOne(id);
    ticket.attivo = true;
    return this.ticketRepository.save(ticket);
  }

  async remove(id: string, user?: CurrentUserData): Promise<void> {
    const ticket = user ? await this.findOneForUser(id, user) : await this.findOne(id);
    await this.ticketRepository.remove(ticket);
  }

  async addMessaggio(id: string, addMessaggioDto: AddMessaggioDto, user?: CurrentUserData): Promise<Ticket> {
    const ticket = user ? await this.findOneForUser(id, user) : await this.findOne(id);

    const nuovoMessaggio: MessaggioTicket = {
      id: uuidv4(),
      autore: addMessaggioDto.autore,
      autoreNome: addMessaggioDto.autoreNome,
      testo: addMessaggioDto.testo,
      dataInvio: new Date(),
    };

    ticket.messaggi = [...(ticket.messaggi || []), nuovoMessaggio];
    const saved = await this.ticketRepository.save(ticket);
    await this.notificationsService.notifyTicketMessage(saved, addMessaggioDto.autore);
    return saved;
  }

  async chiudiTicket(id: string, user?: CurrentUserData): Promise<Ticket> {
    return this.update(id, { stato: 'chiuso' }, user);
  }

  async prendiInCarico(id: string, user?: CurrentUserData): Promise<Ticket> {
    return this.update(id, { stato: 'in_gestione' }, user);
  }

  async riapriTicket(id: string, user?: CurrentUserData): Promise<Ticket> {
    return this.update(id, { stato: 'in_gestione' }, user);
  }

  private isValidStatusTransition(current: TicketStato, next: TicketStato): boolean {
    if (current === next) return true;
    const allowed: Record<TicketStato, TicketStato[]> = {
      aperto: ['in_gestione'],
      in_gestione: ['chiuso'],
      chiuso: ['in_gestione'],
    };
    return allowed[current].includes(next);
  }

  private async sendTicketEmail(ticket: Ticket) {
    let studio: Studio | null = null;

    if (ticket.studioId) {
      studio = await this.studioRepository.findOne({ where: { id: ticket.studioId } });
    }

    if (!studio && ticket.praticaId) {
      const pratica = await this.praticaRepository.findOne({
        where: { id: ticket.praticaId },
        relations: ['studio'],
      });
      studio = pratica?.studio ?? null;
    }

    if (!studio?.email) return;

    const subject = `Nuovo ticket cliente: ${ticket.oggetto}`;
    const text = [
      `È stato aperto un nuovo ticket da un cliente.`,
      `Studio: ${studio.nome}`,
      `Oggetto: ${ticket.oggetto}`,
      `Autore: ${ticket.autore}`,
      `Categoria: ${ticket.categoria}`,
      `Priorità: ${ticket.priorita}`,
      `Descrizione: ${ticket.descrizione}`,
    ].join('\n');

    await this.emailService.sendEmail({
      to: studio.email,
      subject,
      text,
    });
  }

  private async triggerTicketAlert(ticket: Ticket): Promise<{ id: string } | null> {
    if (!ticket.praticaId) return null;

    const alertPayload: CreateAlertDto = {
      studioId: ticket.studioId ?? null,
      praticaId: ticket.praticaId,
      titolo: `Ticket cliente: ${ticket.oggetto}`,
      descrizione: ticket.descrizione,
      destinatario: 'studio',
      modalitaNotifica: 'popup',
      dataScadenza: new Date().toISOString(),
      giorniAnticipo: 0,
      clienteCanClose: true,
    };

    try {
      return await this.alertsService.create(alertPayload);
    } catch (error) {
      this.logger.error('Errore creazione alert per ticket cliente', error);
      return null;
    }
  }

  private async applyAccessFilter(
    query: ReturnType<Repository<Ticket>['createQueryBuilder']>,
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
          query.andWhere('ticket.studioId = :studioId', { studioId: user.studioId });
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
      query
        .leftJoin('pratica.avvocati', 'avvocato_access')
        .andWhere('LOWER(avvocato_access.email) = :email', { email });
      return;
    }

    if (user.ruolo === 'collaboratore') {
      query
        .leftJoin('pratica.collaboratori', 'collaboratore_access')
        .andWhere('collaboratore_access.id = :userId', { userId: user.id });
      return;
    }

    if (!user.studioId) {
      query.andWhere('1 = 0');
      return;
    }

    query.andWhere('ticket.studioId = :studioId', { studioId: user.studioId });
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
