import { API_BASE_URL } from './config';

export const CheckupExportFormat = {
  CSV: 'csv',
  XLSX: 'xlsx',
  JSON: 'json',
} as const;

export type CheckupExportFormat = typeof CheckupExportFormat[keyof typeof CheckupExportFormat];

export const CheckupExportEntity = {
  LICENZIATARI: 'licenziatari',
  SUBLICENZIATARI: 'sublicenziatari',
  UTENTI: 'utenti',
  LICENZE: 'licenze',
  SUBLICENZE: 'sublicenze',
  RISPOSTE: 'risposte',
  DOMANDE: 'domande',
} as const;

export type CheckupExportEntity = typeof CheckupExportEntity[keyof typeof CheckupExportEntity];

export interface CheckupExportRequest {
  entity: CheckupExportEntity;
  format: CheckupExportFormat;
  licenziatarioId?: string;
}

export interface CheckupBackupRequest {
  licenziatarioId?: string;
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

export async function exportCheckupData(request: CheckupExportRequest, token?: string): Promise<void> {
  const authToken = resolveToken(token);
  if (!authToken) {
    throw new Error('Sessione scaduta. Effettua di nuovo il login.');
  }

  const response = await fetch(`${API_BASE_URL}/admin/checkup/export`, {
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
  let filename = `checkup_export_${request.entity}_${new Date().toISOString().split('T')[0]}.${request.format}`;

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+)"?/);
    if (match && match[1]) {
      filename = match[1].replace(/"+$/, '');
    }
  }

  downloadFile(blob, filename);
}

export async function exportCheckupBackup(request: CheckupBackupRequest, token?: string): Promise<void> {
  const authToken = resolveToken(token);
  if (!authToken) {
    throw new Error('Sessione scaduta. Effettua di nuovo il login.');
  }

  const response = await fetch(`${API_BASE_URL}/admin/checkup/export/backup`, {
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
  let filename = `checkup_backup_${new Date().toISOString().split('T')[0]}.json`;

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+)"?/);
    if (match && match[1]) {
      filename = match[1].replace(/"+$/, '');
    }
  }

  downloadFile(blob, filename);
}

export const CHECKUP_ENTITY_LABELS: Record<CheckupExportEntity, string> = {
  [CheckupExportEntity.LICENZIATARI]: 'Licenziatari',
  [CheckupExportEntity.SUBLICENZIATARI]: 'Sublicenziatari',
  [CheckupExportEntity.UTENTI]: 'Utenti',
  [CheckupExportEntity.LICENZE]: 'Licenze',
  [CheckupExportEntity.SUBLICENZE]: 'Sublicenze',
  [CheckupExportEntity.RISPOSTE]: 'Risposte',
  [CheckupExportEntity.DOMANDE]: 'Domande',
};

export const CHECKUP_FORMAT_LABELS: Record<CheckupExportFormat, string> = {
  [CheckupExportFormat.CSV]: 'CSV',
  [CheckupExportFormat.XLSX]: 'Excel (XLSX)',
  [CheckupExportFormat.JSON]: 'JSON',
};
