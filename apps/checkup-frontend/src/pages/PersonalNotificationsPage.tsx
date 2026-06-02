import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  BellRing,
  CheckCircle2,
  FileText,
  Filter,
  FolderKanban,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Ticket,
  Trash2,
} from 'lucide-react';
import { meApi, type PersonalNotificationItem, type PersonalNotificationType } from '../api/me';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

type NotificationFilter = 'tutte' | PersonalNotificationType;

const FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'consultant_note', label: 'Note consulente' },
  { value: 'ticket_created', label: 'Ticket creati' },
  { value: 'ticket_updated', label: 'Ticket aggiornati' },
  { value: 'chat_message', label: 'Chat checkup' },
  { value: 'direct_chat_message', label: 'Chat diretta' },
  { value: 'preassessment_new_version', label: 'Nuove versioni' },
];

const TYPE_META: Record<PersonalNotificationType, { icon: typeof BellRing; chipClass: string; iconClass: string }> = {
  consultant_note: {
    icon: FileText,
    chipClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-300',
  },
  client_note: {
    icon: FileText,
    chipClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    iconClass: 'text-sky-600 dark:text-sky-300',
  },
  ticket_created: {
    icon: Ticket,
    chipClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    iconClass: 'text-rose-600 dark:text-rose-300',
  },
  ticket_updated: {
    icon: Ticket,
    chipClass: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
    iconClass: 'text-fuchsia-600 dark:text-fuchsia-300',
  },
  chat_message: {
    icon: MessageCircle,
    chipClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    iconClass: 'text-blue-600 dark:text-blue-300',
  },
  direct_chat_message: {
    icon: MessageCircle,
    chipClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    iconClass: 'text-indigo-600 dark:text-indigo-300',
  },
  preassessment_section_validated: {
    icon: CheckCircle2,
    chipClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-300',
  },
  preassessment_final_validated: {
    icon: ShieldAlert,
    chipClass: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    iconClass: 'text-teal-600 dark:text-teal-300',
  },
  preassessment_reopened: {
    icon: RefreshCw,
    chipClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    iconClass: 'text-orange-600 dark:text-orange-300',
  },
  preassessment_new_version: {
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

function getReadStorageKey(userId?: string) {
  return userId ? `checkup_personal_notifications_read:${userId}` : '';
}

function readStoredIds(key: string) {
  if (!key) return new Set<string>();
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function storeReadIds(key: string, ids: Set<string>) {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(Array.from(ids)));
}

function getTypeLabel(value: PersonalNotificationType) {
  switch (value) {
    case 'consultant_note':
      return 'Nota consulente';
    case 'client_note':
      return 'Nota cliente';
    case 'ticket_created':
      return 'Ticket creato';
    case 'ticket_updated':
      return 'Ticket aggiornato';
    case 'chat_message':
      return 'Chat checkup';
    case 'direct_chat_message':
      return 'Chat diretta';
    case 'preassessment_section_validated':
      return 'Sezione validata';
    case 'preassessment_final_validated':
      return 'Validazione finale';
    case 'preassessment_reopened':
      return 'Checkup riaperto';
    case 'preassessment_new_version':
      return 'Nuova versione';
    default:
      return value;
  }
}

export function PersonalNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<PersonalNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<NotificationFilter>('tutte');
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [readIds, setReadIds] = useState<Set<string>>(() => readStoredIds(getReadStorageKey(user?.id)));
  const pageSize = 20;
  const readStorageKey = getReadStorageKey(user?.id);

  const load = useCallback(async (overrides?: { query?: string; filter?: NotificationFilter; page?: number }) => {
    const effectiveQuery = overrides?.query ?? query;
    const effectiveFilter = overrides?.filter ?? filter;
    const effectivePage = overrides?.page ?? page;
    try {
      setLoading(true);
      setError('');
      const response = await meApi.getNotifications({
        page: effectivePage,
        limit: pageSize,
        query: effectiveQuery.trim() || undefined,
        type: effectiveFilter !== 'tutte' ? effectiveFilter : undefined,
      });
      setItems(response.items);
      setPage(response.page);
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
      setHasSearched(true);
      setReadIds((prev) => {
        const next = new Set(prev);
        response.items.forEach((item) => next.add(item.id));
        storeReadIds(readStorageKey, next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle notifiche');
    } finally {
      setLoading(false);
    }
  }, [filter, page, query, readStorageKey]);

  useEffect(() => {
    const stored = readStoredIds(readStorageKey);
    setReadIds(stored);
  }, [readStorageKey]);

  const readItems = useMemo(() => items.filter((item) => readIds.has(item.id)), [items, readIds]);

  const stats = useMemo(() => ({
    total: totalItems,
    notes: items.filter((item) => item.type === 'consultant_note' || item.type === 'client_note').length,
    tickets: items.filter((item) => item.type === 'ticket_created' || item.type === 'ticket_updated').length,
    chat: items.filter((item) => item.type === 'chat_message' || item.type === 'direct_chat_message').length,
  }), [items, totalItems]);

  const handleDeleteRead = async () => {
    const ids = readItems.map((item) => item.id);
    if (ids.length === 0) return;
    try {
      setDeleting(true);
      setError('');
      await meApi.deleteNotifications(ids);
      await load({ page: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'eliminazione delle notifiche lette");
    } finally {
      setDeleting(false);
    }
  };

  if (user && !user.sublicense?.id) {
    return <Navigate to="/checkup" replace />;
  }

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
                Eventi del tuo pre-assessment: note del consulente, ticket, chat e aggiornamenti operativi collegati alla sublicenza.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDeleteRead}
            disabled={deleting || readItems.length === 0}
            className="wow-button inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            Elimina lette
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Totale eventi', value: stats.total, detail: 'notifiche raccolte' },
          { label: 'Note', value: stats.notes, detail: 'note consulente o cliente' },
          { label: 'Ticket', value: stats.tickets, detail: 'aperture e aggiornamenti' },
          { label: 'Chat', value: stats.chat, detail: 'messaggi recenti' },
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
              placeholder="Cerca messaggio, cliente o autore"
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
            Caricamento notifiche in corso...
          </div>
        ) : items.length === 0 ? (
          <div className="wow-panel p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {hasSearched
              ? 'Nessuna notifica disponibile con i filtri selezionati.'
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
                  className="wow-card p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-900/70"
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
                        onClick={() => {
                          if (item.actionUrl) navigate(item.actionUrl);
                        }}
                        className="wow-button-ghost"
                      >
                        Apri
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={pageSize}
              onPageChange={(nextPage) => {
                load({ page: nextPage });
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
