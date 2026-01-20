import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { CurrentUserData } from './current-user.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
    verifyTwoFactorLogin: jest.fn(),
    refreshToken: jest.fn(),
    getProfile: jest.fn(),
    changePassword: jest.fn(),
    logoutAll: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  };

  const mockUser: CurrentUserData = {
    id: 'user-123',
    email: 'test@example.com',
    nome: 'Test',
    cognome: 'User',
    ruolo: 'collaboratore',
    clienteId: null,
    studioId: 'studio-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'password123',
        nome: 'New',
        cognome: 'User',
      };
      const result = { id: '1', ...dto };
      mockAuthService.register.mockResolvedValue(result);

      expect(await controller.register(dto)).toBe(result);
      expect(service.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const result = { accessToken: 'token', user: mockUser };
      mockAuthService.login.mockResolvedValue(result);

      expect(await controller.login(dto)).toBe(result);
      expect(service.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset', async () => {
      const dto = { email: 'test@example.com' };
      const result = { success: true };
      mockAuthService.requestPasswordReset.mockResolvedValue(result);

      expect(await controller.requestPasswordReset(dto)).toBe(result);
      expect(service.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('confirmPasswordReset', () => {
    it('should confirm password reset', async () => {
      const dto = {
        email: 'test@example.com',
        token: 'reset-token',
        newPassword: 'newpass123',
      };
      const result = { success: true };
      mockAuthService.confirmPasswordReset.mockResolvedValue(result);

      expect(await controller.confirmPasswordReset(dto)).toBe(result);
      expect(service.confirmPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        'reset-token',
        'newpass123',
      );
    });
  });

  describe('verifyTwoFactorLogin', () => {
    it('should verify 2FA code', async () => {
      const dto = { userId: 'user-123', code: '123456' };
      const result = { accessToken: 'token' };
      mockAuthService.verifyTwoFactorLogin.mockResolvedValue(result);

      expect(await controller.verifyTwoFactorLogin(dto)).toBe(result);
      expect(service.verifyTwoFactorLogin).toHaveBeenCalledWith('user-123', '123456');
    });
  });

  describe('refresh', () => {
    it('should refresh token', async () => {
      const dto = { userId: 'user-123', refreshToken: 'refresh-token' };
      const result = { accessToken: 'new-token' };
      mockAuthService.refreshToken.mockResolvedValue(result);

      expect(await controller.refresh(dto)).toBe(result);
      expect(service.refreshToken).toHaveBeenCalledWith('user-123', 'refresh-token');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const result = { ...mockUser, additionalData: 'data' };
      mockAuthService.getProfile.mockResolvedValue(result);

      expect(await controller.getProfile(mockUser)).toBe(result);
      expect(service.getProfile).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      const result = await controller.getCurrentUser(mockUser);

      expect(result).toBe(mockUser);
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const dto = { oldPassword: 'old123', newPassword: 'new123' };
      const result = { success: true };
      mockAuthService.changePassword.mockResolvedValue(result);

      expect(await controller.changePassword(mockUser, dto)).toBe(result);
      expect(service.changePassword).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('logoutAll', () => {
    it('should logout user from all devices', async () => {
      const result = { success: true };
      mockAuthService.logoutAll.mockResolvedValue(result);

      expect(await controller.logoutAll(mockUser)).toBe(result);
      expect(service.logoutAll).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getSettings', () => {
    it('should return user settings', async () => {
      const result = { theme: 'dark', notifications: true };
      mockAuthService.getSettings.mockResolvedValue(result);

      expect(await controller.getSettings(mockUser)).toBe(result);
      expect(service.getSettings).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateSettings', () => {
    it('should update user settings', async () => {
      const dto = { theme: 'light' };
      const result = { theme: 'light', notifications: true };
      mockAuthService.updateSettings.mockResolvedValue(result);

      expect(await controller.updateSettings(mockUser, dto)).toBe(result);
      expect(service.updateSettings).toHaveBeenCalledWith('user-123', dto);
    });
  });
});
