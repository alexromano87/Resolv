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
      if (pre.userId !== user.id) {
        throw new ForbiddenException('Non autorizzato');
      }
      return { pre, client: null };
    }

    if (!user.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
    const client = await this.userRepository.findOne({
      where: { id: pre.userId, attivo: true },
      relations: ['client'],
    });
    if (!client || !client.clientId) {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.licenseRepository.findOne({ where: { studioId: user.studioId } });
    if (!license) {
      throw new ForbiddenException('Non autorizzato');
    }
    const sublicense = await this.sublicenseRepository.findOne({
      where: { licenseId: license.id, clientId: client.clientId, attiva: true },
    });
    if (!sublicense) {
      throw new ForbiddenException('Non autorizzato');
    }

    return { pre, client };
  }

  async listTickets(preassessmentId: string, user: CheckupCurrentUserData) {
    await this.ensureAccess(preassessmentId, user);
    const tickets = await this.ticketRepository.find({
      where: { preassessmentId },
      relations: ['createdBy', 'messages', 'messages.user'],
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

    const { client } = await this.ensureAccess(preassessmentId, user);

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
      targetUserId = target.id;
    }

    if (client && dto.targetUserId && client.id !== dto.targetUserId) {
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
