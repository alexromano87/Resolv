import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupPreassessment } from '../preassessment/checkup-preassessment.entity';
import { CheckupPreassessmentDocument } from '../preassessment/checkup-preassessment-document.entity';
import { CheckupPreassessmentTicket } from '../preassessment/checkup-preassessment-ticket.entity';
import { CheckupPreassessmentAlert } from '../preassessment/checkup-preassessment-alert.entity';
import { CheckupMailService } from '../mail/checkup-mail.service';
import { CheckupAuditLog } from '../audit/checkup-audit-log.entity';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupNotificationsService } from '../notifications/checkup-notifications.service';
import { CheckupSystemNotificationState } from '../notifications/checkup-system-notification-state.entity';

export interface CheckupSystemNotificationItem {
  id: string;
  type: 'sezione_validata' | 'checkup_completato' | 'validazione_finale' | 'nuova_versione' | 'nota_cliente';
  title: string;
  message: string;
  createdAt: string;
  clientId: string | null;
  clientName: string | null;
  preassessmentId: string | null;
  actionUrl: string | null;
  actorName: string | null;
  priority: 'info' | 'warning' | 'urgent';
  readAt: string | null;
}

export interface CheckupSystemNotificationListResponse {
  items: CheckupSystemNotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface GetSystemNotificationsParams {
  studioId: string | null;
  userId: string;
  ruolo: CheckupUser['ruolo'];
  query?: string;
  type?: CheckupSystemNotificationItem['type'];
  read?: 'read' | 'unread';
  notificationId?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class CheckupMeService {
  constructor(
    @InjectRepository(CheckupUser)
    private readonly userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupPreassessment)
    private readonly preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupPreassessmentDocument)
    private readonly documentRepository: Repository<CheckupPreassessmentDocument>,
    @InjectRepository(CheckupPreassessmentTicket)
    private readonly ticketRepository: Repository<CheckupPreassessmentTicket>,
    @InjectRepository(CheckupPreassessmentAlert)
    private readonly alertRepository: Repository<CheckupPreassessmentAlert>,
    @InjectRepository(CheckupAuditLog)
    private readonly auditLogRepository: Repository<CheckupAuditLog>,
    @InjectRepository(CheckupSystemNotificationState)
    private readonly systemNotificationStateRepository: Repository<CheckupSystemNotificationState>,
    private readonly mailService: CheckupMailService,
    private readonly notificationsService: CheckupNotificationsService,
  ) {}

  async exportMyData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const preassessments = await this.preassessmentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const preassessmentIds = preassessments.map((p) => p.id);

    const documents = preassessmentIds.length
      ? await this.documentRepository
          .createQueryBuilder('d')
          .where('d.preassessmentId IN (:...ids)', { ids: preassessmentIds })
          .getMany()
      : [];

    const tickets = preassessmentIds.length
      ? await this.ticketRepository
          .createQueryBuilder('t')
          .where('t.preassessmentId IN (:...ids)', { ids: preassessmentIds })
          .getMany()
      : [];

    const alerts = preassessmentIds.length
      ? await this.alertRepository
          .createQueryBuilder('a')
          .where('a.preassessmentId IN (:...ids)', { ids: preassessmentIds })
          .getMany()
      : [];

