import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/ToastProvider';
import { CustomSelect } from '../components/ui/CustomSelect';
import { PhoneInput } from '../components/ui/PhoneInput';

export default function AdminSuperSettingsPage() {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorChannel, setTwoFactorChannel] = useState<'sms' | 'email'>('email');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'enable-pending' | 'disable-pending'>('idle');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorNotice, setTwoFactorNotice] = useState('');
  const [telefono, setTelefono] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.ruolo !== 'superadmin') {
      navigate('/');
      return;
    }
    const loadSettings = async () => {
      try {
        const data = await authApi.getSettings();
        setTwoFactorEnabled(data.twoFactorEnabled);
        setTwoFactorChannel(data.twoFactorChannel || 'email');
        setTelefono(data.telefono || '');
      } catch (err: any) {
        error(err.message || 'Errore nel caricamento delle impostazioni');
      }
    };
    loadSettings();
  }, [error, navigate, user]);

  const handleRequestEnable2fa = async () => {
    setTwoFactorLoading(true);
    try {
      await authApi.requestTwoFactorEnable({
        channel: twoFactorChannel,
        telefono: twoFactorChannel === 'sms' ? telefono : undefined,
      });
      setTwoFactorStep('enable-pending');
      const channelLabel = twoFactorChannel === 'sms' ? 'SMS' : 'email';
      const phoneInfo = twoFactorChannel === 'sms' && telefono ? ` al numero ${telefono}` : '';
      setTwoFactorNotice(`Codice inviato via ${channelLabel}${phoneInfo}. Inseriscilo per completare l'attivazione.`);
      success('Codice 2FA inviato');
    } catch (err: any) {
      setTwoFactorNotice('');
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
      setTwoFactorNotice('');
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
      const channelLabel = twoFactorChannel === 'sms' ? 'SMS' : 'email';
      const phoneInfo = twoFactorChannel === 'sms' && telefono ? ` al numero ${telefono}` : '';
      setTwoFactorNotice(`Codice inviato via ${channelLabel}${phoneInfo}. Inseriscilo per completare la disattivazione.`);
      success('Codice 2FA inviato');
    } catch (err: any) {
      setTwoFactorNotice('');
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
      setTwoFactorNotice('');
      success('2FA disattivato');
    } catch (err: any) {
      error(err.message || 'Codice 2FA non valido');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      error('Compila tutti i campi richiesti');
      return;
    }
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
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      error(err.message || 'Errore durante la modifica della password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8">
        <span className="wow-chip">Superadmin</span>
        <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">
          Impostazioni sicurezza
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gestisci password e 2FA dell’utente superadmin.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="wow-panel p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lock className="h-4 w-4 text-indigo-500" />
            Password superadmin
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Email</p>
              <p className="text-sm font-semibold text-slate-900">{user?.email || 'admin@resolv.legal'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password attuale</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nuova password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Conferma nuova password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="wow-button"
              >
                {savingPassword ? 'Salvataggio...' : 'Aggiorna password'}
              </button>
            </div>
          </div>
        </section>

        <section className="wow-panel p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            Autenticazione a due fattori (2FA)
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span>Stato</span>
              <span className={`text-[11px] font-semibold ${twoFactorEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>
                {twoFactorEnabled ? 'Attiva' : 'Disattiva'}
              </span>
            </div>
            {twoFactorNotice && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                {twoFactorNotice}
              </div>
            )}

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
                    value={telefono}
                    onChange={setTelefono}
                    placeholder="Numero di telefono"
                    inputClassName="text-xs"
                  />
                )}
                <button
                  type="button"
                  onClick={handleRequestEnable2fa}
                  disabled={twoFactorLoading}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Invia codice
                </button>
                {twoFactorStep === 'enable-pending' && (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Disattiva 2FA
                </button>
                {twoFactorStep === 'disable-pending' && (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
        </section>
      </div>
    </div>
  );
}
