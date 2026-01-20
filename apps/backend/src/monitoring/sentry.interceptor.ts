import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SentryService } from './sentry.service';
import * as Sentry from '@sentry/node';

/**
 * Sentry Interceptor per tracking automatico
 *
 * Features:
 * - Cattura automaticamente eccezioni non gestite
 * - Aggiunge context HTTP (request, response)
 * - Traccia performance delle richieste
 * - Aggiunge breadcrumb per debugging
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers, ip, body } = request;

    // Start performance transaction
    const transaction = this.sentryService.startTransaction({
      op: 'http.server',
      name: `${method} ${this.getRouteName(request)}`,
      data: {
        url,
        method,
        headers: this.sanitizeHeaders(headers),
        ip,
      },
    });

    // Set user context se disponibile
    if (request.user) {
      this.sentryService.setUser({
        id: request.user.id || request.user.sub,
        email: request.user.email,
        username: request.user.username || request.user.nome,
      });
    }

    // Add breadcrumb per la richiesta
    this.sentryService.addBreadcrumb({
      category: 'http',
      message: `${method} ${url}`,
      level: 'info',
      data: {
        url,
        method,
        ip,
      },
    });

    return next.handle().pipe(
      tap(() => {
        // Success - finish transaction
        if (transaction) {
          transaction.setHttpStatus(200);
          transaction.finish();
        }
      }),
      catchError((error) => {
        // Error - capture and finish transaction
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;

        if (transaction) {
          transaction.setHttpStatus(statusCode);
          transaction.finish();
        }

        // Cattura errore in Sentry (solo se >= 500)
        if (statusCode >= 500) {
          Sentry.withScope((scope) => {
            scope.setContext('http', {
              method,
              url,
              status_code: statusCode,
              headers: this.sanitizeHeaders(headers),
              body: this.sanitizeBody(body),
              ip,
            });

            if (request.user) {
              scope.setUser({
                id: request.user.id || request.user.sub,
                email: request.user.email,
              });
            }

            this.sentryService.captureException(error);
          });
        }

        return throwError(() => error);
      }),
    );
  }

  /**
   * Ottieni route pattern (es: /users/:id)
   */
  private getRouteName(request: any): string {
    return request.route?.path || request.url || 'unknown';
  }

  /**
   * Sanitize headers (rimuovi token, cookies, etc)
   */
  private sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize body (rimuovi password, token, etc)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'refreshToken'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
