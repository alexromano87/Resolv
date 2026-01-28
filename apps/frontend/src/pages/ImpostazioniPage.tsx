import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Bell, LayoutGrid, ShieldCheck } from 'lucide-react';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { studiApi } from '../api/studi';
import { CustomSelect } from '../components/ui/CustomSelect';
import { PhoneInput } from '../components/ui/PhoneInput';
import { useToast } from '../components/ui/ToastProvider';
import { authApi } from '../api/auth';
import {
  applyUserSettings,
  loadUserSettings,
  mergeUserSettings,
  saveUserSettings,
} from '../utils/userSettings';

type UiDensity = 'confortevole' | 'compatta';

type UserSettings = {
  density: UiDensity;
  notifications: {
    popup: boolean;
    sound: boolean;
    email: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    shareUsage: boolean;
  };
};

export function ImpostazioniPage() {
  const { user, logout, setSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [studioName, setStudioName] = useState<string>('');
  const [savedTelefono, setSavedTelefono] = useState<string>('');
  const [draftTelefono, setDraftTelefono] = useState<string>('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorChannel, setTwoFactorChannel] = useState<'sms' | 'email'>('email');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'enable-pending' | 'disable-pending'>('idle');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(() => loadUserSettings() as UserSettings);
  const [draftSettings, setDraftSettings] = useState<UserSettings>(settings);
  const [draftTheme, setDraftTheme] = useState<'light' | 'dark'>(theme);

  useEffect(() => {
    saveUserSettings(settings);
    applyUserSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const data = await authApi.getSettings();
        const next = mergeUserSettings(data.settings || {});
        setSettings(next as UserSettings);
        setDraftSettings(next as UserSettings);
        const phone = data.telefono || '';
        setSavedTelefono(phone);
        setDraftTelefono(phone);
        setTwoFactorEnabled(data.twoFactorEnabled);
        setTwoFactorChannel(data.twoFactorChannel || 'email');
      } catch (err: any) {
        error(err.message || 'Errore nel caricamento delle impostazioni');
      }
    };
    loadSettings();
  }, [error, user]);

  useEffect(() => {
    if (!user?.studioId) {
      setStudioName('');
      return;
    }
    let cancelled = false;
    const loadStudio = async () => {
      try {
        const studio = await studiApi.getOne(user.studioId as string);
        if (!cancelled) setStudioName(studio.nome);
      } catch {
        if (!cancelled) setStudioName('');
      }
    };
    loadStudio();
    return () => {
      cancelled = true;
    };
  }, [user?.studioId]);

  const densityOptions = useMemo(
    () => [
      { value: 'confortevole', label: 'Confortevole' },
      { value: 'compatta', label: 'Compatta' },
    ],
    [],
  );

  const themeOptions = useMemo(
    () => [
      { value: 'light', label: 'Chiaro' },
      { value: 'dark', label: 'Scuro' },
    ],
    [],
  );

  const handleSaveToast = () => {
    success('Preferenze aggiornate');
  };

  const handleSaveSettings = async () => {
    if (savingSettings) return;
    try {
      setSavingSettings(true);
      await authApi.updateSettings({ ...draftSettings, telefono: draftTelefono });
      setSettings(draftSettings);
      setSavedTelefono(draftTelefono);
      if (draftTheme !== theme) {
        toggleTheme();
      }
      handleSaveToast();
    } catch (err: any) {
      error(err.message || 'Errore nel salvataggio delle preferenze');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCancelSettings = () => {
    setDraftSettings(settings);
    setDraftTelefono(savedTelefono);
    setDraftTheme(theme);
  };

  const handleRequestEnable2fa = async () => {
    setTwoFactorLoading(true);
    try {
      await authApi.requestTwoFactorEnable({
        channel: twoFactorChannel,
        telefono: twoFactorChannel === 'sms' ? draftTelefono : undefined,
      });
      setTwoFactorStep('enable-pending');
      success('Codice 2FA inviato');
    } catch (err: any) {
      error(err.message || 'Errore invio codice 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerifyEnable2fa = async () => {
    if (!twoFactorCode.trim()) return;
    setTwoFactorLoading(true);
    try {
      await authApi.verifyTwoFactorEnable({ code: twoFactorCode.trim() });
      setTwoFactorEnabled(true);
      setTwoFactorStep('idle');
      setTwoFactorCode('');
      success('2FA attivato');
    } catch (err: any) {
      error(err.message || 'Codice 2FA non valido');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleRequestDisable2fa = async () => {
    setTwoFactorLoading(true);
    try {
      await authApi.requestTwoFactorDisable();
      setTwoFactorStep('disable-pending');
      success('Codice 2FA inviato');
    } catch (err: any) {
      error(err.message || 'Errore invio codice 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerifyDisable2fa = async () => {
    if (!twoFactorCode.trim()) return;
    setTwoFactorLoading(true);
    try {
      await authApi.verifyTwoFactorDisable({ code: twoFactorCode.trim() });
      setTwoFactorEnabled(false);
      setTwoFactorStep('idle');
      setTwoFactorCode('');
      success('2FA disattivato');
    } catch (err: any) {
      error(err.message || 'Codice 2FA non valido');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('Le password non coincidono');
      return;
    }
    setSavingPassword(true);
    try {
      const response = await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSession(response);
      success('Password aggiornata');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      error(err.message || 'Errore durante la modifica della password');
    } finally {
      setSavingPassword(false);
    }
  };

  const hasChanges =
    JSON.stringify(draftSettings) !== JSON.stringify(settings) ||
    draftTelefono !== savedTelefono ||
    draftTheme !== theme;

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-4 md:p-5">
        <span className="wow-chip">Profilo & Preferenze</span>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
          Impostazioni utente
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Gestisci profilo, preferenze e notifiche personali.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="wow-panel p-5 relative z-30">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            Profilo personale
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Nome</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user ? `${user.nome} ${user.cognome}` : 'Utente'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Email</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{user?.email || 'N/D'}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Ruolo</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {user?.ruolo || 'N/D'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Studio</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {studioName || 'Studio legale'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="wow-button-ghost text-xs"
            >
              <Lock className="h-4 w-4" />
              Modifica password
            </button>
          </div>
        </section>

        <section className="wow-panel p-5 relative z-30">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <LayoutGrid className="h-4 w-4 text-indigo-500" />
            Preferenze UI
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Tema
              </label>
              <CustomSelect
                options={themeOptions}
                value={draftTheme}
                onChange={(value) => setDraftTheme(value as 'light' | 'dark')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Densità elenco
              </label>
              <CustomSelect
                options={densityOptions}
                value={draftSettings.density}
                onChange={(value) =>
                  setDraftSettings((prev) => ({ ...prev, density: value as UiDensity }))
                }
              />
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Bell className="h-4 w-4 text-indigo-500" />
            Notifiche
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <span>Popup in app</span>
              <input
                type="checkbox"
                checked={draftSettings.notifications.popup}
                onChange={(e) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, popup: e.target.checked },
                  }))
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <span>Suoni alert</span>
              <input
                type="checkbox"
                checked={draftSettings.notifications.sound}
                onChange={(e) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, sound: e.target.checked },
                  }))
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <span>Email riepilogo</span>
              <input
                type="checkbox"
                checked={draftSettings.notifications.email}
                onChange={(e) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: e.target.checked },
                  }))
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            Privacy e sicurezza
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <span>Mostra stato online</span>
              <input
                type="checkbox"
                checked={draftSettings.privacy.showOnlineStatus}
                onChange={(e) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    privacy: { ...prev.privacy, showOnlineStatus: e.target.checked },
                  }))
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <span>Condividi statistiche anonime</span>
              <input
                type="checkbox"
                checked={draftSettings.privacy.shareUsage}
                onChange={(e) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    privacy: { ...prev.privacy, shareUsage: e.target.checked },
                  }))
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                try {
                  await authApi.logoutAll();
                } finally {
                  logout();
                  navigate('/login');
                }
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Esci da tutti i dispositivi
            </button>
            <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span>Autenticazione a due fattori (2FA)</span>
                <span className={`text-[11px] font-semibold ${twoFactorEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {twoFactorEnabled ? 'Attiva' : 'Disattiva'}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {!twoFactorEnabled && (
                  <>
                    <CustomSelect
                      options={[
                        { value: 'email', label: 'Email' },
                        { value: 'sms', label: 'SMS' },
                      ]}
                      value={twoFactorChannel}
                      onChange={(value) => setTwoFactorChannel(value as 'sms' | 'email')}
                    />
                    {twoFactorChannel === 'sms' && (
                      <PhoneInput
                        value={draftTelefono}
                        onChange={setDraftTelefono}
                        placeholder="Numero di telefono"
                        inputClassName="text-xs"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleRequestEnable2fa}
                      disabled={twoFactorLoading}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Invia codice
                    </button>
                    {twoFactorStep === 'enable-pending' && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="Codice 2FA"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyEnable2fa}
                          disabled={twoFactorLoading}
                          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Verifica e attiva
                        </button>
                      </div>
                    )}
                  </>
                )}

                {twoFactorEnabled && (
                  <>
                    <p className="text-[11px] text-slate-500">
                      Metodo attivo: {twoFactorChannel === 'sms' ? 'SMS' : 'Email'}
                    </p>
                    <button
                      type="button"
                      onClick={handleRequestDisable2fa}
                      disabled={twoFactorLoading}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Disattiva 2FA
                    </button>
                    {twoFactorStep === 'disable-pending' && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="Codice 2FA"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyDisable2fa}
                          disabled={twoFactorLoading}
                          className="w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          Conferma disattivazione
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {showPasswordModal && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Modifica password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <Lock className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Password attuale</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nuova password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Conferma nuova password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingPassword ? 'Salvataggio...' : 'Salva password'}
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCancelSettings}
          disabled={!hasChanges || savingSettings}
          className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:bg-slate-800"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={!hasChanges || savingSettings}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {savingSettings ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

    </div>
  );
}
