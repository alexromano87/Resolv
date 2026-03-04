import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  Building2,
  Users,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Activity,
  Lock,
  TrendingUp,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { checkupAdminApi, type CheckupDashboardStats } from '../api/checkupAdmin';
import { useToast } from '../components/ui/ToastProvider';

// ─── Helpers ────────────────────────────────────────────────────────────────

function pct(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

function fmtDate(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(iso: string) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  return `${Math.floor(diff / 3600)}h fa`;
}

type LicenziatarioRow = CheckupDashboardStats['licenziatariBreakdown'][0];

function studioHealth(s: LicenziatarioRow): 'healthy' | 'warning' | 'critical' {
  if (!s.attivo || !s.hasLicense || s.licenzaScaduta || s.expiredSublicenses > 0) return 'critical';
  if (s.licenzaInScadenza || s.expiringSoonSublicenses > 0) return 'warning';
  return 'healthy';
}

const ROLE_LABELS: Record<string, string> = {
  admin_studio: 'Admin Studio',
  segreteria: 'Segreteria',
  collaboratore: 'Collaboratore',
  cliente: 'Cliente',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function Bar({
  value,
  max,
  color = 'emerald',
}: {
  value: number;
  max: number;
  color?: 'emerald' | 'amber' | 'red' | 'sky' | 'indigo' | 'violet';
}) {
  const p = pct(value, max);
  const colors = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    sky: 'bg-sky-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${colors[color]}`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function HealthDot({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const map = {
    healthy: 'bg-emerald-400',
    warning: 'bg-amber-400',
    critical: 'bg-red-500',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status !== 'healthy' && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${map[status]}`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${map[status]}`} />
    </span>
  );
}

