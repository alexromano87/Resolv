// apps/frontend/src/api/avvocati.ts
import { api } from './config';

export type LivelloAccessoPratiche = 'solo_proprie' | 'tutte';
export type LivelloPermessi = 'visualizzazione' | 'modifica';

export interface Avvocato {
  id: string;
  attivo: boolean;
  nome: string;
  cognome: string;
  codiceFiscale?: string;
  email: string;
  telefono?: string;
  livelloAccessoPratiche: LivelloAccessoPratiche;
  livelloPermessi: LivelloPermessi;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvvocatoDto {
  nome: string;
  cognome: string;
  codiceFiscale?: string;
  email: string;
  telefono?: string;
  livelloAccessoPratiche?: LivelloAccessoPratiche;
  livelloPermessi?: LivelloPermessi;
  note?: string;
}

export interface UpdateAvvocatoDto extends Partial<CreateAvvocatoDto> {
  attivo?: boolean;
}

export const avvocatiApi = {
  async getAll(includeInactive = false): Promise<Avvocato[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return await api.get(`/avvocati${params}`);
  },

  async getById(id: string): Promise<Avvocato> {
    return await api.get(`/avvocati/${id}`);
  },

  async create(data: CreateAvvocatoDto): Promise<Avvocato> {
    return await api.post('/avvocati', data);
  },

  async update(id: string, data: UpdateAvvocatoDto): Promise<Avvocato> {
    return await api.patch(`/avvocati/${id}`, data);
  },

  async deactivate(id: string): Promise<Avvocato> {
    return await api.patch(`/avvocati/${id}/deactivate`);
  },

  async reactivate(id: string): Promise<Avvocato> {
    return await api.patch(`/avvocati/${id}/reactivate`);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/avvocati/${id}`);
  },
};

// Helper per ottenere nome completo
export function getAvvocatoDisplayName(avvocato: Avvocato | undefined | null): string {
  if (!avvocato) return 'N/D';
  return `${avvocato.nome} ${avvocato.cognome}`.trim();
}
