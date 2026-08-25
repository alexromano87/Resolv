import { api } from './config';
import { CheckupUser } from './auth';

export interface CreateCheckupUserPayload {
  email: string;
  /** Obbligatoria per una nuova utenza; omessa quando si associa un'utenza esistente. */
  password?: string;
  nome: string;
  cognome: string;
  telefono?: string;
  titolo?: string;
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  clientId?: string;
  sublicenseId?: string;
  anagraficaId?: string;
  azienda?: string;
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

/** Costruisce il messaggio di conferma riuso utenza in base al match di società. */
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
