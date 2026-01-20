// apps/frontend/src/pages/LoginPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useAuth } from '../contexts/AuthContext';
import { authApi, type LoginDto } from '../api/auth';
import { useToast } from '../components/ui/ToastProvider';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, setSession } = useAuth();
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState<LoginDto>({
    email: '',
    password: '',
  });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorChannel, setTwoFactorChannel] = useState<'sms' | 'email' | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'studio' | 'cliente' | null>(null);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  useEffect(() => {
    const flagged = localStorage.getItem('auth_inactivity_logout');
    if (flagged) {
      localStorage.removeItem('auth_inactivity_logout');
      setShowInactivityModal(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await login(formData);
      if ('requiresTwoFactor' in response) {
        setTwoFactorUserId(response.userId);
        setTwoFactorChannel(response.channel);
        setTwoFactorCode('');
        return;
      }

      if ('requiresStudioSelection' in response) {
        // Naviga alla pagina di selezione studio passando i dati nello state
        navigate('/select-studio', { state: response });
        return;
      }

      if (response && response.user.ruolo === 'admin') {
        navigate('/admin/users');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      // Gestione errori specifici
      if (err.status === 0) {
        // Errore di rete - server non raggiungibile
        setError(
          'Impossibile contattare il server. Verifica la tua connessione internet o riprova più tardi.'
        );
      } else if (err.status >= 500) {
        // Errore del server
        setError(
          'Il server non è al momento disponibile. Riprova tra qualche minuto.'
        );
      } else if (err.status === 401) {
        // Credenziali errate
        setError('Email o password non corretti. Riprova.');
      } else if (err.message?.toLowerCase().includes('database') ||
                 err.message?.toLowerCase().includes('connection')) {
        // Errore del database
        setError(
          'Servizio temporaneamente non disponibile. Stiamo risolvendo il problema, riprova tra qualche minuto.'
        );
      } else {
        // Altri errori
        setError(err.message || 'Errore durante il login. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorUserId || !twoFactorCode.trim()) return;
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.verifyTwoFactorLogin(twoFactorUserId, twoFactorCode.trim());
      setSession(response);
      if (response.user.ruolo === 'admin') {
        navigate('/admin/users');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      // Gestione errori specifici per 2FA
      if (err.status === 0) {
        setError(
          'Impossibile contattare il server. Verifica la tua connessione internet o riprova più tardi.'
        );
      } else if (err.status >= 500) {
        setError(
          'Il server non è al momento disponibile. Riprova tra qualche minuto.'
        );
      } else if (err.status === 401 || err.status === 400) {
        setError('Codice non valido o scaduto. Riprova.');
      } else {
        setError(err.message || 'Errore nella verifica. Riprova.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-blue-600/20 blur-3xl" />

        {/* Top Section - Logo & Title */}
        <div className="relative z-10">
          <img src="/logo_resolv.png" alt="RESOLV" className="h-28 w-auto" />
          <p className="mt-6 text-lg text-blue-200 max-w-md">
            Gestione professionale del recupero crediti per studi legali
          </p>
        </div>

        {/* Middle Section - Features */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-500/20 text-success-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Tracking Completo</h3>
              <p className="text-sm text-blue-200">Monitora ogni fase del recupero crediti in tempo reale</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Sicurezza & Compliance</h3>
              <p className="text-sm text-blue-200">Conforme GDPR con audit trail completo</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Dashboard & Report</h3>
              <p className="text-sm text-blue-200">KPI finanziari e metriche in tempo reale</p>
            </div>
          </div>
        </div>

        {/* Bottom Section - Footer */}
        <p className="text-xs text-blue-300 relative z-10">
          © {new Date().getFullYear()} Resolv. Tutti i diritti riservati. GDPR Compliant.
        </p>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo_resolv.png" alt="RESOLV" className="h-14 w-14 mx-auto" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              RESOLV
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Piattaforma professionale di recupero crediti
            </p>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Benvenuto
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Accedi al tuo account per continuare
            </p>
          </div>

        {!twoFactorUserId ? (
          !loginMode ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Seleziona il tipo di accesso per visualizzare il form.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setLoginMode('studio')}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="block text-sm font-semibold text-slate-900">Accedi come studio</span>
                  <span className="mt-1 block text-xs text-slate-500">Area professionisti</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode('cliente')}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="block text-sm font-semibold text-slate-900">Accedi come cliente</span>
                  <span className="mt-1 block text-xs text-slate-500">Area clienti</span>
                </button>
              </div>
            </div>
          ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span>
                {loginMode === 'studio' ? 'Accesso studio' : 'Accesso cliente'}
              </span>
              <button
                type="button"
                onClick={() => setLoginMode(null)}
                className="font-semibold text-blue-700 hover:text-blue-800 transition"
              >
                Cambia
              </button>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition"
                placeholder={loginMode === 'studio' ? 'nome@studio.it' : 'nome@cliente.it'}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-blue-700 focus:ring-blue-600" />
                Ricordami
              </label>
              <button
                type="button"
                onClick={() => setShowRecoverModal(true)}
                className="font-semibold text-blue-700 hover:text-blue-800 transition"
              >
                Password dimenticata?
              </button>
            </div>

          {error && (
            <div className="rounded-lg bg-danger-50 border border-danger-200 p-4">
              <p className="text-sm font-medium text-danger-800">
                {error}
              </p>
            </div>
          )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(30,64,175,0.3)] transition hover:bg-blue-800 hover:shadow-[0_12px_32px_rgba(30,64,175,0.4)] active:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  Accesso in corso...
                </span>
              ) : (
                'Accedi alla piattaforma'
              )}
            </button>
          </form>
          )
        ) : (
          <form className="space-y-5" onSubmit={handleVerifyTwoFactor}>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              Codice 2FA inviato via {twoFactorChannel === 'sms' ? 'SMS' : 'email'}.
            </div>

            <div>
              <label htmlFor="twofa" className="block text-sm font-semibold text-slate-700 mb-2">
                Codice di verifica
              </label>
              <input
                id="twofa"
                name="twofa"
                type="text"
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition"
                placeholder="Inserisci il codice"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-danger-50 border border-danger-200 p-4">
                <p className="text-sm font-medium text-danger-800">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(30,64,175,0.3)] transition hover:bg-blue-800 hover:shadow-[0_12px_32px_rgba(30,64,175,0.4)] active:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Verifica...
                  </span>
                ) : (
                  'Verifica e accedi'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTwoFactorUserId(null);
                  setTwoFactorChannel(null);
                }}
                className="w-full text-sm font-medium text-slate-600 hover:text-slate-900 transition"
              >
                ← Torna al login
              </button>
            </div>
          </form>
        )}
        </div>
      </div>

      {showInactivityModal && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Sessione terminata</h3>
            <p className="mt-2 text-sm text-slate-600">
              Sei stato disconnesso per inattività.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowInactivityModal(false);
                  navigate('/login');
                }}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
              >
                Vai al login
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
      )}

      {showRecoverModal && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRecoverModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">
              Recupera password
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Inserisci la tua email per ricevere il link di recupero.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={recoverEmail}
                onChange={(e) => setRecoverEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition"
                placeholder="nome@studio.it"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRecoverModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={recoverLoading || !recoverEmail.trim()}
                onClick={async () => {
                  try {
                    setRecoverLoading(true);
                    await authApi.requestPasswordReset({ email: recoverEmail.trim() });
                    success('Email inviata con il link di recupero');
                    setShowRecoverModal(false);
                    setRecoverEmail('');
                  } catch (err: any) {
                    toastError(err.message || 'Errore durante la richiesta');
                  } finally {
                    setRecoverLoading(false);
                  }
                }}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Invia link
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
      )}
    </div>
  );
};

export default LoginPage;
