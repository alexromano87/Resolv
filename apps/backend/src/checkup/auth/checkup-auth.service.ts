import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLoginDto } from './dto/checkup-login.dto';
import { CheckupChangePasswordDto } from './dto/checkup-change-password.dto';
import { CheckupJwtPayload } from './checkup-jwt.strategy';
import { EmailService } from '../../notifications/email.service';
import { buildTwoFactorEmailHtml, buildTwoFactorEmailText } from '../../notifications/email-templates';

@Injectable()
export class CheckupAuthService {
  constructor(
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private mapUserPayload(user: CheckupUser) {
    const clientSublicense = user.client?.sublicenses?.[0] || null;
    const clientLicense = clientSublicense?.license || null;
    const licenziatarioNome = clientLicense?.studio?.nome ?? null;
    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo,
      studioId: user.studioId,
      studioNome: user.studio?.nome ?? null,
      studioTipo: user.studio?.tipo ?? null,
      clientId: user.clientId,
      clientNome: user.client?.nome ?? null,
      licenziatarioNome,
      azienda: user.azienda,
      telefono: user.telefono,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorChannel: user.twoFactorChannel,
      license: user.studio?.license
        ? {
            id: user.studio.license.id,
            studioId: user.studio.license.studioId,
            intestatario: user.studio.license.intestatario,
            tipo: user.studio.license.tipo,
            numeroUtenze: user.studio.license.numeroUtenze,
            numeroSottolicenze: user.studio.license.numeroSottolicenze,
          }
        : clientLicense
          ? {
              id: clientLicense.id,
              studioId: clientLicense.studioId,
              intestatario: clientLicense.intestatario,
              tipo: clientLicense.tipo,
              numeroUtenze: clientLicense.numeroUtenze,
              numeroSottolicenze: clientLicense.numeroSottolicenze,
            }
          : null,
    };
  }

  private async loadUserForAuth(where: { id?: string; email?: string }) {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .addSelect('u.password')
      .leftJoinAndSelect('u.studio', 'studio')
      .leftJoinAndSelect('studio.license', 'license')
      .leftJoinAndSelect('u.client', 'client')
      .leftJoinAndSelect('client.sublicenses', 'clientSublicense')
      .leftJoinAndSelect('clientSublicense.license', 'clientLicense')
      .leftJoinAndSelect('clientLicense.studio', 'licenziatarioStudio')
      .andWhere('u.attivo = :attivo', { attivo: true });

    if (where.email) {
      qb.andWhere('u.email = :email', { email: where.email });
    }
    if (where.id) {
      qb.andWhere('u.id = :id', { id: where.id });
    }

    return qb.getOne();
  }

  private generateTwoFactorCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendTwoFactorCode(channel: 'sms' | 'email', destination: string, code: string) {
    if (channel === 'sms') {
      console.info(`[Checkup][2FA][SMS] Code ${code} to ${destination}`);
      return;
    }

    await this.emailService.sendEmail({
      to: destination,
      subject: 'Codice di verifica 2FA',
      text: buildTwoFactorEmailText({ code, product: 'Checkup' }),
      html: buildTwoFactorEmailHtml({ code, product: 'Checkup' }),
    });
  }

  async login(dto: CheckupLoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.loadUserForAuth({ email });

    if (!user) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    if (user.twoFactorEnabled) {
      const code = this.generateTwoFactorCode();
      user.twoFactorCode = code;
      user.twoFactorCodePurpose = 'login';
      user.twoFactorCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
      await this.userRepository.save(user);

      const channel = (user.twoFactorChannel || 'email') as 'sms' | 'email';
      const destination = channel === 'sms' ? user.telefono : user.email;
      if (!destination) {
        throw new BadRequestException('Canale 2FA non configurato');
      }
      await this.sendTwoFactorCode(channel, destination, code);

      return {
        requiresTwoFactor: true,
        userId: user.id,
        channel,
      };
    }

    await this.userRepository.update(user.id, { lastLogin: new Date() });

    const payload: CheckupJwtPayload = {
      sub: user.id,
      email: user.email,
      ruolo: user.ruolo,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: this.mapUserPayload(user),
    };
  }

