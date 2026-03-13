import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

type SendEmailPayload = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string | null = null;
  private replyTo: string | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {
    const g = (key: string, def?: string) =>
      this.configService.get<string>(key) ?? process.env[key] ?? def;

    const host   = g('SMTP_HOST');
    const port   = Number(g('SMTP_PORT', '587'));
    const user   = g('SMTP_USER');
    const pass   = g('SMTP_PASS') ?? g('SMTP_PASSWORD');
    const secure = g('SMTP_SECURE', 'false') === 'true';
    const from   = g('SMTP_FROM');
    const replyTo = g('SMTP_REPLY_TO');

    if (!host || !from) {
      this.logger.warn('SMTP non configurato (SMTP_HOST o SMTP_FROM mancanti). Invio email disabilitato.');
      return;
    }

    this.from = from;
    this.replyTo = replyTo || null;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
    this.enabled = true;
    this.logger.log(`SMTP configurato correttamente. 📧 From: ${from}`);
  }

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    if (!this.enabled || !this.transporter || !this.from) {
      this.logger.debug(`Email saltata: ${payload.subject}`);
      return;
    }

    const recipients = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipients,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        replyTo: this.replyTo || undefined,
      });
    } catch (error) {
      this.logger.error(`Errore invio email: ${payload.subject}`, error as Error);
    }
  }
}
