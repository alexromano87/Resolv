import { Injectable, ForbiddenException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import type Redis from 'ioredis';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupPreassessmentTicket } from './checkup-preassessment-ticket.entity';
import { CheckupPreassessmentTicketMessage } from './checkup-preassessment-ticket-message.entity';
import { CheckupPreassessmentAlert } from './checkup-preassessment-alert.entity';
import { CheckupPreassessmentMessage } from './checkup-preassessment-message.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CreatePreassessmentTicketDto } from './dto/create-preassessment-ticket.dto';
import { ReplyPreassessmentTicketDto } from './dto/reply-preassessment-ticket.dto';
import { CreatePreassessmentAlertDto } from './dto/create-preassessment-alert.dto';
import { UpdatePreassessmentAlertDto } from './dto/update-preassessment-alert.dto';
import { CheckupMailService } from '../mail/checkup-mail.service';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { CheckupNotificationsService } from '../notifications/checkup-notifications.service';

const SEEN_TTL = 30 * 24 * 60 * 60; // 30 giorni in secondi

@Injectable()
export class CheckupPreassessmentThreadsService {
  private readonly logger = new Logger(CheckupPreassessmentThreadsService.name);

  constructor(
    @InjectRepository(CheckupPreassessment)
    private preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupPreassessmentTicket)
    private ticketRepository: Repository<CheckupPreassessmentTicket>,
    @InjectRepository(CheckupPreassessmentTicketMessage)
    private ticketMessageRepository: Repository<CheckupPreassessmentTicketMessage>,
    @InjectRepository(CheckupPreassessmentAlert)
    private alertRepository: Repository<CheckupPreassessmentAlert>,
    @InjectRepository(CheckupPreassessmentMessage)
    private chatMessageRepository: Repository<CheckupPreassessmentMessage>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
    private readonly mailService: CheckupMailService,
    private readonly auditLogService: CheckupAuditLogService,
    private readonly notificationsService: CheckupNotificationsService,
    @Inject('CHECKUP_REDIS') private readonly redis: Redis,
  ) {}

  // ─── Access control ───────────────────────────────────────────────────────

  private async ensureAccess(preassessmentId: string, user: CheckupCurrentUserData) {
    const pre = await this.preassessmentRepository.findOne({ where: { id: preassessmentId } });
    if (!pre) throw new NotFoundException('Checkup non trovato');

    if (user.ruolo === 'cliente') {
      if (!user.clientId || pre.clientId !== user.clientId) {
        throw new ForbiddenException('Non autorizzato');
      }
      return { pre, clientId: pre.clientId };
    }

    if (!user.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.licenseRepository.findOne({ where: { studioId: user.studioId } });
    if (!license) {
      throw new ForbiddenException('Non autorizzato');
    }
    const sublicense = await this.sublicenseRepository.findOne({
      where: { licenseId: license.id, clientId: pre.clientId, attiva: true },
    });
    if (!sublicense) {
      throw new ForbiddenException('Non autorizzato');
    }

    return { pre, clientId: pre.clientId };
  }

  private async getAccessibleClientIdsForStaff(user: CheckupCurrentUserData): Promise<string[]> {
    if (!user.studioId || user.ruolo === 'cliente') return [];
    const license = await this.licenseRepository.findOne({ where: { studioId: user.studioId } });
    if (!license) return [];
    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, attiva: true },
      select: ['clientId'],
    });
    return sublicenses
      .map((entry) => entry.clientId)
      .filter((clientId): clientId is string => !!clientId);
  }

  private async getAccessibleLatestPreassessmentsForStaff(user: CheckupCurrentUserData): Promise<CheckupPreassessment[]> {
    const clientIds = await this.getAccessibleClientIdsForStaff(user);
    if (clientIds.length === 0) return [];
    return this.preassessmentRepository.find({
      where: { clientId: In(clientIds), isLatest: true },
      relations: ['client'],
      order: { updatedAt: 'DESC' },
    });
  }

  // ─── Email helpers ─────────────────────────────────────────────────────────

  /** Trova tutti gli admin_studio attivi di un dato studioId. */
  private async findAdminsByStudio(studioId: string): Promise<CheckupUser[]> {
    return this.userRepository.find({
      where: { studioId, ruolo: 'admin_studio', attivo: true },
    });
  }

  /** Trova gli admin_studio risalendo dal clientId del preassessment. */
  private async findAdminsForPreassessment(preassessmentId: string): Promise<CheckupUser[]> {
    const pre = await this.preassessmentRepository.findOne({ where: { id: preassessmentId } });
    if (!pre?.clientId) return [];
    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId: pre.clientId, attiva: true },
    });
    if (!sublicense) return [];
    const license = await this.licenseRepository.findOne({ where: { id: sublicense.licenseId } });
    if (!license?.studioId) return [];
    return this.findAdminsByStudio(license.studioId);
  }

  private async resolveNotificationContext(preassessmentId: string) {
    const pre = await this.preassessmentRepository.findOne({ where: { id: preassessmentId } });
    if (!pre?.clientId) return null;
    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId: pre.clientId, attiva: true },
    });
    if (!sublicense) return null;
    const license = await this.licenseRepository.findOne({ where: { id: sublicense.licenseId } });
    if (!license?.studioId) return null;
    const clientUser = await this.userRepository.findOne({ where: { clientId: pre.clientId, ruolo: 'cliente' } });
    const clientName = clientUser?.azienda || clientUser?.nome || 'Cliente';
    return {
      studioId: license.studioId,
      clientId: pre.clientId,
      clientName,
      preassessmentId,
    };
  }

  private async logNotificationEvent(params: {
    preassessmentId: string;
    user: CheckupCurrentUserData;
    entityType: 'TICKET' | 'ALERT';
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entityId?: string | null;
    entityName?: string | null;
    description: string;
    priority?: 'info' | 'warning' | 'urgent';
    actionUrl: string;
  }) {
    const context = await this.resolveNotificationContext(params.preassessmentId);
    if (!context) return;
    this.auditLogService.log({
      userId: params.user.id,
      userEmail: params.user.email,
      userRole: params.user.ruolo,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? context.clientName,
      description: params.description,
      studioId: context.studioId,
      success: true,
      metadata: {
        clientId: context.clientId,
        clientName: context.clientName,
        preassessmentId: context.preassessmentId,
        actionUrl: params.actionUrl,
        actorName: `${params.user.nome} ${params.user.cognome}`.trim() || params.user.email,
        priority: params.priority ?? 'info',
      },
    }).catch(() => {});
  }

  private appUrl(): string {
    return process.env.CHECKUP_APP_URL || 'http://localhost:8081';
  }

  private emailTicketRow(ticket: CheckupPreassessmentTicket | { subject: string; body?: string }): string {
    const subject = 'subject' in ticket ? ticket.subject : '';
    return `<p style="margin:8px 0;background:#f8fafc;padding:10px 14px;border-radius:6px;font-size:14px;color:#1e293b;">
              <strong>${subject}</strong>
            </p>`;
  }

  // ─── Unread-count helpers (Redis) ─────────────────────────────────────────

  private seenKey(type: 'tickets' | 'alerts', userId: string, preassessmentId: string): string {
    return `checkup:seen:${type}:${userId}:${preassessmentId}`;
  }

  async getUnreadCounts(userId: string, preassessmentId: string): Promise<{ tickets: number; alerts: number; chat: number }> {
    const [ticketsSeen, alertsSeen] = await Promise.all([
      this.redis.get(this.seenKey('tickets', userId, preassessmentId)),
      this.redis.get(this.seenKey('alerts', userId, preassessmentId)),
    ]);

    // Only count items created by OTHER users (not the current user themselves)
    const countAfter = async (
      repo: Repository<any>,
      field: string,
      since: string | null,
    ): Promise<number> => {
      const qb = repo.createQueryBuilder('e')
        .where(`e.${field} = :pid`, { pid: preassessmentId })
        .andWhere('e.createdById != :uid', { uid: userId });
      if (since) {
        qb.andWhere('e.createdAt > :since', { since: new Date(since) });
      }
      return qb.getCount();
    };

    const [tickets, alerts, chat] = await Promise.all([
      countAfter(this.ticketRepository, 'preassessmentId', ticketsSeen),
      countAfter(this.alertRepository, 'preassessmentId', alertsSeen),
      // Chat: count messages not sent by current user that are unread (letto = false)
      this.chatMessageRepository.count({
        where: { preassessmentId, sectionId: 'general', letto: false } as any,
      }).then(async (total) => {
        if (total === 0) return 0;
        return this.chatMessageRepository
          .createQueryBuilder('m')
          .where('m.preassessmentId = :pid', { pid: preassessmentId })
          .andWhere('m.sectionId = :sid', { sid: 'general' })
          .andWhere('m.letto = false')
          .andWhere('m.userId != :uid', { uid: userId })
          .andWhere('m.deletedForEveryoneAt IS NULL')
          .andWhere('NOT JSON_CONTAINS(COALESCE(m.deletedForUserIds, JSON_ARRAY()), JSON_QUOTE(:uid))', { uid: userId })
          .getCount();
      }),
    ]);

    return { tickets, alerts, chat };
  }

  async markSeen(userId: string, preassessmentId: string, type: 'tickets' | 'alerts' | 'chat'): Promise<void> {
    if (type === 'chat') {
      // Bulk-mark all unread chat messages (not sent by current user) as read
      await this.chatMessageRepository
        .createQueryBuilder()
        .update()
        .set({ letto: true })
        .where('preassessmentId = :pid', { pid: preassessmentId })
        .andWhere('sectionId = :sid', { sid: 'general' })
        .andWhere('letto = false')
        .andWhere('userId != :uid', { uid: userId })
        .execute();
    } else {
      await this.redis.set(this.seenKey(type, userId, preassessmentId), new Date().toISOString(), 'EX', SEEN_TTL);
    }
  }

  // ─── Tickets ───────────────────────────────────────────────────────────────

  async listTickets(preassessmentId: string, user: CheckupCurrentUserData) {
    await this.ensureAccess(preassessmentId, user);
    const tickets = await this.ticketRepository.find({
      where: { preassessmentId },
      relations: [
        'createdBy',
        'assignedTo',
        'closeRequestedBy',
        'closedBy',
        'messages',
        'messages.user',
      ],
      order: { createdAt: 'DESC' },
    });

    tickets.forEach((ticket) => {
      if (ticket.messages) {
        ticket.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    return tickets;
  }

  async listAllTickets(user: CheckupCurrentUserData, search?: string) {
    if (user.ruolo === 'cliente') {
      throw new ForbiddenException('Solo lo studio può consultare tutti i ticket');
    }

    const preassessments = await this.getAccessibleLatestPreassessmentsForStaff(user);
    if (preassessments.length === 0) return [];

    const preassessmentIds = preassessments.map((entry) => entry.id);
    const preassessmentById = new Map(preassessments.map((entry) => [entry.id, entry]));
    const normalizedSearch = search?.trim().toLowerCase();

    const tickets = await this.ticketRepository.find({
      where: { preassessmentId: In(preassessmentIds) },
      relations: [
        'createdBy',
        'assignedTo',
        'closeRequestedBy',
        'closedBy',
        'messages',
        'messages.user',
      ],
      order: { createdAt: 'DESC' },
    });

    tickets.forEach((ticket) => {
      if (ticket.messages) {
        ticket.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    return tickets
      .map((ticket) => {
        const pre = preassessmentById.get(ticket.preassessmentId);
        const clientName = pre?.client?.ragioneSociale || pre?.client?.nome || 'Cliente';
        return {
          ...ticket,
          client: {
            id: pre?.clientId ?? null,
            nome: pre?.client?.nome ?? null,
            ragioneSociale: pre?.client?.ragioneSociale ?? null,
            label: clientName,
            preassessmentId: ticket.preassessmentId,
          },
        };
      })
      .filter((ticket) => {
        if (!normalizedSearch) return true;
        const haystack = [
          ticket.subject,
          ticket.body,
          ticket.createdBy ? `${ticket.createdBy.nome} ${ticket.createdBy.cognome}` : '',
          ticket.createdBy?.email ?? '',
          ticket.assignedTo ? `${ticket.assignedTo.nome} ${ticket.assignedTo.cognome}` : '',
          ticket.client?.label ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }

  async createTicket(
    preassessmentId: string,
    dto: CreatePreassessmentTicketDto,
    user: CheckupCurrentUserData,
  ) {
    if (user.ruolo !== 'cliente') {
      throw new ForbiddenException('Solo il cliente può aprire ticket');
    }

    await this.ensureAccess(preassessmentId, user);

    const ticket = this.ticketRepository.create({
      preassessmentId,
      createdById: user.id,
      subject: dto.subject,
      body: dto.body,
      status: 'open',
    });

    const saved = await this.ticketRepository.save(ticket);
    const result = await this.ticketRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'messages', 'messages.user'],
    });

    // Notifica email agli admin_studio
    this.findAdminsForPreassessment(preassessmentId).then((admins) => {
      admins.forEach((admin) => {
        this.mailService.sendMail({
          to: admin.email,
          subject: `[Checkup] Nuovo ticket: ${dto.subject}`,
          html: `<p>Il cliente <strong>${user.nome} ${user.cognome}</strong> ha aperto un nuovo ticket.</p>
                 ${this.emailTicketRow(dto)}
                 ${this.mailService.signature()}`,
        });
      });
    }).catch(() => {/* silenzioso */});

    this.logNotificationEvent({
      preassessmentId,
      user,
      entityType: 'TICKET',
      action: 'CREATE',
      entityId: saved.id,
      entityName: dto.subject,
      description: `Nuovo ticket aperto: ${dto.subject}`,
      actionUrl: `/checkup/clienti/${user.clientId}/tickets`,
    }).catch(() => {});
    this.notificationsService.notifyPreassessmentParticipants(preassessmentId, {
      type: 'ticket_created',
      title: 'Nuovo ticket',
      message: `Nuovo ticket aperto: ${dto.subject}`,
      actionUrl: `/checkup/clienti/${user.clientId}/tickets`,
      metadata: { ticketId: saved.id },
    }, user).catch(() => {});

    return result;
  }

  async replyTicket(
    ticketId: string,
    dto: ReplyPreassessmentTicketDto,
    user: CheckupCurrentUserData,
  ) {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket non trovato');

    await this.ensureAccess(ticket.preassessmentId, user);

    const msg = this.ticketMessageRepository.create({
      ticketId: ticket.id,
      userId: user.id,
      messaggio: dto.messaggio,
    });

    const saved = await this.ticketMessageRepository.save(msg);
    const result = await this.ticketMessageRepository.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });

    // Notifica email al destinatario (chi non ha scritto)
    if (user.ruolo === 'cliente') {
      // Cliente ha risposto → notifica assignee o tutti gli admin
      if (ticket.assignedToId) {
        this.userRepository.findOne({ where: { id: ticket.assignedToId } }).then((admin) => {
          if (admin) {
            this.mailService.sendMail({
              to: admin.email,
              subject: `[Checkup] Risposta al ticket: ${ticket.subject}`,
              html: `<p>Il cliente <strong>${user.nome} ${user.cognome}</strong> ha risposto al ticket <strong>${ticket.subject}</strong>.</p>
                     <blockquote style="border-left:3px solid #4f46e5;padding:8px 12px;margin:12px 0;color:#475569;">${dto.messaggio}</blockquote>
                     ${this.mailService.signature()}`,
            });
          }
        }).catch(() => {/* silenzioso */});
      } else {
        this.findAdminsForPreassessment(ticket.preassessmentId).then((admins) => {
          admins.forEach((admin) => {
            this.mailService.sendMail({
              to: admin.email,
              subject: `[Checkup] Risposta al ticket: ${ticket.subject}`,
              html: `<p>Il cliente <strong>${user.nome} ${user.cognome}</strong> ha risposto al ticket <strong>${ticket.subject}</strong>.</p>
                     <blockquote style="border-left:3px solid #4f46e5;padding:8px 12px;margin:12px 0;color:#475569;">${dto.messaggio}</blockquote>
                     ${this.mailService.signature()}`,
            });
          });
        }).catch(() => {/* silenzioso */});
      }
    } else {
      // Admin ha risposto → notifica cliente
      this.userRepository.findOne({ where: { id: ticket.createdById } }).then((cliente) => {
        if (cliente) {
          this.mailService.sendMail({
            to: cliente.email,
            subject: `[Checkup] Aggiornamento ticket: ${ticket.subject}`,
            html: `<p>Hai ricevuto una risposta al tuo ticket <strong>${ticket.subject}</strong>.</p>
                   <blockquote style="border-left:3px solid #4f46e5;padding:8px 12px;margin:12px 0;color:#475569;">${dto.messaggio}</blockquote>
                   ${this.mailService.signature()}`,
          });
        }
      }).catch(() => {/* silenzioso */});
    }

    const access = await this.ensureAccess(ticket.preassessmentId, user);
    this.logNotificationEvent({
      preassessmentId: ticket.preassessmentId,
      user,
      entityType: 'TICKET',
      action: 'UPDATE',
      entityId: ticket.id,
      entityName: ticket.subject,
      description: `Nuova risposta sul ticket: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${access.clientId}/tickets`,
    }).catch(() => {});
    this.notificationsService.notifyPreassessmentParticipants(ticket.preassessmentId, {
      type: 'ticket_updated',
      title: 'Risposta al ticket',
      message: `Nuova risposta sul ticket: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${access.clientId}/tickets`,
      metadata: { ticketId: ticket.id, messageId: saved.id },
    }).catch(() => {});

    return result;
  }

  async assignTicket(ticketId: string, user: CheckupCurrentUserData) {
    if (user.ruolo === 'cliente') {
      throw new ForbiddenException('Solo lo studio può prendere in carico i ticket');
    }
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket non trovato');

    await this.ensureAccess(ticket.preassessmentId, user);

    ticket.assignedToId = user.id;
    ticket.status = 'in_progress';
    const saved = await this.ticketRepository.save(ticket);

    // Notifica cliente
    this.userRepository.findOne({ where: { id: ticket.createdById } }).then((cliente) => {
      if (cliente) {
        this.mailService.sendMail({
          to: cliente.email,
          subject: `[Checkup] Ticket preso in carico: ${ticket.subject}`,
          html: `<p>Il tuo ticket <strong>${ticket.subject}</strong> è stato preso in carico da <strong>${user.nome} ${user.cognome}</strong>.</p>
                 ${this.mailService.signature()}`,
        });
      }
    }).catch(() => {/* silenzioso */});

    const access = await this.ensureAccess(ticket.preassessmentId, user);
    this.logNotificationEvent({
      preassessmentId: ticket.preassessmentId,
      user,
      entityType: 'TICKET',
      action: 'UPDATE',
      entityId: ticket.id,
      entityName: ticket.subject,
      description: `Ticket preso in carico: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${access.clientId}/tickets`,
    }).catch(() => {});
    this.notificationsService.notifyPreassessmentParticipants(ticket.preassessmentId, {
      type: 'ticket_updated',
      title: 'Ticket preso in carico',
      message: `Ticket preso in carico: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${access.clientId}/tickets`,
      metadata: { ticketId: ticket.id },
    }).catch(() => {});

    return saved;
  }

  async requestClose(ticketId: string, user: CheckupCurrentUserData) {
    if (user.ruolo === 'cliente') {
      throw new ForbiddenException('Solo lo studio può richiedere la chiusura');
    }
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket non trovato');

    await this.ensureAccess(ticket.preassessmentId, user);

    ticket.status = 'pending_close';
    ticket.closeRequestedById = user.id;
    ticket.closeRequestedAt = new Date();
    const saved = await this.ticketRepository.save(ticket);

    // Notifica cliente
    this.userRepository.findOne({ where: { id: ticket.createdById } }).then((cliente) => {
      if (cliente) {
        this.mailService.sendMail({
          to: cliente.email,
          subject: `[Checkup] Richiesta chiusura ticket: ${ticket.subject}`,
          html: `<p>Lo studio ha richiesto la chiusura del ticket <strong>${ticket.subject}</strong>.</p>
                 <p>Accedi alla piattaforma per confermare la chiusura o rispondere con ulteriori informazioni.</p>
                 ${this.mailService.signature()}`,
        });
      }
    }).catch(() => {/* silenzioso */});

    const access = await this.ensureAccess(ticket.preassessmentId, user);
    this.logNotificationEvent({
      preassessmentId: ticket.preassessmentId,
      user,
      entityType: 'TICKET',
      action: 'UPDATE',
      entityId: ticket.id,
      entityName: ticket.subject,
      description: `Richiesta chiusura ticket: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${access.clientId}/tickets`,
    }).catch(() => {});
    this.notificationsService.notifyPreassessmentParticipants(ticket.preassessmentId, {
      type: 'ticket_updated',
      title: 'Richiesta chiusura ticket',
      message: `Richiesta chiusura ticket: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${access.clientId}/tickets`,
      metadata: { ticketId: ticket.id },
    }).catch(() => {});

    return saved;
  }

  async confirmClose(ticketId: string, user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente') {
      throw new ForbiddenException('Solo il cliente può confermare la chiusura');
    }
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket non trovato');

    await this.ensureAccess(ticket.preassessmentId, user);

    if (ticket.status !== 'pending_close') {
      throw new ForbiddenException('Chiusura non richiesta');
    }

    ticket.status = 'closed';
    ticket.closedById = user.id;
    ticket.closedAt = new Date();
    const saved = await this.ticketRepository.save(ticket);

    // Notifica assignee (o tutti gli admin se non assegnato)
    const notifyAdmin = async () => {
      if (ticket.assignedToId) {
        const admin = await this.userRepository.findOne({ where: { id: ticket.assignedToId } });
        if (admin) {
          this.mailService.sendMail({
            to: admin.email,
            subject: `[Checkup] Ticket chiuso: ${ticket.subject}`,
            html: `<p>Il cliente ha confermato la chiusura del ticket <strong>${ticket.subject}</strong>.</p>
                   ${this.mailService.signature()}`,
          });
        }
      } else {
        const admins = await this.findAdminsForPreassessment(ticket.preassessmentId);
        admins.forEach((admin) => {
          this.mailService.sendMail({
            to: admin.email,
            subject: `[Checkup] Ticket chiuso: ${ticket.subject}`,
            html: `<p>Il cliente ha confermato la chiusura del ticket <strong>${ticket.subject}</strong>.</p>
                   ${this.mailService.signature()}`,
          });
        });
      }
    };
    notifyAdmin().catch(() => {/* silenzioso */});

    this.logNotificationEvent({
      preassessmentId: ticket.preassessmentId,
      user,
      entityType: 'TICKET',
      action: 'UPDATE',
      entityId: ticket.id,
      entityName: ticket.subject,
      description: `Ticket chiuso: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${user.clientId}/tickets`,
    }).catch(() => {});
    this.notificationsService.notifyPreassessmentParticipants(ticket.preassessmentId, {
      type: 'ticket_updated',
      title: 'Ticket chiuso',
      message: `Ticket chiuso: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${user.clientId}/tickets`,
      metadata: { ticketId: ticket.id },
    }, user).catch(() => {});

    return saved;
  }

  async reopenTicket(ticketId: string, user: CheckupCurrentUserData) {
    if (user.ruolo === 'cliente') {
      throw new ForbiddenException('Solo lo studio può riaprire il ticket');
    }
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket non trovato');

    await this.ensureAccess(ticket.preassessmentId, user);

    ticket.status = 'in_progress';
    ticket.closeRequestedById = null;
    ticket.closeRequestedAt = null;
    ticket.closedById = null;
    ticket.closedAt = null;
    const saved = await this.ticketRepository.save(ticket);

    // Notifica cliente
    this.userRepository.findOne({ where: { id: ticket.createdById } }).then((cliente) => {
      if (cliente) {
        this.mailService.sendMail({
          to: cliente.email,
          subject: `[Checkup] Ticket riaperto: ${ticket.subject}`,
          html: `<p>Il ticket <strong>${ticket.subject}</strong> è stato riaperto dallo studio.</p>
                 ${this.mailService.signature()}`,
        });
      }
    }).catch(() => {/* silenzioso */});

    const access = await this.ensureAccess(ticket.preassessmentId, user);
    this.logNotificationEvent({
      preassessmentId: ticket.preassessmentId,
      user,
      entityType: 'TICKET',
      action: 'UPDATE',
      entityId: ticket.id,
      entityName: ticket.subject,
      description: `Ticket riaperto: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${access.clientId}/tickets`,
    }).catch(() => {});
    this.notificationsService.notifyPreassessmentParticipants(ticket.preassessmentId, {
      type: 'ticket_updated',
      title: 'Ticket riaperto',
      message: `Ticket riaperto: ${ticket.subject}`,
      actionUrl: `/checkup/clienti/${access.clientId}/tickets`,
      metadata: { ticketId: ticket.id },
    }).catch(() => {});

    return saved;
  }

  // ─── Alerts ────────────────────────────────────────────────────────────────

  /** Returns other active users that share the same clientId as the current user (cliente only). */
  async getCoParticipants(preassessmentId: string, user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente' || !user.clientId) return [];
    await this.ensureAccess(preassessmentId, user);
    const all = await this.userRepository.find({
      where: { clientId: user.clientId, ruolo: 'cliente', attivo: true },
      select: ['id', 'nome', 'cognome'],
    });
    return all.filter((p) => p.id !== user.id);
  }

  async listAlerts(preassessmentId: string, user: CheckupCurrentUserData) {
    await this.ensureAccess(preassessmentId, user);

    const qb = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.client', 'createdByClient')
      .leftJoinAndSelect('alert.targetUser', 'targetUser')
      .leftJoinAndSelect('targetUser.client', 'targetUserClient')
      .where('alert.preassessmentId = :preassessmentId', { preassessmentId });

    if (user.ruolo === 'cliente') {
      // Cliente vede: alert a lui destinati, oppure alert che ha creato lui stesso
      qb.andWhere(
        '(alert.targetUserId = :userId OR alert.createdById = :userId)',
        { userId: user.id },
      );
    } else {
      // Staff vede solo alert pubblici, alert creati da lui o alert esplicitamente diretti a lui.
      qb.andWhere(
        '(alert.targetUserId IS NULL OR alert.targetUserId = :userId OR alert.createdById = :userId)',
        { userId: user.id },
      );
    }

    return qb.orderBy('alert.createdAt', 'DESC').getMany();
  }

  async listAllAlerts(user: CheckupCurrentUserData, search?: string) {
    if (user.ruolo === 'cliente') {
      throw new ForbiddenException('Solo lo studio può consultare tutti gli alert');
    }

    const preassessments = await this.getAccessibleLatestPreassessmentsForStaff(user);
    if (preassessments.length === 0) return [];

    const preassessmentIds = preassessments.map((entry) => entry.id);
    const preassessmentById = new Map(preassessments.map((entry) => [entry.id, entry]));
    const normalizedSearch = search?.trim().toLowerCase();

    const qb = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.client', 'createdByClient')
      .leftJoinAndSelect('alert.targetUser', 'targetUser')
      .leftJoinAndSelect('targetUser.client', 'targetUserClient')
      .where('alert.preassessmentId IN (:...preassessmentIds)', { preassessmentIds })
      .andWhere('(alert.targetUserId IS NULL OR alert.targetUserId = :userId OR alert.createdById = :userId)', {
        userId: user.id,
      })
      .orderBy('alert.createdAt', 'DESC');

    const alerts = await qb.getMany();

    return alerts
      .map((alert) => {
        const pre = preassessmentById.get(alert.preassessmentId);
        const clientName = pre?.client?.ragioneSociale || pre?.client?.nome || 'Cliente';
        return {
          ...alert,
          client: {
            id: pre?.clientId ?? null,
            nome: pre?.client?.nome ?? null,
            ragioneSociale: pre?.client?.ragioneSociale ?? null,
            label: clientName,
            preassessmentId: alert.preassessmentId,
          },
        };
      })
      .filter((alert) => {
        if (!normalizedSearch) return true;
        const haystack = [
          alert.messaggio,
          alert.createdBy ? `${alert.createdBy.nome} ${alert.createdBy.cognome}` : '',
          alert.createdBy?.email ?? '',
          alert.targetUser ? `${alert.targetUser.nome} ${alert.targetUser.cognome}` : '',
          alert.targetUser?.email ?? '',
          alert.client?.label ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }

  async createAlert(
    preassessmentId: string,
    dto: CreatePreassessmentAlertDto,
    user: CheckupCurrentUserData,
  ) {
    const { pre: _pre, clientId } = await this.ensureAccess(preassessmentId, user);

    let targetUserId: string | null = null;

    if (user.ruolo !== 'cliente') {
      // Staff (admin_studio, segreteria, collaboratore) can create alerts
      if (dto.targetUserId) {
        if (dto.targetUserId === user.id) {
          // Self-target = private reminder
          targetUserId = user.id;
        } else {
          // Try by CheckupUser.id first; fallback to CheckupClient.id (sent by frontend's getClient)
          let target = await this.userRepository.findOne({ where: { id: dto.targetUserId, attivo: true } });
          if (!target) {
            target = await this.userRepository.findOne({ where: { clientId: dto.targetUserId, ruolo: 'cliente', attivo: true } });
          }
          if (!target) throw new ForbiddenException('Destinatario non valido');

          if (target.ruolo === 'cliente') {
            // Alert directed to the client — validate sublicense access
            if (!target.clientId) throw new ForbiddenException('Destinatario non valido');
            if (!user.studioId) throw new ForbiddenException('Destinatario non valido');
            const license = await this.licenseRepository.findOne({ where: { studioId: user.studioId } });
            if (!license) throw new ForbiddenException('Destinatario non valido');
            const sublicense = await this.sublicenseRepository.findOne({
              where: { licenseId: license.id, clientId: target.clientId, attiva: true },
            });
            if (!sublicense) throw new ForbiddenException('Destinatario non valido');
            if (target.clientId !== clientId) throw new ForbiddenException('Alert non coerente con il checkup selezionato');
            targetUserId = target.id;
          } else {
            // Alert directed to a studio colleague — must be in the same studio
            if (!user.studioId || target.studioId !== user.studioId) {
              throw new ForbiddenException('Destinatario non valido: collega non appartenente allo stesso studio');
            }
            targetUserId = target.id;
          }
        }
      } else {
        targetUserId = null;
      }
    } else if (user.ruolo === 'cliente') {
      if (dto.targetUserId) {
        if (dto.targetUserId === user.id) {
          // Self-target = private reminder
          targetUserId = user.id;
        } else {
          if (!user.clientId) {
            throw new ForbiddenException('Il cliente può targetizzare solo utenti del proprio sublicenziatario o dello studio collegato');
          }
          const target = await this.userRepository.findOne({ where: { id: dto.targetUserId, attivo: true } });
          if (!target) {
            throw new ForbiddenException('Destinatario non valido');
          }
          if (target.ruolo === 'cliente') {
            if (target.clientId !== user.clientId) {
              throw new ForbiddenException('Il cliente può targetizzare solo se stesso o altri partecipanti del proprio account');
            }
            targetUserId = target.id;
          } else {
            const currentSublicense = await this.sublicenseRepository.findOne({
              where: { clientId: user.clientId, attiva: true },
              relations: ['license'],
            });
            if (!currentSublicense?.license?.studioId || target.studioId !== currentSublicense.license.studioId) {
              throw new ForbiddenException('Il cliente può targetizzare solo i consulenti del proprio studio licenziatario');
            }
            targetUserId = target.id;
          }
        }
      } else {
        targetUserId = null;
      }
    }

    const alert = this.alertRepository.create({
      preassessmentId,
      createdById: user.id,
      targetUserId,
      priority: dto.priority || 'info',
      messaggio: dto.messaggio,
      stato: 'aperto',
      dataScadenza: dto.dataScadenza ? new Date(dto.dataScadenza) : null,
      preavvisoGiorni: dto.preavvisoGiorni ?? null,
    });

    const saved = await this.alertRepository.save(alert);
    const result = await this.alertRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'targetUser'],
    });

    // Notifica email
    const priorityLabel = dto.priority === 'urgent' ? '🔴 URGENTE' : dto.priority === 'warning' ? '⚠️ Attenzione' : 'ℹ️ Info';
    const emailBody = `<p>Hai ricevuto un nuovo alert con priorità <strong>${priorityLabel}</strong>.</p>
                       <blockquote style="border-left:3px solid #4f46e5;padding:8px 12px;margin:12px 0;color:#475569;">${dto.messaggio}</blockquote>
                       ${this.mailService.signature()}`;

    if (targetUserId) {
      // Alert per un utente specifico
      this.userRepository.findOne({ where: { id: targetUserId } }).then((target) => {
        if (target) {
          this.mailService.sendMail({
            to: target.email,
            subject: `[Checkup] Nuovo alert: ${priorityLabel}`,
            html: emailBody,
          });
        }
      }).catch(() => {/* silenzioso */});
    } else {
      // Alert per lo studio (tutti gli admin)
      const notifyAdmins = async () => {
        if (user.ruolo === 'admin_studio' && user.studioId) {
          const admins = await this.findAdminsByStudio(user.studioId);
          admins.forEach((a) => {
            if (a.id !== user.id) { // non notificare chi ha creato l'alert
              this.mailService.sendMail({ to: a.email, subject: `[Checkup] Nuovo alert: ${priorityLabel}`, html: emailBody });
            }
          });
        } else {
          const admins = await this.findAdminsForPreassessment(preassessmentId);
          admins.forEach((a) => {
            this.mailService.sendMail({ to: a.email, subject: `[Checkup] Nuovo alert: ${priorityLabel}`, html: emailBody });
          });
        }
      };
      notifyAdmins().catch(() => {/* silenzioso */});
    }

    this.logNotificationEvent({
      preassessmentId,
      user,
      entityType: 'ALERT',
      action: 'CREATE',
      entityId: saved.id,
      description: `Nuovo alert ${dto.priority || 'info'}: ${dto.messaggio}`,
      priority: dto.priority || 'info',
      actionUrl: `/checkup/clienti/${clientId}/alerts`,
    }).catch(() => {});

    return result;
  }

  async updateAlert(
    alertId: string,
    dto: UpdatePreassessmentAlertDto,
    user: CheckupCurrentUserData,
  ) {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
      relations: ['createdBy', 'targetUser'],
    });
    if (!alert) throw new NotFoundException('Alert non trovato');
    if (alert.createdById !== user.id) throw new ForbiddenException('Solo il creatore può modificare l\'alert');
    if (alert.stato !== 'aperto') throw new ForbiddenException('Non è possibile modificare un alert chiuso o scaduto');

    if (dto.priority !== undefined) alert.priority = dto.priority;
    if (dto.messaggio !== undefined) alert.messaggio = dto.messaggio;
    if (dto.dataScadenza !== undefined) {
      alert.dataScadenza = dto.dataScadenza ? new Date(dto.dataScadenza) : null;
    }
    if (dto.preavvisoGiorni !== undefined) {
      alert.preavvisoGiorni = dto.preavvisoGiorni ?? null;
    }

    const saved = await this.alertRepository.save(alert);
    this.logNotificationEvent({
      preassessmentId: alert.preassessmentId,
      user,
      entityType: 'ALERT',
      action: 'UPDATE',
      entityId: alert.id,
      description: `Alert aggiornato: ${alert.messaggio}`,
      priority: alert.priority,
      actionUrl: `/checkup/clienti/${(await this.ensureAccess(alert.preassessmentId, user)).clientId}/alerts`,
    }).catch(() => {});
    return saved;
  }

  async closeAlert(alertId: string, user: CheckupCurrentUserData) {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Alert non trovato');
    if (alert.stato === 'chiuso') throw new ForbiddenException('Alert già chiuso');

    await this.ensureAccess(alert.preassessmentId, user);

    const canClose =
      user.ruolo !== 'cliente'
      || alert.createdById === user.id
      || alert.targetUserId === user.id;
    if (!canClose) {
      throw new ForbiddenException('Puoi chiudere solo alert creati da te o assegnati a te');
    }

    alert.stato = 'chiuso';
    const saved = await this.alertRepository.save(alert);
    this.logNotificationEvent({
      preassessmentId: alert.preassessmentId,
      user,
      entityType: 'ALERT',
      action: 'UPDATE',
      entityId: alert.id,
      description: `Alert chiuso: ${alert.messaggio}`,
      priority: alert.priority,
      actionUrl: `/checkup/clienti/${(await this.ensureAccess(alert.preassessmentId, user)).clientId}/alerts`,
    }).catch(() => {});
    return saved;
  }

  async deleteAlert(alertId: string, user: CheckupCurrentUserData) {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Alert non trovato');
    if (alert.createdById !== user.id) throw new ForbiddenException('Solo il creatore può eliminare l\'alert');

    await this.alertRepository.delete(alertId);
  }

  // ─── Expiring alerts (for toast notification) ──────────────────────────────

  private isAlertInWarningWindow(alert: CheckupPreassessmentAlert): boolean {
    if (!alert.dataScadenza || !alert.preavvisoGiorni) return false;
    const now = Date.now();
    const expiry = new Date(alert.dataScadenza).getTime();
    const warnMs = alert.preavvisoGiorni * 24 * 60 * 60 * 1000;
    return expiry > now && expiry - now <= warnMs;
  }

  async getExpiringAlerts(user: CheckupCurrentUserData): Promise<CheckupPreassessmentAlert[]> {
    let alerts: CheckupPreassessmentAlert[];

    if (user.ruolo === 'cliente' && user.clientId) {
      const pre = await this.preassessmentRepository.findOne({
        where: { clientId: user.clientId, isLatest: true },
      });
      if (!pre) return [];
      alerts = await this.alertRepository.find({
        where: { preassessmentId: pre.id, stato: 'aperto', taciuto: false, archiviato: false },
      });
    } else {
      // Staff: only self-targeted private alerts
      alerts = await this.alertRepository.find({
        where: { targetUserId: user.id, stato: 'aperto', taciuto: false, archiviato: false },
      });
    }

    return alerts.filter((a) => this.isAlertInWarningWindow(a));
  }

  // ─── Archive ───────────────────────────────────────────────────────────────

  async archiveAlert(alertId: string, user: CheckupCurrentUserData) {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Alert non trovato');
    if (alert.stato === 'aperto') throw new ForbiddenException('Solo alert chiusi o scaduti possono essere archiviati');
    await this.ensureAccess(alert.preassessmentId, user);
    alert.archiviato = true;
    const saved = await this.alertRepository.save(alert);
    this.logNotificationEvent({
      preassessmentId: alert.preassessmentId,
      user,
      entityType: 'ALERT',
      action: 'UPDATE',
      entityId: alert.id,
      description: `Alert archiviato: ${alert.messaggio}`,
      priority: alert.priority,
      actionUrl: `/checkup/clienti/${(await this.ensureAccess(alert.preassessmentId, user)).clientId}/alerts`,
    }).catch(() => {});
    return saved;
  }

  async archiveTicket(ticketId: string, user: CheckupCurrentUserData) {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket non trovato');
    if (ticket.status !== 'closed') throw new ForbiddenException('Solo i ticket chiusi possono essere archiviati');
    await this.ensureAccess(ticket.preassessmentId, user);
    ticket.archiviato = true;
    return this.ticketRepository.save(ticket);
  }

  async muteAlert(alertId: string, user: CheckupCurrentUserData) {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Alert non trovato');
    await this.ensureAccess(alert.preassessmentId, user);
    alert.taciuto = true;
    return this.alertRepository.save(alert);
  }

  async restoreAlert(alertId: string, user: CheckupCurrentUserData) {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Alert non trovato');
    await this.ensureAccess(alert.preassessmentId, user);
    alert.taciuto = false;
    return this.alertRepository.save(alert);
  }

  async listChatConversations(user: CheckupCurrentUserData, search?: string) {
    if (user.ruolo === 'cliente') {
      throw new ForbiddenException('Solo lo studio può consultare l’elenco chat');
    }

    const preassessments = await this.getAccessibleLatestPreassessmentsForStaff(user);
    if (preassessments.length === 0) return [];

    const preassessmentIds = preassessments.map((entry) => entry.id);
    const [clientUsers, messages, unreadRows] = await Promise.all([
      this.userRepository.find({
        where: { clientId: In(preassessments.map((entry) => entry.clientId)), ruolo: 'cliente', attivo: true },
        select: ['id', 'clientId', 'nome', 'cognome', 'email', 'azienda'],
      }),
      this.chatMessageRepository.find({
        where: { preassessmentId: In(preassessmentIds), sectionId: 'general' },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      }),
      this.chatMessageRepository
        .createQueryBuilder('m')
        .select('m.preassessmentId', 'preassessmentId')
        .addSelect('COUNT(*)', 'count')
        .where('m.preassessmentId IN (:...preassessmentIds)', { preassessmentIds })
        .andWhere('m.sectionId = :sectionId', { sectionId: 'general' })
        .andWhere('m.letto = false')
        .andWhere('m.userId != :userId', { userId: user.id })
        .groupBy('m.preassessmentId')
        .getRawMany<{ preassessmentId: string; count: string }>(),
    ]);

    const unreadByPre = new Map(unreadRows.map((row) => [row.preassessmentId, Number(row.count)]));
    const latestMessageByPre = new Map<string, CheckupPreassessmentMessage>();
    messages.forEach((message) => {
      if (!latestMessageByPre.has(message.preassessmentId)) {
        latestMessageByPre.set(message.preassessmentId, message);
      }
    });
    const primaryUserByClient = new Map<string, CheckupUser>();
    clientUsers.forEach((entry) => {
      if (!primaryUserByClient.has(entry.clientId!)) {
        primaryUserByClient.set(entry.clientId!, entry);
      }
    });

    const normalizedSearch = search?.trim().toLowerCase();
    return preassessments
      .map((pre) => {
        const primaryUser = primaryUserByClient.get(pre.clientId);
        const clientLabel = pre.client?.ragioneSociale || primaryUser?.azienda || pre.client?.nome || `${primaryUser?.nome ?? ''} ${primaryUser?.cognome ?? ''}`.trim() || 'Cliente';
        const lastMessage = latestMessageByPre.get(pre.id);
        return {
          preassessmentId: pre.id,
          clientId: pre.clientId,
          clientLabel,
          participant: primaryUser
            ? {
                id: primaryUser.id,
                nome: primaryUser.nome,
                cognome: primaryUser.cognome,
                email: primaryUser.email,
                azienda: primaryUser.azienda ?? pre.client?.ragioneSociale ?? pre.client?.nome ?? null,
              }
            : null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                messaggio: lastMessage.messaggio,
                createdAt: lastMessage.createdAt,
                user: {
                  id: lastMessage.user.id,
                  nome: lastMessage.user.nome,
                  cognome: lastMessage.user.cognome,
                  ruolo: lastMessage.user.ruolo,
                },
              }
            : null,
          unreadCount: unreadByPre.get(pre.id) ?? 0,
        };
      })
      .filter((entry) => {
        if (!normalizedSearch) return true;
        const haystack = [
          entry.clientLabel,
          entry.participant ? `${entry.participant.nome} ${entry.participant.cognome}` : '',
          entry.participant?.email ?? '',
          entry.participant?.azienda ?? '',
          entry.lastMessage?.messaggio ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }

  /** Cron: ogni notte alle 2:00 segna come 'scaduto' gli alert aperti con dataScadenza passata */
  @Cron('0 2 * * *')
  async expireAlerts() {
    const result = await this.alertRepository.update(
      {
        stato: 'aperto',
        dataScadenza: LessThan(new Date()),
      },
      { stato: 'scaduto' },
    );
    if ((result.affected ?? 0) > 0) {
      this.logger.log(`Alert scaduti: ${result.affected} alert marcati come 'scaduto'`);
    }
  }

  /** Cron: ogni mattina alle 8:00 invia email di preavviso scadenza alert */
  @Cron('0 8 * * *')
  async sendPreavvisoNotifications() {
    const now = new Date();
    const alerts = await this.alertRepository.find({
      where: { stato: 'aperto', taciuto: false },
      relations: ['targetUser', 'createdBy'],
    });

    for (const alert of alerts) {
      if (!alert.dataScadenza || !alert.preavvisoGiorni) continue;
      const expiry = new Date(alert.dataScadenza).getTime();
      const warnMs = alert.preavvisoGiorni * 24 * 60 * 60 * 1000;
      const nowMs = now.getTime();
      const isInWindow = expiry > nowMs && expiry - nowMs <= warnMs;
      if (!isInWindow) continue;

      const recipient = (alert.targetUser as any) || (alert.createdBy as any);
      const email: string | undefined = recipient?.email;
      if (!email) continue;

      const scadeIl = new Date(alert.dataScadenza).toLocaleDateString('it-IT', { dateStyle: 'medium' });
      this.mailService.sendMail({
        to: email,
        subject: `[Checkup] Promemoria: alert in scadenza il ${scadeIl}`,
        html: `<p>Ti ricordiamo che un alert è in prossima scadenza.</p>
               <p style="background:#f8fafc;padding:10px 14px;border-radius:6px;border-left:3px solid #f59e0b;margin:12px 0;">
                 ${alert.messaggio}
               </p>
               <p style="color:#64748b;font-size:13px;">Scade il <strong>${scadeIl}</strong></p>
               ${this.mailService.signature()}`,
      });
    }
  }
}
