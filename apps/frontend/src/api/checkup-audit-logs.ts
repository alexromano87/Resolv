import { api, API_BASE_URL } from './config';

export type CheckupAuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'TOGGLE_ACTIVE'
  | 'RESET_PASSWORD'
  | 'ASSIGN'
  | 'UPLOAD_FILE'
  | 'DOWNLOAD_FILE'
  | 'DELETE_FILE'
  | 'EXPORT_DATA'
  | 'BACKUP_DATA'
  | 'IMPORT_DATA';

export type CheckupAuditEntity =
  | 'STUDIO'
  | 'CLIENTE'
  | 'UTENTE'
  | 'LICENZA'
  | 'SUBLICENZA'
  | 'MODELLO'
  | 'DOMANDA'
  | 'PREASSESSMENT'
  | 'REPORT'
  | 'DOCUMENTO'
  | 'CHAT'
  | 'TICKET'
  | 'ALERT'
  | 'SYSTEM';

export interface CheckupAuditLog {
  id: string;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: CheckupAuditAction;
  entityType: CheckupAuditEntity;
  entityId: string | null;
  entityName: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  studioId: string | null;
  success: boolean;
  errorMessage: string | null;
}

export interface CheckupAuditLogFilters {
  userId?: string;
  studioId?: string;
  entityType?: CheckupAuditEntity;
  action?: CheckupAuditAction;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CheckupAuditLogResponse {
  logs: CheckupAuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CheckupAuditLogStats {
  total: number;
  successCount: number;
  failureCount: number;
  actionStats: Array<{
    action: CheckupAuditAction;
    count: number;
  }>;
  entityStats: Array<{
    entityType: CheckupAuditEntity;
    count: number;
  }>;
}

export const checkupAuditLogsApi = {
  getLogs: async (filters?: CheckupAuditLogFilters): Promise<CheckupAuditLogResponse> => {
    return api.get<CheckupAuditLogResponse>('/admin/checkup/audit-logs', filters);
  },

  getStats: async (
    filters?: Omit<CheckupAuditLogFilters, 'page' | 'limit' | 'entityType' | 'action' | 'success' | 'search'>,
  ): Promise<CheckupAuditLogStats> => {
    return api.get<CheckupAuditLogStats>('/admin/checkup/audit-logs/stats', filters);
  },

  exportLogs: async (filters?: Omit<CheckupAuditLogFilters, 'page' | 'limit'>): Promise<Blob> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(
      `${API_BASE_URL}/admin/checkup/audit-logs/export?${params.toString()}`,
      { headers },
    );

    if (!response.ok) {
      throw new Error('Errore durante l\'esportazione dei log');
    }

    return response.blob();
  },
};
