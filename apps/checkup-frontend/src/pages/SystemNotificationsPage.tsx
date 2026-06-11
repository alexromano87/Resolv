import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BellRing,
  CheckCheck,
  CheckCircle2,
  FolderKanban,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { meApi, type SystemNotificationItem } from '../api/me';
import { Pagination } from '../components/Pagination';

type ReadFilter = 'unread' | 'read' | 'all';

const READ_FILTERS: Array<{ value: ReadFilter; label: string }> = [
  { value: 'unread', label: 'Da leggere' },
  { value: 'read', label: 'Lette' },
  { value: 'all', label: 'Tutte' },
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
  nota_cliente: {
    icon: BellRing,
    chipClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-300',
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
    case 'nota_cliente':
      return 'Nota cliente';
    default:
      return value;
  }
}

export function SystemNotificationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<SystemNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('unread');
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;
  const selectedNotificationId = searchParams.get('notificationId');
  const presetQuery = searchParams.get('query') || '';

  const load = async (overrides?: { query?: string; readFilter?: ReadFilter; notificationId?: string | null; page?: number }) => {
    const effectiveQuery = overrides?.query ?? query;
    const effectiveReadFilter = overrides?.readFilter ?? readFilter;
    const effectiveNotificationId = overrides && 'notificationId' in overrides
      ? overrides.notificationId
      : selectedNotificationId;
    const effectivePage = overrides?.page ?? page;
    try {
      setLoading(true);
      setError('');
      const response = await meApi.getSystemNotifications({
        query: effectiveQuery.trim() || undefined,
        read: effectiveNotificationId || effectiveReadFilter === 'all' ? undefined : effectiveReadFilter,
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
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextQuery = selectedNotificationId ? '' : presetQuery;
    const nextReadFilter = selectedNotificationId ? 'all' : readFilter;
    setQuery(nextQuery);
    setReadFilter(nextReadFilter);
    setPage(1);
    if (selectedNotificationId) {
      load({
        query: nextQuery,
        readFilter: nextReadFilter,
        notificationId: selectedNotificationId,
        page: 1,
      });
    }
  }, [presetQuery, selectedNotificationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedNotificationId) return;

    const timeout = window.setTimeout(() => {
      load({ query, readFilter, notificationId: null, page: 1 });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query, readFilter, selectedNotificationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    total: totalItems,
    unread: items.filter((item) => !item.readAt).length,
    completati: items.filter((item) => item.type === 'checkup_completato').length,
    validazioni: items.filter((item) => item.type === 'sezione_validata' || item.type === 'validazione_finale').length,
    urgenti: items.filter((item) => item.priority === 'urgent').length,
  }), [items, totalItems]);

  const refreshHeaderNotifications = () => {
    window.dispatchEvent(new Event('checkup-notifications-updated'));
  };

  const handleMarkAllRead = async () => {
    try {
      setBusyAction('read-all');
      setError('');
      await meApi.markAllSystemNotificationsRead();
      await load({ page });
      refreshHeaderNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la marcatura delle notifiche');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusyAction(id);
      setError('');
      await meApi.deleteSystemNotification(id);
      await load({ page });
      refreshHeaderNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'eliminazione della notifica");
    } finally {
      setBusyAction(null);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      setBusyAction(id);
      setError('');
      await meApi.markSystemNotificationRead(id);
      await load({ page });
      refreshHeaderNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la marcatura della notifica');
    } finally {
      setBusyAction(null);
    }
  };

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
                Notifiche
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Eventi chiave del pre-assessment per tutti i clienti collegati allo studio:
                sezioni validate, checkup completati, validazioni finali, nuove versioni e note aggiornate dai clienti.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={busyAction !== null || stats.unread === 0}
            className="wow-button inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="h-4 w-4" />
            Segna tutte come lette
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Totale eventi', value: stats.total, detail: 'notifiche raccolte' },
          { label: 'Da leggere', value: stats.unread, detail: "visibili nell'header" },
          { label: 'Checkup completati', value: stats.completati, detail: 'chiusure registrate' },
          { label: 'Validazioni', value: stats.validazioni, detail: 'sezioni o checkup finali' },
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
              Stato
            </span>
            {READ_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReadFilter(option.value)}
                className={readFilter === option.value ? 'wow-button' : 'wow-button-ghost'}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => load({ query, readFilter, notificationId: null, page: 1 })}
              className="wow-button inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
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
            Caricamento notifiche in corso...
          </div>
        ) : items.length === 0 ? (
          <div className="wow-panel p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {hasSearched
              ? 'Nessuna notifica disponibile per lo stato selezionato.'
              : 'Caricamento notifiche in corso...'}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              return (
                <article
                  key={item.id}
                  className={`wow-card p-5 transition ${
                    item.readAt
                      ? 'bg-white/80 opacity-80 hover:bg-slate-50/70 dark:bg-slate-950/70 dark:hover:bg-slate-900/70'
                      : 'border-rose-200 bg-rose-50/60 shadow-sm hover:bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30'
                  } ${selectedNotificationId === item.id ? 'ring-2 ring-indigo-500/60' : ''}`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${
                        item.readAt
                          ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'
                          : 'border-rose-200 bg-white dark:border-rose-900/70 dark:bg-slate-950'
                      }`}>
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
                          <span className={item.readAt
                            ? 'rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            : 'rounded-full bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'}
                          >
                            {item.readAt ? 'Letta' : 'Da leggere'}
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

                    <div className="flex flex-wrap items-center gap-2">
                      {!item.readAt && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item.id)}
                          disabled={busyAction === item.id}
                          className="wow-button-ghost disabled:opacity-50"
                        >
                          Segna letta
                        </button>
                      )}
                      {item.actionUrl ? (
                        <button
                          type="button"
                          onClick={() => navigate(item.actionUrl!)}
                          className="wow-button-ghost"
                        >
                          Apri
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={busyAction === item.id}
                        className="wow-button-ghost inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Elimina
                      </button>
                    </div>
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
