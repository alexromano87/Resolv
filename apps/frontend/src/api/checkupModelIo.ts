import { API_BASE_URL } from './config';

export type ModelIoFormat = 'xlsx' | 'csv' | 'json';

const BASE = `${API_BASE_URL}/admin/checkup/questions`;

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const resolveToken = (): string | null => {
  const raw =
    localStorage.getItem('auth_token') ||
    localStorage.getItem('token') ||
    null;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^"|"$/g, '');
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice(7).trim() : trimmed;
};

const authHeaders = (): Record<string, string> => {
  const token = resolveToken();
  if (!token) throw new Error('Sessione scaduta. Effettua di nuovo il login.');
  return { Authorization: `Bearer ${token}` };
};

const parseError = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    const raw = (data as { message?: string | string[] }).message;
    if (Array.isArray(raw)) return raw.join(', ');
    if (raw) return raw;
  } catch {
    /* ignore */
  }
  if (response.status === 401) return 'Sessione scaduta. Effettua di nuovo il login.';
  if (response.status === 403) return 'Non autorizzato a eseguire questa operazione.';
  return fallback;
};

const filenameFromResponse = (response: Response, fallback: string) => {
  const cd = response.headers.get('Content-Disposition');
  if (cd) {
    const match = cd.match(/filename="?([^"]+)"?/);
    if (match && match[1]) return match[1].replace(/"+$/, '');
  }
  return fallback;
};

/** Scarica l'export di un modello (Excel/CSV/JSON). */
export async function exportModel(modelId: string, format: ModelIoFormat): Promise<void> {
  const response = await fetch(`${BASE}/models/${modelId}/export?format=${format}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, "Errore durante l'esportazione del modello"));
  const blob = await response.blob();
  downloadBlob(blob, filenameFromResponse(response, `modello.${format}`));
}

/** Scarica un file template d'esempio per l'import. */
export async function downloadImportTemplate(format: ModelIoFormat): Promise<void> {
  const response = await fetch(`${BASE}/import-template?format=${format}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Errore durante il download del template'));
  const blob = await response.blob();
  downloadBlob(blob, filenameFromResponse(response, `template_modello.${format}`));
}

export interface ImportSpec {
  columns: Record<string, string>;
  supportedFieldTypes: string[];
  optionFieldTypes: string[];
  formats: string[];
}

/** Requisiti del file di import (colonne, tipi ammessi). */
export async function getImportSpec(): Promise<ImportSpec> {
  const response = await fetch(`${BASE}/import-spec`, { headers: authHeaders() });
  if (!response.ok) throw new Error(await parseError(response, 'Errore nel caricamento dei requisiti'));
  return response.json();
}

export interface ImportModelInput {
  file: File;
  code: string;
  label: string;
  description?: string;
}

/** Importa un nuovo modello da file. Ritorna il modello creato. */
export async function importModel(input: ImportModelInput): Promise<{ id: string; code: string; label: string }> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('code', input.code);
  form.append('label', input.label);
  if (input.description) form.append('description', input.description);

  const response = await fetch(`${BASE}/import-model`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!response.ok) throw new Error(await parseError(response, "Errore durante l'import del modello"));
  return response.json();
}
