import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

// Mock nodemailer
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('with SMTP configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                const config = {
                  SMTP_HOST: 'smtp.example.com',
                  SMTP_PORT: '587',
                  SMTP_USER: 'user@example.com',
                  SMTP_PASS: 'password',
                  SMTP_SECURE: 'false',
                  SMTP_FROM: 'noreply@example.com',
                };
                return config[key] || defaultValue;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should send email with single recipient', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: undefined,
      });
    });

    it('should send email with multiple recipients', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'test1@example.com, test2@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: undefined,
      });
    });

    it('should send email with HTML content', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      });
    });

    it('should handle email sending errors gracefully', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendEmail({
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test body',
        }),
      ).resolves.not.toThrow();

      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('without SMTP configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should not send email when SMTP is not configured', async () => {
      await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('with partial SMTP configuration', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                const config = {
                  SMTP_HOST: 'smtp.example.com',
                  SMTP_PORT: '587',
                  SMTP_FROM: 'noreply@example.com',
                  // No SMTP_USER and SMTP_PASS
                };
                return config[key] || defaultValue;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should configure transporter without auth when credentials are missing', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(mockSendMail).toHaveBeenCalled();
    });
  });
});
