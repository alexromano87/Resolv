import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  ChartPie,
  ClipboardList,
  Eye,
  Gauge,
  Layers,
  MessageCircle,
  RefreshCw,
  Search,
  Ticket,
  Users,
} from 'lucide-react';
import { preassessmentApi, threadsUnreadApi, PreassessmentClientEntry } from '../api/preassessment';
import { usersApi } from '../api/users';
import { studiosApi, CheckupSublicenseOption, CheckupStudioProfile } from '../api/studios';
import type { CheckupUser } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import { SECTIONS } from '../data/preassessment';

const formatPercent = (value: number) => `${Math.round(value)}%`;

export default function StudioDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<PreassessmentClientEntry[]>([]);
  const [users, setUsers] = useState<CheckupUser[]>([]);
  const [profile, setProfile] = useState<CheckupStudioProfile | null>(null);
  const [sublicenses, setSublicenses] = useState<CheckupSublicenseOption[]>([]);
  const [usage, setUsage] = useState<{
    license: { studioId: string; maxUsers: number | null; activeUsers: number };
    clients: Array<{ clientId: string | null; maxUsers: number; activeUsers: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'tutti' | 'in_corso' | 'completati' | 'overdue'>('tutti');
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, { tickets: number; alerts: number; chat: number }>>({});

  const isOwnerSection = useCallback(
    (section: (typeof SECTIONS)[number]) => section.macro === 'k' || section.fields.some((field) => /^owner_[a-j]_/.test(field.id)),
    [],
  );

  const fetchUnreadCounts = useCallback(async (clientList: PreassessmentClientEntry[]) => {
    const withPre = clientList.filter((e) => e.preassessment?.id);
    const results = await Promise.allSettled(
      withPre.map((e) =>
        threadsUnreadApi.getCounts(e.preassessment!.id).then((c) => ({ id: e.preassessment!.id, ...c })),
      ),
    );
    const counts: Record<string, { tickets: number; alerts: number; chat: number }> = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        counts[r.value.id] = { tickets: r.value.tickets, alerts: r.value.alerts, chat: r.value.chat };
      }
    });
    setUnreadCounts(counts);
  }, []);

  const loadDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [clientEntries, usersData, profileData, sublicensesData, usageData] = await Promise.all([
        preassessmentApi.listClients(),
        usersApi.getAll(undefined, true),
        studiosApi.getMyStudio(),
        studiosApi.listSublicenses(),
        usersApi.getUsage(),
      ]);
      setClients(clientEntries);
      setUsers(usersData);
      setProfile(profileData);
      setSublicenses(sublicensesData);
      setUsage(usageData);
      setError('');
      await fetchUnreadCounts(clientEntries);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetchUnreadCounts]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 30_000);
    const handleFocus = () => {
      loadDashboardData(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(true);
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    if (clients.length === 0) return;
    const interval = setInterval(() => fetchUnreadCounts(clients), 30_000);
    return () => clearInterval(interval);
  }, [clients]);

  // Refresh unread counts immediately when a page marks items as seen
  useEffect(() => {
    if (clients.length === 0) return;
    const handler = () => fetchUnreadCounts(clients);
    window.addEventListener('checkup:mark-seen', handler);
    return () => window.removeEventListener('checkup:mark-seen', handler);
  }, [clients]);

  useEffect(() => {
    let alive = true;
    const fetchOnline = async () => {
      try {
        const res = await preassessmentApi.getOnline();
        if (!alive) return;
        setOnlineIds(new Set(res.preassessmentIds));
      } catch {
        if (!alive) return;
        setOnlineIds(new Set());
      }
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const getCompletion = (entry: PreassessmentClientEntry) => {
    const data = entry.preassessment?.data || {};
    const naFields = entry.preassessment?.naFields || {};
    const countedSections = SECTIONS.filter((section) => !isOwnerSection(section));
    const fields = countedSections.flatMap((section) => section.fields);
    const total = fields.length;
    const filled = fields.filter((field) => !!naFields[field.id] || !!data[field.id]?.trim()).length;
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  };

  const clientRows = useMemo(() => {
    return clients.map((entry) => {
      const completion = getCompletion(entry);
      return {
        ...entry,
        completion,
        updatedAt: entry.preassessment?.updatedAt ? new Date(entry.preassessment.updatedAt) : null,
      };
    });
  }, [clients]);

  const filteredClients = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 30);
    const bySearch = !search.trim()
      ? clientRows
      : clientRows.filter((c) => {
        const name = `${c.client.nome || ''} ${c.client.cognome || ''}`.toLowerCase();
        const azienda = (c.client.azienda || c.client.ragioneSociale || '').toLowerCase();
        const email = c.client.email ? c.client.email.toLowerCase() : '';
        const t = search.toLowerCase();
        return name.includes(t) || azienda.includes(t) || email.includes(t);
      });

    if (statusFilter === 'tutti') return bySearch;
    if (statusFilter === 'completati') return bySearch.filter((c) => c.completion === 100);
    if (statusFilter === 'in_corso') return bySearch.filter((c) => c.completion < 100);
    return bySearch.filter(
      (c) => c.completion < 100 && c.updatedAt && c.updatedAt < cutoff,
    );
  }, [clientRows, search, statusFilter]);

  const totalClients = clientRows.length;
  const preassessmentClients = clientRows.filter((c) => c.preassessment);
  const openCheckups = preassessmentClients.filter((c) => c.completion < 100);
  const averageCompletion = preassessmentClients.length
    ? preassessmentClients.reduce((acc, c) => acc + c.completion, 0) / preassessmentClients.length
    : 0;

  const clientUsers = users.filter((u) => u.ruolo === 'cliente');
  const activeClientUsers = clientUsers.filter((u) => u.attivo !== false);

  const usersByClientId = activeClientUsers.reduce<Record<string, number>>((acc, u) => {
    if (u.clientId) {
      acc[u.clientId] = (acc[u.clientId] || 0) + 1;
    }
    return acc;
  }, {});

  const sublicensesByClientId = sublicenses.reduce<Record<string, number>>((acc, s) => {
    if (s.clientId) {
      acc[s.clientId] = (acc[s.clientId] || 0) + 1;
    }
    return acc;
  }, {});

  const completionBuckets = [0, 0, 0, 0, 0];
  preassessmentClients.forEach((c) => {
    if (c.completion === 100) completionBuckets[4] += 1;
    else if (c.completion >= 75) completionBuckets[3] += 1;
    else if (c.completion >= 50) completionBuckets[2] += 1;
    else if (c.completion >= 25) completionBuckets[1] += 1;
    else completionBuckets[0] += 1;
  });

  const usageByClientId = new Map<string, { maxUsers: number; activeUsers: number }>();
  usage?.clients.forEach((c) => {
    if (c.clientId) usageByClientId.set(c.clientId, { maxUsers: c.maxUsers, activeUsers: c.activeUsers });
  });

  const licenseActive = profile?.license && profile.license.dataScadenza
    ? new Date(profile.license.dataScadenza) >= new Date()
    : Boolean(profile?.license);

  const weeklyTrend = useMemo(() => {
    const weeks = Array.from({ length: 6 }, () => 0);
    const now = new Date();
    preassessmentClients.forEach((entry) => {
      if (!entry.updatedAt) return;
      const diffDays = Math.floor((now.getTime() - entry.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      const index = 5 - Math.floor(diffDays / 7);
      if (index >= 0 && index < weeks.length) weeks[index] += 1;
    });
    return weeks;
  }, [preassessmentClients]);

  const riskClients = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 30);
    return preassessmentClients
      .filter((c) => c.completion < 100)
      .map((c) => {
        const stale = c.updatedAt ? c.updatedAt < cutoff : false;
        const score = (stale ? 2 : 0) + (c.completion < 50 ? 2 : c.completion < 75 ? 1 : 0);
        return { ...c, stale, score };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [preassessmentClients]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-8 py-10 text-white shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.32),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.25),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(56,189,248,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute -right-16 top-6 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-100">
              Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100/80">
              Monitoraggio operativo in tempo reale di clienti, utenti, licenze e stato di avanzamento dei checkup.
            </p>
          </div>
          {user?.ruolo === 'admin_studio' && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/checkup/utenti')}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <Users className="h-4 w-4" />
                Gestione utenti
              </button>
              <button
                type="button"
                onClick={() => navigate('/checkup/impostazioni')}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <BadgeCheck className="h-4 w-4" />
                Impostazioni studio
              </button>
            </div>
          )}
        </div>
        <div className="relative mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs text-blue-100/70">Licenza attiva</p>
            <p className="mt-2 text-lg font-semibold">{licenseActive ? 'Attiva' : 'Non disponibile'}</p>
            <p className="mt-1 text-[11px] text-blue-100/60">
              {profile?.license?.numeroLicenza ? `Numero ${profile.license.numeroLicenza}` : 'Nessun numero assegnato'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs text-blue-100/70">Clienti monitorati</p>
            <p className="mt-2 text-2xl font-semibold">{totalClients}</p>
            <p className="mt-1 text-[11px] text-blue-100/60">{openCheckups.length} checkup in corso</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs text-blue-100/70">Media compilazione</p>
            <p className="mt-2 text-2xl font-semibold">{formatPercent(averageCompletion)}</p>
            <p className="mt-1 text-[11px] text-blue-100/60">Basata sui checkup attivi</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="wow-panel border-rose-200 bg-rose-50/80 p-4 text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Utenti attivi</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{activeClientUsers.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Dipendenti con accesso checkup</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-2">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Licenze</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{licenseActive ? 1 : 0}</p>
                  <p className="mt-1 text-xs text-slate-500">Licenza principale attiva</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-2">
                  <Layers className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sublicenze</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{sublicenses.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Attive sul portafoglio clienti</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-2">
                  <ClipboardList className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Performance checkup</h2>
                  <p className="text-xs text-slate-500">Distribuzione completamento e stato delle iniziative.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                  <ChartPie className="h-4 w-4" />
                  {preassessmentClients.length} checkup attivi
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { label: '0 - 25%', value: completionBuckets[0] },
                  { label: '26 - 50%', value: completionBuckets[1] },
                  { label: '51 - 75%', value: completionBuckets[2] },
                  { label: '76 - 99%', value: completionBuckets[3] },
                  { label: '100%', value: completionBuckets[4] },
                ].map((bucket) => {
                  const total = preassessmentClients.length || 1;
                  const pct = Math.round((bucket.value / total) * 100);
                  return (
                    <div key={bucket.label} className="flex items-center gap-4">
                      <div className="w-20 text-xs text-slate-500">{bucket.label}</div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-14 text-right text-xs font-semibold text-slate-700">{pct}%</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Checkup in corso</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{openCheckups.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Checkup completati</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {preassessmentClients.length - openCheckups.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Media compilazione</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatPercent(averageCompletion)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Capacita licenza</h2>
                  <p className="text-xs text-slate-500">Utilizzo complessivo delle utenze.</p>
                </div>
                <Gauge className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Utenti attivi</span>
                  <span>{usage?.license.activeUsers ?? 0} / {usage?.license.maxUsers ?? '∞'}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    style={{
                      width: usage?.license.maxUsers
                        ? `${Math.min(100, Math.round((usage.license.activeUsers / usage.license.maxUsers) * 100))}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                    {preassessmentClients.slice(0, 4).map((entry) => {
                      const completion = entry.completion;
                      const company = entry.client.azienda || entry.client.ragioneSociale || entry.client.nome;
                      const isOnline = entry.preassessment?.id ? onlineIds.has(entry.preassessment.id) : false;
                      return (
                        <div key={entry.client.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              <span className="inline-flex items-center gap-2">
                                {company}
                                {isOnline && (
                                  <span className="group relative inline-flex items-center" aria-label="Online adesso">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-sm transition group-hover:opacity-100">
                                      Online adesso
                                    </span>
                                  </span>
                                )}
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">{completion}% completato</p>
                          </div>
                          <button
                        type="button"
                        onClick={() => navigate(`/checkup/clienti/${entry.client.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Apri
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Portfolio clienti</h2>
                <p className="text-xs text-slate-500">Dettaglio utenti, sublicenze e stato dei checkup.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                  <Search className="h-4 w-4" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cerca cliente o azienda..."
                    className="bg-transparent text-xs text-slate-600 outline-none border-0 shadow-none focus:ring-0 rounded-none"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-full border border-slate-200 p-1 text-[11px]">
                  {([
                    { value: 'tutti', label: 'Tutti' },
                    { value: 'in_corso', label: 'In corso' },
                    { value: 'completati', label: 'Completati' },
                    { value: 'overdue', label: 'Overdue' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatusFilter(option.value)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        statusFilter === option.value
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              {filteredClients.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Nessun cliente trovato</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">Azienda</th>
                      <th className="px-4 py-3 text-left">Referente</th>
                      <th className="px-4 py-3 text-center">Utenti</th>
                      <th className="px-4 py-3 text-center">Sublicenze</th>
                      <th className="px-4 py-3 text-center">Completamento</th>
                      <th className="px-4 py-3 text-center">Aggiornamento</th>
                      <th className="px-4 py-3 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredClients.map((entry) => {
                      const company = entry.client.azienda || entry.client.ragioneSociale || entry.client.nome;
                      const referent = `${entry.client.nome || ''} ${entry.client.cognome || ''}`.trim();
                      const usersCount = usersByClientId[entry.client.id] || 0;
                      const sublicensesCount = sublicensesByClientId[entry.client.id] || 0;
                      const usageInfo = usageByClientId.get(entry.client.id);
                      const isOnline = entry.preassessment?.id ? onlineIds.has(entry.preassessment.id) : false;
                                      const preId = entry.preassessment?.id ?? '';
                      const unread = unreadCounts[preId] ?? { tickets: 0, alerts: 0, chat: 0 };
                      return (
                        <tr key={entry.client.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <span className="inline-flex items-center gap-2">
                              {company}
                              {isOnline && (
                                <span className="group relative inline-flex items-center" aria-label="Online adesso">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow-sm transition group-hover:opacity-100">
                                    Online adesso
                                  </span>
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{referent}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                              {usersCount}
                              {usageInfo ? ` / ${usageInfo.maxUsers}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                              {sublicensesCount}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                                  style={{ width: `${entry.completion}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-600 w-10 text-right">
                                {entry.completion}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-500">
                            {entry.preassessment?.updatedAt
                              ? new Date(entry.preassessment.updatedAt).toLocaleDateString('it-IT')
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/checkup/clienti/${entry.client.id}`)}
                                className="group relative inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                                title="Apri checkup"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Apri
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/checkup/clienti/${entry.client.id}?panel=chat`)}
                                className={`group relative rounded-lg p-1.5 transition ${unread.chat > 0 ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'}`}
                                title="Chat"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                {unread.chat > 0 && (
                                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white leading-none">
                                    {unread.chat > 9 ? '9+' : unread.chat}
                                  </span>
                                )}
                                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition group-hover:opacity-100">Chat</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/checkup/clienti/${entry.client.id}/tickets`)}
                                className={`group relative rounded-lg p-1.5 transition ${unread.tickets > 0 ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'}`}
                                title="Ticket"
                              >
                                <Ticket className="h-3.5 w-3.5" />
                                {unread.tickets > 0 && (
                                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white leading-none">
                                    {unread.tickets > 9 ? '9+' : unread.tickets}
                                  </span>
                                )}
                                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition group-hover:opacity-100">Ticket</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/checkup/clienti/${entry.client.id}/alerts`)}
                                className={`group relative rounded-lg p-1.5 transition ${unread.alerts > 0 ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
                                title="Alert"
                              >
                                <Bell className="h-3.5 w-3.5" />
                                {unread.alerts > 0 && (
                                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white leading-none">
                                    {unread.alerts > 9 ? '9+' : unread.alerts}
                                  </span>
                                )}
                                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition group-hover:opacity-100">Alert</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Checkup in corso</h2>
                  <p className="text-xs text-slate-500">Attivita con completamento inferiore al 100%.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                  <RefreshCw className="h-4 w-4" />
                  {openCheckups.length} attivi
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {openCheckups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                    Nessun checkup in corso.
                  </div>
                ) : (
                  openCheckups.slice(0, 6).map((entry) => (
                    <div key={entry.client.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.client.azienda || entry.client.ragioneSociale || entry.client.nome}
                          </p>
                          <p className="text-xs text-slate-500">
                            Aggiornato il {entry.preassessment?.updatedAt
                              ? new Date(entry.preassessment.updatedAt).toLocaleDateString('it-IT')
                              : '—'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/checkup/clienti/${entry.client.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Apri
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${entry.completion}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{entry.completion}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Indicatori operativi</h2>
                  <p className="text-xs text-slate-500">Sintesi KPI per la direzione.</p>
                </div>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Copertura clienti</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{formatPercent((preassessmentClients.length / (totalClients || 1)) * 100)}</p>
                  <p className="mt-1 text-xs text-slate-500">Clienti con checkup attivo</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Utilizzo sublicenze</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{sublicenses.filter((s) => s.clientId).length}</p>
                  <p className="mt-1 text-xs text-slate-500">Sublicenze assegnate ai clienti</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Utenti per cliente</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {totalClients ? (activeClientUsers.length / totalClients).toFixed(1) : '0.0'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Media utenti attivi per azienda</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trend settimanale</p>
                  <div className="mt-4 flex items-center gap-4">
                    <svg viewBox="0 0 120 40" className="h-10 w-36">
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2"
                        points={weeklyTrend.map((v, i) => `${i * 24},${40 - v * 4}`).join(' ')}
                      />
                    </svg>
                    <div className="text-xs text-slate-500">
                      {weeklyTrend.reduce((a, b) => a + b, 0)} aggiornamenti / 6 settimane
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">SLA & Rischi</h2>
                <p className="text-xs text-slate-500">Clienti con completamento basso o checkup non aggiornati.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-600">
                <span>Criticita</span>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {riskClients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                  Nessun cliente critico rilevato.
                </div>
              ) : (
                riskClients.map((entry) => (
                  <div key={entry.client.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.client.azienda || entry.client.ragioneSociale || entry.client.nome}
                        </p>
                        <p className="text-xs text-slate-500">
                          {`${entry.client.nome || ''} ${entry.client.cognome || ''}`.trim() || '—'}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                        {entry.completion}% completato
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span className={`rounded-full px-2 py-0.5 ${entry.stale ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {entry.stale ? 'Overdue 30+ giorni' : 'In corso'}
                      </span>
                      <span>Priorita {entry.score}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