    return {
      exportedAt: new Date().toISOString(),
      profile: user
        ? {
            id: user.id,
            email: user.email,
            nome: user.nome,
            cognome: user.cognome,
            azienda: user.azienda,
            ruolo: user.ruolo,
            createdAt: user.createdAt,
          }
        : null,
      preassessments: preassessments.map((p) => ({
        id: p.id,
        status: p.status,
        version: p.version,
        completedAt: p.completedAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        data: p.data,
        notes: p.notes,
      })),
      documents: documents.map((d) => ({
        id: d.id,
        nomeOriginale: d.nomeOriginale,
        tipo: d.tipo,
        estensione: d.estensione,
        uploadedAt: d.createdAt,
        fieldId: d.fieldId,
      })),
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt,
      })),
      alerts: alerts.map((a) => ({
        id: a.id,
        messaggio: a.messaggio,
        stato: a.stato,
        createdAt: a.createdAt,
      })),
    };
  }

  async requestDeletion(userId: string, userEmail: string, userName: string, studioAdminEmail?: string): Promise<void> {
    const to = studioAdminEmail || process.env.SMTP_FROM || userEmail;

    this.mailService.sendMail({
      to,
      subject: `Richiesta cancellazione dati — ${userName} (${userEmail})`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1e293b;">Richiesta di cancellazione dati personali</h2>
          <p>L'utente seguente ha richiesto la cancellazione dei propri dati dalla piattaforma Checkup:</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0;">
            <tr><td style="padding:8px;font-weight:600;color:#475569;">Nome</td><td style="padding:8px;">${userName}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:8px;font-weight:600;color:#475569;">Email</td><td style="padding:8px;">${userEmail}</td></tr>
            <tr><td style="padding:8px;font-weight:600;color:#475569;">ID utente</td><td style="padding:8px;font-family:monospace;">${userId}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:8px;font-weight:600;color:#475569;">Data richiesta</td><td style="padding:8px;">${new Date().toLocaleString('it-IT')}</td></tr>
          </table>
          <p style="color:#64748b;font-size:14px;">
            Ai sensi dell'art. 17 GDPR, la richiesta deve essere evasa entro 30 giorni.<br>
            Procedere con la cancellazione dei dati tramite il pannello amministrativo.
          </p>
          ${this.mailService.signature()}
        </div>
      `,
    });
  }

  async getSystemNotifications(params: GetSystemNotificationsParams): Promise<CheckupSystemNotificationListResponse> {
    if (params.ruolo === 'cliente' || !params.studioId) {
      throw new ForbiddenException('Accesso riservato allo staff del licenziatario');
    }

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const query = params.query?.trim();

    const qb = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoin(
        'checkup_system_notification_states',
        'state',
        'state.auditLogId = log.id AND state.userId = :userId',
        { userId: params.userId },
      )
      .where('log.studioId = :studioId', { studioId: params.studioId })
      .andWhere('log.success = true')
      .andWhere('log.entityType IN (:...entityTypes)', { entityTypes: ['PREASSESSMENT'] as const })
      .andWhere('state.deletedAt IS NULL');

    if (params.notificationId) {
      qb.andWhere('log.id = :notificationId', { notificationId: params.notificationId });
    }

    if (params.type) {
      this.applyTypeFilter(qb, params.type);
    }

    if (params.read === 'read') {
      qb.andWhere('state.readAt IS NOT NULL');
    } else if (params.read === 'unread') {
      qb.andWhere('state.readAt IS NULL');
    }

    if (query) {
      const like = `%${query.toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(COALESCE(log.description, '')) LIKE :like
          OR LOWER(COALESCE(log.entityName, '')) LIKE :like
          OR LOWER(COALESCE(log.userEmail, '')) LIKE :like
          OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(log.metadata, '$.clientName'))) LIKE :like
          OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(log.metadata, '$.actorName'))) LIKE :like)`,
        { like },
      );
    }

    const unreadCount = await qb.clone()
      .andWhere('state.readAt IS NULL')
      .getCount();

    qb.orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [logs, total] = await qb.getManyAndCount();
    const states = logs.length
      ? await this.systemNotificationStateRepository
          .createQueryBuilder('state')
          .withDeleted()
          .addSelect('state.deletedAt')
          .where('state.userId = :userId', { userId: params.userId })
          .andWhere('state.auditLogId IN (:...auditLogIds)', { auditLogIds: logs.map((log) => log.id) })
          .getMany()
      : [];
    const readAtByLogId = new Map(
      states
        .filter((state) => !state.deletedAt)
        .map((state) => [state.auditLogId, state.readAt ? state.readAt.toISOString() : null]),
    );
    const items = logs
      .map((log) => this.mapSystemNotification(log, readAtByLogId.get(log.id) ?? null))
      .filter((item): item is CheckupSystemNotificationItem => item !== null);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadCount,
    };
  }

  getNotifications(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      query?: string;
      type?: 'consultant_note' | 'client_note' | 'ticket_created' | 'ticket_updated' | 'chat_message' | 'direct_chat_message' | 'preassessment_section_validated' | 'preassessment_final_validated' | 'preassessment_reopened' | 'preassessment_new_version';
      read?: 'read' | 'unread';
    },
  ) {
    return this.notificationsService.listForUser(userId, params);
  }

  getNotificationsCount(userId: string) {
    return this.notificationsService.countForUser(userId);
  }

  markNotificationRead(userId: string, notificationId: string) {
    return this.notificationsService.markReadForUser(userId, notificationId);
  }

  markNotificationsRead(userId: string, ids: string[]) {
    return this.notificationsService.markManyReadForUser(userId, ids);
  }

  markAllNotificationsRead(userId: string) {
    return this.notificationsService.markAllReadForUser(userId);
  }

  async markSystemNotificationRead(currentUser: CheckupCurrentUserData, notificationId: string) {
    await this.ensureSystemNotificationAccess(currentUser, [notificationId]);
    await this.systemNotificationStateRepository.upsert({
      userId: currentUser.id,
      auditLogId: notificationId,
      readAt: new Date(),
      deletedAt: null,
    }, ['userId', 'auditLogId']);
    return { success: true, updatedCount: 1 };
  }

  async markSystemNotificationsRead(currentUser: CheckupCurrentUserData, ids: string[]) {
    const uniqueIds = await this.ensureSystemNotificationAccess(currentUser, ids);
    if (!uniqueIds.length) return { success: true, updatedCount: 0 };
    const now = new Date();
    await this.systemNotificationStateRepository.upsert(
      uniqueIds.map((id) => ({
        userId: currentUser.id,
        auditLogId: id,
        readAt: now,
        deletedAt: null,
      })),
      ['userId', 'auditLogId'],
    );
    return { success: true, updatedCount: uniqueIds.length };
  }

  async markAllSystemNotificationsRead(currentUser: CheckupCurrentUserData) {
    const ids = await this.getAccessibleSystemNotificationIds(currentUser);
    return this.markSystemNotificationsRead(currentUser, ids);
  }

  async deleteSystemNotification(currentUser: CheckupCurrentUserData, notificationId: string) {
    const [id] = await this.ensureSystemNotificationAccess(currentUser, [notificationId]);
    if (!id) return { success: true, deletedCount: 0 };
    await this.systemNotificationStateRepository.upsert({
      userId: currentUser.id,
      auditLogId: id,
      readAt: new Date(),
      deletedAt: new Date(),
    }, ['userId', 'auditLogId']);
    return { success: true, deletedCount: 1 };
  }

  async deleteSystemNotifications(currentUser: CheckupCurrentUserData, ids: string[]) {
    const uniqueIds = await this.ensureSystemNotificationAccess(currentUser, ids);
    if (!uniqueIds.length) return { success: true, deletedCount: 0 };
    const now = new Date();
    await this.systemNotificationStateRepository.upsert(
      uniqueIds.map((id) => ({
        userId: currentUser.id,
        auditLogId: id,
        readAt: now,
        deletedAt: now,
      })),
      ['userId', 'auditLogId'],
    );
    return { success: true, deletedCount: uniqueIds.length };
  }

  async deleteNotification(userId: string, notificationId: string) {
    await this.notificationsService.deleteForUser(userId, notificationId);
    return { ok: true };
  }

  async deleteNotifications(userId: string, ids: string[]) {
    await this.notificationsService.deleteManyForUser(userId, ids);
    return { ok: true };
  }

  private applyTypeFilter(
    qb: SelectQueryBuilder<CheckupAuditLog>,
    type: CheckupSystemNotificationItem['type'],
  ) {
    switch (type) {
      case 'sezione_validata':
        qb.andWhere('log.entityType = :preEntity', { preEntity: 'PREASSESSMENT' })
          .andWhere("(log.description LIKE 'Sezione validata:%' OR log.description LIKE 'Sezioni validate:%')");
        return;
      case 'checkup_completato':
        qb.andWhere('log.entityType = :preEntity', { preEntity: 'PREASSESSMENT' })
          .andWhere("log.description LIKE 'Checkup completato%'");
        return;
      case 'validazione_finale':
        qb.andWhere('log.entityType = :preEntity', { preEntity: 'PREASSESSMENT' })
          .andWhere("log.description LIKE 'Validazione finale checkup%'");
        return;
      case 'nuova_versione':
        qb.andWhere('log.entityType = :preEntity', { preEntity: 'PREASSESSMENT' })
          .andWhere("log.description LIKE 'Nuova versione del checkup%'");
        return;
      case 'nota_cliente':
        qb.andWhere('log.entityType = :preEntity', { preEntity: 'PREASSESSMENT' })
          .andWhere("log.description LIKE 'Nota cliente aggiornata%'");
        return;
    }
  }

  private async getAccessibleSystemNotificationIds(currentUser: CheckupCurrentUserData) {
    if (currentUser.ruolo === 'cliente' || !currentUser.studioId) {
      throw new ForbiddenException('Accesso riservato allo staff del licenziatario');
    }
    const logs = await this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoin(
        'checkup_system_notification_states',
        'state',
        'state.auditLogId = log.id AND state.userId = :userId',
        { userId: currentUser.id },
      )
      .where('log.studioId = :studioId', { studioId: currentUser.studioId })
      .andWhere('log.success = true')
      .andWhere('log.entityType = :entityType', { entityType: 'PREASSESSMENT' })
      .andWhere('state.deletedAt IS NULL')
      .select('log.id', 'id')
      .getRawMany<{ id: string }>();
    return logs.map((row) => row.id);
  }

  private async ensureSystemNotificationAccess(currentUser: CheckupCurrentUserData, ids: string[]) {
    if (currentUser.ruolo === 'cliente' || !currentUser.studioId) {
      throw new ForbiddenException('Accesso riservato allo staff del licenziatario');
    }
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return [];
    const logs = await this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.id IN (:...ids)', { ids: uniqueIds })
      .andWhere('log.studioId = :studioId', { studioId: currentUser.studioId })
      .andWhere('log.success = true')
      .andWhere('log.entityType = :entityType', { entityType: 'PREASSESSMENT' })
      .select('log.id', 'id')
      .getRawMany<{ id: string }>();
    return logs.map((row) => row.id);
  }

  private mapSystemNotification(log: CheckupAuditLog, readAt: string | null): CheckupSystemNotificationItem | null {
    const metadata = (log.metadata || {}) as Record<string, any>;
    const description = log.description || '';
    const clientId = typeof metadata.clientId === 'string' ? metadata.clientId : null;
    const clientName = typeof metadata.clientName === 'string'
      ? metadata.clientName
      : (typeof log.entityName === 'string' ? log.entityName : null);
    const preassessmentId = typeof metadata.preassessmentId === 'string' ? metadata.preassessmentId : null;
    const actionUrl = this.resolveActionUrl(log, metadata, clientId);
    const actorName = typeof metadata.actorName === 'string'
      ? metadata.actorName
      : (log.userEmail || null);

    if (log.entityType === 'PREASSESSMENT') {
      if (description.startsWith('Sezione validata:') || description.startsWith('Sezioni validate:')) {
        return {
          id: log.id,
          type: 'sezione_validata',
          title: 'Sezione validata',
          message: this.composeMessage(clientName, description),
          createdAt: log.createdAt.toISOString(),
          clientId,
          clientName,
          preassessmentId,
          actionUrl,
          actorName,
          priority: 'info',
          readAt,
        };
      }

      if (description.startsWith('Checkup completato')) {
        return {
          id: log.id,
          type: 'checkup_completato',
          title: 'Checkup completato',
          message: this.composeMessage(clientName, description),
          createdAt: log.createdAt.toISOString(),
          clientId,
          clientName,
          preassessmentId,
          actionUrl,
          actorName,
          priority: 'info',
          readAt,
        };
      }

      if (description.startsWith('Validazione finale checkup')) {
        return {
          id: log.id,
          type: 'validazione_finale',
          title: 'Checkup validato definitivamente',
          message: this.composeMessage(clientName, description),
          createdAt: log.createdAt.toISOString(),
          clientId,
          clientName,
          preassessmentId,
          actionUrl,
          actorName,
          priority: 'info',
          readAt,
        };
      }

      if (description.startsWith('Nuova versione del checkup')) {
        return {
          id: log.id,
          type: 'nuova_versione',
          title: 'Nuova versione del checkup',
          message: this.composeMessage(clientName, description),
          createdAt: log.createdAt.toISOString(),
          clientId,
          clientName,
          preassessmentId,
          actionUrl,
          actorName,
          priority: 'warning',
          readAt,
        };
      }

      if (description.startsWith('Nota cliente aggiornata')) {
        return {
          id: log.id,
          type: 'nota_cliente',
          title: 'Nota del cliente aggiornata',
          message: this.composeMessage(clientName, description),
          createdAt: log.createdAt.toISOString(),
          clientId,
          clientName,
          preassessmentId,
          actionUrl,
          actorName,
          priority: 'info',
          readAt,
        };
      }

      return null;
    }

    return null;
  }

  private composeMessage(clientName: string | null, description: string): string {
    if (!clientName) return description;
    return `${clientName}: ${description}`;
  }

  private resolveActionUrl(
    log: CheckupAuditLog,
    metadata: Record<string, any>,
    clientId: string | null,
  ): string | null {
    if (typeof metadata.actionUrl === 'string') return metadata.actionUrl;
    if (!clientId) return null;
    if (log.entityType === 'TICKET') return `/checkup/clienti/${clientId}/tickets`;
    if (log.entityType === 'ALERT') return `/checkup/clienti/${clientId}/alerts`;
    return `/checkup/clienti/${clientId}`;
  }
}
