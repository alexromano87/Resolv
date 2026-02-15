import { api, apiBase } from './config';

export interface PreassessmentPayload {
  data?: Record<string, string>;
  notes?: Record<string, string>;
  fieldNotes?: Record<string, string>;
  studioCanEdit?: boolean;
}

export interface PreassessmentRecord {
  id: string;
  userId: string;
  data: Record<string, string> | null;
  notes: Record<string, string> | null;
  fieldNotes: Record<string, string> | null;
  studioCanEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreassessmentClientEntry {
  client: {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    azienda: string | null;
    studioId?: string | null;
    studioNome?: string | null;
  };
  preassessment: {
    id: string;
    updatedAt: string;
    studioCanEdit: boolean;
    data: Record<string, string> | null;
  } | null;
}

export interface PreassessmentClientRecord {
  client: PreassessmentClientEntry['client'];
  preassessment: PreassessmentRecord;
}

export const preassessmentApi = {
  get: () => api.get<PreassessmentRecord>('/checkup/preassessment'),
  update: (payload: PreassessmentPayload) =>
    api.put<PreassessmentRecord>('/checkup/preassessment', payload),
  listClients: () => api.get<PreassessmentClientEntry[]>('/checkup/preassessment/clients'),
  getClient: (clientId: string) =>
    api.get<PreassessmentClientRecord>(`/checkup/preassessment/clients/${clientId}`),
  updateClient: (clientId: string, payload: PreassessmentPayload) =>
    api.put<PreassessmentRecord>(`/checkup/preassessment/clients/${clientId}`, payload),
  downloadPdf: async (html: string) => {
    const token = localStorage.getItem('checkup_token');
    const response = await fetch(`${apiBase}/checkup/preassessment/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ html }),
    });

    if (response.status === 401) {
      localStorage.removeItem('checkup_token');
      localStorage.removeItem('checkup_user');
      window.location.href = '/checkup/login';
      throw new Error('Non autorizzato');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Errore di rete' }));
      throw new Error(error.message || `Errore ${response.status}`);
    }

    return response.blob();
  },
};

export interface PreassessmentChatMessage {
  id: string;
  preassessmentId: string;
  sectionId: string;
  userId: string;
  messaggio: string;
  letto: boolean;
  createdAt: string;
  user: { id: string; nome: string; cognome: string; ruolo: string };
}

export const preassessmentChatApi = {
  getMessages: (preassessmentId: string, sectionId: string) =>
    api.get<PreassessmentChatMessage[]>(`/checkup/preassessment/${preassessmentId}/sections/${sectionId}/chat`),
  sendMessage: (preassessmentId: string, sectionId: string, messaggio: string) =>
    api.post<PreassessmentChatMessage>(`/checkup/preassessment/${preassessmentId}/sections/${sectionId}/chat`, { messaggio }),
  markAsRead: (id: string) => api.patch(`/checkup/preassessment/chat/${id}/read`),
};

export interface PreassessmentTicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  messaggio: string;
  createdAt: string;
  user: { id: string; nome: string; cognome: string; ruolo: string };
}

export interface PreassessmentTicket {
  id: string;
  preassessmentId: string;
  createdById: string;
  subject: string;
  body: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; nome: string; cognome: string; ruolo: string };
  messages?: PreassessmentTicketMessage[];
}

export const preassessmentTicketApi = {
  list: (preassessmentId: string) =>
    api.get<PreassessmentTicket[]>(`/checkup/preassessment/${preassessmentId}/tickets`),
  create: (preassessmentId: string, subject: string, body: string) =>
    api.post<PreassessmentTicket>(`/checkup/preassessment/${preassessmentId}/tickets`, { subject, body }),
  reply: (ticketId: string, messaggio: string) =>
    api.post<PreassessmentTicketMessage>(`/checkup/preassessment/tickets/${ticketId}/replies`, { messaggio }),
};

export interface PreassessmentAlert {
  id: string;
  preassessmentId: string;
  createdById: string;
  targetUserId: string | null;
  priority: 'info' | 'warning' | 'urgent';
  messaggio: string;
  createdAt: string;
  createdBy?: { id: string; nome: string; cognome: string; ruolo: string };
  targetUser?: { id: string; nome: string; cognome: string; ruolo: string } | null;
}

export const preassessmentAlertApi = {
  list: (preassessmentId: string) =>
    api.get<PreassessmentAlert[]>(`/checkup/preassessment/${preassessmentId}/alerts`),
  create: (preassessmentId: string, payload: { targetUserId?: string; priority?: string; messaggio: string }) =>
    api.post<PreassessmentAlert>(`/checkup/preassessment/${preassessmentId}/alerts`, payload),
};
