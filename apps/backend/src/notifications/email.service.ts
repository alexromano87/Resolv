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
  private enabled = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const from = this.configService.get<string>('SMTP_FROM');

    if (!host || !from) {
      this.logger.warn('SMTP non configurato. Invio email disabilitato.');
      return;
    }

    this.from = from;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
    this.enabled = true;
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
      });
    } catch (error) {
      this.logger.error(`Errore invio email: ${payload.subject}`, error as Error);
    }
  }
}
