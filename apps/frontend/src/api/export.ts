// apps/frontend/src/api/export.ts
import { API_BASE_URL } from './config';

export const ExportFormat = {
  CSV: 'csv',
  XLSX: 'xlsx',
  JSON: 'json',
} as const;

export type ExportFormat = typeof ExportFormat[keyof typeof ExportFormat];

export const ExportEntity = {
  PRATICHE: 'pratiche',
  CLIENTI: 'clienti',
  DEBITORI: 'debitori',
  AVVOCATI: 'avvocati',
  MOVIMENTI_FINANZIARI: 'movimenti_finanziari',
  DOCUMENTI: 'documenti',
  ALERTS: 'alerts',
  TICKETS: 'tickets',
  AUDIT_LOGS: 'audit_logs',
  USERS: 'users',
} as const;

export type ExportEntity = typeof ExportEntity[keyof typeof ExportEntity];

export interface ExportRequest {
  studioId?: string;
  entity: ExportEntity;
  format: ExportFormat;
  dataInizio?: string;
  dataFine?: string;
  includeInactive?: boolean;
  searchTerm?: string;
}

export interface BackupStudioRequest {
  studioId: string;
  includeDocuments?: boolean;
  includeAuditLogs?: boolean;
}

const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const normalizeTokenValue = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }

  return trimmed;
};

const resolveToken = (token?: string | null) => {
  return (
    normalizeTokenValue(token) ??
    normalizeTokenValue(localStorage.getItem('auth_token')) ??
    normalizeTokenValue(localStorage.getItem('token'))
  );
};

const parseErrorMessage = async (response: Response, fallback: string) => {
  let message = fallback;
  try {
    const data = await response.json();
    if (data && typeof data === 'object' && 'message' in data) {
      const raw = (data as { message?: string | string[] }).message;
      if (Array.isArray(raw)) {
        message = raw.join(', ');
      } else if (raw) {
        message = raw;
      }
    }
  } catch {
    // Ignore parse errors
  }

  if (response.status === 401) {
    message = 'Sessione scaduta. Effettua di nuovo il login.';
  } else if (response.status === 403) {
    message = 'Non autorizzato a eseguire questa esportazione.';
  }

  return message;
};

export async function exportData(request: ExportRequest, token?: string): Promise<void> {
  try {
    const authToken = resolveToken(token);
    if (!authToken) {
      throw new Error('Sessione scaduta. Effettua di nuovo il login.');
    }

    const response = await fetch(`${API_BASE_URL}/export/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Errore durante l\'esportazione');
      throw new Error(message);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `export_${request.entity}_${new Date().toISOString().split('T')[0]}.${request.format}`;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    downloadFile(blob, filename);
  } catch (error) {
    console.error('Errore export:', error);
    throw error;
  }
}

export async function backupStudio(request: BackupStudioRequest, token?: string): Promise<void> {
  try {
    const authToken = resolveToken(token);
    if (!authToken) {
      throw new Error('Sessione scaduta. Effettua di nuovo il login.');
    }

    const response = await fetch(`${API_BASE_URL}/export/backup-studio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Errore durante il backup');
      throw new Error(message);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `backup_studio_${request.studioId}_${new Date().toISOString().split('T')[0]}.json`;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    downloadFile(blob, filename);
  } catch (error) {
    console.error('Errore backup:', error);
    throw error;
  }
}

export const ENTITY_LABELS: Record<ExportEntity, string> = {
  [ExportEntity.PRATICHE]: 'Pratiche',
  [ExportEntity.CLIENTI]: 'Clienti',
  [ExportEntity.DEBITORI]: 'Debitori',
  [ExportEntity.AVVOCATI]: 'Avvocati',
  [ExportEntity.MOVIMENTI_FINANZIARI]: 'Movimenti Finanziari',
  [ExportEntity.DOCUMENTI]: 'Documenti',
  [ExportEntity.ALERTS]: 'Alert',
  [ExportEntity.TICKETS]: 'Tickets',
  [ExportEntity.AUDIT_LOGS]: 'Audit Logs',
  [ExportEntity.USERS]: 'Utenti',
};

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  [ExportFormat.CSV]: 'CSV',
  [ExportFormat.XLSX]: 'Excel (XLSX)',
  [ExportFormat.JSON]: 'JSON',
};
