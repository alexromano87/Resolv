import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';
import type { AuditAction, AuditEntity } from './audit-log.entity';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    // Skip se non è un'operazione da loggare
    if (this.shouldSkipLogging(method, url)) {
      return next.handle();
    }

    // Determina l'azione e l'entità dalla richiesta
    const { action, entityType, description } = this.parseRequest(
      method,
      url,
      request.body,
    );

    if (!action || !entityType) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        // Log successo
        const duration = Date.now() - startTime;
        this.auditLogService.log({
          userId: user?.sub || null,
          userEmail: user?.email || null,
          userRole: user?.ruolo || null,
          action,
          entityType,
          entityId: this.extractEntityId(response, request.params),
          entityName: this.extractEntityName(response, request.body),
          description: description || this.generateDescription(action, entityType, method, url),
          metadata: {
            method,
            url,
            params: request.params,
            query: request.query,
            duration,
          },
          ipAddress: this.getClientIp(request),
          userAgent: headers['user-agent'] || null,
          studioId: user?.studioId || null,
          success: true,
          errorMessage: null,
        });
      }),
      catchError((error) => {
        // Log fallimento
        const duration = Date.now() - startTime;
        this.auditLogService.log({
          userId: user?.sub || null,
          userEmail: user?.email || null,
          userRole: user?.ruolo || null,
          action,
          entityType,
          entityId: request.params?.id || null,
          entityName: null,
          description: description || this.generateDescription(action, entityType, method, url),
          metadata: {
            method,
            url,
            params: request.params,
            query: request.query,
            duration,
            errorType: error.name,
            errorStatus: error.status,
          },
          ipAddress: this.getClientIp(request),
          userAgent: headers['user-agent'] || null,
          studioId: user?.studioId || null,
          success: false,
          errorMessage: error.message || 'Errore sconosciuto',
        });

        throw error;
      }),
    );
  }

  private shouldSkipLogging(method: string, url: string): boolean {
    // Skip GET requests per performance (tranne export)
    if (method === 'GET' && !url.includes('/export')) {
      return true;
    }

    // Skip health checks, metrics, etc.
    const skipPatterns = [
      '/health',
      '/metrics',
      '/admin/audit-logs',
      '/dashboard',
    ];

    return skipPatterns.some((pattern) => url.includes(pattern));
  }

  private parseRequest(
    method: string,
    url: string,
    body: any,
  ): { action: AuditAction | null; entityType: AuditEntity | null; description?: string } {
    // Login/Logout
    if (url.includes('/auth/login')) {
      return { action: 'LOGIN', entityType: 'USER', description: 'Tentativo di login' };
    }
    if (url.includes('/auth/logout')) {
      return { action: 'LOGOUT', entityType: 'USER', description: 'Logout utente' };
    }

    // Determina l'entità dall'URL
    const entityType = this.extractEntityType(url);
    if (!entityType) {
      return { action: null, entityType: null };
    }

    // Determina l'azione dal metodo HTTP
    let action: AuditAction | null = null;
    let description: string | undefined;

    switch (method) {
      case 'POST':
        action = 'CREATE';
        description = `Creazione nuovo ${this.getEntityLabel(entityType)}`;
        break;
      case 'PUT':
      case 'PATCH':
        // Check per operazioni speciali
        if (url.includes('/toggle-active') || body?.attivo !== undefined) {
          action = 'TOGGLE_ACTIVE';
          description = `Modifica stato attivazione ${this.getEntityLabel(entityType)}`;
        } else if (url.includes('/reset-password')) {
          action = 'RESET_PASSWORD';
          description = 'Reset password utente';
        } else if (url.includes('/assign-studio') || body?.studioId !== undefined) {
          action = 'ASSIGN_STUDIO';
          description = `Assegnazione studio a ${this.getEntityLabel(entityType)}`;
        } else {
          action = 'UPDATE';
          description = `Modifica ${this.getEntityLabel(entityType)}`;
        }
        break;
      case 'DELETE':
        action = 'DELETE';
        description = `Eliminazione ${this.getEntityLabel(entityType)}`;
        break;
      case 'GET':
        if (url.includes('/export')) {
          action = 'EXPORT_DATA';
          description = `Esportazione dati ${this.getEntityLabel(entityType)}`;
        }
        break;
    }

    // Upload/Download file
    if (url.includes('/upload') || url.includes('/documenti') && method === 'POST') {
      action = 'UPLOAD_FILE';
      description = 'Upload documento';
      return { action, entityType: 'DOCUMENTO', description };
    }
    if (url.includes('/download')) {
      action = 'DOWNLOAD_FILE';
      description = 'Download documento';
      return { action, entityType: 'DOCUMENTO', description };
    }

    return { action, entityType, description };
  }

  private extractEntityType(url: string): AuditEntity | null {
    const entityMap: Record<string, AuditEntity> = {
      '/users': 'USER',
      '/studi': 'STUDIO',
      '/clienti': 'CLIENTE',
      '/debitori': 'DEBITORE',
      '/pratiche': 'PRATICA',
      '/avvocati': 'AVVOCATO',
      '/movimenti-finanziari': 'MOVIMENTO_FINANZIARIO',
      '/alerts': 'ALERT',
      '/tickets': 'TICKET',
      '/documenti': 'DOCUMENTO',
      '/cartelle': 'CARTELLA',
    };

    for (const [pattern, entity] of Object.entries(entityMap)) {
      if (url.includes(pattern)) {
        return entity;
      }
    }

    return null;
  }

  private getEntityLabel(entityType: AuditEntity): string {
    const labels: Record<AuditEntity, string> = {
      USER: 'utente',
      STUDIO: 'studio',
      CLIENTE: 'cliente',
      DEBITORE: 'debitore',
      PRATICA: 'pratica',
      AVVOCATO: 'avvocato',
      MOVIMENTO_FINANZIARIO: 'movimento finanziario',
      ALERT: 'alert',
      TICKET: 'ticket',
      DOCUMENTO: 'documento',
      CARTELLA: 'cartella',
      SYSTEM: 'sistema',
    };
    return labels[entityType] || entityType.toLowerCase();
  }

  private extractEntityId(response: any, params: any): string | null {
    if (params?.id) {
      return params.id;
    }
    if (response?.id) {
      return response.id;
    }
    return null;
  }

  private extractEntityName(response: any, body: any): string | null {
    // Try to extract a descriptive name from the response or body
    if (response?.nome) return response.nome;
    if (response?.ragioneSociale) return response.ragioneSociale;
    if (response?.denominazione) return response.denominazione;
    if (response?.numeroTicket) return response.numeroTicket;
    if (response?.titolo) return response.titolo;

    if (body?.nome) return body.nome;
    if (body?.ragioneSociale) return body.ragioneSociale;
    if (body?.denominazione) return body.denominazione;

    // For users, combine nome + cognome
    if (response?.nome && response?.cognome) {
      return `${response.nome} ${response.cognome}`;
    }
    if (body?.nome && body?.cognome) {
      return `${body.nome} ${body.cognome}`;
    }

    return null;
  }

  private generateDescription(
    action: AuditAction,
    entityType: AuditEntity,
    method: string,
    url: string,
  ): string {
    const entityLabel = this.getEntityLabel(entityType);
    return `${action} su ${entityLabel} (${method} ${url})`;
  }

  private getClientIp(request: any): string | null {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || null;
  }
}
