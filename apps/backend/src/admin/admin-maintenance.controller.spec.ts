import { Test, TestingModule } from '@nestjs/testing';
import { AdminMaintenanceController } from './admin-maintenance.controller';
import { AdminMaintenanceService } from './admin-maintenance.service';

describe('AdminMaintenanceController', () => {
  let controller: AdminMaintenanceController;
  let service: AdminMaintenanceService;

  const mockAdminMaintenanceService = {
    getOrphanData: jest.fn(),
    assignOrphanDataToStudio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMaintenanceController],
      providers: [
        {
          provide: AdminMaintenanceService,
          useValue: mockAdminMaintenanceService,
        },
      ],
    }).compile();

    controller = module.get<AdminMaintenanceController>(AdminMaintenanceController);
    service = module.get<AdminMaintenanceService>(AdminMaintenanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOrphanData', () => {
    it('should return orphan data', async () => {
      const result = {
        pratiche: [],
        clienti: [],
        debitori: [],
      };
      mockAdminMaintenanceService.getOrphanData.mockResolvedValue(result);

      expect(await controller.getOrphanData()).toBe(result);
      expect(service.getOrphanData).toHaveBeenCalled();
    });
  });

  describe('assignOrphanData', () => {
    it('should assign orphan data to studio', async () => {
      const body = { studioId: 'studio-123' };
      const result = { success: true, assigned: 5 };
      mockAdminMaintenanceService.assignOrphanDataToStudio.mockResolvedValue(result);

      expect(await controller.assignOrphanData(body)).toBe(result);
      expect(service.assignOrphanDataToStudio).toHaveBeenCalledWith('studio-123');
    });
  });
});
