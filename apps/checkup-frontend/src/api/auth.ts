import { api } from './config';

export interface CheckupUser {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  telefono?: string | null;
  ruolo: 'superadmin' | 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  studioId: string | null;
  studioNome?: string | null;
  studioTipo?: 'licenziatario' | 'cliente' | null;
  clientId?: string | null;
  clientNome?: string | null;
  client?: { id: string; nome: string; ragioneSociale?: string | null; logoUrl?: string | null } | null;
  licenziatarioNome?: string | null;
  studio?: { id: string; nome: string } | null;
  azienda: string | null;
  macroAreaOwner?: string[] | null;
  macroAreaAssignments?: string[] | null;
  superOwner?: boolean;
  attivo?: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled?: boolean;
  twoFactorChannel?: 'email' | 'sms' | null;
  license?: {
    id: string;
    studioId: string;
    intestatario: string;
    tipo: string;
    numeroUtenze: number;
    numeroSottolicenze: number;
    modelIds?: string[] | null;
    model?: {
      id: string;
      code: string;
      label: string;
    } | null;
  } | null;
  sublicense?: {
    id: string;
    modelId?: string | null;
    allowDocuments?: boolean;
  } | null;
}

export interface LoginResponse {
  access_token: string;
  user: CheckupUser;
}

export interface RefreshResponse {
  access_token: string;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  userId: string;
  channel: 'email' | 'sms';
}

export type LoginResult = LoginResponse | TwoFactorRequiredResponse;

export interface PasswordResetRequestDto {
  email: string;
}

export interface PasswordResetConfirmDto {
  email: string;
  token: string;
  newPassword: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResult>('/checkup/auth/login', { email, password }, { skipAuthRedirect: true, credentials: 'include' }),

  verifyTwoFactorLogin: (userId: string, code: string) =>
    api.post<LoginResponse>('/checkup/auth/login/2fa', { userId, code }, { skipAuthRedirect: true, credentials: 'include' }),

  requestTwoFactorEnable: (channel: 'email' | 'sms', telefono?: string) =>
    api.post('/checkup/auth/2fa/enable/request', { channel, telefono }),

  verifyTwoFactorEnable: (code: string) =>
    api.post('/checkup/auth/2fa/enable/verify', { code }),

  requestTwoFactorDisable: () =>
    api.post('/checkup/auth/2fa/disable/request'),

  verifyTwoFactorDisable: (code: string) =>
    api.post('/checkup/auth/2fa/disable/verify', { code }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<LoginResponse>('/checkup/auth/change-password', { currentPassword, newPassword }, { credentials: 'include' }),

  getProfile: () =>
    api.get<CheckupUser>('/checkup/auth/profile'),

  requestPasswordReset: (dto: PasswordResetRequestDto) =>
    api.post('/checkup/auth/password-reset/request', dto, { skipAuthRedirect: true }),

  confirmPasswordReset: (dto: PasswordResetConfirmDto) =>
    api.post('/checkup/auth/password-reset/confirm', dto, { skipAuthRedirect: true }),

  /** Exchange the httpOnly refresh cookie for a new access token. */
  refresh: () =>
    api.post<RefreshResponse>('/checkup/auth/refresh', undefined, { skipAuthRedirect: true, credentials: 'include' }),

  /** Server-side logout: invalidates the refresh token cookie. */
  logout: () =>
    api.post('/checkup/auth/logout', undefined, { credentials: 'include' }).catch(() => undefined),
};
