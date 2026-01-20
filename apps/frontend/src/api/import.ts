// apps/frontend/src/api/import.ts
import { API_BASE_URL } from './config';

export type ImportCsvEntity = 'clienti' | 'debitori' | 'users' | 'avvocati' | 'pratiche';

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

export async function importBackup(file: File): Promise<BackupImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/import/backup`, {
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

export async function importCsv(entity: ImportCsvEntity, file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entity', entity);

  const response = await fetch(`${API_BASE_URL}/import/csv`, {
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
