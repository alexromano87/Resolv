// apps/backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../users/user.entity';
import { Cliente } from '../clienti/cliente.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private readonly lockoutThreshold = 5;
  private readonly lockoutWindowMs = 15 * 60 * 1000;
  private readonly refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;

  private async resolveClienteIdForUser(user: User): Promise<string | null> {
    if (user.ruolo !== 'cliente') {
      return user.clienteId ?? null;
    }
    if (user.clienteId) {
      return user.clienteId;
    }
    const email = user.email.toLowerCase().trim();
    const cliente = await this.clienteRepository
      .createQueryBuilder('cliente')
      .where('LOWER(cliente.referenteEmail) = :email', { email })
      .orWhere('LOWER(cliente.email) = :email', { email })
      .getOne();
    return cliente?.id ?? null;
  }

  private async issueTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      ruolo: user.ruolo,
      tokenVersion: user.tokenVersion ?? 0,
    };

    const refreshToken = randomBytes(48).toString('hex');
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenExpiresAt = new Date(Date.now() + this.refreshTokenTtlMs);
    await this.userRepository.save(user);

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
    };
  }

  private async buildUserResponse(user: User) {
    const resolvedClienteId = await this.resolveClienteIdForUser(user);
    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo,
      clienteId: resolvedClienteId,
      attivo: user.attivo,
      studioId: user.studioId,
      currentStudioId: user.currentStudioId,
      studi: user.studi,
      telefono: user.telefono,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorChannel: user.twoFactorChannel,
      settings: user.settings,
    };
  }

  async register(registerDto: RegisterDto) {
    // Normalizza email in lowercase
    const normalizedEmail = registerDto.email.toLowerCase().trim();

    // Verifica se l'email è già in uso
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email già registrata');
    }

    // Hash della password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Crea nuovo utente
    const user = this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      nome: registerDto.nome,
      cognome: registerDto.cognome,
      ruolo: registerDto.ruolo || 'collaboratore',
      clienteId: registerDto.clienteId || null,
      telefono: null,
      settings: null,
    });

    await this.userRepository.save(user);

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: await this.buildUserResponse(user),
    };
  }

  private async sendTwoFactorCode(channel: 'sms' | 'email', destination: string, code: string) {
    if (channel === 'sms') {
      console.info(`[2FA][SMS] Code ${code} to ${destination}`);
    } else {
      console.info(`[2FA][Email] Code ${code} to ${destination}`);
    }
  }

  private generateTwoFactorCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendPasswordResetCode(email: string, token: string) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    await this.emailService.sendEmail({
      to: email,
      subject: 'Link per recupero password',
      text: [
        'Hai richiesto il recupero della password.',
        `Link per il reset: ${link}`,
        'Il link scade tra 15 minuti.',
      ].join('\n'),
    });
  }

  private async findUserWithPasswordByEmail(email: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  private async findUserWithPasswordById(userId: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.studi', 'studi')
      .where('user.id = :id', { id: userId })
      .getOne();
  }

  async login(loginDto: LoginDto) {
    // Normalizza email in lowercase
    const normalizedEmail = loginDto.email.toLowerCase().trim();

    // Trova utente con gli studi associati
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.studi', 'studi')
      .where('user.email = :email', { email: normalizedEmail })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    if (!user.attivo) {
      throw new UnauthorizedException('Utente disattivato');
    }

    if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
      throw new UnauthorizedException('Account temporaneamente bloccato');
    }

    // Verifica password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const update: any = { failedLoginAttempts: attempts };
      if (attempts >= this.lockoutThreshold) {
        update.lockoutUntil = new Date(Date.now() + this.lockoutWindowMs);
        update.failedLoginAttempts = 0;
      }
      await this.userRepository.update(user.id, update);
      throw new UnauthorizedException('Credenziali non valide');
    }

    if (user.failedLoginAttempts || user.lockoutUntil) {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      });
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

    const isMultiStudioRole = user.ruolo === 'avvocato' || user.ruolo === 'collaboratore';

    // Verifica se l'utente ha più studi associati
    if (isMultiStudioRole && user.studi && user.studi.length > 1) {
      return {
        requiresStudioSelection: true,
        userId: user.id,
        studi: user.studi.map(s => ({
          id: s.id,
          nome: s.nome,
          ragioneSociale: s.ragioneSociale,
        })),
      };
    }

    // Se ha un solo studio, impostalo come corrente
    if (isMultiStudioRole && user.studi && user.studi.length === 1) {
      user.currentStudioId = user.studi[0].id;
      if (!user.studioId) {
        user.studioId = user.studi[0].id;
      }
    }

    // Aggiorna lastLogin e currentStudioId se è stato impostato
    const updateData: any = { lastLogin: new Date() };
    if (user.currentStudioId) {
      updateData.currentStudioId = user.currentStudioId;
    }
    await this.userRepository.update(user.id, updateData);

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: await this.buildUserResponse(user),
    };
  }

  async verifyTwoFactorLogin(userId: string, code: string) {
    const user = await this.findUserWithPasswordById(userId);
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

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: await this.buildUserResponse(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    const { password, ...result } = user;
    return result;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password attuale non valida');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepository.save(user);

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: await this.buildUserResponse(user),
    };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.findUserWithPasswordByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Email non trovata');
    }

    const token = `${this.generateTwoFactorCode()}-${Math.random().toString(36).slice(2, 10)}`;
    user.twoFactorCode = token;
    user.twoFactorCodePurpose = 'password_reset';
    user.twoFactorCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await this.userRepository.save(user);

    await this.sendPasswordResetCode(user.email, token);
    return { success: true };
  }

  async confirmPasswordReset(email: string, token: string, newPassword: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.findUserWithPasswordByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Email non trovata');
    }

    if (
      user.twoFactorCode !== token ||
      user.twoFactorCodePurpose !== 'password_reset' ||
      !user.twoFactorCodeExpires ||
      user.twoFactorCodeExpires.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Codice non valido o scaduto');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.twoFactorCode = null;
    user.twoFactorCodePurpose = null;
    user.twoFactorCodeExpires = null;
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    await this.userRepository.save(user);

    return { success: true };
  }

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token non valido');
    }

    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      user.refreshTokenHash = null;
      user.refreshTokenExpiresAt = null;
      await this.userRepository.save(user);
      throw new UnauthorizedException('Refresh token scaduto');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      // Tentativo con token errato: revoca tutto
      await this.userRepository.update(user.id, {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        tokenVersion: (user.tokenVersion ?? 0) + 1,
      });
      throw new UnauthorizedException('Refresh token non valido');
    }

    // Rotazione: emette nuovo refresh e invalida quello usato
    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: await this.buildUserResponse(user),
    };
  }

  async logoutAll(userId: string) {
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
    await this.userRepository.update(userId, {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
    return { success: true };
  }

  async getSettings(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }
    return {
      settings: user.settings,
      telefono: user.telefono,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorChannel: user.twoFactorChannel,
    };
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    const { telefono, ...settings } = dto;
    user.settings = { ...(user.settings || {}), ...settings };
    if (telefono !== undefined) {
      user.telefono = telefono || null;
    }
    await this.userRepository.save(user);
    return {
      settings: user.settings,
      telefono: user.telefono,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorChannel: user.twoFactorChannel,
    };
  }

  async requestTwoFactorEnable(userId: string, channel: 'sms' | 'email', telefono?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    if (channel === 'sms') {
      const phone = telefono || user.telefono;
      if (!phone) {
        throw new BadRequestException('Numero di telefono mancante');
      }
      user.telefono = phone;
    }

    const code = this.generateTwoFactorCode();
    user.twoFactorCode = code;
    user.twoFactorCodePurpose = 'enable';
    user.twoFactorCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.twoFactorChannel = channel;
    await this.userRepository.save(user);

    const destination = channel === 'sms' ? (user.telefono as string) : user.email;
    await this.sendTwoFactorCode(channel, destination, code);
    return { success: true };
  }

  async verifyTwoFactorEnable(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
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
    return { success: true };
  }

  async requestTwoFactorDisable(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    if (!user.twoFactorEnabled) {
      return { success: true };
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
    return { success: true };
  }

  async verifyTwoFactorDisable(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
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
    return { success: true };
  }

  async selectStudio(userId: string, studioId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studi'],
    });

    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    // Verifica che lo studio sia tra quelli associati all'utente
    const hasAccess = user.studi?.some(s => s.id === studioId);
    if (!hasAccess) {
      throw new UnauthorizedException('Accesso allo studio non autorizzato');
    }

    // Aggiorna lo studio corrente e lastLogin
    user.currentStudioId = studioId;
    if (!user.studioId) {
      user.studioId = studioId;
    }
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: await this.buildUserResponse(user),
    };
  }
}
