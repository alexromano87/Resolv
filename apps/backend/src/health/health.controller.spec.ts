import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { CacheService } from '../common/cache.service';
import { PerformanceService } from '../monitoring/performance.service';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: DataSource;
  let cacheService: CacheService;
  let performanceService: PerformanceService;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockPerformanceService = {
    getHealthStatus: jest.fn(),
    getAllMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: PerformanceService,
          useValue: mockPerformanceService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get<DataSource>(DataSource);
    cacheService = module.get<CacheService>(CacheService);
    performanceService = module.get<PerformanceService>(PerformanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return healthy status when all checks pass', async () => {
      mockDataSource.query.mockResolvedValue([{ 1: 1 }]);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('ok');
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('healthy');
      expect(result.redis).toBe('healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
    });

    it('should return degraded status when database fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB Error'));
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue('ok');
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('unhealthy');
    });

    it('should mark redis unhealthy but not degrade status when redis fails', async () => {
      mockDataSource.query.mockResolvedValue([{ 1: 1 }]);
      mockCacheService.set.mockRejectedValue(new Error('Redis Error'));

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('healthy');
      expect(result.redis).toBe('unhealthy');
    });
  });

  describe('readiness', () => {
    it('should return ready status when database is accessible', async () => {
      mockDataSource.query.mockResolvedValue([{ 1: 1 }]);

      const result = await controller.readiness();

      expect(result).toEqual({ status: 'ready' });
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw error when database is not accessible', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB Error'));

      await expect(controller.readiness()).rejects.toThrow('Database not ready');
    });
  });

  describe('liveness', () => {
    it('should return alive status with uptime', () => {
      const result = controller.liveness();

      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('getMetrics', () => {
    it('should return health and metrics data', () => {
      const mockHealth = { cpu: 50, memory: 60 };
      const mockMetrics = { requests: 100, errors: 5 };

      mockPerformanceService.getHealthStatus.mockReturnValue(mockHealth);
      mockPerformanceService.getAllMetrics.mockReturnValue(mockMetrics);

      const result = controller.getMetrics();

      expect(result.health).toBe(mockHealth);
      expect(result.metrics).toBe(mockMetrics);
      expect(result).toHaveProperty('timestamp');
      expect(performanceService.getHealthStatus).toHaveBeenCalled();
      expect(performanceService.getAllMetrics).toHaveBeenCalled();
    });
  });
});
