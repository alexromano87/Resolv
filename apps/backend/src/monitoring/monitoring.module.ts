import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SentryService } from './sentry.service';
import { SentryInterceptor } from './sentry.interceptor';
import { LoggerService } from './logger.service';
import { PerformanceService } from './performance.service';

/**
 * Global Monitoring Module
 *
 * Fornisce:
 * - Error tracking (Sentry)
 * - Centralized logging (Winston)
 * - Performance monitoring
 * - Metrics collection
 */
@Global()
@Module({
  providers: [
    SentryService,
    LoggerService,
    PerformanceService,
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
  exports: [SentryService, LoggerService, PerformanceService],
})
export class MonitoringModule {}
