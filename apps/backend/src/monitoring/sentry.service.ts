import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

/**
 * Sentry Error Tracking & Performance Monitoring Service
 *
 * Features:
 * - Error tracking e crash reporting
 * - Performance monitoring (APM)
 * - Transaction tracing
 * - User context tracking
 * - Release tracking
 * - Environment-based filtering
 */
@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const release = this.configService.get<string>('SENTRY_RELEASE') ||
                    this.configService.get<string>('npm_package_version');

    if (!dsn) {
      this.logger.warn('Sentry DSN not configured, error tracking disabled');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        release,

        // Performance Monitoring
        tracesSampleRate: this.getTracesSampleRate(environment),

        // Error filtering
        beforeSend: (event, hint) => {
          // Non inviare errori in development (opzionale)
          if (environment === 'development') {
            const sendInDev = this.configService.get<boolean>('SENTRY_SEND_IN_DEV', false);
            if (!sendInDev) {
              this.logger.debug('Sentry error suppressed in development:', hint.originalException);
              return null;
            }
          }

          // Filtra errori noti/ignorabili
          if (this.shouldIgnoreError(event, hint)) {
            return null;
          }

          return event;
        },

        // Breadcrumbs filtering
        beforeBreadcrumb: (breadcrumb) => {
          // Non loggare console.log in produzione
          if (breadcrumb.category === 'console' && environment === 'production') {
            return null;
          }
          return breadcrumb;
        },

        // Error sampling (invia solo % degli errori in produzione)
        sampleRate: environment === 'production' ? 1.0 : 1.0,
      });

      this.enabled = true;
      this.logger.log(`Sentry initialized (env: ${environment}, release: ${release})`);
    } catch (error) {
      this.logger.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Sample rate per transaction tracing
   */
  private getTracesSampleRate(environment: string): number {
    const envRate = this.configService.get<number>('SENTRY_TRACES_SAMPLE_RATE');
    if (envRate !== undefined) return envRate;

    // Default: sample più in development, meno in production
    switch (environment) {
      case 'development':
        return 1.0; // 100% - trace tutto
      case 'staging':
        return 0.5; // 50%
      case 'production':
        return 0.1; // 10% - riduce costi
      default:
        return 0.2;
    }
  }


  /**
   * Determina se un errore deve essere ignorato
   */
  private shouldIgnoreError(event: Sentry.Event, hint: Sentry.EventHint): boolean {
    const error = hint.originalException;

    // Ignora errori HTTP noti
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      // Ignora 4xx client errors (tranne 401, 403, 429)
      if (status >= 400 && status < 500 && ![401, 403, 429].includes(status)) {
        return true;
      }
    }

    // Ignora errori di validazione
    if (event.exception?.values?.[0]?.type === 'BadRequestException') {
      return true;
    }

    // Ignora timeout da client
    if (event.exception?.values?.[0]?.type === 'AbortError') {
      return true;
    }

    return false;
  }

  /**
   * Capture manual exception
   */
  captureException(exception: any, context?: Partial<Sentry.EventHint>): string | undefined {
    if (!this.enabled) return undefined;

    try {
      return Sentry.captureException(exception, context);
    } catch (error) {
      this.logger.error('Failed to capture exception to Sentry:', error);
      return undefined;
    }
  }

  /**
   * Capture manual message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): string | undefined {
    if (!this.enabled) return undefined;

    try {
      return Sentry.captureMessage(message, level);
    } catch (error) {
      this.logger.error('Failed to capture message to Sentry:', error);
      return undefined;
    }
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; username?: string } | null): void {
    if (!this.enabled) return;

    try {
      Sentry.setUser(user);
    } catch (error) {
      this.logger.error('Failed to set Sentry user:', error);
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.enabled) return;

    try {
      Sentry.addBreadcrumb(breadcrumb);
    } catch (error) {
      this.logger.error('Failed to add Sentry breadcrumb:', error);
    }
  }

  /**
   * Set custom tag
   */
  setTag(key: string, value: string): void {
    if (!this.enabled) return;

    try {
      Sentry.setTag(key, value);
    } catch (error) {
      this.logger.error('Failed to set Sentry tag:', error);
    }
  }

  /**
   * Set custom context
   */
  setContext(name: string, context: Record<string, any>): void {
    if (!this.enabled) return;

    try {
      Sentry.setContext(name, context);
    } catch (error) {
      this.logger.error('Failed to set Sentry context:', error);
    }
  }

  /**
   * Start transaction for performance monitoring
   */
  startTransaction(context: any): any {
    return Sentry.startTransaction(context);
  }

  /**
   * Flush events (useful before shutdown)
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.enabled) return true;

    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      this.logger.error('Failed to flush Sentry:', error);
      return false;
    }
  }

  /**
   * Close Sentry client
   */
  async close(timeout = 2000): Promise<boolean> {
    if (!this.enabled) return true;

    try {
      return await Sentry.close(timeout);
    } catch (error) {
      this.logger.error('Failed to close Sentry:', error);
      return false;
    }
  }
}
