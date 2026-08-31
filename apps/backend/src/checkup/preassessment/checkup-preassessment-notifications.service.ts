import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { In, Repository } from 'typeorm';
import { EmailService } from '../../notifications/email.service';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupUser, CheckupUserRole } from '../users/checkup-user.entity';
import { CheckupMembershipsService } from '../memberships/checkup-memberships.service';
import { CheckupPreassessment } from './checkup-preassessment.entity';

@Injectable()
export class CheckupPreassessmentNotificationsService {
  private static readonly portalLoginUrl = 'https://checkup.resolv.legal/checkup/login';
  private static resolvLogoDataUri: string | null = null;

  constructor(
    @InjectRepository(CheckupUser)
    private readonly userRepository: Repository<CheckupUser>,
    private readonly emailService: EmailService,
    private readonly auditLogService: CheckupAuditLogService,
    private readonly membershipsService: CheckupMembershipsService,
  ) {}

  /** Staff dello studio via appartenenze (include utenze riusate/associate). */
  private async findStudioStaff(studioId: string, ruoli: CheckupUserRole[]): Promise<CheckupUser[]> {
    const ids = await this.membershipsService.activeUserIdsForContext({ studioId, ruoli });
    if (!ids.length) return [];
    return this.userRepository.find({ where: { id: In(ids) } });
  }

  private getResolvLogoDataUri() {
    if (CheckupPreassessmentNotificationsService.resolvLogoDataUri) {
      return CheckupPreassessmentNotificationsService.resolvLogoDataUri;
    }
    try {
      const logo = readFileSync(join(process.cwd(), 'src/assets/logo_resolv.png'));
      CheckupPreassessmentNotificationsService.resolvLogoDataUri = `data:image/png;base64,${logo.toString('base64')}`;
    } catch {
      CheckupPreassessmentNotificationsService.resolvLogoDataUri = '';
    }
    return CheckupPreassessmentNotificationsService.resolvLogoDataUri;
  }

  private buildNoteEmailHtml(params: {
    title: string;
    preheader: string;
    body: string;
    clientName: string;
    actorLabel: string;
    actorName: string;
  }) {
    const logo = this.getResolvLogoDataUri();
    const loginUrl = CheckupPreassessmentNotificationsService.portalLoginUrl;
    return `
      <div style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033">
        <div style="display:none;max-height:0;overflow:hidden;color:#f5f7fb;opacity:0">${params.preheader}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:32px 16px">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5eaf2;border-radius:16px;overflow:hidden">
                <tr>
                  <td style="padding:28px 32px 20px;border-bottom:1px solid #edf1f7">
                    ${logo ? `<img src="${logo}" alt="RESOLV" width="132" style="display:block;width:132px;height:auto;margin:0 0 20px" />` : '<div style="font-size:22px;font-weight:800;color:#172033;margin-bottom:20px">RESOLV</div>'}
                    <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Checkup Governance · Pre-Assessment</div>
                    <h1 style="font-size:24px;line-height:1.25;color:#0f172a;margin:0">${params.title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 32px 8px">
                    <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 22px">${params.body}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5eaf2;border-radius:12px;overflow:hidden">
                      <tr>
                        <td style="width:34%;padding:14px 18px;border-bottom:1px solid #e5eaf2;background:#f8fafc;color:#64748b;font-size:13px">Cliente</td>
                        <td style="padding:14px 18px;border-bottom:1px solid #e5eaf2;color:#0f172a;font-size:14px;font-weight:700">${params.clientName}</td>
                      </tr>
                      <tr>
                        <td style="width:34%;padding:14px 18px;background:#f8fafc;color:#64748b;font-size:13px">${params.actorLabel}</td>
                        <td style="padding:14px 18px;color:#0f172a;font-size:14px;font-weight:700">${params.actorName}</td>
                      </tr>
                    </table>
                    <p style="font-size:14px;line-height:1.6;color:#475569;margin:24px 0 0">
                      Per visualizzare la nota accedi al portale Checkup. Dopo il login troverai la notifica nell'area dedicata.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:24px 32px 32px">
                    <a href="${loginUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:10px">Accedi al portale Checkup</a>
                    <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:18px 0 0">
                      Questo messaggio e' stato generato automaticamente da RESOLV. Non rispondere a questa email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>`;
  }

  async notifyCompletion(
    preassessment: CheckupPreassessment,
    client: CheckupClient,
    user: CheckupCurrentUserData,
    studioId: string | null,
  ) {
    if (!studioId) return;
    const admins = await this.findStudioStaff(studioId, ['admin_studio']);
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
      return (u.macroAreaOwner || []).some((m) => affectedMacros.has(m));
    });

    if (recipients.length === 0) return;

    const consultantName = `${consultant.nome} ${consultant.cognome}`.trim() || consultant.email;
    const company = client.ragioneSociale || client.nome || 'Cliente';
    const subject = `Nuova nota dal consulente - ${company}`;
    const messaggio = `Il consulente ${consultantName} ha inserito o aggiornato una nota nel pre-assessment di ${company}. Accedi al portale Checkup: ${CheckupPreassessmentNotificationsService.portalLoginUrl}`;
    const html = this.buildNoteEmailHtml({
      title: 'Nuova nota dal consulente',
      preheader: `Il consulente ${consultantName} ha inserito o aggiornato una nota nel pre-assessment di ${company}.`,
      body: `Il consulente <strong>${consultantName}</strong> ha inserito o aggiornato una nota nel pre-assessment di <strong>${company}</strong>.`,
      clientName: company,
      actorLabel: 'Consulente',
      actorName: consultantName,
    });

    await Promise.all(
      recipients.map(async (u) => {
        if (u.email) {
          await this.emailService.sendEmail({ to: u.email, subject, text: messaggio, html });
        }
      }),
    );
  }

  async notifyClientNote(
    client: CheckupClient,
    user: CheckupCurrentUserData,
    studioId: string | null,
    fieldIds: string[],
    actionUrl: string,
  ) {
    if (!studioId) return;
    const staffUsers = await this.findStudioStaff(studioId, ['admin_studio', 'segreteria', 'collaboratore']);
    if (!staffUsers.length) return;

    const actorName = `${user.nome} ${user.cognome}`.trim() || user.email;
    const company = client.ragioneSociale || client.nome || 'Cliente';
    const subject = `Nuova nota cliente - ${company}`;
    const text = `${actorName} ha inserito o aggiornato una nota nel questionario di ${company}. Accedi al portale Checkup: ${CheckupPreassessmentNotificationsService.portalLoginUrl}`;
    const noteCount = fieldIds.length;
    const html = this.buildNoteEmailHtml({
      title: 'Nuova nota cliente',
      preheader: `${actorName} ha inserito o aggiornato ${noteCount > 1 ? `${noteCount} note` : 'una nota'} nel questionario di ${company}.`,
      body: `<strong>${actorName}</strong> ha inserito o aggiornato ${noteCount > 1 ? `${noteCount} note` : 'una nota'} nel questionario di <strong>${company}</strong>.`,
      clientName: company,
      actorLabel: 'Autore',
      actorName,
    });

    await Promise.all(
      staffUsers.map(async (staffUser) => {
        if (staffUser.email) {
          await this.emailService.sendEmail({ to: staffUser.email, subject, text, html });
        }
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
    const admins = await this.findStudioStaff(studioId, ['admin_studio']);
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
      }),
    );
  }
}
