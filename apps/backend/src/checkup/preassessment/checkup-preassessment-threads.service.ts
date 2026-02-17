import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

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
    return this.ticketRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'messages', 'messages.user'],
    });
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
    return this.ticketMessageRepository.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
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
    return this.ticketRepository.save(ticket);
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
    return this.ticketRepository.save(ticket);
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
    return this.ticketRepository.save(ticket);
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
    return this.ticketRepository.save(ticket);
  }

  async listAlerts(preassessmentId: string, user: CheckupCurrentUserData) {
    await this.ensureAccess(preassessmentId, user);

    const qb = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.createdBy', 'createdBy')
      .leftJoinAndSelect('alert.targetUser', 'targetUser')
      .where('alert.preassessmentId = :preassessmentId', { preassessmentId });

    if (user.ruolo === 'cliente') {
      qb.andWhere('alert.targetUserId = :userId', { userId: user.id });
    }

    return qb.orderBy('alert.createdAt', 'DESC').getMany();
  }

  async createAlert(
    preassessmentId: string,
    dto: CreatePreassessmentAlertDto,
    user: CheckupCurrentUserData,
  ) {
    if (user.ruolo !== 'admin_studio') {
      throw new ForbiddenException('Solo l\'admin studio può inviare alert');
    }

    const { pre, clientId } = await this.ensureAccess(preassessmentId, user);

    let targetUserId = dto.targetUserId || user.id;
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
    }
    if (!dto.targetUserId && user.clientId && user.clientId !== clientId) {
      throw new ForbiddenException('Alert non coerente con il checkup selezionato');
    }

    const alert = this.alertRepository.create({
      preassessmentId,
      createdById: user.id,
      targetUserId,
      priority: dto.priority || 'info',
      messaggio: dto.messaggio,
    });

    const saved = await this.alertRepository.save(alert);
    return this.alertRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy', 'targetUser'],
    });
  }
}
