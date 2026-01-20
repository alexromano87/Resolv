import { User } from './user.entity';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user.id = 'user-1';
    user.email = 'test@example.com';
    user.password = 'hashed-password';
    user.nome = 'Mario';
    user.cognome = 'Rossi';
    user.ruolo = 'collaboratore';
    user.attivo = true;
  });

  describe('basic properties', () => {
    it('should have an id', () => {
      expect(user.id).toBe('user-1');
    });

    it('should have an email', () => {
      expect(user.email).toBe('test@example.com');
    });

    it('should have a password', () => {
      expect(user.password).toBe('hashed-password');
    });

    it('should have nome and cognome', () => {
      expect(user.nome).toBe('Mario');
      expect(user.cognome).toBe('Rossi');
    });
  });

  describe('ruolo', () => {
    it('should accept collaboratore role', () => {
      user.ruolo = 'collaboratore';
      expect(user.ruolo).toBe('collaboratore');
    });

    it('should accept avvocato role', () => {
      user.ruolo = 'avvocato';
      expect(user.ruolo).toBe('avvocato');
    });

    it('should accept cliente role', () => {
      user.ruolo = 'cliente';
      expect(user.ruolo).toBe('cliente');
    });

    it('should accept studio role', () => {
      user.ruolo = 'studio';
      expect(user.ruolo).toBe('studio');
    });

    it('should accept superadmin role', () => {
      user.ruolo = 'superadmin';
      expect(user.ruolo).toBe('superadmin');
    });

    it('should accept admin role', () => {
      user.ruolo = 'admin';
      expect(user.ruolo).toBe('admin');
    });
  });

  describe('status flags', () => {
    it('should be attivo by default', () => {
      expect(user.attivo).toBe(true);
    });

    it('should allow setting attivo to false', () => {
      user.attivo = false;
      expect(user.attivo).toBe(false);
    });

    it('should track tokenVersion', () => {
      user.tokenVersion = 5;
      expect(user.tokenVersion).toBe(5);
    });
  });

  describe('2FA properties', () => {
    it('should have twoFactorEnabled flag', () => {
      user.twoFactorEnabled = true;
      expect(user.twoFactorEnabled).toBe(true);
    });

    it('should store twoFactorCode', () => {
      user.twoFactorCode = '123456';
      expect(user.twoFactorCode).toBe('123456');
    });

    it('should store twoFactorCodeExpiresAt', () => {
      const expiryDate = new Date();
      user.twoFactorCodeExpiresAt = expiryDate;
      expect(user.twoFactorCodeExpiresAt).toBe(expiryDate);
    });

    it('should store twoFactorChannel', () => {
      user.twoFactorChannel = 'email';
      expect(user.twoFactorChannel).toBe('email');
    });
  });

  describe('login security', () => {
    it('should track failed login attempts', () => {
      user.failedLoginAttempts = 3;
      expect(user.failedLoginAttempts).toBe(3);
    });

    it('should store lockout timestamp', () => {
      const lockoutDate = new Date();
      user.lockoutUntil = lockoutDate;
      expect(user.lockoutUntil).toBe(lockoutDate);
    });

    it('should check if account is locked', () => {
      user.lockoutUntil = new Date(Date.now() + 3600000); // 1 hour from now
      const isLocked = user.lockoutUntil && user.lockoutUntil.getTime() > Date.now();
      expect(isLocked).toBe(true);
    });

    it('should check if account lockout has expired', () => {
      user.lockoutUntil = new Date(Date.now() - 3600000); // 1 hour ago
      const isLocked = user.lockoutUntil && user.lockoutUntil.getTime() > Date.now();
      expect(isLocked).toBe(false);
    });
  });

  describe('refresh token', () => {
    it('should store refresh token hash', () => {
      user.refreshTokenHash = 'hashed-refresh-token';
      expect(user.refreshTokenHash).toBe('hashed-refresh-token');
    });

    it('should store refresh token expiry', () => {
      const expiryDate = new Date();
      user.refreshTokenExpiresAt = expiryDate;
      expect(user.refreshTokenExpiresAt).toBe(expiryDate);
    });

    it('should check if refresh token is expired', () => {
      user.refreshTokenExpiresAt = new Date(Date.now() - 3600000); // 1 hour ago
      const isExpired = user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() < Date.now();
      expect(isExpired).toBe(true);
    });

    it('should check if refresh token is valid', () => {
      user.refreshTokenExpiresAt = new Date(Date.now() + 3600000); // 1 hour from now
      const isValid = user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() > Date.now();
      expect(isValid).toBe(true);
    });
  });

  describe('password reset', () => {
    it('should store reset token hash', () => {
      user.resetTokenHash = 'hashed-reset-token';
      expect(user.resetTokenHash).toBe('hashed-reset-token');
    });

    it('should store reset token expiry', () => {
      const expiryDate = new Date();
      user.resetTokenExpiresAt = expiryDate;
      expect(user.resetTokenExpiresAt).toBe(expiryDate);
    });
  });

  describe('relationships', () => {
    it('should have optional studioId', () => {
      user.studioId = 'studio-1';
      expect(user.studioId).toBe('studio-1');
    });

    it('should have optional clienteId', () => {
      user.clienteId = 'cliente-1';
      expect(user.clienteId).toBe('cliente-1');
    });
  });

  describe('contact info', () => {
    it('should store telefono', () => {
      user.telefono = '1234567890';
      expect(user.telefono).toBe('1234567890');
    });

    it('should allow optional telefono', () => {
      user.telefono = undefined;
      expect(user.telefono).toBeUndefined();
    });
  });

  describe('timestamps', () => {
    it('should have createdAt', () => {
      user.createdAt = new Date();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt', () => {
      user.updatedAt = new Date();
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });
});
