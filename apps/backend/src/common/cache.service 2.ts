import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private readonly TTL = {
    SESSION: 3600, // 1 hour
    LOOKUP: 300, // 5 minutes
    USER: 600, // 10 minutes
    LIST: 60, // 1 minute for lists
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed after 3 retries, continuing without cache');
            return null;
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis error:', err);
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected successfully');
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.redis) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  // Session cache helpers
  async getSession(sessionId: string): Promise<any | null> {
    return this.get(`session:${sessionId}`);
  }

  async setSession(sessionId: string, data: any): Promise<void> {
    await this.set(`session:${sessionId}`, data, this.TTL.SESSION);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // User cache helpers
  async getUser(userId: string): Promise<any | null> {
    return this.get(`user:${userId}`);
  }

  async setUser(userId: string, data: any): Promise<void> {
    await this.set(`user:${userId}`, data, this.TTL.USER);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.del(`user:${userId}`);
  }

  // List cache helpers
  async getList(key: string): Promise<any[] | null> {
    return this.get(`list:${key}`);
  }

  async setList(key: string, data: any[]): Promise<void> {
    await this.set(`list:${key}`, data, this.TTL.LIST);
  }

  async invalidateList(key: string): Promise<void> {
    await this.del(`list:${key}`);
  }

  // Lookup cache helpers (for dropdown data, rarely changing)
  async getLookup(key: string): Promise<any | null> {
    return this.get(`lookup:${key}`);
  }

  async setLookup(key: string, data: any): Promise<void> {
    await this.set(`lookup:${key}`, data, this.TTL.LOOKUP);
  }

  async invalidateLookup(key: string): Promise<void> {
    await this.del(`lookup:${key}`);
  }

  async invalidateAllLookups(): Promise<void> {
    await this.delPattern('lookup:*');
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
