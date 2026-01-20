import { api } from './config';
import type { User } from './auth';

export interface CreateCollaboratoreDto {
  email: string;
  password?: string;
  nome: string;
  cognome: string;
  telefono?: string | null;
  codiceFiscale?: string | null;
  livelloAccessoPratiche?: 'solo_proprie' | 'tutte';
  livelloPermessi?: 'visualizzazione' | 'modifica';
  note?: string | null;
}

export interface UpdateCollaboratoreDto {
  email?: string;
  password?: string;
  nome?: string;
  cognome?: string;
  telefono?: string | null;
  codiceFiscale?: string | null;
  livelloAccessoPratiche?: 'solo_proprie' | 'tutte';
  livelloPermessi?: 'visualizzazione' | 'modifica';
  note?: string | null;
}

export const collaboratoriApi = {
  getAll: async (includeInactive = false): Promise<User[]> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    return api.get<User[]>(`/collaboratori${params}`);
  },

  create: async (createDto: CreateCollaboratoreDto): Promise<User> => {
    return api.post<User>('/collaboratori', createDto);
  },

  update: async (id: string, updateDto: UpdateCollaboratoreDto): Promise<User> => {
    return api.patch<User>(`/collaboratori/${id}`, updateDto);
  },

  deactivate: async (id: string): Promise<User> => {
    return api.patch<User>(`/collaboratori/${id}/deactivate`, {});
  },

  reactivate: async (id: string): Promise<User> => {
    return api.patch<User>(`/collaboratori/${id}/reactivate`, {});
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/collaboratori/${id}`);
  },
};
