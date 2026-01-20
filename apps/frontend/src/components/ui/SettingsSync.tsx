import { useEffect } from 'react';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import {
  applyUserSettings,
  loadUserSettings,
  mergeUserSettings,
  saveUserSettings,
  USER_SETTINGS_STORAGE_KEY,
} from '../../utils/userSettings';

export function SettingsSync() {
  const { user } = useAuth();

  useEffect(() => {
    const settings = loadUserSettings();
    applyUserSettings(settings);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadRemoteSettings = async () => {
      try {
        const data = await authApi.getSettings();
        if (cancelled) return;
        const merged = mergeUserSettings(data.settings || {});
        saveUserSettings(merged);
        applyUserSettings(merged);
      } catch {
        // ignore settings fetch errors
      }
    };

    loadRemoteSettings();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== USER_SETTINGS_STORAGE_KEY) return;
      const settings = loadUserSettings();
      applyUserSettings(settings);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return null;
}
