import { api, apiBase } from './config';

export interface PreassessmentPayload {
  data?: Record<string, string>;
  notes?: Record<string, string>;
  fieldNotes?: Record<string, string>;
  naFields?: Record<string, boolean>;
  macroValidations?: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>;
  studioCanEdit?: boolean;
}

export interface PreassessmentRecord {
  id: string;
  userId: string;
  data: Record<string, string> | null;
  notes: Record<string, string> | null;
  fieldNotes: Record<string, string> | null;
  naFields?: Record<string, boolean> | null;
  macroValidations?: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }> | null;
  fieldMeta?: Record<string, { updatedAt: string; updatedBy: { id: string; name: string; ruolo: string } }> | null;
  studioCanEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreassessmentClientEntry {
  client: {
    id: string;
    nome: string;
    cognome?: string;
    email: string | null;
    azienda: string | null;
    ragioneSociale?: string | null;
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

export interface PreassessmentPresence {
  fields: Array<{ fieldId: string; userId: string; name: string }>;
}

export interface PreassessmentTyping {
  users: Array<{ userId: string; name: string; ruolo: string }>;
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
  getPresence: (preassessmentId: string) =>
    api.get<PreassessmentPresence>(`/checkup/preassessment/${preassessmentId}/presence`),
  getOnline: () =>
    api.get<{ preassessmentIds: string[] }>('/checkup/preassessment/online'),
  setPresenceActive: (preassessmentId: string, fieldId: string) =>
    api.post(`/checkup/preassessment/${preassessmentId}/presence/active`, { fieldId }),
  setPresenceInactive: (preassessmentId: string, fieldId: string) =>
    api.post(`/checkup/preassessment/${preassessmentId}/presence/inactive`, { fieldId }),
  getTyping: (preassessmentId: string, sectionId: string) =>
    api.get<PreassessmentTyping>(`/checkup/preassessment/${preassessmentId}/sections/${sectionId}/typing`),
  setTyping: (preassessmentId: string, sectionId: string, active: boolean) =>
    api.post(`/checkup/preassessment/${preassessmentId}/sections/${sectionId}/typing`, { active }),
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
  status: 'open' | 'in_progress' | 'pending_close' | 'closed';
  assignedToId?: string | null;
  closeRequestedById?: string | null;
  closeRequestedAt?: string | null;
  closedById?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; nome: string; cognome: string; ruolo: string };
  assignedTo?: { id: string; nome: string; cognome: string; ruolo: string } | null;
  closeRequestedBy?: { id: string; nome: string; cognome: string; ruolo: string } | null;
  closedBy?: { id: string; nome: string; cognome: string; ruolo: string } | null;
  messages?: PreassessmentTicketMessage[];
}

export const preassessmentTicketApi = {
  list: (preassessmentId: string) =>
    api.get<PreassessmentTicket[]>(`/checkup/preassessment/${preassessmentId}/tickets`),
  create: (preassessmentId: string, subject: string, body: string) =>
    api.post<PreassessmentTicket>(`/checkup/preassessment/${preassessmentId}/tickets`, { subject, body }),
  reply: (ticketId: string, messaggio: string) =>
    api.post<PreassessmentTicketMessage>(`/checkup/preassessment/tickets/${ticketId}/replies`, { messaggio }),
  assign: (ticketId: string) =>
    api.post<PreassessmentTicket>(`/checkup/preassessment/tickets/${ticketId}/assign`),
  requestClose: (ticketId: string) =>
    api.post<PreassessmentTicket>(`/checkup/preassessment/tickets/${ticketId}/request-close`),
  confirmClose: (ticketId: string) =>
    api.post<PreassessmentTicket>(`/checkup/preassessment/tickets/${ticketId}/confirm-close`),
  reopen: (ticketId: string) =>
    api.post<PreassessmentTicket>(`/checkup/preassessment/tickets/${ticketId}/reopen`),
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

export interface PreassessmentDocument {
  id: string;
  preassessmentId: string;
  fieldId: string;
  sectionId: string | null;
  nomeOriginale: string;
  createdAt: string;
}

export const preassessmentDocumentsApi = {
  list: (preassessmentId: string, sectionId?: string, fieldId?: string) =>
    api.get<PreassessmentDocument[]>(`/checkup/preassessment/${preassessmentId}/documents`, {
      params: { sectionId, fieldId },
    }),
  upload: (preassessmentId: string, file: File, fieldId: string, sectionId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fieldId', fieldId);
    if (sectionId) formData.append('sectionId', sectionId);
    return api.post<PreassessmentDocument>(
      `/checkup/preassessment/${preassessmentId}/documents/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
  download: async (id: string) => {
    const token = localStorage.getItem('checkup_token');
    const response = await fetch(`${apiBase}/checkup/preassessment/documents/${id}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
  delete: (id: string) => api.delete(`/checkup/preassessment/documents/${id}`),
};
