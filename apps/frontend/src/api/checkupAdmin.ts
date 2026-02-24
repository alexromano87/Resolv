import { api } from './config';

export interface CheckupStudio {
  id: string;
  nome: string;
  tipo: 'licenziatario' | 'cliente';
  ragioneSociale?: string | null;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  indirizzo?: string | null;
  citta?: string | null;
  provincia?: string | null;
  cap?: string | null;
  paese?: string | null;
  email?: string | null;
  telefono?: string | null;
  sitoWeb?: string | null;
  logoUrl?: string | null;
  note?: string | null;
  attivo: boolean;
}

export interface CheckupAdminUser {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  telefono?: string | null;
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  studioId: string | null;
  studio?: CheckupStudio | null;
  clientId?: string | null;
  client?: CheckupClient | null;
  sublicenseId?: string | null;
  sublicense?: CheckupSublicense | null;
  azienda?: string | null;
  macroAreaOwner?: string[] | null;
  attivo: boolean;
  createdAt: string;
}

export interface CheckupLicense {
  id: string;
  studioId: string | null;
  modelId?: string;
  intestatario: string;
  tipo: string;
  numeroUtenze: number;
  numeroSottolicenze?: number;
  numeroLicenza?: string | null;
  dataInizioValidita?: string | null;
  dataScadenza?: string | null;
  model?: {
    id: string;
    code: string;
    label: string;
  } | null;
  studio?: CheckupStudio | null;
  sublicenses?: CheckupSublicense[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckupSublicense {
  id: string;
  licenseId: string;
  clienteStudioId?: string | null;
  clientId?: string | null;
  numeroSublicenza?: string | null;
  tipo?: string | null;
  numeroUtenze: number;
  dataInizioValidita?: string | null;
  dataScadenza?: string | null;
  attiva: boolean;
  license?: CheckupLicense | null;
  clienteStudio?: CheckupStudio | null;
  client?: CheckupClient | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckupClient {
  id: string;
  nome: string;
  ragioneSociale?: string | null;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  indirizzo?: string | null;
  citta?: string | null;
  provincia?: string | null;
  cap?: string | null;
  paese?: string | null;
  email?: string | null;
  telefono?: string | null;
  sitoWeb?: string | null;
  logoUrl?: string | null;
  note?: string | null;
  attivo: boolean;
}

export interface CreateCheckupStudioDto {
  nome: string;
  tipo?: 'licenziatario' | 'cliente';
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  paese?: string;
  email?: string;
  telefono?: string;
  sitoWeb?: string;
  logoUrl?: string;
  note?: string;
}

export interface UpdateCheckupStudioDto extends Partial<CreateCheckupStudioDto> {
  attivo?: boolean;
  licenseId?: string;
}

export interface CreateCheckupClientDto {
  nome: string;
  sublicenseId: string;
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  paese?: string;
  email?: string;
  telefono?: string;
  sitoWeb?: string;
  logoUrl?: string;
  note?: string;
}

export interface UpdateCheckupClientDto extends Partial<Omit<CreateCheckupClientDto, 'sublicenseId'>> {
  attivo?: boolean;
}

export interface CreateCheckupAdminUserDto {
  email: string;
  password: string;
  nome: string;
  cognome: string;
  studioId?: string;
  clientId?: string;
  sublicenseId?: string;
  azienda?: string;
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  telefono?: string;
  macroAreaOwner?: string[];
}

export interface UpdateCheckupAdminUserDto {
  email?: string;
  nome?: string;
  cognome?: string;
  telefono?: string;
  studioId?: string;
  clientId?: string;
  sublicenseId?: string;
  azienda?: string;
  ruolo?: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  attivo?: boolean;
  macroAreaOwner?: string[];
}

export interface UpsertCheckupLicenseDto {
  id?: string;
  studioId?: string;
  modelId?: string;
  tipo: string;
  numeroUtenze: number;
  dataInizioValidita: string;
  dataScadenza: string;
}

export interface UpsertCheckupSublicenseDto {
  id?: string;
  licenseId: string;
  tipo: string;
  numeroUtenze: number;
  dataInizioValidita: string;
  dataScadenza: string;
  clienteStudioId?: string;
  clientId?: string;
  attiva?: boolean;
}

export const checkupAdminApi = {
  getStudios: async (): Promise<CheckupStudio[]> => {
    return api.get<CheckupStudio[]>('/admin/checkup/studios');
  },

  createStudio: async (dto: CreateCheckupStudioDto): Promise<CheckupStudio> => {
    return api.post<CheckupStudio>('/admin/checkup/studios', dto);
  },

  updateStudio: async (id: string, dto: UpdateCheckupStudioDto): Promise<CheckupStudio> => {
    return api.put<CheckupStudio>(`/admin/checkup/studios/${id}`, dto);
  },

  deactivateStudio: async (id: string): Promise<CheckupStudio> => {
    return api.patch<CheckupStudio>(`/admin/checkup/studios/${id}/deactivate`);
  },

  getAdminUsers: async (): Promise<CheckupAdminUser[]> => {
    return api.get<CheckupAdminUser[]>('/admin/checkup/users');
  },

  getMacroAreasByModel: async (modelId: string) => {
    return api.get<{ id: number; code: string; label: string; color: string; sortOrder: number }[]>(
      `/admin/checkup/questions/macro-areas?modelId=${encodeURIComponent(modelId)}`,
    );
  },

  createAdminUser: async (dto: CreateCheckupAdminUserDto): Promise<CheckupAdminUser> => {
    return api.post<CheckupAdminUser>('/admin/checkup/users', dto);
  },

  updateAdminUser: async (id: string, dto: UpdateCheckupAdminUserDto): Promise<CheckupAdminUser> => {
    return api.put<CheckupAdminUser>(`/admin/checkup/users/${id}`, dto);
  },

  deactivateAdminUser: async (id: string): Promise<CheckupAdminUser> => {
    return api.patch<CheckupAdminUser>(`/admin/checkup/users/${id}/deactivate`);
  },

  resetAdminPassword: async (id: string, newPassword: string): Promise<CheckupAdminUser> => {
    return api.put<CheckupAdminUser>(`/admin/checkup/users/${id}/reset-password`, { newPassword });
  },

  getClients: async (): Promise<CheckupClient[]> => {
    return api.get<CheckupClient[]>('/admin/checkup/clients');
  },

  createClient: async (dto: CreateCheckupClientDto): Promise<CheckupClient> => {
    return api.post<CheckupClient>('/admin/checkup/clients', dto);
  },

  updateClient: async (id: string, dto: UpdateCheckupClientDto): Promise<CheckupClient> => {
    return api.put<CheckupClient>(`/admin/checkup/clients/${id}`, dto);
  },

  deactivateClient: async (id: string): Promise<CheckupClient> => {
    return api.patch<CheckupClient>(`/admin/checkup/clients/${id}/deactivate`);
  },

  getLicenses: async (): Promise<CheckupLicense[]> => {
    return api.get<CheckupLicense[]>('/admin/checkup/licenses');
  },

  upsertLicense: async (dto: UpsertCheckupLicenseDto): Promise<CheckupLicense> => {
    return api.post<CheckupLicense>('/admin/checkup/licenses', dto);
  },

  getSublicenses: async (): Promise<CheckupSublicense[]> => {
    return api.get<CheckupSublicense[]>('/admin/checkup/sublicenses');
  },

  upsertSublicense: async (dto: UpsertCheckupSublicenseDto): Promise<CheckupSublicense> => {
    return api.post<CheckupSublicense>('/admin/checkup/sublicenses', dto);
  },
};
