import { api, apiBase, getAccessToken, requestBlob, requestBlobWithFilename } from './config';

export interface PreassessmentPayload {
  data?: Record<string, string>;
  notes?: Record<string, string>;
  fieldNotes?: Record<string, string>;
  userFieldNotes?: Record<string, string>;
  naFields?: Record<string, boolean>;
  macroValidations?: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>;
  sectionValidations?: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>;
  studioCanEdit?: boolean;
}

export interface PreassessmentRecord {
  id: string;
  userId: string;
  status: 'in_progress' | 'concluso';
  completedAt?: string | null;
  completedById?: string | null;
  data: Record<string, string> | null;
  notes: Record<string, string> | null;
  fieldNotes: Record<string, string> | null;
  userFieldNotes: Record<string, string> | null;
  naFields?: Record<string, boolean> | null;
  macroValidations?: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }> | null;
  sectionValidations?: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }> | null;
  finalValidation?: { by: { id: string; name: string; ruolo: string }; at: string } | null;
  fieldMeta?: Record<string, { updatedAt: string; updatedBy: { id: string; name: string; ruolo: string } }> | null;
  studioCanEdit: boolean;
  version: number;
  parentId?: string | null;
  isLatest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreassessmentHistoryEntry {
  id: string;
  version: number;
  status: 'in_progress' | 'concluso';
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  isLatest: boolean;
  parentId?: string | null;
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
    sublicense?: {
      id: string;
      modelId?: string | null;
      allowDocuments?: boolean;
    } | null;
  };
  preassessment: {
    id: string;
    updatedAt: string;
    studioCanEdit: boolean;
    status: 'in_progress' | 'concluso';
    data: Record<string, string> | null;
    sectionValidationsCount: number;
    finalValidationAt: string | null;
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
  complete: () => api.post<PreassessmentRecord>('/checkup/preassessment/complete', {}),
  finalValidate: () => api.post<PreassessmentRecord>('/checkup/preassessment/final-validate', {}),
  listClients: () => api.get<PreassessmentClientEntry[]>('/checkup/preassessment/clients'),
  getClient: (clientId: string) =>
    api.get<PreassessmentClientRecord>(`/checkup/preassessment/clients/${clientId}`),
  updateClient: (clientId: string, payload: PreassessmentPayload) =>
    api.put<PreassessmentRecord>(`/checkup/preassessment/clients/${clientId}`, payload),
  createNewVersion: (clientId: string) =>
    api.post<PreassessmentRecord>(`/checkup/preassessment/clients/${clientId}/new-version`, {}),
  getHistory: (clientId: string) =>
    api.get<PreassessmentHistoryEntry[]>(`/checkup/preassessment/clients/${clientId}/history`),
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
  createPdfJob: (html: string) =>
    api.post<PreassessmentExportJob>('/checkup/preassessment/pdf/jobs', { html }, { timeoutMs: 120_000 }),
  getExportJob: (jobId: string) =>
    api.get<PreassessmentExportJob>(`/checkup/preassessment/export-jobs/${jobId}`),
  downloadExportJob: (jobId: string) =>
    requestBlobWithFilename(`/checkup/preassessment/export-jobs/${jobId}/download`, { timeoutMs: 120_000 }),
};


export interface PreassessmentExportJob {
  id: string;
  type: 'pdf' | 'zip';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  filename?: string | null;
  mimeType?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

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
  archiviato?: boolean;
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
  archive: (ticketId: string) =>
    api.post<PreassessmentTicket>(`/checkup/preassessment/tickets/${ticketId}/archive`),
};

type AlertUser = { id: string; nome: string; cognome: string; ruolo: string; azienda?: string | null; client?: { nome: string | null; ragioneSociale?: string | null } | null };

export interface PreassessmentAlert {
  id: string;
  preassessmentId: string;
  createdById: string;
  targetUserId: string | null;
  priority: 'info' | 'warning' | 'urgent';
  messaggio: string;
  stato?: 'aperto' | 'chiuso' | 'scaduto';
  taciuto?: boolean;
  archiviato?: boolean;
  dataScadenza?: string | null;
  preavvisoGiorni?: number | null;
  createdAt: string;
  updatedAt?: string;
  createdBy?: AlertUser;
  targetUser?: AlertUser | null;
}

