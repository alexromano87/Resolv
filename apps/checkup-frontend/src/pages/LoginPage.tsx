import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ClipboardCheck, BarChart3, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorChannel, setTwoFactorChannel] = useState<'email' | 'sms' | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      if ('access_token' in res) {
        setSession(res.access_token, res.user);
        navigate('/checkup/');
      } else {
        setTwoFactorUserId(res.userId);
        setTwoFactorChannel(res.channel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e: FormEvent) => {
    e.preventDefault();
    if (!twoFactorUserId) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyTwoFactorLogin(twoFactorUserId, twoFactorCode.trim());
      setSession(res.access_token, res.user);
      navigate('/checkup/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Codice 2FA non valido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE — Branding Panel */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[80px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-[200px] w-[200px] rounded-full bg-cyan-400/10 blur-[60px]" />

        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Top — Logo & Title */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <img src="/logo_resolv.png" alt="RESOLV" className="h-16 w-auto" />
          </div>
          <div className="mt-8 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-300">Checkup Platform</span>
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight" style={{ fontVariationSettings: "'wght' 700, 'opsz' 32" }}>
              Profilazione Aziendale<br />
              <span className="text-blue-300">Intelligente</span>
            </h1>
            <p className="mt-3 text-[15px] text-blue-200/80 max-w-sm leading-relaxed">
              Analisi strutturata della compliance, del rischio e della salute organizzativa della tua azienda.
            </p>
          </div>
        </div>

        {/* Middle — Feature highlights */}
        <div className="relative z-10 space-y-5">
          {[
            {
              icon: <ClipboardCheck className="w-5 h-5" />,
              color: 'bg-emerald-500/15 text-emerald-400',
              title: 'Questionari Strutturati',
              desc: 'Assessment guidati con template personalizzabili per area aziendale',
            },
            {
              icon: <Shield className="w-5 h-5" />,
              color: 'bg-cyan-500/15 text-cyan-400',
              title: 'Compliance & Risk Assessment',
              desc: 'Valutazione conformità normativa con scoring automatico',
            },
            {
              icon: <BarChart3 className="w-5 h-5" />,
              color: 'bg-blue-500/15 text-blue-400',
              title: 'Report & Analytics',
              desc: 'Dashboard executive con indicatori di rischio in tempo reale',
            },
          ].map((feature, i) => (
            <div key={i} className="flex items-start gap-4 group">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.color} transition-transform group-hover:scale-110`}>
                {feature.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                <p className="text-[13px] text-blue-300/70 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom — Footer */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-xs text-blue-400/60">
            &copy; {new Date().getFullYear()} Resolv. Tutti i diritti riservati.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-blue-400/60">
            <Lock className="w-3 h-3" />
            <span>Connessione cifrata</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <img src="/logo_resolv.png" alt="RESOLV" className="h-12 mx-auto" />
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-700">Checkup Platform</span>
            </div>
          </div>

          {twoFactorUserId ? (
            /* ——— 2FA FORM ——— */
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontVariationSettings: "'wght' 700" }}>
                  Verifica identità
                </h2>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Abbiamo inviato un codice di verifica via{' '}
                  <span className="font-medium text-slate-700">{twoFactorChannel === 'sms' ? 'SMS' : 'email'}</span>.
                  Inseriscilo per completare l'accesso.
                </p>
              </div>

              <form onSubmit={handleVerifyTwoFactor} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-danger-100 flex-shrink-0 mt-0.5">
                      <span className="text-danger-600 text-xs font-bold">!</span>
                    </div>
                    <p className="text-sm text-danger-700">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Codice di verifica
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="w-full px-4 py-3 text-center text-lg font-semibold tracking-[0.3em] border border-slate-300 rounded-xl bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-normal"
                    placeholder="000000"
                    maxLength={6}
                  />
                  <p className="mt-2 text-xs text-slate-400">Il codice scade tra 5 minuti</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length < 6}
                  className="w-full relative rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(30,64,175,0.25)] transition-all hover:bg-blue-800 hover:shadow-[0_12px_32px_rgba(30,64,175,0.35)] active:bg-blue-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifica in corso...
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
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Torna al login
                </button>
              </form>
            </div>
          ) : (
            /* ——— LOGIN FORM ——— */
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontVariationSettings: "'wght' 700" }}>
                  Benvenuto
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Accedi alla piattaforma di profilazione aziendale
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-danger-100 flex-shrink-0 mt-0.5">
                      <span className="text-danger-600 text-xs font-bold">!</span>
                    </div>
                    <p className="text-sm text-danger-700">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition-all text-sm"
                    placeholder="nome@azienda.it"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition-all text-sm"
                      placeholder="Inserisci password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(30,64,175,0.25)] transition-all hover:bg-blue-800 hover:shadow-[0_12px_32px_rgba(30,64,175,0.35)] active:bg-blue-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Accesso in corso...
                    </span>
                  ) : (
                    'Accedi alla piattaforma'
                  )}
                </button>
              </form>

              {/* Trust indicators */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    SSL/TLS
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Shield className="h-3 w-3" />
                    GDPR Compliant
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-slate-400">
            Powered by <span className="font-semibold text-slate-500">Resolv</span> &middot; Piattaforma sicura
          </p>
        </div>
      </div>
    </div>
  );
}
