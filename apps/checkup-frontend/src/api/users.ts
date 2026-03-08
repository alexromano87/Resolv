import { api } from './config';
import { CheckupUser } from './auth';

export interface CreateCheckupUserPayload {
  email: string;
  password: string;
  nome: string;
  cognome: string;
  telefono?: string;
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  clientId?: string;
  azienda?: string;
  macroAreaOwner?: string[];
  macroAreaAssignments?: string[];
  superOwner?: boolean;
}

export interface UpdateCheckupUserPayload {
  email?: string;
  nome?: string;
  cognome?: string;
  telefono?: string;
  azienda?: string;
  ruolo?: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  clientId?: string | null;
  attivo?: boolean;
  macroAreaOwner?: string[];
  macroAreaAssignments?: string[];
  superOwner?: boolean;
}

export const usersApi = {
  getAll: (search?: string, includeInactive?: boolean) => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (includeInactive) params.includeInactive = 'true';
    return api.get<CheckupUser[]>('/checkup/users', Object.keys(params).length ? params : undefined);
  },
  getUsage: () =>
    api.get<{
      license: { studioId: string; maxUsers: number | null; activeUsers: number };
      clients: Array<{ clientId: string | null; maxUsers: number; activeUsers: number }>;
    }>('/checkup/users/usage'),

  getOne: (id: string) =>
    api.get<CheckupUser>(`/checkup/users/${id}`),

  create: (data: CreateCheckupUserPayload) =>
    api.post<CheckupUser>('/checkup/users', data),

  update: (id: string, data: UpdateCheckupUserPayload) =>
    api.put<CheckupUser>(`/checkup/users/${id}`, data),

  deactivate: (id: string) =>
    api.patch<CheckupUser>(`/checkup/users/${id}/deactivate`),

  resetPassword: (id: string, newPassword: string) =>
    api.put<CheckupUser>(`/checkup/users/${id}/reset-password`, { newPassword }),
};
