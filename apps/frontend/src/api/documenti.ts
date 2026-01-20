// apps/frontend/src/api/documenti.ts
import { api, API_BASE_URL } from './config';

export type TipoDocumento = 'pdf' | 'word' | 'excel' | 'immagine' | 'csv' | 'xml' | 'altro';
export type TipologiaDocumento = 'Cliente' | 'Stragiudiziale' | 'Ingiunzione' | 'Esecuzione' | 'Pagamenti' | 'Altro';

export interface Documento {
  id: string;
  nome: string;
  descrizione: string | null;
  percorsoFile: string;
  nomeOriginale: string;
  estensione: string;
  tipo: TipoDocumento;
  tipologia: TipologiaDocumento | null;
  dimensione: number;
  caricatoDa: string | null;
  praticaId: string | null;
  cartellaId: string | null;
  pratica?: {
    id: string;
    cliente?: {
      ragioneSociale: string;
    };
  } | null;
  cartella?: {
    id: string;
    nome: string;
  } | null;
  attivo: boolean;
  dataCreazione: Date;
  dataAggiornamento: Date;
}

export interface UploadDocumentoDto {
  file: File;
  nome?: string;
  descrizione?: string;
  caricatoDa?: string;
  praticaId?: string;
  cartellaId?: string;
  tipologia?: TipologiaDocumento;
}

export interface UpdateDocumentoDto {
  nome?: string;
  descrizione?: string;
  cartellaId?: string | null;
  tipologia?: TipologiaDocumento | null;
}

export const documentiApi = {
  upload: async (uploadDto: UploadDocumentoDto): Promise<Documento> => {
    const formData = new FormData();
    formData.append('file', uploadDto.file);
    if (uploadDto.nome) formData.append('nome', uploadDto.nome);
    if (uploadDto.descrizione) formData.append('descrizione', uploadDto.descrizione);
    if (uploadDto.caricatoDa) formData.append('caricatoDa', uploadDto.caricatoDa);
    if (uploadDto.praticaId) formData.append('praticaId', uploadDto.praticaId);
    if (uploadDto.cartellaId) formData.append('cartellaId', uploadDto.cartellaId);
    if (uploadDto.tipologia) formData.append('tipologia', uploadDto.tipologia);

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documenti/upload`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      throw new Error('Upload fallito');
    }

    return response.json();
  },

  getAll: async (includeInactive = false): Promise<Documento[]> => {
    return api.get<Documento[]>('/documenti', { includeInactive: String(includeInactive) });
  },

  getAllByPratica: async (praticaId: string, includeInactive = false): Promise<Documento[]> => {
    return api.get<Documento[]>(`/documenti/pratica/${praticaId}`, { includeInactive: String(includeInactive) });
  },

  getAllByCartella: async (cartellaId: string, includeInactive = false): Promise<Documento[]> => {
    return api.get<Documento[]>(`/documenti/cartella/${cartellaId}`, { includeInactive: String(includeInactive) });
  },

  getOne: async (id: string): Promise<Documento> => {
    return api.get<Documento>(`/documenti/${id}`);
  },

  download: async (id: string): Promise<void> => {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documenti/${id}/download`, {
      headers,
    });
    if (!response.ok) {
      throw new Error('Download fallito');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : 'documento';

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  update: async (id: string, updateDto: UpdateDocumentoDto): Promise<Documento> => {
    return api.patch<Documento>(`/documenti/${id}`, updateDto);
  },

  deactivate: async (id: string): Promise<Documento> => {
    return api.patch<Documento>(`/documenti/${id}/deactivate`);
  },

  reactivate: async (id: string): Promise<Documento> => {
    return api.patch<Documento>(`/documenti/${id}/reactivate`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/documenti/${id}`);
  },
};

export async function fetchDocumenti(includeInactive = false): Promise<Documento[]> {
  return documentiApi.getAll(includeInactive);
}

export async function fetchDocumentiByPratica(praticaId: string, includeInactive = false): Promise<Documento[]> {
  return documentiApi.getAllByPratica(praticaId, includeInactive);
}
