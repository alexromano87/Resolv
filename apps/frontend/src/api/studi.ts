import { api } from './config';

export interface Studio {
  id: string;
  nome: string;
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  pec?: string;
  logo?: string | null;
  attivo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateStudioDto {
  nome: string;
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  pec?: string;
}

export interface UpdateStudioDto {
  nome?: string;
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
  pec?: string;
  attivo?: boolean;
}

export interface OrphanedRecords {
  clienti: any[];
  debitori: any[];
  users: any[];
  avvocati: any[];
  pratiche: any[];
  totale: number;
}

export const studiApi = {
  getAll: async (): Promise<Studio[]> => {
    return api.get<Studio[]>('/studi');
  },

  getAllActive: async (): Promise<Studio[]> => {
    return api.get<Studio[]>('/studi/active');
  },

  getOne: async (id: string): Promise<Studio> => {
    return api.get<Studio>(`/studi/${id}`);
  },

  create: async (createDto: CreateStudioDto): Promise<Studio> => {
    return api.post<Studio>('/studi', createDto);
  },

  update: async (id: string, updateDto: UpdateStudioDto): Promise<Studio> => {
    return api.put<Studio>(`/studi/${id}`, updateDto);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/studi/${id}`);
  },

  permanentDelete: async (id: string): Promise<void> => {
    await api.delete(`/studi/${id}/permanent`);
  },

  restore: async (id: string): Promise<Studio> => {
    return api.post<Studio>(`/studi/${id}/restore`, {});
  },

  toggleActive: async (id: string): Promise<Studio> => {
    return api.put<Studio>(`/studi/${id}/toggle-active`, {});
  },

  getOrphanedRecords: async (): Promise<OrphanedRecords> => {
    return api.get<OrphanedRecords>('/studi/orphaned/records');
  },

  assignOrphanedRecords: async (
    entityType: string,
    recordIds: string[],
    studioId: string
  ): Promise<{ success: boolean; updated: number }> => {
    return api.post<{ success: boolean; updated: number }>('/studi/orphaned/assign', {
      entityType,
      recordIds,
      studioId,
    });
  },

  uploadLogo: async (id: string, logo: string): Promise<Studio> => {
    return api.put<Studio>(`/studi/${id}/logo`, { logo });
  },

  deleteLogo: async (id: string): Promise<Studio> => {
    return api.delete<Studio>(`/studi/${id}/logo`);
  },
};