  async verifyTwoFactorLogin(userId: string, code: string) {
    const user = await this.loadUserForAuth({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    if (
      user.twoFactorCode !== code ||
      user.twoFactorCodePurpose !== 'login' ||
      !user.twoFactorCodeExpires ||
      user.twoFactorCodeExpires.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Codice 2FA non valido');
    }

    user.twoFactorCode = null;
    user.twoFactorCodePurpose = null;
    user.twoFactorCodeExpires = null;
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    const payload: CheckupJwtPayload = {
      sub: user.id,
      email: user.email,
      ruolo: user.ruolo,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: this.mapUserPayload(user),
    };
  }

  async requestTwoFactorEnable(userId: string, channel: 'sms' | 'email', telefono?: string) {
    const user = await this.loadUserForAuth({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    if (channel === 'sms' && telefono) {
      user.telefono = telefono;
    }

    const destination = channel === 'sms' ? user.telefono : user.email;
    if (!destination) {
      throw new BadRequestException('Canale 2FA non configurato');
    }

    const code = this.generateTwoFactorCode();
    user.twoFactorCode = code;
    user.twoFactorCodePurpose = 'enable';
    user.twoFactorCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.twoFactorChannel = channel;
    await this.userRepository.save(user);

    await this.sendTwoFactorCode(channel, destination, code);
    return { ok: true };
  }

  async verifyTwoFactorEnable(userId: string, code: string) {
    const user = await this.loadUserForAuth({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    if (
      user.twoFactorCode !== code ||
      user.twoFactorCodePurpose !== 'enable' ||
      !user.twoFactorCodeExpires ||
      user.twoFactorCodeExpires.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Codice 2FA non valido');
    }

    user.twoFactorEnabled = true;
    user.twoFactorCode = null;
    user.twoFactorCodePurpose = null;
    user.twoFactorCodeExpires = null;
    await this.userRepository.save(user);
    return { ok: true };
  }

  async requestTwoFactorDisable(userId: string) {
    const user = await this.loadUserForAuth({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA non attivo');
    }

    const channel = (user.twoFactorChannel || 'email') as 'sms' | 'email';
    const destination = channel === 'sms' ? user.telefono : user.email;
    if (!destination) {
      throw new BadRequestException('Canale 2FA non configurato');
    }

    const code = this.generateTwoFactorCode();
    user.twoFactorCode = code;
    user.twoFactorCodePurpose = 'disable';
    user.twoFactorCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
    await this.userRepository.save(user);

    await this.sendTwoFactorCode(channel, destination, code);
    return { ok: true };
  }

  async verifyTwoFactorDisable(userId: string, code: string) {
    const user = await this.loadUserForAuth({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    if (
      user.twoFactorCode !== code ||
      user.twoFactorCodePurpose !== 'disable' ||
      !user.twoFactorCodeExpires ||
      user.twoFactorCodeExpires.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Codice 2FA non valido');
    }

    user.twoFactorEnabled = false;
    user.twoFactorChannel = null;
    user.twoFactorCode = null;
    user.twoFactorCodePurpose = null;
    user.twoFactorCodeExpires = null;
    await this.userRepository.save(user);
    return { ok: true };
  }

  async changePassword(userId: string, dto: CheckupChangePasswordDto) {
    const user = await this.loadUserForAuth({ id: userId });

    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password attuale non valida');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepository.save(user);

    const payload: CheckupJwtPayload = {
      sub: user.id,
      email: user.email,
      ruolo: user.ruolo,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        ...this.mapUserPayload(user),
        mustChangePassword: false,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, attivo: true },
      relations: [
        'studio',
        'studio.license',
        'studio.sublicensesAsCliente',
        'studio.sublicensesAsCliente.license',
        'studio.sublicensesAsCliente.license.studio',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    return this.mapUserPayload(user);
  }
}
