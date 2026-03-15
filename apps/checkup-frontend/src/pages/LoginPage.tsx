import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ClipboardCheck, BarChart3, Lock, Eye, EyeOff, ArrowLeft, Loader2, Clock, Users, Layers, X } from 'lucide-react';
import { authApi } from '../api/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inactivityNotice, setInactivityNotice] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('checkup_inactivity_logout') === '1') {
      localStorage.removeItem('checkup_inactivity_logout');
      setInactivityNotice(true);
    }
  }, []);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorChannel, setTwoFactorChannel] = useState<'email' | 'sms' | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverStep, setRecoverStep] = useState<'request' | 'confirm'>('request');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverPassword, setRecoverPassword] = useState('');
  const [recoverConfirm, setRecoverConfirm] = useState('');
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);
  const [showRecoverConfirm, setShowRecoverConfirm] = useState(false);
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState('');
  const [recoverInfo, setRecoverInfo] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const forceClientDashboard = (user: { ruolo?: string; clientId?: string | null }) => {
    if (user?.ruolo !== 'cliente' || !user.clientId) return;
    const key = `checkup_preassessment_view_${user.clientId}`;
    sessionStorage.setItem(key, JSON.stringify({ view: 'dashboard', panel: null }));
    localStorage.removeItem(key);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      if ('access_token' in res) {
        setSession(res.access_token, res.user);
        forceClientDashboard(res.user);
        const isLicenziatario = res.user?.ruolo !== 'cliente';
        const target = isLicenziatario ? '/checkup/dashboard-studio' : '/checkup/';
        navigate(target, { replace: true });
      } else {
        setTwoFactorUserId(res.challengeToken);
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
      forceClientDashboard(res.user);
      const isLicenziatario = res.user?.ruolo !== 'cliente';
      const target = isLicenziatario ? '/checkup/dashboard-studio' : '/checkup/';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Codice 2FA non valido');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    if (!recoverEmail.trim()) return;
    setRecoverError('');
    setRecoverInfo('');
    setRecoverLoading(true);
    try {
      await authApi.requestPasswordReset({ email: recoverEmail.trim() });
      setRecoverStep('confirm');
      setRecoverInfo('Codice inviato via email');
    } catch (err) {
      setRecoverError(err instanceof Error ? err.message : 'Errore durante la richiesta');
    } finally {
      setRecoverLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!recoverEmail.trim() || !recoverCode.trim() || !recoverPassword) return;
    if (recoverPassword !== recoverConfirm) {
      setRecoverError('Le password non coincidono');
      return;
    }
    setRecoverError('');
    setRecoverInfo('');
    setRecoverLoading(true);
    try {
      await authApi.confirmPasswordReset({
        email: recoverEmail.trim(),
        token: recoverCode.trim(),
        newPassword: recoverPassword,
      });
      setShowRecoverModal(false);
      setRecoverStep('request');
      setRecoverEmail('');
      setRecoverCode('');
      setRecoverPassword('');
      setRecoverConfirm('');
    } catch (err) {
      setRecoverError(err instanceof Error ? err.message : 'Errore durante il reset');
    } finally {
      setRecoverLoading(false);
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
              <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-cyan-300">Governance &amp; Risk &amp; Compliance Platform</span>
            </div>
            <h1 className="text-xl font-bold text-white leading-tight whitespace-nowrap" style={{ fontVariationSettings: "'wght' 700, 'opsz' 32" }}>
              Piattaforma GRC modulare per la gestione integrata della compliance aziendale
            </h1>
          </div>
        </div>

        {/* Middle — Feature highlights */}
        <div className="relative z-10 space-y-4">
          {[
            {
              icon: <ClipboardCheck className="w-5 h-5" />,
              color: 'bg-emerald-500/15 text-emerald-400',
              title: 'Questionari Strutturati e Interattivi',
              desc: 'Assessment guidati con template personalizzati dove consulente e azienda lavorano proattivamente in un ambiente condiviso e sicuro',
            },
            {
              icon: <Shield className="w-5 h-5" />,
              color: 'bg-cyan-500/15 text-cyan-400',
              title: 'Compliance & Risk Assessment Integrati',
              desc: 'Valutazione multilevel dei rischi con scoring personalizzabili, gap analysis e mappatura del rischio su base continuativa',
            },
            {
              icon: <BarChart3 className="w-5 h-5" />,
              color: 'bg-blue-500/15 text-blue-400',
              title: 'Report, KPI e Dashboard dinamici',
              desc: 'Indicatori sintetici in tempo reale, reportistica e strumenti a supporto delle decisioni strategiche',
            },
            {
              icon: <Users className="w-5 h-5" />,
              color: 'bg-violet-500/15 text-violet-400',
              title: 'Workflow Collaborativo & Audit Trail',
              desc: 'Assegnazione di task, tracciabilità delle azioni, storico delle revisioni e archiviazione sicura della documentazione di compliance',
            },
            {
              icon: <Layers className="w-5 h-5" />,
              color: 'bg-amber-500/15 text-amber-400',
              title: 'Moduli Verticali per Area Normativa',
              desc: 'Implementazione e gestione strutturata di MOG 231, MOG Privacy, NIS2, Whistleblowing, Antiriciclaggio e altri framework regolatori in continua espansione',
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
          <p className="text-xs text-white/70">
            &reg; Resolv è un marchio R&amp;S Italy srl - Tutti i diritti riservati
          </p>
          <div className="flex items-center gap-1.5 text-xs text-white/70">
            <Lock className="w-3 h-3" />
            <span>Connessione sicura</span>
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-700">Governance &amp; Risk &amp; Compliance Platform</span>
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
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {inactivityNotice && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">Sessione terminata per inattività. Effettua nuovamente l'accesso.</p>
                  </div>
                )}
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400"> </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverEmail(email);
                      setShowRecoverModal(true);
                      setRecoverStep('request');
                      setRecoverError('');
                      setRecoverInfo('');
                    }}
                    className="font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Password dimenticata?
                  </button>
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
                    'Accedi alla Piattaforma'
                  )}
                </button>
              </form>

              {/* Trust indicators */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
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
                <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                  Accedendo dichiari di aver letto e accettato la{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="underline text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    Privacy Policy
                  </button>
                  {' '}e le{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="underline text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    Condizioni d'Uso
                  </button>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-slate-400">
            Powered by <span className="font-semibold text-slate-500">R&amp;S Italy srl</span> &middot; Piattaforma sicura
          </p>
        </div>
      </div>

      {/* ——— PRIVACY POLICY MODAL ——— */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPrivacyModal(false)}
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Informativa sul Trattamento dei Dati Personali</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ai sensi dell'art. 13 del Regolamento UE 2016/679 – GDPR</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-slate-700 leading-relaxed">
              <section>
                <h4 className="font-semibold text-slate-900 mb-1">1. Titolare del Trattamento</h4>
                <p>
                  R&amp;S Italy S.r.l., con sede legale in Via Orio 18, Bergamo, P.IVA IT04157700164
                  (di seguito "il Titolare"), fornisce la presente informativa a tutti gli utenti che accedono alla
                  Piattaforma Resolv – Modulo Checkup Pre-Assessment, in qualità di Titolare del trattamento dei
                  dati personali ai sensi dell'art. 13 del Regolamento UE 679/2016 (GDPR).
                  Per ulteriori informazioni sull'azienda: <span className="font-medium text-slate-800">www.resitaly.it</span>.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">2. Dati Trattati</h4>
                <p>Nell'ambito del Modulo Checkup vengono trattati i seguenti dati personali:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-slate-600">
                  <li>Dati identificativi: nome, cognome, indirizzo email;</li>
                  <li>Dati di autenticazione: credenziali di accesso, token di sessione;</li>
                  <li>Dati professionali e aziendali inseriti nei questionari di pre-assessment;</li>
                  <li>Log di accesso e tracciatura delle attività (audit trail).</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">3. Finalità del Trattamento</h4>
                <p>
                  I dati sono trattati esclusivamente per l'erogazione del servizio di pre-assessment della compliance
                  aziendale, per la gestione del profilo utente e per l'assolvimento degli obblighi contrattuali e di
                  legge derivanti dalla fruizione della Piattaforma.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">4. Base Giuridica</h4>
                <p>
                  Il trattamento si fonda sull'esecuzione del contratto di servizio stipulato tra il Titolare e
                  l'organizzazione committente (art. 6, par. 1, lett. b) GDPR) e sul legittimo interesse del Titolare
                  a garantire la sicurezza e il corretto funzionamento della Piattaforma (art. 6, par. 1, lett. f) GDPR).
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">5. Conservazione dei Dati</h4>
                <p>
                  I dati dei pre-assessment conclusi sono conservati per il periodo definito contrattualmente con
                  l'organizzazione committente, decorso il quale sono eliminati in modo automatico e definitivo.
                  I log di accesso e gli audit trail sono conservati per 90 giorni dalla loro generazione, salvo diversa
                  indicazione contrattuale.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">6. Misure di Sicurezza</h4>
                <p>
                  Il Titolare adotta misure tecniche e organizzative adeguate ai sensi dell'art. 32 GDPR, tra cui:
                  cifratura AES-256-GCM dei dati sensibili, autenticazione a due fattori (2FA), token di sessione con
                  scadenza automatica, connessione SSL/TLS cifrata e tracciatura delle operazioni tramite audit trail
                  immutabile.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">7. Diritti dell'Interessato</h4>
                <p>
                  L'utente ha il diritto di accedere ai propri dati (tramite la funzione "Esporta i miei dati" nella
                  sezione Impostazioni), rettificarli, richiederne la cancellazione (tramite la funzione "Richiesta di
                  cancellazione"), limitarne il trattamento, opporsi al trattamento e richiedere la portabilità dei dati,
                  ai sensi degli artt. 15–22 GDPR.
                </p>
                <p className="mt-2">
                  Per esercitare tali diritti o per qualsiasi richiesta in materia di protezione dei dati personali,
                  è possibile contattare il Responsabile della Protezione dei Dati (DPO) all'indirizzo:{' '}
                  <span className="font-medium text-slate-800">privacy@resolv.legal</span>.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">8. Trasferimenti Internazionali</h4>
                <p>
                  I dati personali trattati nell'ambito della Piattaforma Resolv non sono trasferiti verso Paesi terzi
                  al di fuori dello Spazio Economico Europeo.
                </p>
              </section>

              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                Ultimo aggiornamento: marzo 2026
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition"
              >
                Ho letto e compreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ——— CONDIZIONI D'USO MODAL ——— */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTermsModal(false)}
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Condizioni d'Uso della Piattaforma</h3>
                <p className="text-xs text-slate-400 mt-0.5">Modulo Checkup Pre-Assessment – Resolv</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm text-slate-700 leading-relaxed">
              <section>
                <h4 className="font-semibold text-slate-900 mb-1">1. Ambito di Applicazione</h4>
                <p>
                  Le presenti Condizioni d'Uso disciplinano l'accesso e l'utilizzo del Modulo Checkup Pre-Assessment
                  della Piattaforma Resolv, sviluppata e gestita da R&amp;S Italy S.r.l., con sede legale in Via Orio 18,
                  Bergamo, P.IVA IT04157700164 (di seguito "il Fornitore") – <span className="font-medium text-slate-800">www.resitaly.it</span>.
                  L'accesso alla Piattaforma implica la piena e incondizionata accettazione delle presenti Condizioni.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">2. Credenziali di Accesso</h4>
                <p>
                  Le credenziali di accesso (indirizzo email e password) sono strettamente personali e non cedibili a
                  terzi. L'utente è responsabile della custodia delle proprie credenziali e di qualsiasi attività
                  compiuta tramite il proprio account. In caso di smarrimento o sospetta compromissione, l'utente deve
                  procedere immediatamente al cambio della password tramite la funzione "Password dimenticata?"
                  disponibile nella pagina di accesso.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">3. Utilizzo della Piattaforma</h4>
                <p>
                  L'utente si impegna a utilizzare la Piattaforma esclusivamente per le finalità per cui è stata messa
                  a disposizione e in conformità alla normativa vigente. È espressamente vietato:
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-slate-600">
                  <li>condividere le credenziali di accesso con soggetti non autorizzati;</li>
                  <li>tentare di accedere ad aree o funzionalità riservate non autorizzate;</li>
                  <li>utilizzare strumenti automatizzati, bot o script per l'interazione con la Piattaforma;</li>
                  <li>inserire dati falsi, fuorvianti o lesivi dei diritti di terzi nei questionari.</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">4. Proprietà Intellettuale</h4>
                <p>
                  Resolv è un marchio registrato di R&amp;S Italy S.r.l. Tutti i contenuti, le metodologie, i template
                  di assessment, il software e la documentazione della Piattaforma sono di esclusiva proprietà del
                  Fornitore e protetti dalla normativa vigente in materia di diritto d'autore e proprietà intellettuale.
                  Nessun contenuto può essere riprodotto, distribuito, modificato o comunicato a terzi senza espressa
                  autorizzazione scritta del Fornitore.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">5. Limitazione di Responsabilità</h4>
                <p>
                  Il Fornitore garantisce la disponibilità della Piattaforma nei limiti previsti dal contratto di
                  servizio. Il Fornitore declina ogni responsabilità per danni derivanti da: uso improprio o non
                  autorizzato delle credenziali; inserimento di dati inesatti o incompleti nei questionari;
                  interruzioni del servizio dovute a cause di forza maggiore, guasti di terzi o interventi di
                  manutenzione programmata comunicati con ragionevole preavviso.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">6. Modifiche alle Condizioni</h4>
                <p>
                  Il Fornitore si riserva il diritto di modificare le presenti Condizioni d'Uso in qualsiasi momento,
                  dandone comunicazione agli utenti tramite la Piattaforma. L'utilizzo continuato della Piattaforma
                  dopo la pubblicazione delle modifiche costituisce accettazione delle nuove Condizioni.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-slate-900 mb-1">7. Legge Applicabile e Foro Competente</h4>
                <p>
                  Le presenti Condizioni d'Uso sono disciplinate dalla legge italiana. Per qualsiasi controversia
                  relativa all'interpretazione, all'esecuzione o alla cessazione del rapporto regolato dalle presenti
                  Condizioni, sarà competente in via esclusiva il Foro di Bergamo, salvo diversa indicazione contrattuale.
                </p>
              </section>

              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                Ultimo aggiornamento: marzo 2026
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition"
              >
                Ho letto e accettato
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRecoverModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">
              Recupera password
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Ti invieremo un codice via email.
            </p>
            {recoverError && (
              <div className="mt-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
                {recoverError}
              </div>
            )}
            {recoverInfo && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {recoverInfo}
              </div>
            )}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition"
                  placeholder="nome@azienda.it"
                />
              </div>
              {recoverStep === 'confirm' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Codice
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={recoverCode}
                      onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition"
                      placeholder="Codice ricevuto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nuova password
                    </label>
                    <div className="relative">
                      <input
                        type={showRecoverPassword ? 'text' : 'password'}
                        value={recoverPassword}
                        onChange={(e) => setRecoverPassword(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition"
                        placeholder="Nuova password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoverPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showRecoverPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Conferma password
                    </label>
                    <div className="relative">
                      <input
                        type={showRecoverConfirm ? 'text' : 'password'}
                        value={recoverConfirm}
                        onChange={(e) => setRecoverConfirm(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 transition"
                        placeholder="Conferma password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoverConfirm((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showRecoverConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRecoverModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Annulla
              </button>
              {recoverStep === 'request' ? (
                <button
                  type="button"
                  disabled={recoverLoading || !recoverEmail.trim()}
                  onClick={handleRequestReset}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recoverLoading ? 'Invio...' : 'Invia codice'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={recoverLoading || !recoverEmail.trim() || !recoverCode.trim() || !recoverPassword}
                  onClick={handleConfirmReset}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recoverLoading ? 'Conferma...' : 'Reset password'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
