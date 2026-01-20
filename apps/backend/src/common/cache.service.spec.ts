import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    ttl: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      incr: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn(),
    }),
    on: jest.fn(),
    quit: jest.fn(),
  }));
});

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: any;

  beforeEach(async () => {
    const Redis = require('ioredis');
    mockRedis = new Redis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return 6379;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    // Replace the redis instance with our mock
    (service as any).redis = mockRedis;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic cache operations', () => {
    it('should get a value from cache', async () => {
      const testData = { name: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get('test-key');

      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should set a value in cache without TTL', async () => {
      const testData = { name: 'test' };

      await service.set('test-key', testData);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData),
      );
    });

    it('should set a value in cache with TTL', async () => {
      const testData = { name: 'test' };
      const ttl = 300;

      await service.set('test-key', testData, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        ttl,
        JSON.stringify(testData),
      );
    });

    it('should delete a value from cache', async () => {
      await service.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should delete values matching a pattern', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);

      await service.delPattern('test:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should not delete when no keys match pattern', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.delPattern('test:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('session cache helpers', () => {
    it('should get session data', async () => {
      const sessionData = { userId: '123', role: 'admin' };
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await service.getSession('session-123');

      expect(mockRedis.get).toHaveBeenCalledWith('session:session-123');
      expect(result).toEqual(sessionData);
    });

    it('should set session data with TTL', async () => {
      const sessionData = { userId: '123', role: 'admin' };

      await service.setSession('session-123', sessionData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'session:session-123',
        3600,
        JSON.stringify(sessionData),
      );
    });

    it('should delete session data', async () => {
      await service.deleteSession('session-123');

      expect(mockRedis.del).toHaveBeenCalledWith('session:session-123');
    });
  });

  describe('user cache helpers', () => {
    it('should get user data', async () => {
      const userData = { id: '123', email: 'test@example.com' };
      mockRedis.get.mockResolvedValue(JSON.stringify(userData));

      const result = await service.getUser('user-123');

      expect(mockRedis.get).toHaveBeenCalledWith('user:user-123');
      expect(result).toEqual(userData);
    });

    it('should set user data with TTL', async () => {
      const userData = { id: '123', email: 'test@example.com' };

      await service.setUser('user-123', userData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:user-123',
        600,
        JSON.stringify(userData),
      );
    });

    it('should invalidate user data', async () => {
      await service.invalidateUser('user-123');

      expect(mockRedis.del).toHaveBeenCalledWith('user:user-123');
    });
  });

  describe('list cache helpers', () => {
    it('should get list data', async () => {
      const listData = [{ id: '1' }, { id: '2' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(listData));

      const result = await service.getList('pratiche');

      expect(mockRedis.get).toHaveBeenCalledWith('list:pratiche');
      expect(result).toEqual(listData);
    });

    it('should set list data with TTL', async () => {
      const listData = [{ id: '1' }, { id: '2' }];

      await service.setList('pratiche', listData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'list:pratiche',
        60,
        JSON.stringify(listData),
      );
    });

    it('should invalidate list data', async () => {
      await service.invalidateList('pratiche');

      expect(mockRedis.del).toHaveBeenCalledWith('list:pratiche');
    });
  });

  describe('lookup cache helpers', () => {
    it('should get lookup data', async () => {
      const lookupData = { tribunali: ['Milano', 'Roma'] };
      mockRedis.get.mockResolvedValue(JSON.stringify(lookupData));

      const result = await service.getLookup('tribunali');

      expect(mockRedis.get).toHaveBeenCalledWith('lookup:tribunali');
      expect(result).toEqual(lookupData);
    });

    it('should set lookup data with TTL', async () => {
      const lookupData = { tribunali: ['Milano', 'Roma'] };

      await service.setLookup('tribunali', lookupData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'lookup:tribunali',
        300,
        JSON.stringify(lookupData),
      );
    });

    it('should invalidate lookup data', async () => {
      await service.invalidateLookup('tribunali');

      expect(mockRedis.del).toHaveBeenCalledWith('lookup:tribunali');
    });

    it('should invalidate all lookups', async () => {
      mockRedis.keys.mockResolvedValue([
        'lookup:tribunali',
        'lookup:stati',
        'lookup:types',
      ]);

      await service.invalidateAllLookups();

      expect(mockRedis.keys).toHaveBeenCalledWith('lookup:*');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'lookup:tribunali',
        'lookup:stati',
        'lookup:types',
      );
    });
  });

  describe('counter operations', () => {
    it('should increment a counter with TTL', async () => {
      const mockPipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 5]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.increment('counter:test', 60);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.incr).toHaveBeenCalledWith('counter:test');
      expect(mockPipeline.expire).toHaveBeenCalledWith('counter:test', 60);
      expect(result).toBe(5);
    });

    it('should decrement a counter', async () => {
      mockRedis.decr.mockResolvedValue(3);

      const result = await service.decrement('counter:test');

      expect(mockRedis.decr).toHaveBeenCalledWith('counter:test');
      expect(result).toBe(3);
    });

    it('should get TTL for a key', async () => {
      mockRedis.ttl.mockResolvedValue(120);

      const result = await service.getTTL('test-key');

      expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
      expect(result).toBe(120);
    });
  });

  describe('error handling', () => {
    it('should handle get errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle set errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('test-key', 'value', 60)).resolves.not.toThrow();
    });

    it('should handle delete errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.del('test-key')).resolves.not.toThrow();
    });

    it('should throw on increment error when redis unavailable', async () => {
      (service as any).redis = null;

      await expect(service.increment('counter:test', 60)).rejects.toThrow(
        'Redis not available',
      );
    });

    it('should throw on decrement error when redis unavailable', async () => {
      (service as any).redis = null;

      await expect(service.decrement('counter:test')).rejects.toThrow(
        'Redis not available',
      );
    });

    it('should return -1 for TTL when redis unavailable', async () => {
      (service as any).redis = null;

      const result = await service.getTTL('test-key');

      expect(result).toBe(-1);
    });
  });

  describe('lifecycle', () => {
    it('should close redis connection on module destroy', async () => {
      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
