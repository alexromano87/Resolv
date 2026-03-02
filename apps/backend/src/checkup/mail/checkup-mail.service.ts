import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

export interface CheckupMailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

@Injectable()
export class CheckupMailService {
  private readonly logger = new Logger(CheckupMailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass =
      this.configService.get<string>('SMTP_PASS') ||
      this.configService.get<string>('SMTP_PASSWORD');
    const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const from = this.configService.get<string>('SMTP_FROM');

    if (!host || !from) {
      this.logger.warn('[Checkup] SMTP non configurato — invio email disabilitato.');
      return;
    }

    this.from = from;
    this.transporter = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass } : undefined });
    this.enabled = true;
    this.logger.log('[Checkup] SMTP configurato correttamente.');
  }

  /**
   * Fire-and-forget: non blocca mai il chiamante.
   * Gli errori vengono solo loggati.
   */
  sendMail(payload: CheckupMailPayload): void {
    if (!this.enabled || !this.transporter || !this.from) {
      this.logger.debug(`[Checkup] Email saltata (SMTP off): ${payload.subject}`);
      return;
    }

    const recipients = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;

    this.transporter
      .sendMail({
        from: this.from,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
      })
      .catch((err: Error) => {
        this.logger.error(`[Checkup] Errore invio email "${payload.subject}": ${err.message}`);
      });
  }

  /** Testo generico di firma in calce alle email. */
  signature(): string {
    const appUrl =
      this.configService.get<string>('CHECKUP_APP_URL') || 'https://app.resolv.it';
    return `
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
        <p style="margin:0;">Accedi alla piattaforma: <a href="${appUrl}/checkup/login" style="color:#4f46e5;">${appUrl}/checkup/login</a></p>
        <p style="margin:4px 0 0;">Questo è un messaggio automatico — non rispondere a questa email.</p>
      </div>`;
  }
}
