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

    return next.handle().pipe(
      tap(() => {
        const { action, entityType, description } = this.getActionAndEntity(request.method, url);
        if (!action || !entityType) return;
        const user = request.user || {};
        this.auditLogService.log({
          userId: user.id || null,
          userEmail: user.email || null,
          userRole: user.ruolo || null,
          action,
          entityType,
          description,
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
        const { action, entityType, description } = this.getActionAndEntity(request.method, url);
        if (action && entityType) {
          const user = request.user || {};
          this.auditLogService.log({
            userId: user.id || null,
            userEmail: user.email || null,
            userRole: user.ruolo || null,
            action,
            entityType,
            description,
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
    if (method === 'POST') return 'CREATE';
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';
    if (method === 'GET') return null;
    return null;
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
