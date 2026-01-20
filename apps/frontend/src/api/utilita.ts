// apps/frontend/src/api/utilita.ts
import { api, API_BASE_URL } from './config';

export type TipoRisorsaUtilita = 'manuale' | 'video_tutorial' | 'nota_aggiornamento' | 'altra_risorsa';

export interface RisorsaUtilita {
  id: string;
  studioId: string | null;
  titolo: string;
  descrizione: string | null;
  tipo: TipoRisorsaUtilita;

  // Per file
  percorsoFile: string | null;
  nomeOriginale: string | null;
  estensione: string | null;
  dimensione: number | null;

  // Per video tutorial
  urlVideo: string | null;

  // Per note di aggiornamento
  contenutoNota: string | null;
  versione: string | null;

  caricatoDa: string | null;
  attivo: boolean;
  dataCreazione: string;
  dataAggiornamento: string;
}

export interface CreateRisorsaUtilitaDto {
  titolo: string;
  descrizione?: string;
  tipo: TipoRisorsaUtilita;
  urlVideo?: string;
  contenutoNota?: string;
  versione?: string;
  caricatoDa?: string;
}

export interface UpdateRisorsaUtilitaDto {
  titolo?: string;
  descrizione?: string;
  urlVideo?: string;
  contenutoNota?: string;
  versione?: string;
  attivo?: boolean;
}

export async function fetchRisorseUtilita(includeInactive = false): Promise<RisorsaUtilita[]> {
  return api.get('/api/utilita', { includeInactive: includeInactive ? 'true' : 'false' });
}

export async function fetchRisorseUtilitaByTipo(tipo: TipoRisorsaUtilita): Promise<RisorsaUtilita[]> {
  return api.get(`/api/utilita/tipo/${tipo}`);
}

export async function fetchRisorsaUtilita(id: string): Promise<RisorsaUtilita> {
  return api.get(`/api/utilita/${id}`);
}

export async function uploadRisorsaUtilitaFile(
  file: File,
  titolo: string,
  tipo: TipoRisorsaUtilita,
  descrizione?: string,
): Promise<RisorsaUtilita> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('titolo', titolo);
  formData.append('tipo', tipo);
  if (descrizione) {
    formData.append('descrizione', descrizione);
  }

  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE_URL}/api/utilita/upload`, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Upload failed with status ${response.status}`);
  }

  return response.json();
}

export async function createRisorsaUtilita(data: CreateRisorsaUtilitaDto): Promise<RisorsaUtilita> {
  return api.post('/api/utilita', data);
}

export async function updateRisorsaUtilita(id: string, data: UpdateRisorsaUtilitaDto): Promise<RisorsaUtilita> {
  return api.patch(`/api/utilita/${id}`, data);
}

export async function deleteRisorsaUtilita(id: string): Promise<void> {
  return api.delete(`/api/utilita/${id}`);
}

export function getRisorsaUtilitaDownloadUrl(id: string): string {
  return `${API_BASE_URL}/api/utilita/${id}/download`;
}

export async function downloadRisorsaUtilita(id: string): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE_URL}/api/utilita/${id}/download`, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('content-disposition');
  let filename = 'download';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) {
      filename = match[1];
    }
  }

  // Create a blob URL and trigger download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
