import { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useToast } from '../components/ui/ToastProvider';

const useQuery = () => new URLSearchParams(useLocation().search);

export default function ResetPasswordPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const presetEmail = query.get('email') || '';
  const presetToken = query.get('token') || '';

  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState(presetToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim() && token.trim() && newPassword.trim() && newPassword === confirmPassword;
  }, [email, token, newPassword, confirmPassword]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-transparent px-4 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 right-[-10%] h-72 w-72 rounded-full bg-indigo-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-[-10%] h-80 w-80 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-slate-900/5 blur-3xl" />
      <div className="max-w-md w-full space-y-6 wow-card p-6">
        <div>
          <span className="wow-chip w-fit">Sicurezza account</span>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            Reset password
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Inserisci il token ricevuto via email e imposta la nuova password.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Email <span className="text-rose-600">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={[
                'w-full rounded-2xl border bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
                submitAttempted && !email.trim()
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200/60'
                  : 'border-white/70 focus:border-indigo-500 focus:ring-indigo-200/60',
              ].join(' ')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Token <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className={[
                'w-full rounded-2xl border bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
                submitAttempted && !token.trim()
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200/60'
                  : 'border-white/70 focus:border-indigo-500 focus:ring-indigo-200/60',
              ].join(' ')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Nuova password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={[
                  'w-full rounded-2xl border bg-white/90 px-4 py-3 pr-11 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
                  submitAttempted && !newPassword.trim()
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200/60'
                    : 'border-white/70 focus:border-indigo-500 focus:ring-indigo-200/60',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Conferma password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={[
                  'w-full rounded-2xl border bg-white/90 px-4 py-3 pr-11 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
                  submitAttempted && !confirmPassword.trim()
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200/60'
                    : 'border-white/70 focus:border-indigo-500 focus:ring-indigo-200/60',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Torna al login
          </button>
          <button
            type="button"
            disabled={!canSubmit || loading}
            onClick={async () => {
              setSubmitAttempted(true);
              if (!canSubmit) return;
              if (newPassword !== confirmPassword) {
                error('Le password non coincidono');
                return;
              }
              try {
                setLoading(true);
                await authApi.confirmPasswordReset({
                  email: email.trim(),
                  token: token.trim(),
                  newPassword,
                });
                success('Password aggiornata');
                navigate('/login');
              } catch (err: any) {
                error(err.message || 'Errore durante il reset');
              } finally {
                setLoading(false);
              }
            }}
            className="wow-button text-xs disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}
