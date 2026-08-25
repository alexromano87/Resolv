import { api, ApiError } from './config';

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
  deletedAt?: string | null;
}

export interface CheckupAdminUser {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  titolo?: string | null;
  telefono?: string | null;
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  studioId: string | null;
  studio?: CheckupStudio | null;
  clientId?: string | null;
  client?: CheckupClient | null;
  sublicenseId?: string | null;
  sublicense?: CheckupSublicense | null;
  anagraficaId?: string | null;
  anagrafica?: CheckupAnagraficaLicenziatario | null;
  azienda?: string | null;
  macroAreaOwner?: string[] | null;
  macroAreaAssignments?: string[] | null;
  superOwner?: boolean;
  attivo: boolean;
  deletedAt?: string | null;
  createdAt: string;
  /** Appartenenze aggiuntive (utenze riusate/associate a più contesti). */
  memberships?: {
    id: string;
    ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
    studioId: string | null;
    clientId: string | null;
    anagraficaId: string | null;
    attiva: boolean;
    isPrimary: boolean;
  }[];
  /** Solo lato UI: id dell'appartenenza con cui l'utente compare nel contesto corrente
   *  (valorizzato quando è presente tramite appartenenza aggiuntiva, non primaria). */
  contextMembershipId?: string;
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
  consultantAnagraficaId?: string | null;
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
  consultantAnagrafica?: CheckupAnagraficaLicenziatario | null;
  activeSublicensesCount?: number;
  inactiveSublicensesCount?: number;
  isActivated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckupAnagraficaLicenziatario {
  id: string;
  studioId: string;
  studio?: CheckupStudio | null;
  users?: CheckupAdminUser[];
  titolo?: string | null;
  nome: string;
  cognome: string;
  email?: string | null;
  pec?: string | null;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  telefono?: string | null;
  indirizzo?: string | null;
  citta?: string | null;
  provincia?: string | null;
  attiva: boolean;
  deletedAt?: string | null;
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
  deletedAt?: string | null;
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
  // Fase 1 — id dell'entità di origine da cui è stata riusata l'anagrafica.
  sourceStudioId?: string;
  sourceClientId?: string;
  sourceAnagraficaId?: string;
  // Utenze esistenti dell'azienda sorgente da importare (membership + anagrafica).
  importUsers?: { userId: string; ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' }[];
}

/** Utenza riusabile associata a un'entità sorgente. */
export interface ReusableUser {
  userId: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
  ruoloLabel: string;
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
  /** Obbligatoria per una nuova utenza; omessa quando si associa un'utenza esistente. */
  password?: string;
  nome: string;
  cognome: string;
  titolo?: string;
  studioId?: string;
  clientId?: string;
  sublicenseId?: string;
  azienda?: string;
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  telefono?: string;
  anagraficaId?: string;
  macroAreaOwner?: string[];
  macroAreaAssignments?: string[];
  superOwner?: boolean;
  /** Riusa l'identità esistente con la stessa email creando una nuova appartenenza. */
  associateExisting?: boolean;
}

/** Corpo dell'errore 409 quando l'email è già in uso ma è associabile. */
export interface EmailExistsConflict {
  code: 'EMAIL_EXISTS';
  canAssociate: boolean;
  /** True se l'utenza esistente risulta della stessa società (P.IVA/CF o collegamento). */
  sameCompany?: boolean;
  existingUser: { id: string; nome: string; cognome: string; email: string };
  existingContexts?: { ruolo: string; ruoloLabel: string; companyName: string | null }[];
  targetCompany?: { name: string | null; partitaIva: string | null; codiceFiscale: string | null };
}

/** Messaggio di conferma riuso utenza, in base al match di società. */
export function buildAssociateMessage(c: EmailExistsConflict): string {
  const eu = c.existingUser;
  const contexts = (c.existingContexts ?? [])
    .map((x) => `${x.ruoloLabel}${x.companyName ? ` presso ${x.companyName}` : ''}`)
    .join(', ');
  const dove = contexts ? ` (attualmente: ${contexts})` : '';
  const targetName = c.targetCompany?.name ? ` "${c.targetCompany.name}"` : '';
  if (c.sameCompany) {
    return `Risulta la stessa società${targetName}. L'email ${eu.email} appartiene già a ${eu.nome} ${eu.cognome}${dove}. Vuoi riusare la stessa utenza assegnandole questo nuovo ruolo/contesto? Manterrà le proprie credenziali e potrà passare da un contesto all'altro.`;
  }
  return `⚠️ Attenzione: l'email ${eu.email} appartiene a ${eu.nome} ${eu.cognome}${dove}, che sembra un'altra società rispetto a${targetName || 'lla destinazione'}. Vuoi comunque riusare la stessa utenza assegnandole questo ruolo?`;
}

export interface UpdateCheckupAdminUserDto {
  email?: string;
  nome?: string;
  cognome?: string;
  titolo?: string;
  telefono?: string;
  anagraficaId?: string;
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
  consultantAnagraficaId?: string;
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
  getStudios: async (includeDeleted = false): Promise<CheckupStudio[]> => {
    return api.get<CheckupStudio[]>(`/admin/checkup/studios${includeDeleted ? '?includeDeleted=true' : ''}`);
  },

  createStudio: async (dto: CreateCheckupStudioDto): Promise<CheckupStudio> => {
    return api.post<CheckupStudio>('/admin/checkup/studios', dto);
  },

  deleteStudio: async (id: string): Promise<{ success: true }> => {
    return api.delete<{ success: true }>(`/admin/checkup/studios/${id}`);
  },

  restoreStudio: async (id: string): Promise<{ success: true }> => {
    return api.post<{ success: true }>(`/admin/checkup/studios/${id}/restore`);
  },

  /** Utenze associate all'entità sorgente, per proporne l'import in creazione studio. */
  getReusableUsers: async (params: { sourceClientId?: string; sourceStudioId?: string }): Promise<ReusableUser[]> => {
    const q = new URLSearchParams();
    if (params.sourceClientId) q.set('sourceClientId', params.sourceClientId);
    if (params.sourceStudioId) q.set('sourceStudioId', params.sourceStudioId);
    return api.get<ReusableUser[]>(`/admin/checkup/reusable-users?${q.toString()}`);
  },

  updateStudio: async (id: string, dto: UpdateCheckupStudioDto): Promise<CheckupStudio> => {
    return api.put<CheckupStudio>(`/admin/checkup/studios/${id}`, dto);
  },

  deactivateStudio: async (id: string): Promise<CheckupStudio> => {
    return api.patch<CheckupStudio>(`/admin/checkup/studios/${id}/deactivate`);
  },

  getAdminUsers: async (includeDeleted = false): Promise<CheckupAdminUser[]> => {
    return api.get<CheckupAdminUser[]>(`/admin/checkup/users${includeDeleted ? '?includeDeleted=true' : ''}`);
  },

  deleteAdminUser: async (id: string): Promise<{ success: true }> => {
    return api.delete<{ success: true }>(`/admin/checkup/users/${id}`);
  },

  restoreAdminUser: async (id: string): Promise<{ success: true }> => {
    return api.post<{ success: true }>(`/admin/checkup/users/${id}/restore`);
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

  /** Rimuove un'appartenenza (toglie un'utenza da un contesto) senza toccare l'identità. */
  removeMembership: async (membershipId: string): Promise<{ success: true }> => {
    return api.delete<{ success: true }>(`/admin/checkup/memberships/${membershipId}`);
  },

  resetAdminPassword: async (id: string, newPassword: string): Promise<CheckupAdminUser> => {
    return api.put<CheckupAdminUser>(`/admin/checkup/users/${id}/reset-password`, { newPassword });
  },

  getAnagraficheLicenziatario: async (params?: { search?: string; studioId?: string; includeDeleted?: boolean }): Promise<CheckupAnagraficaLicenziatario[]> => {
    const search = new URLSearchParams();
    if (params?.search) search.set('search', params.search);
    if (params?.studioId) search.set('studioId', params.studioId);
    if (params?.includeDeleted) search.set('includeDeleted', 'true');
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return api.get<CheckupAnagraficaLicenziatario[]>(`/admin/checkup/anagrafiche-licenziatario${suffix}`);
  },

  deleteAnagraficaLicenziatario: async (id: string): Promise<{ success: true }> => {
    return api.delete<{ success: true }>(`/admin/checkup/anagrafiche-licenziatario/${id}`);
  },

  restoreAnagraficaLicenziatario: async (id: string): Promise<{ success: true }> => {
    return api.post<{ success: true }>(`/admin/checkup/anagrafiche-licenziatario/${id}/restore`);
  },

  createAnagraficaLicenziatario: async (
    dto: Partial<CheckupAnagraficaLicenziatario>,
  ): Promise<CheckupAnagraficaLicenziatario> => {
    return api.post<CheckupAnagraficaLicenziatario>('/admin/checkup/anagrafiche-licenziatario', dto);
  },

  updateAnagraficaLicenziatario: async (
    id: string,
    dto: Partial<CheckupAnagraficaLicenziatario>,
  ): Promise<CheckupAnagraficaLicenziatario> => {
    return api.put<CheckupAnagraficaLicenziatario>(`/admin/checkup/anagrafiche-licenziatario/${id}`, dto);
  },

  getClients: async (includeDeleted = false): Promise<CheckupClient[]> => {
    return api.get<CheckupClient[]>(`/admin/checkup/clients${includeDeleted ? '?includeDeleted=true' : ''}`);
  },

  deleteClient: async (id: string): Promise<{ success: true }> => {
    return api.delete<{ success: true }>(`/admin/checkup/clients/${id}`);
  },

  restoreClient: async (id: string): Promise<{ success: true }> => {
    return api.post<{ success: true }>(`/admin/checkup/clients/${id}/restore`);
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

/**
 * Crea un'utenza; se l'email è già in uso ed è associabile, chiede conferma via
 * `confirmAssociate` e — se accettato — riusa l'identità esistente creando una
 * nuova appartenenza (associateExisting). Ritorna `null` se l'utente annulla.
 */
export async function createAdminUserOrAssociate(
  dto: CreateCheckupAdminUserDto,
  confirmAssociate: (conflict: EmailExistsConflict) => Promise<boolean>,
): Promise<CheckupAdminUser | null> {
  try {
    return await checkupAdminApi.createAdminUser(dto);
  } catch (err) {
    const data = err instanceof ApiError ? (err.data as EmailExistsConflict | undefined) : undefined;
    if (data?.code === 'EMAIL_EXISTS' && data.canAssociate) {
      const ok = await confirmAssociate(data);
      if (!ok) return null;
      const { password: _pw, ...rest } = dto;
      return checkupAdminApi.createAdminUser({ ...rest, associateExisting: true });
    }
    throw err;
  }
}
