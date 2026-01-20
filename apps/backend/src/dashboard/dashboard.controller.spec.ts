import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import type { CurrentUserData } from '../auth/current-user.decorator';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DashboardService;

  const mockDashboardService = {
    getAdminDashboard: jest.fn(),
    getStats: jest.fn(),
    getKPI: jest.fn(),
    getDashboardCondivisa: jest.fn(),
  };

  const adminUser: CurrentUserData = {
    id: 'admin-1',
    email: 'admin@example.com',
    nome: 'Admin',
    cognome: 'User',
    ruolo: 'admin',
    clienteId: null,
    studioId: null,
  };

  const studioUser: CurrentUserData = {
    id: 'studio-1',
    email: 'studio@example.com',
    nome: 'Studio',
    cognome: 'User',
    ruolo: 'titolare_studio',
    clienteId: null,
    studioId: 'studio-123',
  };

  const clienteUser: CurrentUserData = {
    id: 'cliente-1',
    email: 'cliente@example.com',
    nome: 'Cliente',
    cognome: 'Test',
    ruolo: 'cliente',
    clienteId: 'cliente-123',
    studioId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard data', async () => {
      const result = { totalStudi: 10, totalPratiche: 100 };
      mockDashboardService.getAdminDashboard.mockResolvedValue(result);

      expect(await controller.getAdminDashboard()).toBe(result);
      expect(service.getAdminDashboard).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return stats for admin without filters', async () => {
      const result = { pratiche: 100, clienti: 50 };
      mockDashboardService.getStats.mockResolvedValue(result);

      await controller.getStats(adminUser);

      expect(service.getStats).toHaveBeenCalledWith(undefined, undefined, adminUser);
    });

    it('should return stats for studio user filtered by studioId', async () => {
      const result = { pratiche: 50, clienti: 20 };
      mockDashboardService.getStats.mockResolvedValue(result);

      await controller.getStats(studioUser);

      expect(service.getStats).toHaveBeenCalledWith(undefined, 'studio-123', studioUser);
    });

    it('should return stats for cliente filtered by clienteId', async () => {
      const result = { pratiche: 5, clienti: 1 };
      mockDashboardService.getStats.mockResolvedValue(result);

      await controller.getStats(clienteUser);

      expect(service.getStats).toHaveBeenCalledWith('cliente-123', undefined, clienteUser);
    });

    it('should use provided clienteId for non-cliente users', async () => {
      const result = { pratiche: 10, clienti: 1 };
      mockDashboardService.getStats.mockResolvedValue(result);

      await controller.getStats(studioUser, 'cliente-456');

      expect(service.getStats).toHaveBeenCalledWith('cliente-456', 'studio-123', studioUser);
    });
  });

  describe('getKPI', () => {
    it('should return KPI for admin', async () => {
      const result = { recuperoTotale: 100000, tassoSuccesso: 75 };
      mockDashboardService.getKPI.mockResolvedValue(result);

      await controller.getKPI(adminUser);

      expect(service.getKPI).toHaveBeenCalledWith(undefined, undefined, adminUser);
    });

    it('should return KPI for studio user', async () => {
      const result = { recuperoTotale: 50000, tassoSuccesso: 80 };
      mockDashboardService.getKPI.mockResolvedValue(result);

      await controller.getKPI(studioUser);

      expect(service.getKPI).toHaveBeenCalledWith(undefined, 'studio-123', studioUser);
    });

    it('should return KPI for cliente', async () => {
      const result = { recuperoTotale: 5000, tassoSuccesso: 70 };
      mockDashboardService.getKPI.mockResolvedValue(result);

      await controller.getKPI(clienteUser);

      expect(service.getKPI).toHaveBeenCalledWith('cliente-123', undefined, clienteUser);
    });
  });

  describe('getDashboardCondivisa', () => {
    it('should return shared dashboard for cliente', async () => {
      const result = { pratiche: [], stats: {} };
      mockDashboardService.getDashboardCondivisa.mockResolvedValue(result);

      expect(await controller.getDashboardCondivisa('cliente-123')).toBe(result);
      expect(service.getDashboardCondivisa).toHaveBeenCalledWith('cliente-123');
    });
  });
});
