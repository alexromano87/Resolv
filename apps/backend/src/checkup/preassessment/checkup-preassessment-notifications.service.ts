import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../../notifications/email.service';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupPreassessmentAlert } from './checkup-preassessment-alert.entity';
import { CheckupPreassessment } from './checkup-preassessment.entity';

@Injectable()
export class CheckupPreassessmentNotificationsService {
  constructor(
    @InjectRepository(CheckupPreassessmentAlert)
    private readonly alertRepository: Repository<CheckupPreassessmentAlert>,
    @InjectRepository(CheckupUser)
    private readonly userRepository: Repository<CheckupUser>,
    private readonly emailService: EmailService,
    private readonly auditLogService: CheckupAuditLogService,
  ) {}

  async notifyCompletion(
    preassessment: CheckupPreassessment,
    client: CheckupClient,
    user: CheckupCurrentUserData,
    studioId: string | null,
  ) {
    if (!studioId) return;
    const admins = await this.userRepository.find({
      where: { studioId, ruolo: 'admin_studio', attivo: true },
    });
    const requester = `${user.nome} ${user.cognome}`.trim() || user.email;
    const company = client.nome || client.ragioneSociale || 'Cliente';
    const completedAt = new Date().toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const subject = `✅ Checkup concluso — ${company}`;
    const text = `Il checkup di ${company} è stato completato da ${requester} in data ${completedAt}.`;
    this.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.ruolo,
      action: 'UPDATE',
      entityType: 'PREASSESSMENT',
      entityId: preassessment.id,
      entityName: company,
      description: `Checkup completato da ${requester}`,
      studioId,
      success: true,
      metadata: {
        clientId: client.id,
        clientName: company,
        preassessmentId: preassessment.id,
        actionUrl: `/checkup/clienti/${client.id}`,
        actorName: requester,
      },
    }).catch(() => {});
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px">
        <div style="background:#1e3a8a;border-radius:8px;padding:20px 24px;margin-bottom:24px">
          <h2 style="color:#fff;margin:0;font-size:18px">Checkup Governance · Pre-Assessment</h2>
        </div>
        <h3 style="color:#0f172a;margin:0 0 8px">✅ Checkup concluso</h3>
        <p style="color:#334155;margin:0 0 16px;font-size:15px">
          Il pre-assessment per <strong>${company}</strong> è stato completato con successo.
        </p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
          <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Cliente</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;font-size:13px">${company}</td></tr>
          <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Completato da</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;font-size:13px">${requester}</td></tr>
          <tr><td style="padding:10px 16px;color:#64748b;font-size:13px">Data</td><td style="padding:10px 16px;font-weight:600;color:#0f172a;font-size:13px">${completedAt}</td></tr>
        </table>
        <p style="color:#64748b;font-size:12px;margin-top:24px;text-align:center">
          Accedi alla piattaforma Checkup per visualizzare il report completo.
        </p>
      </div>`;

    await Promise.all(
      admins.map(async (admin) => {
        if (admin.email) {
          await this.emailService.sendEmail({ to: admin.email, subject, text, html });
        }
        const alert = this.alertRepository.create({
          preassessmentId: preassessment.id,
          createdById: user.id,
          targetUserId: admin.id,
          priority: 'info',
          messaggio: text,
        });
        await this.alertRepository.save(alert);
      }),
    );
  }

  async notifyConsultantNote(
    preassessment: CheckupPreassessment,
    client: CheckupClient,
    consultant: CheckupCurrentUserData,
    affectedMacros: Set<string>,
  ) {
    const clienteUsers = await this.userRepository.find({
      where: { clientId: client.id, ruolo: 'cliente', attivo: true },
    });

    const recipients = clienteUsers.filter((u) => {
      if (u.superOwner) return true;
      if (!u.macroAreaAssignments || u.macroAreaAssignments.length === 0) return true;
      return u.macroAreaAssignments.some((m) => affectedMacros.has(m));
    });

    if (recipients.length === 0) return;

    const consultantName = `${consultant.nome} ${consultant.cognome}`.trim() || consultant.email;
    const company = client.ragioneSociale || client.nome || 'Cliente';
    const subject = `📝 Nuova nota del consulente — ${company}`;
    const messaggio = `Il consulente ${consultantName} ha inserito o aggiornato una nota nel tuo pre-assessment di ${company}.`;
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px">
        <div style="background:#92400e;border-radius:8px;padding:20px 24px;margin-bottom:24px">
          <h2 style="color:#fff;margin:0;font-size:18px">Checkup Governance · Pre-Assessment</h2>
        </div>
        <h3 style="color:#0f172a;margin:0 0 8px">📝 Nuova nota del consulente</h3>
        <p style="color:#334155;margin:0 0 16px;font-size:15px">
          Il consulente <strong>${consultantName}</strong> ha inserito o aggiornato una nota nel pre-assessment di <strong>${company}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
          <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Cliente</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;font-size:13px">${company}</td></tr>
          <tr><td style="padding:10px 16px;color:#64748b;font-size:13px">Consulente</td><td style="padding:10px 16px;font-weight:600;color:#0f172a;font-size:13px">${consultantName}</td></tr>
        </table>
        <p style="color:#64748b;font-size:12px;margin-top:24px;text-align:center">
          Accedi alla piattaforma Checkup per consultare la nota.
        </p>
      </div>`;

    await Promise.all(
      recipients.map(async (u) => {
        if (u.email) {
          await this.emailService.sendEmail({ to: u.email, subject, text: messaggio, html });
        }
        const alert = this.alertRepository.create({
          preassessmentId: preassessment.id,
          createdById: consultant.id,
          targetUserId: u.id,
          priority: 'info',
          messaggio,
        });
        await this.alertRepository.save(alert);
      }),
    );
  }

  async notifyFinalValidation(
    preassessment: CheckupPreassessment,
    client: CheckupClient,
    user: CheckupCurrentUserData,
    studioId: string | null,
  ) {
    if (!studioId) return;
    const admins = await this.userRepository.find({
      where: { studioId, ruolo: 'admin_studio', attivo: true },
    });
    if (!admins.length) return;
    const requester = `${user.nome} ${user.cognome}`.trim() || user.email;
    const company = client.ragioneSociale || client.nome || 'Cliente';
    const validatedAt = new Date().toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const subject = `Checkup validato dal Super-owner — ${company}`;
    const text = `Il checkup di ${company} è stato validato dal Super-owner ${requester} in data ${validatedAt}.`;
    this.auditLogService.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.ruolo,
      action: 'UPDATE',
      entityType: 'PREASSESSMENT',
      entityId: preassessment.id,
      entityName: company,
      description: `Validazione finale checkup eseguita dal Super-owner ${requester}`,
      studioId,
      success: true,
      metadata: {
        clientId: client.id,
        clientName: company,
        preassessmentId: preassessment.id,
        actionUrl: `/checkup/clienti/${client.id}`,
        actorName: requester,
      },
    }).catch(() => {});
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px">
        <div style="background:#0f766e;border-radius:8px;padding:20px 24px;margin-bottom:24px">
          <h2 style="color:#fff;margin:0;font-size:18px">Checkup Governance · Pre-Assessment</h2>
        </div>
        <h3 style="color:#0f172a;margin:0 0 8px">Validazione finale completata</h3>
        <p style="color:#334155;margin:0 0 16px;font-size:15px">
          Il Super-owner ha validato il pre-assessment per <strong>${company}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
          <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Cliente</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;font-size:13px">${company}</td></tr>
          <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Super-owner</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;font-size:13px">${requester}</td></tr>
          <tr><td style="padding:10px 16px;color:#64748b;font-size:13px">Data validazione</td><td style="padding:10px 16px;font-weight:600;color:#0f172a;font-size:13px">${validatedAt}</td></tr>
        </table>
        <p style="color:#64748b;font-size:12px;margin-top:24px;text-align:center">
          Accedi alla piattaforma Checkup per consultare il pre-assessment validato.
        </p>
      </div>`;

    await Promise.all(
      admins.map(async (admin) => {
        if (admin.email) {
          await this.emailService.sendEmail({ to: admin.email, subject, text, html });
        }
        const alert = this.alertRepository.create({
          preassessmentId: preassessment.id,
          createdById: user.id,
          targetUserId: admin.id,
          priority: 'info',
          messaggio: text,
        });
        await this.alertRepository.save(alert);
      }),
    );
  }
}
