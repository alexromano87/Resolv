// apps/frontend/src/api/cartelle.ts
import { api } from './config';
import type { Documento } from './documenti';

export type TipologiaCartella = 'Cliente' | 'Stragiudiziale' | 'Ingiunzione' | 'Esecuzione' | 'Pagamenti' | 'Altro';

export interface Cartella {
  id: string;
  nome: string;
  descrizione: string | null;
  colore: string | null;
  tipologia: TipologiaCartella | null;
  praticaId: string | null;
  pratica?: {
    id: string;
    cliente?: {
      ragioneSociale: string;
    };
  } | null;
  cartellaParent: Cartella | null;
  sottoCartelle: Cartella[];
  documenti: Documento[];
  attivo: boolean;
  dataCreazione: Date;
  dataAggiornamento: Date;
}

export interface CreateCartellaDto {
  nome: string;
  descrizione?: string;
  colore?: string;
  tipologia?: TipologiaCartella;
  praticaId?: string;
  cartellaParentId?: string;
}

export interface UpdateCartellaDto {
  nome?: string;
  descrizione?: string;
  colore?: string;
  tipologia?: TipologiaCartella | null;
  cartellaParentId?: string;
}

export const cartelleApi = {
  getAll: async (includeInactive = false): Promise<Cartella[]> => {
    return api.get<Cartella[]>('/cartelle', { includeInactive: String(includeInactive) });
  },

  getAllByPratica: async (praticaId: string, includeInactive = false): Promise<Cartella[]> => {
    return api.get<Cartella[]>(`/cartelle/pratica/${praticaId}`, { includeInactive: String(includeInactive) });
  },

  getTree: async (praticaId?: string): Promise<Cartella[]> => {
    const params = praticaId ? { praticaId } : {};
    return api.get<Cartella[]>('/cartelle/tree', params);
  },

  getOne: async (id: string): Promise<Cartella> => {
    return api.get<Cartella>(`/cartelle/${id}`);
  },

  getDescendants: async (id: string): Promise<Cartella[]> => {
    return api.get<Cartella[]>(`/cartelle/${id}/descendants`);
  },

  getAncestors: async (id: string): Promise<Cartella[]> => {
    return api.get<Cartella[]>(`/cartelle/${id}/ancestors`);
  },

  create: async (createDto: CreateCartellaDto): Promise<Cartella> => {
    return api.post<Cartella>('/cartelle', createDto);
  },

  update: async (id: string, updateDto: UpdateCartellaDto): Promise<Cartella> => {
    return api.patch<Cartella>(`/cartelle/${id}`, updateDto);
  },

  deactivate: async (id: string): Promise<Cartella> => {
    return api.patch<Cartella>(`/cartelle/${id}/deactivate`);
  },

  reactivate: async (id: string): Promise<Cartella> => {
    return api.patch<Cartella>(`/cartelle/${id}/reactivate`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cartelle/${id}`);
  },
};

export async function fetchCartelle(includeInactive = false): Promise<Cartella[]> {
  return cartelleApi.getAll(includeInactive);
}

export async function fetchCartelleByPratica(praticaId: string, includeInactive = false): Promise<Cartella[]> {
  return cartelleApi.getAllByPratica(praticaId, includeInactive);
}

export async function fetchCartelleTree(praticaId?: string): Promise<Cartella[]> {
  return cartelleApi.getTree(praticaId);
}
