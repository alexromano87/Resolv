import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BellRing,
  CheckCheck,
  CheckCircle2,
  Filter,
  FolderKanban,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { meApi, type SystemNotificationItem } from '../api/me';
import { Pagination } from '../components/Pagination';

type NotificationFilter = 'tutte' | SystemNotificationItem['type'];

const FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'sezione_validata', label: 'Sezioni validate' },
  { value: 'checkup_completato', label: 'Checkup completati' },
  { value: 'validazione_finale', label: 'Validazioni finali' },
  { value: 'nuova_versione', label: 'Nuove versioni' },
];

const TYPE_META: Record<SystemNotificationItem['type'], { icon: typeof CheckCircle2; chipClass: string; iconClass: string }> = {
  sezione_validata: {
    icon: CheckCheck,
    chipClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-300',
  },
  checkup_completato: {
    icon: CheckCircle2,
    chipClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    iconClass: 'text-blue-600 dark:text-blue-300',
  },
  validazione_finale: {
    icon: ShieldAlert,
    chipClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    iconClass: 'text-indigo-600 dark:text-indigo-300',
  },
  nuova_versione: {
    icon: FolderKanban,
    chipClass: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    iconClass: 'text-violet-600 dark:text-violet-300',
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getTypeLabel(value: SystemNotificationItem['type']) {
  switch (value) {
    case 'sezione_validata':
      return 'Sezione validata';
    case 'checkup_completato':
      return 'Checkup completato';
    case 'validazione_finale':
      return 'Validazione finale';
    case 'nuova_versione':
      return 'Nuova versione';
    default:
      return value;
  }
}

export function SystemNotificationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<SystemNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NotificationFilter>('tutte');
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;
  const selectedNotificationId = searchParams.get('notificationId');
  const presetQuery = searchParams.get('query') || '';
  const presetType = (searchParams.get('type') || 'tutte') as NotificationFilter;

  const load = async (overrides?: { query?: string; filter?: NotificationFilter; notificationId?: string | null; page?: number }) => {
    const effectiveQuery = overrides?.query ?? query;
    const effectiveFilter = overrides?.filter ?? filter;
    const effectiveNotificationId = overrides?.notificationId ?? selectedNotificationId;
    const effectivePage = overrides?.page ?? page;
    try {
      setLoading(true);
      setError('');
      const response = await meApi.getSystemNotifications({
        query: effectiveQuery.trim() || undefined,
        type: effectiveFilter !== 'tutte' ? effectiveFilter : undefined,
        notificationId: effectiveNotificationId || undefined,
        limit: effectiveNotificationId ? 50 : pageSize,
        page: effectiveNotificationId ? 1 : effectivePage,
      });
      setItems(response.items);
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
      setPage(response.page);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle notifiche di sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery(presetQuery);
    setFilter(FILTERS.some((option) => option.value === presetType) ? presetType : 'tutte');
    setPage(1);
  }, [presetQuery, presetType]);

  const stats = useMemo(() => ({
    total: totalItems,
    completati: items.filter((item) => item.type === 'checkup_completato').length,
    validazioni: items.filter((item) => item.type === 'sezione_validata' || item.type === 'validazione_finale').length,
    urgenti: items.filter((item) => item.priority === 'urgent').length,
  }), [items, totalItems]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 wow-stagger">
      <section className="wow-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="wow-chip inline-flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Operativita'
            </span>
            <div className="space-y-2">
              <h1 className="display-font text-3xl font-semibold text-slate-900 dark:text-slate-50">
                Notifiche di sistema
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Eventi chiave del pre-assessment per tutti i clienti collegati allo studio:
                sezioni validate, checkup completati, validazioni finali e nuove versioni.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Totale eventi', value: stats.total, detail: 'notifiche raccolte' },
          { label: 'Checkup completati', value: stats.completati, detail: 'chiusure registrate' },
          { label: 'Validazioni', value: stats.validazioni, detail: 'sezioni o checkup finali' },
          { label: 'Alert urgenti', value: stats.urgenti, detail: 'eventi ad alta priorita' },
        ].map((item) => (
          <div key={item.label} className="wow-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {item.label}
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">
              {item.value}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {item.detail}
            </div>
          </div>
        ))}
      </section>

      <section className="wow-panel p-5 space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca cliente, messaggio o autore"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Filter className="h-4 w-4" />
              Filtri
            </span>
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={filter === option.value ? 'wow-button' : 'wow-button-ghost'}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => load({ page: 1 })}
              className="wow-button inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Cerca
            </button>
          </div>
        </div>

        {error ? (
          <div className="wow-panel border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="wow-panel p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Caricamento notifiche di sistema in corso...
          </div>
        ) : items.length === 0 ? (
          <div className="wow-panel p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {hasSearched
              ? 'Nessuna notifica di sistema disponibile con i filtri selezionati.'
              : 'Imposta i filtri desiderati e premi Cerca per caricare le notifiche.'}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              return (
                <article
                  key={item.id}
                  className={`wow-card p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-900/70 ${selectedNotificationId === item.id ? 'ring-2 ring-indigo-500/60' : ''}`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                        <Icon className={`h-5 w-5 ${meta.iconClass}`} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            {item.title}
                          </h2>
                          <span className={`wow-chip ${meta.chipClass}`}>
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {item.message}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatDate(item.createdAt)}</span>
                          {item.actorName ? <span>Autore: {item.actorName}</span> : null}
                          {item.clientName ? <span>Cliente: {item.clientName}</span> : null}
                        </div>
                      </div>
                    </div>

                    {item.actionUrl ? (
                      <button
                        type="button"
                        onClick={() => navigate(item.actionUrl!)}
                        className="wow-button-ghost"
                      >
                        Apri
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {!selectedNotificationId && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={pageSize}
                onPageChange={(nextPage) => {
                  load({ page: nextPage });
                }}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
