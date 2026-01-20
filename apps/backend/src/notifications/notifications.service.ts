import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { User, type UserRole } from '../users/user.entity';
import { Documento } from '../documenti/documento.entity';
import { Ticket } from '../tickets/ticket.entity';

type NotificationPayload = {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Pratica)
    private readonly praticheRepo: Repository<Pratica>,
  ) {}

  async listForUser(userId: string, options?: { unread?: boolean; limit?: number }) {
    const where: Record<string, unknown> = { userId };
    if (options?.unread) {
      where.readAt = null;
    }
    return this.notificationsRepo.find({
      where,
      relations: ['pratica', 'pratica.cliente', 'pratica.debitore'],
      order: { createdAt: 'DESC' },
      take: options?.limit,
    });
  }

  async markRead(userId: string, id: string) {
    await this.notificationsRepo.update({ id, userId }, { readAt: new Date() });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.notificationsRepo.update({ userId, readAt: IsNull() }, { readAt: new Date() });
    return { success: true };
  }

  async notifyStatusChanged(praticaId: string, faseNome?: string) {
    const pratica = await this.findPraticaWithRelations(praticaId);
    if (!pratica) return;
    const message = faseNome ? `Cambio stato: ${faseNome}` : 'Stato pratica aggiornato';
    await this.createForPratica(pratica, {
      type: 'pratica_stato',
      title: 'Aggiornamento pratica',
      message,
      metadata: { faseId: pratica.faseId },
    });
  }

  async notifyDocumentAdded(
    documento: Documento,
    options?: { uploaderRole?: UserRole | string },
  ) {
    if (!documento.praticaId) return;
    const pratica = await this.findPraticaWithRelations(documento.praticaId);
    if (!pratica) return;

    const praticaNumero = pratica.numeroPratica || pratica.id.slice(0, 8);
    const isClienteUpload = options?.uploaderRole === 'cliente';

    if (isClienteUpload) {
      const baseRecipients = await this.getRecipients(pratica);
      const studioRecipients = pratica.studioId
        ? await this.usersRepo.find({
            where: {
              studioId: pratica.studioId,
              ruolo: In(['segreteria', 'titolare_studio']),
              attivo: true,
            },
          })
        : [];

      const unique = new Map<string, User>();
      [...baseRecipients, ...studioRecipients].forEach((user) => unique.set(user.id, user));
      const recipients = Array.from(unique.values());
      if (recipients.length === 0) return;

      const notifications = recipients.map((user) =>
        this.notificationsRepo.create({
          userId: user.id,
          praticaId: pratica.id,
          type: 'pratica_documento',
          title: 'Nuovo documento cliente',
          message: `Nuovo documento aggiunto dal cliente alla pratica numero ${praticaNumero}`,
          metadata: { documentoId: documento.id },
        }),
      );

      await this.notificationsRepo.save(notifications);
      return;
    }

    await this.createForPratica(pratica, {
      type: 'pratica_documento',
      title: 'Nuovo documento',
      message: `Nuovo documento: ${documento.nome}`,
      metadata: { documentoId: documento.id },
    });
  }

  async notifyTicketOpened(ticket: Ticket) {
    if (!ticket.praticaId) return;
    const pratica = await this.findPraticaWithRelations(ticket.praticaId);
    if (!pratica) return;

    const praticaLabel = this.buildPraticaLabel(pratica);
    const baseRecipients = await this.getRecipients(pratica);
    const studioRecipients = pratica.studioId
      ? await this.usersRepo.find({
          where: {
            studioId: pratica.studioId,
            ruolo: In(['segreteria', 'titolare_studio']),
            attivo: true,
          },
        })
      : [];

    const unique = new Map<string, User>();
    [...baseRecipients, ...studioRecipients].forEach((user) => unique.set(user.id, user));
    const recipients = Array.from(unique.values());
    if (recipients.length === 0) return;

    const notifications = recipients.map((user) =>
      this.notificationsRepo.create({
        userId: user.id,
        praticaId: pratica.id,
        type: 'ticket_aperto',
        title: 'Nuovo ticket cliente',
        message: `${praticaLabel} • ${ticket.oggetto}`,
        metadata: { ticketId: ticket.id },
      }),
    );

    await this.notificationsRepo.save(notifications);
  }

  async notifyTicketMessage(ticket: Ticket, sender: 'studio' | 'cliente') {
    if (!ticket.praticaId) return;
    const pratica = await this.findPraticaWithRelations(ticket.praticaId);
    if (!pratica) return;

    if (sender === 'studio') {
      const referenteEmail = pratica.cliente?.referenteEmail?.toLowerCase().trim();
      const clienteWhere = [
        { ruolo: 'cliente' as UserRole, attivo: true, clienteId: pratica.clienteId },
        ...(referenteEmail
          ? [{ ruolo: 'cliente' as UserRole, attivo: true, email: referenteEmail }]
          : []),
      ];
      const clienteUsers = await this.usersRepo.find({
        where: clienteWhere,
      });
      const unique = new Map<string, User>();
      clienteUsers.forEach((user) => unique.set(user.id, user));
      const recipients = Array.from(unique.values());
      if (recipients.length === 0) return;

      const notifications = recipients.map((user) =>
        this.notificationsRepo.create({
          userId: user.id,
          praticaId: pratica.id,
          type: 'ticket_messaggio',
          title: 'Nuovo messaggio ticket',
          message: ticket.oggetto,
          metadata: { ticketId: ticket.id },
        }),
      );

      await this.notificationsRepo.save(notifications);
      return;
    }

    const baseRecipients = await this.getRecipients(pratica);
    const studioRecipients = pratica.studioId
      ? await this.usersRepo.find({
          where: {
            studioId: pratica.studioId,
            ruolo: In(['segreteria', 'titolare_studio'] as UserRole[]),
            attivo: true,
          },
        })
      : [];
    const unique = new Map<string, User>();
    [...baseRecipients, ...studioRecipients].forEach((user) => unique.set(user.id, user));
    const recipients = Array.from(unique.values());
    if (recipients.length === 0) return;

    const notifications = recipients.map((user) =>
      this.notificationsRepo.create({
        userId: user.id,
        praticaId: pratica.id,
        type: 'ticket_messaggio',
        title: 'Nuovo messaggio cliente',
        message: ticket.oggetto,
        metadata: { ticketId: ticket.id },
      }),
    );

    await this.notificationsRepo.save(notifications);
  }

  async notifyAdmins(payload: NotificationPayload) {
    const admins = await this.usersRepo.find({
      where: { ruolo: 'admin', attivo: true },
    });
    if (admins.length === 0) return;

    const notifications = admins.map((user) =>
      this.notificationsRepo.create({
        userId: user.id,
        praticaId: null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata ?? null,
      }),
    );

    await this.notificationsRepo.save(notifications);
  }

  async notifyAdminsUnique(payload: NotificationPayload) {
    const admins = await this.usersRepo.find({
      where: { ruolo: 'admin', attivo: true },
    });
    if (admins.length === 0) return;

    for (const admin of admins) {
      const existing = await this.notificationsRepo.findOne({
        where: {
          userId: admin.id,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          readAt: IsNull(),
        },
      });
      if (existing) continue;
      const notification = this.notificationsRepo.create({
        userId: admin.id,
        praticaId: null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata ?? null,
      });
      await this.notificationsRepo.save(notification);
    }
  }

  private async findPraticaWithRelations(praticaId: string) {
    return this.praticheRepo.findOne({
      where: { id: praticaId },
      relations: ['avvocati', 'collaboratori', 'cliente', 'debitore'],
    });
  }

  private async createForPratica(pratica: Pratica, payload: NotificationPayload) {
    const recipients = await this.getRecipients(pratica);
    if (recipients.length === 0) return;

    const notifications = recipients.map((user) =>
      this.notificationsRepo.create({
        userId: user.id,
        praticaId: pratica.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata ?? null,
      }),
    );

    await this.notificationsRepo.save(notifications);
  }

  private buildPraticaLabel(pratica: Pratica | null): string {
    if (!pratica) return 'Pratica';
    const cliente = pratica.cliente?.ragioneSociale || 'Cliente';
    const debitore =
      pratica.debitore?.ragioneSociale ||
      [pratica.debitore?.nome, pratica.debitore?.cognome].filter(Boolean).join(' ') ||
      'Debitore';
    return `${cliente} vs ${debitore}`;
  }

  private async getRecipients(pratica: Pratica) {
    const collaboratorUsers = pratica.collaboratori?.filter((user) => user.attivo) ?? [];
    const avvocatoEmails = (pratica.avvocati || [])
      .map((avvocato) => avvocato.email?.toLowerCase().trim())
      .filter((email): email is string => Boolean(email));

    let avvocatoUsers: User[] = [];
    if (avvocatoEmails.length > 0) {
      avvocatoUsers = await this.usersRepo.find({
        where: {
          email: In(avvocatoEmails),
          ruolo: 'avvocato',
          attivo: true,
        },
      });
    }

    const unique = new Map<string, User>();
    [...collaboratorUsers, ...avvocatoUsers].forEach((user) => unique.set(user.id, user));
    return Array.from(unique.values());
  }
}
