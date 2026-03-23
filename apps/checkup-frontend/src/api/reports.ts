import { api, requestBlob } from './config';

export interface SavedPreassessmentReport {
  id: string;
  clientId: string;
  preassessmentId: string;
  filename: string;
  createdAt: string;
}

export interface SavePreassessmentReportPayload {
  excludeNA?: boolean;
  includeConsultantNotes?: boolean;
}

export const preassessmentReportApi = {
  save: (preassessmentId: string, payload: SavePreassessmentReportPayload) =>
    api.post<SavedPreassessmentReport>(`/checkup/preassessment/${preassessmentId}/report/salva`, payload),

  listByClient: (clientId: string) =>
    api.get<SavedPreassessmentReport[]>(`/checkup/preassessment/clients/${clientId}/reports`),

  download: (reportId: string) =>
    requestBlob(`/checkup/preassessment/reports/${reportId}/pdf`),
};
