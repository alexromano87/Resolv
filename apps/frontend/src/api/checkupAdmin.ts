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
  macroAreaAssignments?: string[] | null;
  superOwner?: boolean;
  attivo: boolean;
  createdAt: string;
}

export interface CheckupLicense {
  id: string;
  studioId: string | null;
  intestatario: string;
  tipo: string;
  numeroUtenze: number;
  numeroSottolicenze?: number;
  numeroLicenza?: string | null;
  dataInizioValidita?: string | null;
  dataScadenza?: string | null;
  studio?: CheckupStudio | null;
  modelId?: string | null;
  model?: { id: string; code: string; label: string } | null;
  sublicenses?: CheckupSublicense[];
  activeSublicensesCount?: number;
  inactiveSublicensesCount?: number;
  isActivated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckupSublicense {
  id: string;
  licenseId: string;
  modelId: string;
  clienteStudioId?: string | null;
  clientId?: string | null;
  numeroSublicenza?: string | null;
  tipo?: string | null;
  numeroUtenze: number;
  dataInizioValidita?: string | null;
  dataScadenza?: string | null;
  attiva: boolean;
  allowDocuments?: boolean;
  license?: CheckupLicense | null;
  clienteStudio?: CheckupStudio | null;
  client?: CheckupClient | null;
  activeSublicensesCount?: number;
  inactiveSublicensesCount?: number;
  isActivated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckupClient {
  id: string;
  nome: string | null;
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
  licenseId?: string;
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
  keepUserIds?: string[];
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
  macroAreaAssignments?: string[];
  superOwner?: boolean;
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
  macroAreaAssignments?: string[];
  superOwner?: boolean;
}

export interface UpsertCheckupLicenseDto {
  id?: string;
  studioId?: string;
  tipo: string;
  numeroUtenze: number;
  dataInizioValidita: string;
  dataScadenza: string;
}

export interface UpsertCheckupSublicenseDto {
  id?: string;
  licenseId: string;
  modelId: string;
  tipo: string;
  numeroUtenze: number;
  dataInizioValidita: string;
  dataScadenza: string;
  clienteStudioId?: string;
  clientId?: string;
  attiva?: boolean;
  allowDocuments?: boolean;
}

export interface CheckupDashboardStats {
  studios: {
    total: number;
    active: number;
    inactive: number;
    licenziatari: number;
    licenziatariAttivi: number;
    clientiStudio: number;
  };
  clients: {
    total: number;
    active: number;
    inactive: number;
    preassessmentCompleted: number;
    preassessmentInProgress: number;
    completionRate: number;
  };
  licenses: {
    total: number;
    assigned: number;
    unassigned: number;
    expiringSoon: number;
    expired: number;
    totalUtenze: number;
  };
  sublicenses: {
    total: number;
    active: number;
    inactive: number;
    assignedToClient: number;
    unassigned: number;
    expiringSoon: number;
    expired: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    with2fa: number;
    recentlyLoggedIn: number;
    neverLoggedIn: number;
    mustChangePassword: number;
  };
  preassessments: {
    total: number;
    inProgress: number;
    completed: number;
    completionRate: number;
  };
  models: {
    total: number;
    published: number;
    breakdown: Array<{
      id: string;
      code: string;
      label: string;
      status: string;
      activeSublicenseCount: number;
    }>;
  };
  licenziatariBreakdown: Array<{
    id: string;
    nome: string;
    attivo: boolean;
    hasLicense: boolean;
    licenzaScadenza: string | null;
    licenzaScaduta: boolean;
    licenzaInScadenza: boolean;
    totalSublicenses: number;
    activeSublicenses: number;
    expiringSoonSublicenses: number;
    expiredSublicenses: number;
    totalClients: number;
    activeClients: number;
    preassessmentCompleted: number;
    preassessmentInProgress: number;
  }>;
  criticalItems: Array<{
    type: string;
    label: string;
    detail: string;
    severity: 'critical' | 'warning';
    studioNome?: string;
    expiryDate?: string;
    daysRemaining?: number;
  }>;
  generatedAt: string;
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

  renewLicense: async (id: string, dto: { dataInizioValidita: string; dataScadenza: string }): Promise<CheckupLicense> => {
    return api.patch<CheckupLicense>(`/admin/checkup/licenses/${id}/renew`, dto);
  },

  deleteLicense: async (id: string): Promise<{ success: true }> => {
    return api.delete<{ success: true }>(`/admin/checkup/licenses/${id}`);
  },

  getSublicenses: async (): Promise<CheckupSublicense[]> => {
    return api.get<CheckupSublicense[]>('/admin/checkup/sublicenses');
  },

  upsertSublicense: async (dto: UpsertCheckupSublicenseDto): Promise<CheckupSublicense> => {
    return api.post<CheckupSublicense>('/admin/checkup/sublicenses', dto);
  },

  renewSublicense: async (id: string, dto: { dataInizioValidita: string; dataScadenza: string }): Promise<CheckupSublicense> => {
    return api.patch<CheckupSublicense>(`/admin/checkup/sublicenses/${id}/renew`, dto);
  },

  deleteSublicense: async (id: string): Promise<{ success: true }> => {
    return api.delete<{ success: true }>(`/admin/checkup/sublicenses/${id}`);
  },

  getDashboardStats: async (): Promise<CheckupDashboardStats> => {
    return api.get<CheckupDashboardStats>('/admin/checkup/dashboard');
  },
};
