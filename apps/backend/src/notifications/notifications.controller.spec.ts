import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import type { CurrentUserData } from '../auth/current-user.decorator';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    listForUser: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
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
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return all notifications for user', async () => {
      const result = [
        { id: '1', title: 'Notification 1', readAt: null },
        { id: '2', title: 'Notification 2', readAt: new Date() },
      ];
      mockNotificationsService.listForUser.mockResolvedValue(result);

      expect(await controller.list(mockUser)).toBe(result);
      expect(service.listForUser).toHaveBeenCalledWith('user-123', {
        unread: false,
        limit: undefined,
      });
    });

    it('should filter unread notifications', async () => {
      const result = [{ id: '1', title: 'Notification 1', readAt: null }];
      mockNotificationsService.listForUser.mockResolvedValue(result);

      await controller.list(mockUser, 'true');

      expect(service.listForUser).toHaveBeenCalledWith('user-123', {
        unread: true,
        limit: undefined,
      });
    });

    it('should apply limit', async () => {
      const result = [{ id: '1', title: 'Notification 1' }];
      mockNotificationsService.listForUser.mockResolvedValue(result);

      await controller.list(mockUser, undefined, '10');

      expect(service.listForUser).toHaveBeenCalledWith('user-123', {
        unread: false,
        limit: 10,
      });
    });
  });

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      const result = { success: true };
      mockNotificationsService.markRead.mockResolvedValue(result);

      expect(await controller.markRead(mockUser, 'notif-123')).toBe(result);
      expect(service.markRead).toHaveBeenCalledWith('user-123', 'notif-123');
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      const result = { success: true };
      mockNotificationsService.markAllRead.mockResolvedValue(result);

      expect(await controller.markAllRead(mockUser)).toBe(result);
      expect(service.markAllRead).toHaveBeenCalledWith('user-123');
    });
  });
});
