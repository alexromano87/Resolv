import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { CheckupAuditLogService } from './checkup-audit-log.service';
import type { CheckupAuditAction, CheckupAuditEntity } from './checkup-audit-log.entity';

@Injectable()
export class CheckupAuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: CheckupAuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const start = Date.now();

    const url = String(request.originalUrl || request.url || '');
    if (!this.shouldLog(url)) {
      return next.handle();
    }
    if (this.isAnswerUpdate(request.method, url)) {
      return next.handle();
    }
    if (this.isNonAuditableHeartbeatOrSession(request.method, url)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result) => {
        const { action, entityType, description } = this.getActionAndEntity(request.method, url);
        if (!action || !entityType) return;
        const user = this.resolveAuditUser(request, result);
        const resolvedDescription = this.resolveDescription(description, action, user, result, true);
        this.auditLogService.log({
          userId: user.id || null,
          userEmail: user.email || null,
          userRole: user.ruolo || null,
          action,
          entityType,
          entityName: user.email || null,
          description: resolvedDescription,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || null,
          studioId: user.studioId || null,
          success: true,
          metadata: {
            method: request.method,
            url,
            statusCode: response.statusCode,
            durationMs: Date.now() - start,
          },
        }).catch(() => {});
      }),
      catchError((err) => {
        const { action: mappedAction, entityType, description } = this.getActionAndEntity(request.method, url);
        const action = mappedAction === 'LOGIN' ? 'LOGIN_FAILED' : mappedAction;
        if (action && entityType) {
          const user = this.resolveAuditUser(request);
          const resolvedDescription = this.resolveDescription(description, action, user, null, false);
          this.auditLogService.log({
            userId: user.id || null,
            userEmail: user.email || null,
            userRole: user.ruolo || null,
            action,
            entityType,
            entityName: user.email || null,
            description: resolvedDescription,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || null,
            studioId: user.studioId || null,
            success: false,
            errorMessage: err?.message || 'Errore',
            metadata: {
              method: request.method,
              url,
              statusCode: response.statusCode,
              durationMs: Date.now() - start,
            },
          }).catch(() => {});
        }
        throw err;
      }),
    );
  }

  private resolveAuditUser(request: any, result?: any) {
    const authenticatedUser = request.user || {};
    const responseUser = result?.user || {};
    const attemptedEmail = this.normalizeEmail(request.body?.email);

    return {
      id: authenticatedUser.id || responseUser.id || null,
      email: authenticatedUser.email || responseUser.email || attemptedEmail || null,
      ruolo: authenticatedUser.ruolo || responseUser.ruolo || null,
      studioId: authenticatedUser.studioId || responseUser.studioId || null,
    };
  }

  private normalizeEmail(value: unknown) {
    return typeof value === 'string' ? value.trim().toLowerCase() : null;
  }

  private resolveDescription(
    description: string | undefined,
    action: CheckupAuditAction,
    user: { email?: string | null },
    result: any,
    success: boolean,
  ) {
    if (action === 'LOGIN') {
      const email = user.email || 'utente non identificato';
      if (result?.requiresTwoFactor) return `Login checkup per ${email} - verifica 2FA richiesta`;
      return `Login checkup effettuato da ${email}`;
    }
    if (action === 'LOGIN_FAILED') {
      return `Login checkup fallito per ${user.email || 'utente non identificato'}`;
    }
    if (!success && description) return description;
    return description;
  }

  private shouldLog(url: string) {
    return url.startsWith('/checkup') || url.startsWith('/admin/checkup');
  }

  private isAnswerUpdate(method: string, url: string) {
    // Answer saves (PUT) — already excluded
    if (method === 'PUT') {
      if (url.startsWith('/checkup/preassessment/clients/')) return true;
      if (url === '/checkup/preassessment') return true;
      if (url.includes('/checkup/questionnaires/') && url.includes('/answers')) return true;
    }
    // Presence heartbeat
    if (url.includes('/presence/active') || url.includes('/presence/inactive')) return true;
    // Typing indicators
    if (url.includes('/typing')) return true;
    // Mark-seen
    if (url.includes('/mark-seen')) return true;
    // Chat read-status updates
    if (method === 'PATCH' && url.includes('/chat/') && url.endsWith('/read')) return true;
    return false;
  }

  private isNonAuditableHeartbeatOrSession(method: string, url: string) {
    if (method !== 'POST' && method !== 'PATCH') return false;

    // Session maintenance and setup flows do not create domain records.
    if (url.includes('/checkup/auth/refresh')) return true;
    if (url.includes('/checkup/auth/change-password')) return true;
    if (url.includes('/checkup/auth/password-reset/')) return true;
    if (url.includes('/checkup/auth/2fa/')) return true;

    // Online/typing/read-state and notification bookkeeping are high-frequency
    // state updates; logging them as CREATE pollutes the audit trail.
    if (url.includes('/checkup/direct-chat/presence')) return true;
    if (url.includes('/messages/') && url.endsWith('/read')) return true;
    if (url.includes('/conversations/') && (url.endsWith('/archive') || url.endsWith('/restore'))) return true;
    if (url.includes('/checkup/preassessment/alerts/') && (url.endsWith('/mute') || url.endsWith('/restore'))) return true;

    return false;
  }

  private getActionAndEntity(
    method: string,
    url: string,
  ): { action: CheckupAuditAction | null; entityType: CheckupAuditEntity | null; description?: string } {
    if (url.includes('/checkup/auth/login')) {
      return { action: 'LOGIN', entityType: 'SYSTEM', description: 'Login checkup' };
    }
    if (url.includes('/checkup/auth/logout')) {
      return { action: 'LOGOUT', entityType: 'SYSTEM', description: 'Logout checkup' };
    }
    if (url.includes('/admin/checkup/export')) {
      return { action: null, entityType: null };
    }
    if (url.includes('/admin/checkup/import')) {
      return { action: 'IMPORT_DATA', entityType: 'SYSTEM', description: 'Import dati checkup' };
    }
    if (url.includes('/admin/checkup/backup')) {
      return { action: 'BACKUP_DATA', entityType: 'SYSTEM', description: 'Backup/Ripristino checkup' };
    }

    const entityType = this.extractEntityType(url);
    const action = this.mapAction(method, url);
    return { action, entityType, description: undefined };
  }

  private mapAction(method: string, url: string): CheckupAuditAction | null {
    if (method === 'POST') {
      if (this.isCreateEndpoint(url)) return 'CREATE';
      if (this.isUpdatePostEndpoint(url)) return 'UPDATE';
      return null;
    }
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';
    if (method === 'GET') return null;
    return null;
  }

  private isCreateEndpoint(url: string) {
    const path = this.getPath(url);

    return [
      /^\/admin\/checkup\/studios$/,
      /^\/admin\/checkup\/anagrafiche-licenziatario$/,
      /^\/admin\/checkup\/users$/,
      /^\/admin\/checkup\/clients$/,
      /^\/admin\/checkup\/licenses$/,
      /^\/admin\/checkup\/sublicenses$/,
      /^\/admin\/checkup\/questions\/models$/,
      /^\/admin\/checkup\/questions\/macro-areas$/,
      /^\/admin\/checkup\/questions\/sections$/,
      /^\/admin\/checkup\/questions\/fields$/,
      /^\/checkup\/users$/,
      /^\/checkup\/studios\/clients$/,
      /^\/checkup\/questionnaires$/,
      /^\/checkup\/question-management\/models$/,
      /^\/checkup\/question-management\/macro-areas$/,
      /^\/checkup\/question-management\/sections$/,
      /^\/checkup\/question-management\/fields$/,
      /^\/checkup\/preassessment\/pdf\/jobs$/,
      /^\/checkup\/preassessment\/[^/]+\/documents\/download-zip\/jobs$/,
      /^\/checkup\/direct-chat\/conversations$/,
      /^\/checkup\/direct-chat\/conversations\/[^/]+\/messages$/,
      /^\/checkup\/chat\/questionnaires\/[^/]+\/sections\/[^/]+\/chat$/,
      /^\/checkup\/preassessment\/[^/]+\/sections\/[^/]+\/chat$/,
      /^\/checkup\/preassessment\/[^/]+\/documents\/upload$/,
      /^\/checkup\/questionnaires\/[^/]+\/documents\/upload$/,
    ].some((pattern) => pattern.test(path));
  }

  private isUpdatePostEndpoint(url: string) {
    const path = this.getPath(url);

    return [
      /^\/checkup\/preassessment\/complete$/,
      /^\/checkup\/preassessment\/final-validate$/,
      /^\/checkup\/preassessment\/final-reopen$/,
      /^\/checkup\/preassessment\/[^/]+\/report\/salva$/,
      /^\/checkup\/preassessment\/tickets\/[^/]+\/assign$/,
      /^\/checkup\/preassessment\/tickets\/[^/]+\/request-close$/,
      /^\/checkup\/preassessment\/tickets\/[^/]+\/confirm-close$/,
      /^\/checkup\/preassessment\/tickets\/[^/]+\/reopen$/,
      /^\/checkup\/preassessment\/tickets\/[^/]+\/archive$/,
      /^\/checkup\/preassessment\/alerts\/[^/]+\/close$/,
      /^\/checkup\/preassessment\/alerts\/[^/]+\/archive$/,
      /^\/checkup\/question-management\/models\/[^/]+\/publish$/,
      /^\/checkup\/question-management\/models\/[^/]+\/archive$/,
      /^\/checkup\/question-management\/models\/[^/]+\/new-version$/,
    ].some((pattern) => pattern.test(path));
  }

  private getPath(url: string) {
    return url.split('?')[0];
  }

  private extractEntityType(url: string): CheckupAuditEntity {
    if (url.includes('/checkup/preassessment')) return 'PREASSESSMENT';
    if (url.includes('/checkup/question-management') || url.includes('/admin/checkup/questions')) return 'DOMANDA';
    if (url.includes('/admin/checkup/models')) return 'MODELLO';
    if (url.includes('/admin/checkup/licenses')) return 'LICENZA';
    if (url.includes('/admin/checkup/sublicenses')) return 'SUBLICENZA';
    if (url.includes('/admin/checkup/studios')) return 'STUDIO';
    if (url.includes('/admin/checkup/clients')) return 'CLIENTE';
    if (url.includes('/admin/checkup/users')) return 'UTENTE';
    if (url.includes('/checkup/preassessment/reports')) return 'REPORT';
    if (url.includes('/checkup/documents')) return 'DOCUMENTO';
    if (url.includes('/checkup/chat')) return 'CHAT';
    if (url.includes('/checkup/tickets')) return 'TICKET';
    if (url.includes('/checkup/alerts')) return 'ALERT';
    return 'SYSTEM';
  }
}
