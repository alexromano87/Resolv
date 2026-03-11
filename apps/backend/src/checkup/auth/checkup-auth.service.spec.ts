import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { CheckupAuthService } from './checkup-auth.service';
import { CheckupUser } from '../users/checkup-user.entity';
import { CacheService } from '../../common/cache.service';
import { EmailService } from '../../notifications/email.service';

// Mock bcrypt a livello modulo per evitare il problema di "configurable: false"
jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('$2b$10$mockhash'),
}));
import * as bcrypt from 'bcrypt';

// ── Costanti ────────────────────────────────────────────────────────────────

const REFRESH_BLACKLIST_PREFIX = 'checkup:refresh:blacklist:';
const MOCK_ACCESS_TOKEN = 'mock-access-token';
const MOCK_REFRESH_TOKEN = 'mock-refresh-token';
const MOCK_JTI = 'test-jti-uuid-123';

// ── Fixture utente ──────────────────────────────────────────────────────────

const baseUser: any = {
  id: 'user-1',
  email: 'mario@example.com',
  nome: 'Mario',
  cognome: 'Rossi',
  ruolo: 'admin_studio',
  studioId: 'studio-1',
  clientId: null,
  azienda: null,
  telefono: null,
  macroAreaOwner: null,
  macroAreaAssignments: null,
  superOwner: false,
  mustChangePassword: false,
  twoFactorEnabled: false,
  twoFactorChannel: null,
  twoFactorCode: null,
  twoFactorCodePurpose: null,
  twoFactorCodeExpires: null,
  studio: null,
  client: null,
  password: '$2b$10$hashedPassword',
  attivo: true,
  lastLogin: null,
};

// ── QueryBuilder mock factory ──────────────────────────────────────────────

function makeUserQB(user: any) {
  return {
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(user),
  };
}

// ── Suite ──────────────────────────────────────────────────────────────────

