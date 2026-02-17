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
  client?: { id: string; nome: string; ragioneSociale?: string | null } | null;
  licenziatarioNome?: string | null;
  studio?: { id: string; nome: string } | null;
  azienda: string | null;
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
  } | null;
}

export interface LoginResponse {
  access_token: string;
  user: CheckupUser;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  userId: string;
  channel: 'email' | 'sms';
}

export type LoginResult = LoginResponse | TwoFactorRequiredResponse;

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResult>('/checkup/auth/login', { email, password }, { skipAuthRedirect: true }),

  verifyTwoFactorLogin: (userId: string, code: string) =>
    api.post<LoginResponse>('/checkup/auth/login/2fa', { userId, code }, { skipAuthRedirect: true }),

  requestTwoFactorEnable: (channel: 'email' | 'sms', telefono?: string) =>
    api.post('/checkup/auth/2fa/enable/request', { channel, telefono }),

  verifyTwoFactorEnable: (code: string) =>
    api.post('/checkup/auth/2fa/enable/verify', { code }),

  requestTwoFactorDisable: () =>
    api.post('/checkup/auth/2fa/disable/request'),

  verifyTwoFactorDisable: (code: string) =>
    api.post('/checkup/auth/2fa/disable/verify', { code }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<LoginResponse>('/checkup/auth/change-password', { currentPassword, newPassword }),

  getProfile: () =>
    api.get<CheckupUser>('/checkup/auth/profile'),
};
