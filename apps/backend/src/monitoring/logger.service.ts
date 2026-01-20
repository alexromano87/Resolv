import { Injectable, LoggerService as NestLoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { SentryService } from './sentry.service';

/**
 * Centralized Logging Service
 *
 * Features:
 * - Winston-based structured logging
 * - Multiple transports (console, file, external services)
 * - Log levels configurabili
 * - JSON formatting per parsing automatico
 * - Integrazione con Sentry
 * - Rotation automatica dei file
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly sentryService: SentryService,
  ) {
    this.initializeLogger();
  }

  private initializeLogger() {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');

    const transports: winston.transport[] = [];

    // Console transport (development friendly)
    if (environment === 'development') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const ctx = context ? `[${context}]` : '';
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              return `${timestamp} ${level} ${ctx} ${message} ${metaStr}`;
            }),
          ),
        }),
      );
    } else {
      // Production: JSON format per log aggregation
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    // File transport (opzionale)
    const logToFile = this.configService.get<boolean>('LOG_TO_FILE', false);
    if (logToFile) {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      transports,
      exceptionHandlers: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
      rejectionHandlers: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: any, trace?: string, context?: string) {
    const errorContext = context || this.context;

    this.logger.error(message, {
      context: errorContext,
      trace,
    });

    // Invia a Sentry errori critici
    if (typeof message === 'object' && message instanceof Error) {
      this.sentryService.captureException(message);
    } else if (trace) {
      this.sentryService.captureMessage(`${message}\n${trace}`, 'error');
    }
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Log con metadata addizionale
   */
  logWithMeta(level: string, message: string, meta: Record<string, any>, context?: string) {
    this.logger.log(level, message, {
      context: context || this.context,
      ...meta,
    });
  }

  /**
   * Log per metriche/performance
   */
  metric(name: string, value: number, tags?: Record<string, string>) {
    this.logger.info('Metric', {
      metric_name: name,
      metric_value: value,
      tags,
      context: this.context,
    });
  }

  /**
   * Log per audit trail
   */
  audit(action: string, userId: string, details: Record<string, any>) {
    this.logger.info('Audit', {
      audit_action: action,
      user_id: userId,
      details,
      context: this.context,
    });
  }

  /**
   * Query logger per database
   */
  query(query: string, duration: number) {
    const slowQueryThreshold = this.configService.get<number>('SLOW_QUERY_MS', 1000);

    if (duration > slowQueryThreshold) {
      this.logger.warn('Slow Query Detected', {
        query,
        duration_ms: duration,
        context: 'DatabaseQuery',
      });
    } else {
      this.logger.debug('Query Executed', {
        query,
        duration_ms: duration,
        context: 'DatabaseQuery',
      });
    }
  }
}
