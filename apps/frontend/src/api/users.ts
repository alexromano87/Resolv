// apps/frontend/src/api/users.ts
import { api } from './config';
import type { User, UserRole } from './auth';

export interface CreateUserDto {
  email: string;
  password: string;
  nome: string;
  cognome: string;
  telefono?: string | null;
  ruolo: UserRole;
  clienteId?: string | null;
  studioId?: string | null;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  nome?: string;
  cognome?: string;
  telefono?: string | null;
  ruolo?: UserRole;
  clienteId?: string | null;
  studioId?: string | null;
  attivo?: boolean;
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    return api.get<User[]>('/users');
  },

  getOne: async (id: string): Promise<User> => {
    return api.get<User>(`/users/${id}`);
  },

  create: async (createDto: CreateUserDto): Promise<User> => {
    return api.post<User>('/users', createDto);
  },

  update: async (id: string, updateDto: UpdateUserDto): Promise<User> => {
    return api.put<User>(`/users/${id}`, updateDto);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  toggleActive: async (id: string): Promise<User> => {
    return api.put<User>(`/users/${id}/toggle-active`, {});
  },

  resetPassword: async (id: string, newPassword: string): Promise<User> => {
    return api.put<User>(`/users/${id}/reset-password`, { newPassword });
  },

  updateStudi: async (id: string, studiIds: string[]): Promise<User> => {
    return api.put<User>(`/users/${id}/studi`, { studiIds });
  },

  getStudi: async (id: string): Promise<any[]> => {
    return api.get<any[]>(`/users/${id}/studi`);
  },
};
