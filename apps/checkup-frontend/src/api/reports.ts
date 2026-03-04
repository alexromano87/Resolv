import { api, requestBlob } from './config';

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

  download: (reportId: string) =>
    requestBlob(`/checkup/preassessment/reports/${reportId}/pdf`),
};
