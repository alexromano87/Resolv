// apps/frontend/src/api/auth.ts
import { api } from './config';

export type UserRole =
  | 'admin'
  | 'titolare_studio'
  | 'avvocato'
  | 'collaboratore'
  | 'segreteria'
  | 'cliente';

export type UserSettings = {
  language?: 'it' | 'en';
  density?: 'confortevole' | 'compatta';
  notifications?: {
    popup?: boolean;
    sound?: boolean;
    email?: boolean;
  };
  privacy?: {
    showOnlineStatus?: boolean;
    shareUsage?: boolean;
  };
};

export interface User {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  ruolo: UserRole;
  clienteId: string | null;
  studioId: string | null;
  currentStudioId?: string | null;
  studio?: {
    id: string;
    nome: string;
    ragioneSociale?: string;
  } | null;
  studi?: Array<{
    id: string;
    nome: string;
    ragioneSociale?: string;
  }>;
  telefono?: string | null;
  codiceFiscale?: string | null;
  livelloAccessoPratiche?: 'solo_proprie' | 'tutte';
  livelloPermessi?: 'visualizzazione' | 'modifica';
  note?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorChannel?: 'sms' | 'email' | null;
  settings?: UserSettings | null;
  attivo: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  nome: string;
  cognome: string;
  ruolo?: UserRole;
  clienteId?: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

export interface TwoFactorLoginResponse {
  requiresTwoFactor: true;
  userId: string;
  channel: 'sms' | 'email';
}

export interface StudioSelectionResponse {
  requiresStudioSelection: true;
  userId: string;
  studi: Array<{
    id: string;
    nome: string;
    ragioneSociale?: string;
  }>;
}

export type LoginResponse = AuthResponse | TwoFactorLoginResponse | StudioSelectionResponse;

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateSettingsDto extends UserSettings {
  telefono?: string;
}

export interface TwoFactorRequestDto {
  channel: 'sms' | 'email';
  telefono?: string;
}

export interface TwoFactorVerifyDto {
  code: string;
}

export interface PasswordResetRequestDto {
  email: string;
}

export interface PasswordResetConfirmDto {
  email: string;
  token: string;
  newPassword: string;
}

export const authApi = {
  login: async (loginDto: LoginDto): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/auth/login', loginDto);
  },

  register: async (registerDto: RegisterDto): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/register', registerDto);
  },

  getCurrentUser: async (): Promise<User> => {
    return api.get<User>('/auth/me');
  },

  getProfile: async (): Promise<User> => {
    return api.get<User>('/auth/profile');
  },

  verifyTwoFactorLogin: async (userId: string, code: string): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/login/2fa', { userId, code });
  },

  changePassword: async (dto: ChangePasswordDto): Promise<AuthResponse> => {
    return api.patch<AuthResponse>('/auth/change-password', dto);
  },

  logoutAll: async (): Promise<{ success: boolean }> => {
    return api.post<{ success: boolean }>('/auth/logout-all');
  },

  getSettings: async (): Promise<{
    settings: UserSettings | null;
    telefono: string | null;
    twoFactorEnabled: boolean;
    twoFactorChannel: 'sms' | 'email' | null;
  }> => {
    return api.get('/auth/settings');
  },

  updateSettings: async (dto: UpdateSettingsDto) => {
    return api.patch('/auth/settings', dto);
  },

  requestTwoFactorEnable: async (dto: TwoFactorRequestDto) => {
    return api.post('/auth/2fa/enable/request', dto);
  },

  verifyTwoFactorEnable: async (dto: TwoFactorVerifyDto) => {
    return api.post('/auth/2fa/enable/verify', dto);
  },

  requestTwoFactorDisable: async () => {
    return api.post('/auth/2fa/disable/request');
  },

  verifyTwoFactorDisable: async (dto: TwoFactorVerifyDto) => {
    return api.post('/auth/2fa/disable/verify', dto);
  },

  requestPasswordReset: async (dto: PasswordResetRequestDto) => {
    return api.post('/auth/password-reset/request', dto);
  },

  confirmPasswordReset: async (dto: PasswordResetConfirmDto) => {
    return api.post('/auth/password-reset/confirm', dto);
  },

  refreshToken: async (userId: string, refreshToken: string): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/refresh', { userId, refreshToken });
  },

  selectStudio: async (userId: string, studioId: string): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/select-studio', { userId, studioId });
  },
};
