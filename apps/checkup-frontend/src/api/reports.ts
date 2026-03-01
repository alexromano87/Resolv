import { api, apiBase } from './config';

export interface SavedPreassessmentReport {
  id: string;
  clientId: string;
  preassessmentId: string;
  filename: string;
  createdAt: string;
}

export const preassessmentReportApi = {
  save: (preassessmentId: string, html: string) =>
    api.post<SavedPreassessmentReport>(`/checkup/preassessment/${preassessmentId}/report/salva`, { html }),

  listByClient: (clientId: string) =>
    api.get<SavedPreassessmentReport[]>(`/checkup/preassessment/clients/${clientId}/reports`),

  download: async (reportId: string) => {
    const token = localStorage.getItem('checkup_token');
    const response = await fetch(`${apiBase}/checkup/preassessment/reports/${reportId}/pdf`, {
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
      throw new Error('Errore nel download del report');
    }

    return response.blob();
  },
};
