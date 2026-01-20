import type { UserSettings } from '../api/auth';

export const USER_SETTINGS_STORAGE_KEY = 'rc-user-settings';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  density: 'confortevole',
  notifications: {
    popup: true,
    sound: true,
    email: false,
  },
  privacy: {
    showOnlineStatus: true,
    shareUsage: false,
  },
};

export const mergeUserSettings = (settings?: UserSettings | null): UserSettings => ({
  ...DEFAULT_USER_SETTINGS,
  ...(settings || {}),
  notifications: {
    ...DEFAULT_USER_SETTINGS.notifications,
    ...(settings?.notifications || {}),
  },
  privacy: {
    ...DEFAULT_USER_SETTINGS.privacy,
    ...(settings?.privacy || {}),
  },
});

export const loadUserSettings = (): UserSettings => {
  try {
    const stored = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    return stored ? mergeUserSettings(JSON.parse(stored)) : DEFAULT_USER_SETTINGS;
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
};

export const saveUserSettings = (settings: UserSettings) => {
  try {
    const { language, ...cleaned } = settings as UserSettings & { language?: string };
    localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore storage errors
  }
};

export const applyUserSettings = (settings: UserSettings) => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const density = settings.density || 'confortevole';
  root.dataset.density = density;
};
