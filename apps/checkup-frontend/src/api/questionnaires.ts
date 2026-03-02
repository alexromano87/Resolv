import { api, apiBase, getAccessToken } from './config';

export interface CheckupTemplate {
  id: string;
  nome: string;
  descrizione: string | null;
  versione: string;
  sections: CheckupSection[];
}

export interface CheckupSection {
  id: string;
  codice: string;
  nome: string;
  descrizione: string | null;
  ordine: number;
  questions: CheckupQuestion[];
}

export interface CheckupQuestion {
  id: string;
  sectionId: string;
  testo: string;
  tipo: 'text' | 'yesno' | 'choice' | 'number' | 'date';
  opzioni: string[] | null;
  ordine: number;
  obbligatoria: boolean;
  accettaDocumenti: boolean;
  parentQuestionId: string | null;
  parentConditionValue: string | null;
}

export interface CheckupQuestionnaire {
  id: string;
  templateId: string;
  clienteUserId: string;
  stato: 'bozza' | 'in_compilazione' | 'completato' | 'revisionato';
  percentualeCompletamento: number;
  dataAssegnazione: string | null;
  dataCompletamento: string | null;
  note: string | null;
  createdAt: string;
  template: CheckupTemplate;
  cliente: { id: string; nome: string; cognome: string; azienda: string | null };
  assegnatoDa: { id: string; nome: string; cognome: string } | null;
  answers?: CheckupAnswer[];
}

export interface CheckupAnswer {
  id: string;
  questionnaireId: string;
  questionId: string;
  valore: string | null;
  richiesto: boolean;
  evaso: boolean;
  note: string | null;
  updatedAt?: string;
  updatedByUser?: {
    id: string;
    nome: string;
    cognome: string;
    ruolo?: string;
  } | null;
  question: CheckupQuestion;
  documents?: CheckupDocument[];
}

export interface CheckupDocument {
  id: string;
  nome: string;
  nomeOriginale: string;
  estensione: string;
  tipo: string;
  dimensione: number;
  createdAt: string;
}

export const questionnairesApi = {
  getTemplates: () =>
    api.get<CheckupTemplate[]>('/checkup/templates'),

  getTemplate: (id: string) =>
    api.get<CheckupTemplate>(`/checkup/templates/${id}`),

  getAll: () =>
    api.get<CheckupQuestionnaire[]>('/checkup/questionnaires'),

  getOne: (id: string) =>
    api.get<CheckupQuestionnaire>(`/checkup/questionnaires/${id}`),

  create: (templateId: string, clienteUserId: string, note?: string) =>
    api.post<CheckupQuestionnaire>('/checkup/questionnaires', { templateId, clienteUserId, note }),

  updateStato: (id: string, stato: string, note?: string) =>
    api.patch<CheckupQuestionnaire>(`/checkup/questionnaires/${id}/stato`, { stato, note }),

  getAnswers: (questionnaireId: string, sectionId?: string) =>
    api.get<CheckupAnswer[]>(
      `/checkup/questionnaires/${questionnaireId}/answers`,
      sectionId ? { sectionId } : undefined,
    ),

  saveAnswers: (questionnaireId: string, answers: { questionId: string; valore?: string; note?: string }[]) =>
    api.put<{ percentualeCompletamento: number; stato: string }>(
      `/checkup/questionnaires/${questionnaireId}/answers`,
      { answers },
    ),

  getPresence: (questionnaireId: string) =>
    api.get<{ fields: { fieldId: string; users: { userId: string; name: string }[] }[] }>(
      `/checkup/questionnaires/${questionnaireId}/answers/presence`,
    ),

  setPresenceActive: (questionnaireId: string, fieldId: string) =>
    api.post(`/checkup/questionnaires/${questionnaireId}/answers/presence/active`, { fieldId }),

  setPresenceInactive: (questionnaireId: string, fieldId: string) =>
    api.post(`/checkup/questionnaires/${questionnaireId}/answers/presence/inactive`, { fieldId }),

  getDocuments: (questionnaireId: string, sectionId?: string) =>
    api.get<CheckupDocument[]>(
      `/checkup/questionnaires/${questionnaireId}/documents`,
      sectionId ? { sectionId } : undefined,
    ),

  uploadDocument: (questionnaireId: string, file: File, answerId?: string, sectionId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (answerId) formData.append('answerId', answerId);
    if (sectionId) formData.append('sectionId', sectionId);
    return api.post<CheckupDocument>(
      `/checkup/questionnaires/${questionnaireId}/documents/upload`,
      formData,
    );
  },

  deleteDocument: (id: string) =>
    api.delete(`/checkup/documents/${id}`),

  downloadDocument: async (id: string): Promise<Blob> => {
    const token = getAccessToken();
    const response = await fetch(`${apiBase}/checkup/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Errore nel download del documento');
    return response.blob();
  },
};
