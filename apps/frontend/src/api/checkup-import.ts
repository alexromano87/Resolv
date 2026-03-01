import { API_BASE_URL } from './config';

export type CheckupImportEntity =
  | 'licenziatari'
  | 'sublicenziatari'
  | 'utenti'
  | 'licenze'
  | 'sublicenze'
  | 'risposte'
  | 'domande';

export type ImportError = {
  row: number;
  reason: string;
  entity?: string;
};

export type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
};

export type BackupImportResult = {
  results: Record<string, ImportResult>;
  errors: ImportError[];
};

const resolveToken = () => {
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
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

  return message;
};

export async function importCheckupBackup(file: File, licenziatarioId?: string): Promise<BackupImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (licenziatarioId) {
    formData.append('licenziatarioId', licenziatarioId);
  }

  const response = await fetch(`${API_BASE_URL}/admin/checkup/import/backup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolveToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response, 'Errore durante l\'import del backup');
    throw new Error(message);
  }

  return response.json();
}

export async function importCheckupCsv(
  entity: CheckupImportEntity,
  file: File,
  licenziatarioId?: string,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entity', entity);
  if (licenziatarioId) {
    formData.append('licenziatarioId', licenziatarioId);
  }

  const response = await fetch(`${API_BASE_URL}/admin/checkup/import/csv`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolveToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response, 'Errore durante l\'import CSV');
    throw new Error(message);
  }

  return response.json();
}

export const CHECKUP_IMPORT_LABELS: Record<CheckupImportEntity, string> = {
  licenziatari: 'Licenziatari',
  sublicenziatari: 'Sublicenziatari',
  utenti: 'Utenti',
  licenze: 'Licenze',
  sublicenze: 'Sublicenze',
  risposte: 'Risposte',
  domande: 'Domande',
};
