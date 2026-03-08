import { api, apiBase, getAccessToken } from './config';

export interface SystemNotificationItem {
  id: string;
  type: 'sezione_validata' | 'checkup_completato' | 'validazione_finale' | 'nuova_versione';
  title: string;
  message: string;
  createdAt: string;
  clientId: string | null;
  clientName: string | null;
  preassessmentId: string | null;
  actionUrl: string | null;
  actorName: string | null;
  priority: 'info' | 'warning' | 'urgent';
}

export interface GetSystemNotificationsParams {
  query?: string;
  type?: SystemNotificationItem['type'];
  notificationId?: string;
  limit?: number;
  page?: number;
}

export interface SystemNotificationListResponse {
  items: SystemNotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const meApi = {
  /** Download all personal data as a JSON file (GDPR art. 20). */
  async exportMyData(): Promise<void> {
    const token = getAccessToken();
    const res = await fetch(`${apiBase}/checkup/me/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Errore' }));
      throw new Error(err.message || `Errore ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Submit a GDPR art. 17 deletion request. */
  requestDeletion: () =>
    api.post<{ ok: boolean; message: string }>('/checkup/me/deletion-request'),

  getSystemNotifications: (params?: GetSystemNotificationsParams) =>
    api.get<SystemNotificationListResponse>('/checkup/me/system-notifications', {
      ...(params?.query ? { query: params.query } : {}),
      ...(params?.type ? { type: params.type } : {}),
      ...(params?.notificationId ? { notificationId: params.notificationId } : {}),
      ...(params?.limit ? { limit: String(params.limit) } : {}),
      ...(params?.page ? { page: String(params.page) } : {}),
    }),
};
