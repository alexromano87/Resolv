import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(!!user?.twoFactorEnabled);
  const [twoFactorChannel, setTwoFactorChannel] = useState<'email' | 'sms'>(
    user?.twoFactorChannel === 'sms' ? 'sms' : 'email',
  );
  const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'enable-pending' | 'disable-pending'>('idle');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setTwoFactorEnabled(!!user?.twoFactorEnabled);
    setTwoFactorChannel(user?.twoFactorChannel === 'sms' ? 'sms' : 'email');
  }, [user?.twoFactorEnabled, user?.twoFactorChannel]);

  const handleRequestEnable2fa = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authApi.requestTwoFactorEnable(twoFactorChannel);
      setTwoFactorStep('enable-pending');
      setSuccess('Codice 2FA inviato');
    } catch (err: any) {
      setError(err.message || 'Errore invio codice 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEnable2fa = async () => {
    if (!twoFactorCode.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authApi.verifyTwoFactorEnable(twoFactorCode.trim());
      await refreshProfile();
      setTwoFactorEnabled(true);
      setTwoFactorStep('idle');
      setTwoFactorCode('');
      setSuccess('2FA attivato');
    } catch (err: any) {
      setError(err.message || 'Codice 2FA non valido');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDisable2fa = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authApi.requestTwoFactorDisable();
      setTwoFactorStep('disable-pending');
      setSuccess('Codice 2FA inviato');
    } catch (err: any) {
      setError(err.message || 'Errore invio codice 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDisable2fa = async () => {
    if (!twoFactorCode.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authApi.verifyTwoFactorDisable(twoFactorCode.trim());
      await refreshProfile();
      setTwoFactorEnabled(false);
      setTwoFactorStep('idle');
      setTwoFactorCode('');
      setSuccess('2FA disattivato');
    } catch (err: any) {
      setError(err.message || 'Codice 2FA non valido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8">
        <span className="wow-chip">Impostazioni</span>
        <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Impostazioni</h1>
        <p className="text-sm text-slate-600 mt-1">
          Gestisci le impostazioni personali e la sicurezza dell’account.
        </p>
      </div>

      <div className="wow-panel p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sicurezza</h2>
            <p className="text-sm text-slate-500 mt-1">
              Proteggi l’account con 2FA e aggiorna le credenziali di accesso.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Autenticazione a due fattori</h3>
                  <p className="text-xs text-slate-500">Protezione aggiuntiva all’accesso</p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${twoFactorEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {twoFactorEnabled ? 'Attivo' : 'Disattivo'}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              La 2FA protegge il tuo account con un codice inviato via email.
            </p>
            <div className="mt-4 space-y-3">
              {!twoFactorEnabled && twoFactorStep === 'idle' && (
                <button onClick={handleRequestEnable2fa} className="wow-button" disabled={loading}>
                  {loading ? 'Invio...' : 'Invia codice'}
                </button>
              )}

              {!twoFactorEnabled && twoFactorStep === 'enable-pending' && (
                <div className="space-y-2">
                  <input
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Codice 2FA"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleVerifyEnable2fa} className="wow-button" disabled={loading}>
                      {loading ? 'Verifica...' : 'Attiva 2FA'}
                    </button>
                    <button
                      onClick={() => {
                        setTwoFactorStep('idle');
                        setTwoFactorCode('');
                      }}
                      className="wow-button-ghost"
                      type="button"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}

              {twoFactorEnabled && twoFactorStep === 'idle' && (
                <button onClick={handleRequestDisable2fa} className="wow-button-ghost" disabled={loading}>
                  {loading ? 'Invio...' : 'Disattiva 2FA'}
                </button>
              )}

              {twoFactorEnabled && twoFactorStep === 'disable-pending' && (
                <div className="space-y-2">
                  <input
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="Codice 2FA"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleVerifyDisable2fa} className="wow-button" disabled={loading}>
                      {loading ? 'Verifica...' : 'Conferma disattivazione'}
                    </button>
                    <button
                      onClick={() => {
                        setTwoFactorStep('idle');
                        setTwoFactorCode('');
                      }}
                      className="wow-button-ghost"
                      type="button"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Password</h3>
                  <p className="text-xs text-slate-500">Aggiorna periodicamente la password</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Modifica la password di accesso al tuo account in modo sicuro.
            </p>
            <button
              onClick={() => navigate('/checkup/cambio-password')}
              className="mt-4 wow-button"
            >
              Cambia password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
