import { api } from './config';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'TOGGLE_ACTIVE'
  | 'RESET_PASSWORD'
  | 'CHANGE_PASSWORD'
  | 'ASSIGN_STUDIO'
  | 'EXPORT'
  | 'IMPORT'
  | 'DOWNLOAD'
  | 'UPLOAD';

export type AuditEntity =
  | 'USER'
  | 'STUDIO'
  | 'CLIENTE'
  | 'DEBITORE'
  | 'PRATICA'
  | 'AVVOCATO'
  | 'MOVIMENTO_FINANZIARIO'
  | 'ALERT'
  | 'TICKET'
  | 'DOCUMENTO'
  | 'CARTELLA'
  | 'FASE';

export interface AuditLog {
  id: string;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string | null;
  entityName: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  studioId: string | null;
  success: boolean;
  errorMessage: string | null;
  user?: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
  };
}

export interface AuditLogFilters {
  userId?: string;
  studioId?: string;
  entityType?: AuditEntity;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuditLogStats {
  total: number;
  successCount: number;
  failureCount: number;
  actionStats: Array<{
    action: AuditAction;
    count: number;
  }>;
  entityStats: Array<{
    entityType: AuditEntity;
    count: number;
  }>;
}

export const auditLogsApi = {
  getLogs: async (filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    return api.get<AuditLogResponse>('/admin/audit-logs', filters);
  },

  getStats: async (filters?: Omit<AuditLogFilters, 'page' | 'limit' | 'entityType' | 'action' | 'success' | 'search'>): Promise<AuditLogStats> => {
    return api.get<AuditLogStats>('/admin/audit-logs/stats', filters);
  },

  exportLogs: async (filters?: Omit<AuditLogFilters, 'page' | 'limit'>): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/audit-logs/export?${params.toString()}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Errore durante l\'esportazione dei log');
    }

    return response.blob();
  },

  cleanupOldLogs: async (): Promise<{ message: string; deletedCount: number; daysToKeep: number }> => {
    return api.delete<{ message: string; deletedCount: number; daysToKeep: number }>('/admin/audit-logs/cleanup');
  },
};
