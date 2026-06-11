import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupPreassessment } from '../preassessment/checkup-preassessment.entity';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupNotification, type CheckupNotificationType } from './checkup-notification.entity';

interface CreateNotificationPayload {
  type: CheckupNotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  preassessmentId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, any> | null;
}

interface NotifyOwnerMacrosOptions {
  macroIds: string[];
}

@Injectable()
export class CheckupNotificationsService {
  constructor(
    @InjectRepository(CheckupNotification)
    private readonly notificationRepository: Repository<CheckupNotification>,
    @InjectRepository(CheckupPreassessment)
    private readonly preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupClient)
    private readonly clientRepository: Repository<CheckupClient>,
    @InjectRepository(CheckupUser)
    private readonly userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private readonly licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private readonly sublicenseRepository: Repository<CheckupSublicense>,
  ) {}

  private actorName(actor?: CheckupCurrentUserData | null) {
    if (!actor) return null;
    return `${actor.nome || ''} ${actor.cognome || ''}`.trim() || actor.email;
  }

  async notifyUsers(userIds: string[], payload: CreateNotificationPayload, actor?: CheckupCurrentUserData | null) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean))).filter((id) => id !== actor?.id);
    if (!uniqueUserIds.length) return [];

    const rows = uniqueUserIds.map((userId) => this.notificationRepository.create({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      actionUrl: payload.actionUrl ?? null,
      preassessmentId: payload.preassessmentId ?? null,
      clientId: payload.clientId ?? null,
      clientName: payload.clientName ?? null,
      actorId: payload.actorId ?? actor?.id ?? null,
      actorName: payload.actorName ?? this.actorName(actor),
      metadata: payload.metadata ?? null,
    }));
    return this.notificationRepository.save(rows);
  }

  async notifyPreassessmentParticipants(
    preassessmentId: string,
    payload: Omit<CreateNotificationPayload, 'preassessmentId' | 'clientId' | 'clientName'> & {
      clientId?: string | null;
      clientName?: string | null;
    },
    actor?: CheckupCurrentUserData | null,
  ) {
    const pre = await this.preassessmentRepository.findOne({ where: { id: preassessmentId } });
    if (!pre) return [];

    const client = await this.clientRepository.findOne({ where: { id: pre.clientId } });
    const clientName = payload.clientName || client?.ragioneSociale || client?.nome || 'Cliente';

    const clientUsers = await this.userRepository.find({
      where: { clientId: pre.clientId, attivo: true },
      select: ['id'],
    });

    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId: pre.clientId, attiva: true },
    });
    const license = sublicense
      ? await this.licenseRepository.findOne({ where: { id: sublicense.licenseId } })
      : null;
    const staffUsers = license?.studioId
      ? await this.userRepository.find({
          where: { studioId: license.studioId, attivo: true },
          select: ['id'],
        })
      : [];

    return this.notifyUsers(
      [...clientUsers, ...staffUsers].map((user) => user.id),
      {
        ...payload,
        preassessmentId,
        clientId: pre.clientId,
        clientName,
      },
      actor,
    );
  }

  async notifyPreassessmentOwnerMacros(
    preassessmentId: string,
    payload: Omit<CreateNotificationPayload, 'preassessmentId' | 'clientId' | 'clientName'> & {
      clientId?: string | null;
      clientName?: string | null;
    },
    options: NotifyOwnerMacrosOptions,
    actor?: CheckupCurrentUserData | null,
  ) {
    const pre = await this.preassessmentRepository.findOne({ where: { id: preassessmentId } });
    if (!pre) return [];

    const client = await this.clientRepository.findOne({ where: { id: pre.clientId } });
    const clientName = payload.clientName || client?.ragioneSociale || client?.nome || 'Cliente';
    const macroIds = new Set(options.macroIds.filter(Boolean));
    if (macroIds.size === 0) return [];

    const ownerUsers = await this.userRepository.find({
      where: {
        clientId: pre.clientId,
        ruolo: 'cliente',
        attivo: true,
      },
      select: ['id', 'macroAreaOwner', 'superOwner'],
    });

    const recipients = ownerUsers.filter((user) => {
      if (user.superOwner) return true;
      return (user.macroAreaOwner || []).some((macroId) => macroIds.has(macroId));
    });

    return this.notifyUsers(
      recipients.map((user) => user.id),
      {
        ...payload,
        preassessmentId,
        clientId: pre.clientId,
        clientName,
      },
      actor,
    );
  }

  async listForUser(
    userId: string,
    params: { page?: number; limit?: number; query?: string; type?: CheckupNotificationType; read?: 'read' | 'unread' } = {},
  ) {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.deletedAt IS NULL');

    const query = params.query?.trim().toLowerCase();
    if (query) {
      qb.andWhere(
        `(LOWER(notification.title) LIKE :query
          OR LOWER(notification.message) LIKE :query
          OR LOWER(COALESCE(notification.clientName, '')) LIKE :query
          OR LOWER(COALESCE(notification.actorName, '')) LIKE :query)`,
        { query: `%${query}%` },
      );
    }

    if (params.type) {
      qb.andWhere('notification.type = :type', { type: params.type });
    }

    if (params.read === 'read') {
      qb.andWhere('notification.readAt IS NOT NULL');
    } else if (params.read === 'unread') {
      qb.andWhere('notification.readAt IS NULL');
    }

    qb.orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async countForUser(userId: string) {
    const count = await this.notificationRepository.count({
      where: { userId, readAt: IsNull(), deletedAt: IsNull() },
    });
    return { count };
  }

  async markReadForUser(userId: string, notificationId: string) {
    const result = await this.notificationRepository.update(
      { id: notificationId, userId, deletedAt: IsNull() },
      { readAt: new Date() },
    );
    return { success: true, updatedCount: result.affected ?? 0 };
  }

  async markManyReadForUser(userId: string, ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return { success: true, updatedCount: 0 };
    const result = await this.notificationRepository.update(
      { id: In(uniqueIds), userId, deletedAt: IsNull() },
      { readAt: new Date() },
    );
    return { success: true, updatedCount: result.affected ?? 0 };
  }

  async markAllReadForUser(userId: string) {
    const result = await this.notificationRepository.update(
      { userId, readAt: IsNull(), deletedAt: IsNull() },
      { readAt: new Date() },
    );
    return { success: true, updatedCount: result.affected ?? 0 };
  }

  async deleteForUser(userId: string, notificationId: string) {
    const result = await this.notificationRepository.softDelete({ id: notificationId, userId });
    return { success: true, deletedCount: result.affected ?? 0 };
  }

  async deleteManyForUser(userId: string, ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return { success: true, deletedCount: 0 };
    const result = await this.notificationRepository.softDelete({ id: In(uniqueIds), userId });
    return { success: true, deletedCount: result.affected ?? 0 };
  }
}
