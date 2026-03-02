import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLoginDto } from './dto/checkup-login.dto';
import { CheckupChangePasswordDto } from './dto/checkup-change-password.dto';
import { CheckupJwtPayload } from './checkup-jwt.strategy';
import { EmailService } from '../../notifications/email.service';
import { buildTwoFactorEmailHtml, buildTwoFactorEmailText } from '../../notifications/email-templates';
import { CacheService } from '../../common/cache.service';

/** TTL in seconds for a refresh token (7 days) */
const REFRESH_TOKEN_TTL_S = 7 * 24 * 60 * 60;
/** Redis key prefix for refresh-token blacklist */
const REFRESH_BLACKLIST_PREFIX = 'checkup:refresh:blacklist:';

@Injectable()
export class CheckupAuthService {
  private readonly logger = new Logger(CheckupAuthService.name);
  private readonly refreshSecret: string;

  constructor(
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cacheService: CacheService,
    private emailService: EmailService,
  ) {
    const secret = this.configService.get<string>('CHECKUP_REFRESH_SECRET');
    if (!secret) {
      throw new Error('FATAL: CHECKUP_REFRESH_SECRET environment variable is not set.');
    }
    this.refreshSecret = secret;
  }

  private mapUserPayload(user: CheckupUser) {
    const clientSublicense = user.client?.sublicenses?.[0] || null;
    const clientLicense = clientSublicense?.license || null;
    const licenziatarioNome = clientLicense?.studio?.nome ?? null;
    type LicensePayload = NonNullable<NonNullable<CheckupUser['studio']>['license']>;
    const mapLicense = (license: LicensePayload) => ({
      id: license.id,
      studioId: license.studioId,
      intestatario: license.intestatario,
      tipo: license.tipo,
      numeroUtenze: license.numeroUtenze,
      numeroSottolicenze: license.numeroSottolicenze,
      modelIds: license.modelIds && license.modelIds.length ? license.modelIds : (license.model ? [license.model.id] : []),
      model: license.model
        ? {
            id: license.model.id,
            code: license.model.code,
            label: license.model.label,
          }
        : null,
    });
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
      sublicense: clientSublicense
        ? {
            id: clientSublicense.id,
            modelId: clientSublicense.modelId,
            allowDocuments: clientSublicense.allowDocuments,
          }
        : null,
      license: user.studio?.license
        ? mapLicense(user.studio.license)
        : clientLicense
          ? mapLicense(clientLicense)
          : null,
    };
  }

  private async loadUserForAuth(where: { id?: string; email?: string }) {
    const qb = this.userRepository
      .createQueryBuilder('u')
      .addSelect('u.password')
      .leftJoinAndSelect('u.studio', 'studio')
      .leftJoinAndSelect('studio.license', 'license')
      .leftJoinAndSelect('license.model', 'licenseModel')
      .leftJoinAndSelect('u.client', 'client')
      .leftJoinAndSelect('client.sublicenses', 'clientSublicense')
      .leftJoinAndSelect('clientSublicense.license', 'clientLicense')
      .leftJoinAndSelect('clientLicense.model', 'clientLicenseModel')
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

  // ── Refresh-token helpers ──────────────────────────────────────────────────

  /** Issue a refresh token (JWT signed with CHECKUP_REFRESH_SECRET, 7d TTL). */
  private issueRefreshToken(userId: string): string {
    const jti = crypto.randomUUID();
    return this.jwtService.sign(
      { sub: userId, jti },
      { secret: this.refreshSecret, expiresIn: `${REFRESH_TOKEN_TTL_S}s` },
    );
  }

  /** Verify refresh token, check blacklist, and return a fresh access token. */
  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    let payload: { sub: string; jti: string; exp: number };
    try {
      payload = this.jwtService.verify(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token non valido o scaduto');
    }

    // Check blacklist
    const blacklisted = await this.cacheService.get<boolean>(REFRESH_BLACKLIST_PREFIX + payload.jti);
    if (blacklisted) {
      throw new UnauthorizedException('Refresh token revocato');
    }

    // Blacklist old refresh token (rotate)
    const remainingTtl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    await this.cacheService.set(REFRESH_BLACKLIST_PREFIX + payload.jti, true, remainingTtl);

    const user = await this.loadUserForAuth({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    const accessPayload: CheckupJwtPayload = { sub: user.id, email: user.email, ruolo: user.ruolo };
    return {
      access_token: this.jwtService.sign(accessPayload),
      refresh_token: this.issueRefreshToken(user.id),
    };
  }

  /** Invalidate a refresh token by putting its jti in Redis blacklist. */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<{ jti: string; exp: number }>(
        refreshToken,
        { secret: this.refreshSecret },
      );
      const remainingTtl = Math.max(1, payload.exp - Math.floor(Date.now() / 1000));
      await this.cacheService.set(REFRESH_BLACKLIST_PREFIX + payload.jti, true, remainingTtl);
    } catch {
      // Token already expired or invalid — nothing to blacklist
    }
  }

  // ── 2FA helpers ───────────────────────────────────────────────────────────

  private generateTwoFactorCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendPasswordResetCode(email: string, code: string) {
    await this.emailService.sendEmail({
      to: email,
      subject: 'Codice per recupero password',
      text: buildTwoFactorEmailText({ code, product: 'Checkup' }),
      html: buildTwoFactorEmailHtml({ code, product: 'Checkup' }),
    });
  }

  private async sendTwoFactorCode(channel: 'sms' | 'email', destination: string, code: string) {
    if (channel === 'sms') {
      // SMS gateway not configured — fall back to email delivery.
      // Never log OTP codes: they are sensitive credentials.
      this.logger.warn(
        `[2FA][SMS] SMS gateway not configured. ` +
        `Falling back to email delivery for destination ending in ...${destination.slice(-4)}.`,
      );
      // Attempt email fallback: destination for SMS is the phone number,
      // so we cannot send an email without the user's email address.
      // Throw a clear error so the caller can handle it gracefully.
      throw new BadRequestException(
        'Il canale SMS non è configurato. Contatta il supporto per attivare la verifica via email.',
      );
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
      user.twoFactorCode = await bcrypt.hash(code, 8);
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
      refresh_token: this.issueRefreshToken(user.id),
      user: this.mapUserPayload(user),
    };
  }

  async verifyTwoFactorLogin(userId: string, code: string) {
    const user = await this.loadUserForAuth({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    const isLoginCodeValid = user.twoFactorCode
      ? await bcrypt.compare(code, user.twoFactorCode)
      : false;
    if (
      !isLoginCodeValid ||
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
      refresh_token: this.issueRefreshToken(user.id),
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
    user.twoFactorCode = await bcrypt.hash(code, 8);
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

    const isEnableCodeValid = user.twoFactorCode
      ? await bcrypt.compare(code, user.twoFactorCode)
      : false;
    if (
      !isEnableCodeValid ||
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
    user.twoFactorCode = await bcrypt.hash(code, 8);
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

    const isDisableCodeValid = user.twoFactorCode
      ? await bcrypt.compare(code, user.twoFactorCode)
      : false;
    if (
      !isDisableCodeValid ||
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
      refresh_token: this.issueRefreshToken(user.id),
      user: {
        ...this.mapUserPayload(user),
        mustChangePassword: false,
      },
    };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.loadUserForAuth({ email: normalizedEmail });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return { success: true };
    }

    const code = this.generateTwoFactorCode();
    user.twoFactorCode = await bcrypt.hash(code, 8);
    user.twoFactorCodePurpose = 'password_reset';
    user.twoFactorCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await this.userRepository.save(user);

    await this.sendPasswordResetCode(user.email, code);
    return { success: true };
  }

  async confirmPasswordReset(email: string, token: string, newPassword: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.loadUserForAuth({ email: normalizedEmail });
    // Use a generic error to prevent email enumeration
    const isResetCodeValid = user?.twoFactorCode
      ? await bcrypt.compare(token, user.twoFactorCode)
      : false;
    if (
      !user ||
      !isResetCodeValid ||
      user.twoFactorCodePurpose !== 'password_reset' ||
      !user.twoFactorCodeExpires ||
      user.twoFactorCodeExpires.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Codice non valido o scaduto');
    }

    user!.password = await bcrypt.hash(newPassword, 10);
    user!.mustChangePassword = false;
    user!.twoFactorCode = null;
    user!.twoFactorCodePurpose = null;
    user!.twoFactorCodeExpires = null;
    await this.userRepository.save(user!);

    return { success: true };
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
