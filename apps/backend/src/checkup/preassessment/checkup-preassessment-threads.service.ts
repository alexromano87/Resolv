import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type Redis from 'ioredis';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupPreassessmentTicket } from './checkup-preassessment-ticket.entity';
import { CheckupPreassessmentTicketMessage } from './checkup-preassessment-ticket-message.entity';
import { CheckupPreassessmentAlert } from './checkup-preassessment-alert.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CreatePreassessmentTicketDto } from './dto/create-preassessment-ticket.dto';
import { ReplyPreassessmentTicketDto } from './dto/reply-preassessment-ticket.dto';
import { CreatePreassessmentAlertDto } from './dto/create-preassessment-alert.dto';
import { CheckupMailService } from '../mail/checkup-mail.service';

const SEEN_TTL = 30 * 24 * 60 * 60; // 30 giorni in secondi

@Injectable()
export class CheckupPreassessmentThreadsService {
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
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
    private readonly mailService: CheckupMailService,
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

  async getUnreadCounts(userId: string, preassessmentId: string): Promise<{ tickets: number; alerts: number }> {
    const [ticketsSeen, alertsSeen] = await Promise.all([
      this.redis.get(this.seenKey('tickets', userId, preassessmentId)),
      this.redis.get(this.seenKey('alerts', userId, preassessmentId)),
    ]);

    const countAfter = async (
      repo: Repository<any>,
      field: string,
      since: string | null,
    ): Promise<number> => {
      const qb = repo.createQueryBuilder('e').where(`e.${field} = :pid`, { pid: preassessmentId });
      if (since) {
        qb.andWhere('e.updatedAt > :since', { since: new Date(since) });
      }
      return qb.getCount();
    };

    const [tickets, alerts] = await Promise.all([
      countAfter(this.ticketRepository, 'preassessmentId', ticketsSeen),
      countAfter(this.alertRepository, 'preassessmentId', alertsSeen),
    ]);

    return { tickets, alerts };
  }

  async markSeen(userId: string, preassessmentId: string, type: 'tickets' | 'alerts'): Promise<void> {
    await this.redis.set(this.seenKey(type, userId, preassessmentId), new Date().toISOString(), 'EX', SEEN_TTL);
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

    return saved;
  }

  // ─── Alerts ────────────────────────────────────────────────────────────────

  async listAlerts(preassessmentId: string, user: CheckupCurrentUserData) {
    await this.ensureAccess(preassessmentId, user);

    const qb = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.createdBy', 'createdBy')
      .leftJoinAndSelect('alert.targetUser', 'targetUser')
      .where('alert.preassessmentId = :preassessmentId', { preassessmentId });

    if (user.ruolo === 'cliente') {
      qb.andWhere(
        '(alert.targetUserId = :userId OR alert.createdById = :userId)',
        { userId: user.id },
      );
    }

    return qb.orderBy('alert.createdAt', 'DESC').getMany();
  }

  async createAlert(
    preassessmentId: string,
    dto: CreatePreassessmentAlertDto,
    user: CheckupCurrentUserData,
  ) {
    const { pre: _pre, clientId } = await this.ensureAccess(preassessmentId, user);

    let targetUserId: string | null;

    if (user.ruolo === 'admin_studio') {
      if (dto.targetUserId) {
        const target = await this.userRepository.findOne({ where: { id: dto.targetUserId, attivo: true } });
        if (!target || target.ruolo !== 'cliente' || !target.clientId) {
          throw new ForbiddenException('Destinatario non valido');
        }
        if (!user.studioId) {
          throw new ForbiddenException('Destinatario non valido');
        }
        const license = await this.licenseRepository.findOne({ where: { studioId: user.studioId } });
        if (!license) {
          throw new ForbiddenException('Destinatario non valido');
        }
        const sublicense = await this.sublicenseRepository.findOne({
          where: { licenseId: license.id, clientId: target.clientId, attiva: true },
        });
        if (!sublicense) {
          throw new ForbiddenException('Destinatario non valido');
        }
        if (target.clientId !== clientId) {
          throw new ForbiddenException('Alert non coerente con il checkup selezionato');
        }
        targetUserId = target.id;
      } else {
        targetUserId = null;
      }
    } else if (user.ruolo === 'cliente') {
      if (dto.targetUserId) {
        if (dto.targetUserId !== user.id) {
          throw new ForbiddenException('Il cliente può targetizzare solo se stesso');
        }
        targetUserId = user.id;
      } else {
        targetUserId = null;
      }
    } else {
      throw new ForbiddenException('Non autorizzato');
    }

    const alert = this.alertRepository.create({
      preassessmentId,
      createdById: user.id,
      targetUserId,
      priority: dto.priority || 'info',
      messaggio: dto.messaggio,
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

    return result;
  }
}
