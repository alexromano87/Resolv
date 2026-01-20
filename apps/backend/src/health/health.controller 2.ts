import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../common/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'unknown',
      redis: 'unknown',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Check database connection
    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'healthy';
    } catch (error) {
      checks.database = 'unhealthy';
      checks.status = 'degraded';
    }

    // Check Redis connection
    try {
      const testKey = `health:check:${Date.now()}`;
      await this.cacheService.set(testKey, 'ok', 5);
      const value = await this.cacheService.get(testKey);
      await this.cacheService.del(testKey);
      checks.redis = value === 'ok' ? 'healthy' : 'unhealthy';
    } catch (error) {
      checks.redis = 'unhealthy';
      // Redis is not critical, so we don't mark as degraded
    }

    return checks;
  }

  @Get('ready')
  async readiness() {
    // For Kubernetes readiness probe - checks if app is ready to serve traffic
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready' };
    } catch (error) {
      throw new Error('Database not ready');
    }
  }

  @Get('live')
  liveness() {
    // For Kubernetes liveness probe - checks if app is alive
    return { status: 'alive', uptime: process.uptime() };
  }
}