describe('CheckupAuthService', () => {
  let service: CheckupAuthService;
  let userRepository: { createQueryBuilder: jest.Mock; save: jest.Mock; update: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let cacheService: { get: jest.Mock; set: jest.Mock };
  let emailService: { sendEmail: jest.Mock };
  let configService: { get: jest.Mock };

  const mockRefreshPayload = {
    sub: 'user-1',
    jti: MOCK_JTI,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(async () => {
    userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(makeUserQB(baseUser)),
      save: jest.fn().mockImplementation(async (u) => u),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    jwtService = {
      sign: jest.fn()
        .mockReturnValueOnce(MOCK_ACCESS_TOKEN)
        .mockReturnValue(MOCK_REFRESH_TOKEN),
      verify: jest.fn().mockReturnValue(mockRefreshPayload),
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),   // non in blacklist per default
      set: jest.fn().mockResolvedValue(undefined),
    };

    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn((key: string, defaultVal?: any) => {
        if (key === 'CHECKUP_REFRESH_SECRET') return 'test-refresh-secret-min-32-chars!!';
        return defaultVal ?? null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckupAuthService,
        { provide: getRepositoryToken(CheckupUser), useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: CacheService, useValue: cacheService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(CheckupAuthService);

    // Ripristina i default dopo eventuali override dei singoli test
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$mockhash');
  });

  afterEach(() => jest.clearAllMocks());

  // ── login() ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('restituisce access_token, refresh_token e profilo utente', async () => {
      const result = await service.login({ email: 'mario@example.com', password: 'pass' });
      expect(result).toMatchObject({
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: MOCK_REFRESH_TOKEN,
      });
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({ id: 'user-1', email: 'mario@example.com' });
    });

    it('emette due token JWT (access + refresh)', async () => {
      await service.login({ email: 'mario@example.com', password: 'pass' });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('aggiorna lastLogin dopo login corretto', async () => {
      await service.login({ email: 'mario@example.com', password: 'pass' });
      expect(userRepository.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ lastLogin: expect.any(Date) }));
    });

    it('lancia UnauthorizedException se utente non trovato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(null));
      await expect(
        service.login({ email: 'nessuno@example.com', password: 'pass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se password non valida', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ email: 'mario@example.com', password: 'sbagliata' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('normalizza email in minuscolo e trimma spazi', async () => {
      await service.login({ email: '  MARIO@EXAMPLE.COM  ', password: 'pass' });
      const qb = userRepository.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('u.email'),
        expect.objectContaining({ email: 'mario@example.com' }),
      );
    });

    it('ritorna requiresTwoFactor se 2FA è attivo (canale email)', async () => {
      const tfUser = {
        ...baseUser,
        twoFactorEnabled: true,
        twoFactorChannel: 'email',
      };
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(tfUser));

      const result = await service.login({ email: 'mario@example.com', password: 'pass' }) as any;

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.channel).toBe('email');
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('lancia BadRequestException se canale 2FA è SMS (non configurato)', async () => {
      const tfUser = {
        ...baseUser,
        twoFactorEnabled: true,
        twoFactorChannel: 'sms',
        telefono: '+391234567890',
      };
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(tfUser));

      await expect(
        service.login({ email: 'mario@example.com', password: 'pass' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ── verifyTwoFactorLogin() ─────────────────────────────────────────────────

  describe('verifyTwoFactorLogin()', () => {
    const twoFactorUser: any = {
      ...baseUser,
      twoFactorCode: '$2b$10$hashedCode',
      twoFactorCodePurpose: 'login',
      twoFactorCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('restituisce token e profilo dopo verifica corretta', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB({ ...twoFactorUser }));
      const result = await service.verifyTwoFactorLogin('user-1', '123456');
      expect(result).toMatchObject({ access_token: MOCK_ACCESS_TOKEN });
      expect(result).toHaveProperty('user');
    });

    it('azzera il codice 2FA dopo verifica', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB({ ...twoFactorUser }));
      await service.verifyTwoFactorLogin('user-1', '123456');
      const savedUser = (userRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedUser.twoFactorCode).toBeNull();
      expect(savedUser.twoFactorCodePurpose).toBeNull();
    });

    it('lancia UnauthorizedException se codice è errato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(twoFactorUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.verifyTwoFactorLogin('user-1', '000000')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se codice è scaduto', async () => {
      const expiredUser = { ...twoFactorUser, twoFactorCodeExpires: new Date(Date.now() - 1000) };
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(expiredUser));
      await expect(service.verifyTwoFactorLogin('user-1', '123456')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se purpose non è "login"', async () => {
      const wrongPurposeUser = { ...twoFactorUser, twoFactorCodePurpose: 'enable' };
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(wrongPurposeUser));
      await expect(service.verifyTwoFactorLogin('user-1', '123456')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se utente non trovato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(null));
      await expect(service.verifyTwoFactorLogin('unknown', '123456')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── refreshAccessToken() ───────────────────────────────────────────────────

  describe('refreshAccessToken()', () => {
    it('emette nuovi token e ruota il refresh token (blacklista il vecchio)', async () => {
      const result = await service.refreshAccessToken('old-refresh-token');

      expect(result).toMatchObject({
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: MOCK_REFRESH_TOKEN,
      });
      // Blacklista il vecchio JTI
      expect(cacheService.set).toHaveBeenCalledWith(
        `${REFRESH_BLACKLIST_PREFIX}${MOCK_JTI}`,
        true,
        expect.any(Number),
      );
    });

    it('lancia UnauthorizedException se il token è revocato (in blacklist)', async () => {
      cacheService.get.mockResolvedValue(true);
      await expect(service.refreshAccessToken('blacklisted-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se il token è non valido o scaduto', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      await expect(service.refreshAccessToken('expired-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se utente non trovato nel DB', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(null));
      await expect(service.refreshAccessToken('valid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('verifica il refresh token con il secret corretto', async () => {
      await service.refreshAccessToken('some-refresh-token');
      expect(jwtService.verify).toHaveBeenCalledWith(
        'some-refresh-token',
        { secret: 'test-refresh-secret-min-32-chars!!' },
      );
    });
  });

  // ── logout() ──────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('blacklista il JTI del refresh token', async () => {
      await service.logout('valid-refresh-token');
      expect(cacheService.set).toHaveBeenCalledWith(
        `${REFRESH_BLACKLIST_PREFIX}${MOCK_JTI}`,
        true,
        expect.any(Number),
      );
    });

    it('TTL della blacklist è maggiore di 0', async () => {
      await service.logout('valid-refresh-token');
      const ttl = (cacheService.set as jest.Mock).mock.calls[0][2] as number;
      expect(ttl).toBeGreaterThan(0);
    });

    it('non lancia eccezione se il token è già scaduto/invalido', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      await expect(service.logout('invalid-token')).resolves.not.toThrow();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  // ── changePassword() ───────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('aggiorna la password e restituisce nuovi token', async () => {
      const result = await service.changePassword('user-1', {
        currentPassword: 'old-pass',
        newPassword: 'New-Pass-123',
      });

      expect(result).toMatchObject({ access_token: MOCK_ACCESS_TOKEN });
      expect(result.user).toMatchObject({ mustChangePassword: false });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('imposta mustChangePassword=false dopo cambio', async () => {
      await service.changePassword('user-1', { currentPassword: 'old', newPassword: 'new' });
      const savedUser = (userRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedUser.mustChangePassword).toBe(false);
    });

    it('lancia UnauthorizedException se password corrente non valida', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.changePassword('user-1', { currentPassword: 'sbagliata', newPassword: 'nuova' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se utente non trovato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(null));
      await expect(
        service.changePassword('unknown', { currentPassword: 'p', newPassword: 'n' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── requestPasswordReset() ────────────────────────────────────────────────

  describe('requestPasswordReset()', () => {
    it('invia email di reset e restituisce { success: true }', async () => {
      const result = await service.requestPasswordReset('mario@example.com');
      expect(result).toEqual({ success: true });
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('restituisce { success: true } anche se utente non trovato (anti-enumeration)', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(null));
      const result = await service.requestPasswordReset('nessuno@example.com');
      expect(result).toEqual({ success: true });
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('normalizza email prima della ricerca', async () => {
      await service.requestPasswordReset('  MARIO@EXAMPLE.COM  ');
      const qb = userRepository.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('u.email'),
        expect.objectContaining({ email: 'mario@example.com' }),
      );
    });
  });

  // ── confirmPasswordReset() ────────────────────────────────────────────────

  describe('confirmPasswordReset()', () => {
    const validResetUser: any = {
      ...baseUser,
      twoFactorCode: '$2b$10$hashedCode',
      twoFactorCodePurpose: 'password_reset',
      twoFactorCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
    };

    it('reimposta la password e restituisce { success: true }', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB({ ...validResetUser }));
      const result = await service.confirmPasswordReset('mario@example.com', 'valid-code', 'NewPass!123');
      expect(result).toEqual({ success: true });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('azzera il codice di reset dopo conferma', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB({ ...validResetUser }));
      await service.confirmPasswordReset('mario@example.com', 'valid-code', 'NewPass!123');
      const savedUser = (userRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedUser.twoFactorCode).toBeNull();
      expect(savedUser.twoFactorCodePurpose).toBeNull();
    });

    it('lancia UnauthorizedException se codice errato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(validResetUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.confirmPasswordReset('mario@example.com', 'codice-sbagliato', 'NewPass'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se codice scaduto', async () => {
      const expiredUser = { ...validResetUser, twoFactorCodeExpires: new Date(Date.now() - 1000) };
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(expiredUser));
      await expect(
        service.confirmPasswordReset('mario@example.com', 'valid-code', 'NewPass'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se purpose è sbagliato', async () => {
      const wrongPurpose = { ...validResetUser, twoFactorCodePurpose: 'login' };
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(wrongPurpose));
      await expect(
        service.confirmPasswordReset('mario@example.com', 'valid-code', 'NewPass'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lancia UnauthorizedException se utente non trovato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(null));
      await expect(
        service.confirmPasswordReset('nessuno@example.com', 'code', 'NewPass'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── requestTwoFactorEnable() ──────────────────────────────────────────────

  describe('requestTwoFactorEnable()', () => {
    it('invia email di verifica 2FA (canale email)', async () => {
      const result = await service.requestTwoFactorEnable('user-1', 'email');
      expect(result).toEqual({ ok: true });
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('lancia BadRequestException se canale SMS non configurato', async () => {
      await expect(
        service.requestTwoFactorEnable('user-1', 'sms'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lancia UnauthorizedException se utente non trovato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(null));
      await expect(
        service.requestTwoFactorEnable('unknown', 'email'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── verifyTwoFactorEnable() ───────────────────────────────────────────────

  describe('verifyTwoFactorEnable()', () => {
    const enableUser: any = {
      ...baseUser,
      twoFactorCode: '$2b$10$hashedCode',
      twoFactorCodePurpose: 'enable',
      twoFactorCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('abilita 2FA e azzera il codice', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(enableUser));
      const result = await service.verifyTwoFactorEnable('user-1', '123456');
      expect(result).toEqual({ ok: true });
      const savedUser = (userRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedUser.twoFactorEnabled).toBe(true);
      expect(savedUser.twoFactorCode).toBeNull();
    });

    it('lancia UnauthorizedException se codice errato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(enableUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.verifyTwoFactorEnable('user-1', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── requestTwoFactorDisable() / verifyTwoFactorDisable() ──────────────────

  describe('requestTwoFactorDisable()', () => {
    const tfActiveUser: any = {
      ...baseUser,
      twoFactorEnabled: true,
      twoFactorChannel: 'email',
    };

    it('invia email per disabilitare 2FA', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(tfActiveUser));
      const result = await service.requestTwoFactorDisable('user-1');
      expect(result).toEqual({ ok: true });
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('lancia BadRequestException se 2FA non è attivo', async () => {
      await expect(
        service.requestTwoFactorDisable('user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('verifyTwoFactorDisable()', () => {
    const disableUser: any = {
      ...baseUser,
      twoFactorEnabled: true,
      twoFactorCode: '$2b$10$hashedCode',
      twoFactorCodePurpose: 'disable',
      twoFactorCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('disabilita 2FA e azzera tutti i campi correlati', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(disableUser));
      const result = await service.verifyTwoFactorDisable('user-1', '123456');
      expect(result).toEqual({ ok: true });
      const savedUser = (userRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedUser.twoFactorEnabled).toBe(false);
      expect(savedUser.twoFactorChannel).toBeNull();
      expect(savedUser.twoFactorCode).toBeNull();
    });

    it('lancia UnauthorizedException se codice errato o scaduto', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(disableUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.verifyTwoFactorDisable('user-1', 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── getProfile() ──────────────────────────────────────────────────────────

  describe('getProfile()', () => {
    it('restituisce i dati del profilo utente', async () => {
      const result = await service.getProfile('user-1');
      expect(result).toMatchObject({
        id: 'user-1',
        email: 'mario@example.com',
        nome: 'Mario',
        cognome: 'Rossi',
      });
    });

    it('lancia UnauthorizedException se utente non trovato', async () => {
      userRepository.createQueryBuilder.mockReturnValue(makeUserQB(null));
      await expect(service.getProfile('unknown')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