function PctBadge({ value, danger = 50, warn = 75 }: { value: number; danger?: number; warn?: number }) {
  const color =
    value >= danger
      ? 'bg-red-100 text-red-700'
      : value >= warn
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {value}%
    </span>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-100" />
      <div className="h-72 rounded-xl bg-slate-100" />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminCheckupDashboardPage() {
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<CheckupDashboardStats | null>(null);
  const [showAllCritical, setShowAllCritical] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await checkupAdminApi.getDashboardStats();
        setStats(data);
      } catch (err: any) {
        error(err?.message || 'Errore durante il caricamento della dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [error],
  );

  useEffect(() => {
    load();
  }, [load]);

  // System health level
  const systemHealth =
    !stats
      ? 'healthy'
      : stats.criticalItems.some((i) => i.severity === 'critical')
        ? 'critical'
        : stats.criticalItems.length > 0
          ? 'warning'
          : 'healthy';

  const criticalCount = stats?.criticalItems.filter((i) => i.severity === 'critical').length ?? 0;
  const warningCount = stats?.criticalItems.filter((i) => i.severity === 'warning').length ?? 0;

  const visibleCritical = showAllCritical
    ? (stats?.criticalItems ?? [])
    : (stats?.criticalItems ?? []).slice(0, 5);

  if (loading) return <DashboardSkeleton />;

  if (!stats) {
    return (
      <div className="wow-panel p-12 text-center">
        <XCircle className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-slate-500">Impossibile caricare i dati</p>
      </div>
    );
  }

  const sublicUsage = pct(stats.sublicenses.assignedToClient, stats.sublicenses.total);
  const twoFaPct = pct(stats.users.with2fa, stats.users.total);

  return (
    <div className="space-y-6 wow-stagger">

      {/* ── HEADER ── */}
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Superadmin · Checkup</span>
          <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900">
            Dashboard Pre-Assessment
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitoraggio operativo licenziatari, sublicenziatari, utenze e pre-assessment — aggiornato{' '}
            {timeAgo(stats.generatedAt)}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {/* ── SYSTEM HEALTH BANNER ── */}
      {systemHealth !== 'healthy' && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            systemHealth === 'critical'
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <AlertCircle
            className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
              systemHealth === 'critical' ? 'text-red-600' : 'text-amber-600'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold ${systemHealth === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
              {systemHealth === 'critical'
                ? `${criticalCount} element${criticalCount === 1 ? 'o critico' : 'i critici'} rilevat${criticalCount === 1 ? 'o' : 'i'}`
                : `${warningCount} avvis${warningCount === 1 ? 'o' : 'i'} — azione richiesta entro 30 giorni`}
              {warningCount > 0 && systemHealth === 'critical' && (
                <span className="ml-2 font-normal text-red-600">
                  · {warningCount} avvis{warningCount === 1 ? 'o' : 'i'} aggiuntiv{warningCount === 1 ? 'o' : 'i'}
                </span>
              )}
            </p>
            <p className={`mt-0.5 text-sm ${systemHealth === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
              Scorrere la sezione "Elementi critici" per i dettagli e le azioni correttive.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI ROW (4 cards) ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Licenziatari */}
        <div className="wow-panel p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700">
              <Building2 className="h-5 w-5" />
            </div>
            <HealthDot status={stats.studios.inactive > 0 ? 'warning' : 'healthy'} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.studios.licenziatari}</p>
          <p className="text-sm font-medium text-slate-500">Licenziatari</p>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Attivi</span>
              <span className="font-semibold text-slate-700">{stats.studios.licenziatariAttivi}/{stats.studios.licenziatari}</span>
            </div>
            <div className="flex justify-between">
              <span>Inattivi</span>
              <span className="font-semibold text-slate-700">{stats.studios.licenziatari - stats.studios.licenziatariAttivi}</span>
            </div>
          </div>
        </div>

        {/* Sublicenziatari */}
        <div className="wow-panel p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <HealthDot status={stats.clients.inactive > 0 ? 'warning' : 'healthy'} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.clients.total}</p>
          <p className="text-sm font-medium text-slate-500">Sublicenziatari</p>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Attivi</span>
              <span className="font-semibold text-slate-700">{stats.clients.active}</span>
            </div>
            <div className="flex justify-between">
              <span>Pre-assessment completati</span>
              <span className="font-semibold text-slate-700">{stats.clients.preassessmentCompleted}</span>
            </div>
          </div>
        </div>

        {/* Sublicenses */}
        <div className="wow-panel p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <HealthDot
              status={
                stats.sublicenses.expired > 0
                  ? 'critical'
                  : stats.sublicenses.expiringSoon > 0
                    ? 'warning'
                    : 'healthy'
              }
            />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.sublicenses.total}</p>
          <p className="text-sm font-medium text-slate-500">Sublicenze</p>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Attive</span>
              <span className="font-semibold text-slate-700">{stats.sublicenses.active}</span>
            </div>
            <div className="flex justify-between">
              <span>Scadute</span>
              <span className={`font-semibold ${stats.sublicenses.expired > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                {stats.sublicenses.expired}
              </span>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="wow-panel p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
              <Users className="h-5 w-5" />
            </div>
            <HealthDot status={stats.users.inactive > 0 ? 'warning' : 'healthy'} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.users.total}</p>
          <p className="text-sm font-medium text-slate-500">Utenze</p>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Attive</span>
              <span className="font-semibold text-slate-700">{stats.users.active}</span>
            </div>
            <div className="flex justify-between">
              <span>Inattive</span>
              <span className="font-semibold text-slate-700">{stats.users.inactive}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODELLI ── */}
      <div className="wow-panel p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Modelli Pre-Assessment</p>
              <p className="text-xs text-slate-500">
                {stats.models.published} pubblicat{stats.models.published === 1 ? 'o' : 'i'} su {stats.models.total} attiv{stats.models.total === 1 ? 'o' : 'i'} — distribuzione sublicenze attive per modello
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5">
            <span className="text-xs font-semibold text-violet-700">{stats.models.total}</span>
            <span className="text-xs text-violet-500">modell{stats.models.total === 1 ? 'o' : 'i'}</span>
          </div>
        </div>

        {stats.models.breakdown.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nessun modello attivo configurato</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stats.models.breakdown.map((m) => {
              const maxCount = Math.max(...stats.models.breakdown.map((x) => x.activeSublicenseCount), 1);
              const statusColors: Record<string, string> = {
                published: 'bg-emerald-100 text-emerald-700',
                draft: 'bg-slate-100 text-slate-500',
                archived: 'bg-rose-100 text-rose-600',
              };
              return (
                <div key={m.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{m.label}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{m.code}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[m.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {m.status === 'published' ? 'Pub.' : m.status === 'draft' ? 'Bozza' : 'Arch.'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xs text-slate-500">Sublicenze attive</span>
                      <span className="text-lg font-bold text-slate-900">{m.activeSublicenseCount}</span>
                    </div>
                    <Bar value={m.activeSublicenseCount} max={maxCount} color="violet" />
                    {stats.sublicenses.active > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        {Math.round((m.activeSublicenseCount / stats.sublicenses.active) * 100)}% del totale
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECOND ROW ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Pre-assessment status */}
        <div className="wow-panel p-6 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pre-Assessment</p>
              <p className="text-2xl font-bold text-slate-900">{stats.preassessments.total}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Completati
                </span>
                <span className="font-semibold text-slate-700">
                  {stats.preassessments.completed}/{stats.preassessments.total}
                </span>
              </div>
              <Bar value={stats.preassessments.completed} max={stats.preassessments.total} color="emerald" />
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-sky-500" />
                  In corso
                </span>
                <span className="font-semibold text-slate-700">{stats.preassessments.inProgress}</span>
              </div>
              <Bar value={stats.preassessments.inProgress} max={stats.preassessments.total} color="sky" />
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Tasso di completamento</span>
              <PctBadge value={stats.preassessments.completionRate} danger={0} warn={50} />
            </div>
          </div>
        </div>

        {/* Sublicense health */}
        <div className="wow-panel p-6 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Salute Sublicenze</p>
              <p className="text-2xl font-bold text-slate-900">{stats.sublicenses.active} attive</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Totali" value={stats.sublicenses.total} />
            <MiniStat label="Assegnate" value={stats.sublicenses.assignedToClient} />
            <MiniStat
              label="In scadenza"
              value={
                <span className={stats.sublicenses.expiringSoon > 0 ? 'text-amber-600' : undefined}>
                  {stats.sublicenses.expiringSoon}
                </span>
              }
              sub="entro 30 giorni"
            />
            <MiniStat
              label="Scadute"
              value={
                <span className={stats.sublicenses.expired > 0 ? 'text-red-600' : undefined}>
                  {stats.sublicenses.expired}
                </span>
              }
            />
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Utilizzo ({sublicUsage}%)</span>
              <span>{stats.sublicenses.assignedToClient}/{stats.sublicenses.total}</span>
            </div>
            <Bar
              value={stats.sublicenses.assignedToClient}
              max={stats.sublicenses.total}
              color={sublicUsage > 90 ? 'amber' : 'indigo'}
            />
          </div>
        </div>

        {/* Security & Access */}
        <div className="wow-panel p-6 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-50 p-2.5 text-rose-700">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Sicurezza & Accessi</p>
              <p className="text-2xl font-bold text-slate-900">{twoFaPct}% 2FA</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Autenticazione 2FA
                </span>
                <span className="font-semibold text-slate-700">{stats.users.with2fa}/{stats.users.total}</span>
              </div>
              <Bar
                value={stats.users.with2fa}
                max={stats.users.total}
                color={twoFaPct < 30 ? 'red' : twoFaPct < 60 ? 'amber' : 'emerald'}
              />
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-sky-500" />
                  Accesso negli ultimi 7gg
                </span>
                <span className="font-semibold text-slate-700">{stats.users.recentlyLoggedIn}</span>
              </div>
              <Bar value={stats.users.recentlyLoggedIn} max={stats.users.active} color="sky" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Mai loggati</p>
                <p className={`text-lg font-semibold ${stats.users.neverLoggedIn > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {stats.users.neverLoggedIn}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Cambio pw obbligatorio</p>
                <p className={`text-lg font-semibold ${stats.users.mustChangePassword > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {stats.users.mustChangePassword}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── USER ROLE DISTRIBUTION ── */}
      <div className="wow-panel p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Distribuzione utenze per ruolo</p>
            <p className="text-xs text-slate-500">{stats.users.active} utenti attivi su {stats.users.total} totali</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['admin_studio', 'segreteria', 'collaboratore', 'cliente'] as const).map((role) => {
            const count = stats.users.byRole[role] ?? 0;
            const roleColors: Record<string, string> = {
              admin_studio: 'indigo',
              segreteria: 'sky',
              collaboratore: 'teal',
              cliente: 'violet',
            };
            const color = roleColors[role] as 'indigo' | 'sky' | 'violet';
            return (
              <div key={role} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{ROLE_LABELS[role]}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
                <div className="mt-2">
                  <Bar value={count} max={stats.users.total} color={color} />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{pct(count, stats.users.total)}% del totale</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CRITICAL ITEMS ── */}
      {stats.criticalItems.length > 0 && (
        <div className="wow-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-50 p-2.5 text-red-700">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Elementi critici e avvisi</p>
                <p className="text-xs text-slate-500">
                  {criticalCount} critico/i · {warningCount} avviso/i
                </p>
              </div>
            </div>
            {stats.criticalItems.length > 5 && (
              <button
                onClick={() => setShowAllCritical((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                {showAllCritical ? (
                  <>Mostra meno <ChevronUp className="h-3.5 w-3.5" /></>
                ) : (
                  <>Mostra tutti ({stats.criticalItems.length}) <ChevronDown className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {visibleCritical.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  item.severity === 'critical'
                    ? 'border-red-100 bg-red-50'
                    : 'border-amber-100 bg-amber-50'
                }`}
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                    item.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span
                      className={`text-sm font-semibold ${
                        item.severity === 'critical' ? 'text-red-800' : 'text-amber-800'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.studioNome && (
                      <span className="text-xs text-slate-500">· {item.studioNome}</span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${item.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                    {item.detail}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.severity === 'critical'
                      ? 'bg-red-200 text-red-800'
                      : 'bg-amber-200 text-amber-800'
                  }`}
                >
                  {item.severity === 'critical' ? 'Critico' : 'Avviso'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LICENZIATARI BREAKDOWN TABLE ── */}
      <div className="wow-panel p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Dettaglio per Licenziatario</p>
            <p className="text-xs text-slate-500">{stats.licenziatariBreakdown.length} licenziatari</p>
          </div>
        </div>

        {stats.licenziatariBreakdown.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nessun licenziatario configurato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Stato', 'Studio', 'Licenza scadenza', 'Sublicenze', 'Clienti', 'Pre-Assessment'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap pb-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.licenziatariBreakdown
                  .sort((a, b) => {
                    const order = { critical: 0, warning: 1, healthy: 2 };
                    return order[studioHealth(a)] - order[studioHealth(b)];
                  })
                  .map((s) => {
                    const health = studioHealth(s);
                    const paTotal = s.preassessmentCompleted + s.preassessmentInProgress;
                    const paPct = pct(s.preassessmentCompleted, paTotal);

                    return (
                      <tr
                        key={s.id}
                        className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                          !s.attivo ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Health dot */}
                        <td className="py-4 pr-6">
                          <div className="flex items-center gap-2">
                            <HealthDot status={health} />
                            <span className="text-xs text-slate-500">
                              {health === 'healthy' ? 'OK' : health === 'warning' ? 'Attenzione' : 'Critico'}
                            </span>
                          </div>
                        </td>

                        {/* Studio name */}
                        <td className="py-4 pr-6">
                          <p className="font-semibold text-slate-800">{s.nome}</p>
                          {!s.attivo && (
                            <span className="text-xs text-slate-400">Inattivo</span>
                          )}
                          {!s.hasLicense && (
                            <span className="block text-xs text-red-500">Nessuna licenza</span>
                          )}
                        </td>

                        {/* License expiry */}
                        <td className="py-4 pr-6">
                          {s.hasLicense ? (
                            <span
                              className={`text-sm ${
                                s.licenzaScaduta
                                  ? 'font-semibold text-red-600'
                                  : s.licenzaInScadenza
                                    ? 'font-semibold text-amber-600'
                                    : 'text-slate-700'
                              }`}
                            >
                              {fmtDate(s.licenzaScadenza)}
                              {s.licenzaScaduta && <span className="ml-1 text-xs">(scaduta)</span>}
                              {s.licenzaInScadenza && !s.licenzaScaduta && (
                                <span className="ml-1 text-xs">(presto)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Sublicenses */}
                        <td className="py-4 pr-6">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-slate-700">
                              {s.activeSublicenses}
                              <span className="text-slate-400">/{s.totalSublicenses}</span>
                            </span>
                            {s.expiredSublicenses > 0 && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                                {s.expiredSublicenses} scad.
                              </span>
                            )}
                            {s.expiringSoonSublicenses > 0 && s.expiredSublicenses === 0 && (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                                {s.expiringSoonSublicenses} presto
                              </span>
                            )}
                          </div>
                          {s.totalSublicenses > 0 && (
                            <div className="mt-1.5 w-24">
                              <Bar
                                value={s.activeSublicenses}
                                max={s.totalSublicenses}
                                color={
                                  s.expiredSublicenses > 0
                                    ? 'red'
                                    : s.expiringSoonSublicenses > 0
                                      ? 'amber'
                                      : 'emerald'
                                }
                              />
                            </div>
                          )}
                        </td>

                        {/* Clients */}
                        <td className="py-4 pr-6">
                          <span className="tabular-nums text-slate-700">
                            {s.activeClients}
                            <span className="text-slate-400">/{s.totalClients}</span>
                          </span>
                        </td>

                        {/* Pre-assessment */}
                        <td className="py-4 pr-6">
                          {paTotal > 0 ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums text-slate-700">
                                  {s.preassessmentCompleted}
                                  <span className="text-slate-400">/{paTotal}</span>
                                </span>
                                <PctBadge value={paPct} danger={0} warn={50} />
                              </div>
                              <div className="mt-1.5 w-24">
                                <Bar
                                  value={s.preassessmentCompleted}
                                  max={paTotal}
                                  color="emerald"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── LICENSE OVERVIEW ── */}
      <div className="wow-panel p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Riepilogo Licenze</p>
            <p className="text-xs text-slate-500">{stats.licenses.total} licenze configurate · {stats.licenses.totalUtenze} utenze totali</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat label="Totali" value={stats.licenses.total} />
          <MiniStat label="Assegnate" value={stats.licenses.assigned} />
          <MiniStat label="Non assegnate" value={stats.licenses.unassigned} />
          <MiniStat
            label="In scadenza"
            value={
              <span className={stats.licenses.expiringSoon > 0 ? 'text-amber-600' : undefined}>
                {stats.licenses.expiringSoon}
              </span>
            }
            sub="entro 30 giorni"
          />
          <MiniStat
            label="Scadute"
            value={
              <span className={stats.licenses.expired > 0 ? 'text-red-600' : undefined}>
                {stats.licenses.expired}
              </span>
            }
          />
          <MiniStat label="Utenze totali" value={stats.licenses.totalUtenze} />
        </div>
      </div>

    </div>
  );
}
