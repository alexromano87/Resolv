import { api } from './config';

export interface Notification {
  id: string;
  praticaId: string | null;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  pratica?: {
    id: string;
    cliente?: {
      ragioneSociale: string;
    };
    debitore?: {
      tipoSoggetto?: 'persona_fisica' | 'persona_giuridica';
      nome?: string;
      cognome?: string;
      ragioneSociale?: string;
    };
  } | null;
}

export const notificationsApi = {
  getAll: async (options?: { unread?: boolean; limit?: number }): Promise<Notification[]> => {
    const params: Record<string, string> = {};
    if (options?.unread) params.unread = 'true';
    if (options?.limit) params.limit = String(options.limit);
    return api.get<Notification[]>('/notifications', params);
  },

  markRead: async (id: string): Promise<{ success: boolean }> => {
    return api.post<{ success: boolean }>(`/notifications/${id}/read`, {});
  },

  markAllRead: async (): Promise<{ success: boolean }> => {
    return api.post<{ success: boolean }>('/notifications/read-all', {});
  },
};