export const preassessmentAlertApi = {
  list: (preassessmentId: string) =>
    api.get<PreassessmentAlert[]>(`/checkup/preassessment/${preassessmentId}/alerts`),
  create: (preassessmentId: string, payload: {
    targetUserId?: string;
    priority?: string;
    messaggio: string;
    dataScadenza?: string | null;
    preavvisoGiorni?: number | null;
  }) =>
    api.post<PreassessmentAlert>(`/checkup/preassessment/${preassessmentId}/alerts`, payload),
  update: (alertId: string, payload: {
    priority?: string;
    messaggio?: string;
    dataScadenza?: string | null;
    preavvisoGiorni?: number | null;
  }) =>
    api.patch<PreassessmentAlert>(`/checkup/preassessment/alerts/${alertId}`, payload),
  close: (alertId: string) =>
    api.post<PreassessmentAlert>(`/checkup/preassessment/alerts/${alertId}/close`),
  mute: (alertId: string) =>
    api.post<PreassessmentAlert>(`/checkup/preassessment/alerts/${alertId}/mute`),
  restore: (alertId: string) =>
    api.post<PreassessmentAlert>(`/checkup/preassessment/alerts/${alertId}/restore`),
  archive: (alertId: string) =>
    api.post<PreassessmentAlert>(`/checkup/preassessment/alerts/${alertId}/archive`),
  delete: (alertId: string) =>
    api.delete<void>(`/checkup/preassessment/alerts/${alertId}`),
  getExpiring: () =>
    api.get<PreassessmentAlert[]>('/checkup/preassessment/alerts/expiring'),
};

export interface CoParticipant {
  id: string;
  nome: string;
  cognome: string;
}

export const preassessmentCoParticipantsApi = {
  list: (preassessmentId: string) =>
    api.get<CoParticipant[]>(`/checkup/preassessment/${preassessmentId}/co-participants`),
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
  list: (preassessmentId: string, sectionId?: string, fieldId?: string) => {
    const params: Record<string, string> = {};
    if (sectionId) params.sectionId = sectionId;
    if (fieldId) params.fieldId = fieldId;
    return api.get<PreassessmentDocument[]>(`/checkup/preassessment/${preassessmentId}/documents`, params);
  },
  upload: (preassessmentId: string, file: File, fieldId: string, sectionId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fieldId', fieldId);
    if (sectionId) formData.append('sectionId', sectionId);
    return api.post<PreassessmentDocument>(
      `/checkup/preassessment/${preassessmentId}/documents/upload`,
      formData,
    );
  },
  download: (id: string) =>
    requestBlob(`/checkup/preassessment/documents/${id}/download`),
  createZipJob: (preassessmentId: string) =>
    api.post<PreassessmentExportJob>(`/checkup/preassessment/${preassessmentId}/documents/download-zip/jobs`, {}),
  delete: (id: string) => api.delete(`/checkup/preassessment/documents/${id}`),
};

// ─── Unread counts API ────────────────────────────────────────────────────────

export const threadsUnreadApi = {
  getCounts: (preassessmentId: string) =>
    api.get<{ tickets: number; alerts: number; chat: number }>(
      `/checkup/preassessment/${preassessmentId}/unread-counts`,
    ),
  markSeen: (preassessmentId: string, type: 'tickets' | 'alerts' | 'chat') =>
    api.post<void>(`/checkup/preassessment/${preassessmentId}/mark-seen`, { type }),
};

// ─── Audit log API ────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  description: string | null;
  ipAddress: string | null;
  studioId: string | null;
  success: boolean;
  errorMessage: string | null;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export const auditApi = {
  getLogs: (params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }) => {
    const p: Record<string, string> = {};
    if (params.page) p.page = String(params.page);
    if (params.limit) p.limit = String(params.limit);
    if (params.userId) p.userId = params.userId;
    if (params.action) p.action = params.action;
    if (params.entityType) p.entityType = params.entityType;
    if (params.from) p.from = params.from;
    if (params.to) p.to = params.to;
    return api.get<AuditLogResponse>('/checkup/audit-logs', p);
  },
  exportCsvUrl: (params: {
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }) => {
    const p = new URLSearchParams();
    if (params.userId) p.set('userId', params.userId);
    if (params.action) p.set('action', params.action);
    if (params.entityType) p.set('entityType', params.entityType);
    if (params.from) p.set('from', params.from);
    if (params.to) p.set('to', params.to);
    const token = getAccessToken();
    if (token) p.set('_token', token); // non usato da backend, solo per compatibilità
    return `${apiBase}/checkup/audit-logs/export.csv?${p.toString()}`;
  },
  exportCsv: async (params: {
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }) => {
    const p = new URLSearchParams();
    if (params.userId) p.set('userId', params.userId);
    if (params.action) p.set('action', params.action);
    if (params.entityType) p.set('entityType', params.entityType);
    if (params.from) p.set('from', params.from);
    if (params.to) p.set('to', params.to);
    const token = getAccessToken();
    const response = await fetch(`${apiBase}/checkup/audit-logs/export.csv?${p.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Errore export CSV');
    return response.blob();
  },

  cleanupLogs: (beforeDate?: string): Promise<{ message: string; deletedCount: number }> => {
    const path = beforeDate
      ? `/checkup/audit-logs/cleanup?beforeDate=${encodeURIComponent(beforeDate)}`
      : '/checkup/audit-logs/cleanup';
    return api.delete<{ message: string; deletedCount: number }>(path);
  },
};
