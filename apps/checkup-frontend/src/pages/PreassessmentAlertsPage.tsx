// apps/checkup-frontend/src/pages/PreassessmentAlertsPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bell,
  Plus,
  X,
  Save,
  RefreshCw,
  AlertTriangle,
  Info,
  ArrowLeft,
  User,
  Clock,
} from 'lucide-react';
import {
  preassessmentAlertApi,
  preassessmentApi,
  threadsUnreadApi,
  type PreassessmentAlert,
} from '../api/preassessment';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { Pagination } from '../components/Pagination';

type PriorityFilter = 'tutti' | 'info' | 'warning' | 'urgent';

const PRIORITY_LABELS: Record<PreassessmentAlert['priority'], string> = {
  info: 'Informazione',
  warning: 'Attenzione',
  urgent: 'Urgente',
};

const PRIORITY_BORDER: Record<PreassessmentAlert['priority'], string> = {
  info: 'border-l-indigo-400',
  warning: 'border-l-amber-400',
  urgent: 'border-l-rose-500',
};

const PRIORITY_BADGE: Record<PreassessmentAlert['priority'], string> = {
  info: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400',
};

const ITEMS_PER_PAGE = 10;

interface CreateFormData {
  messaggio: string;
  priority: 'info' | 'warning' | 'urgent';
  destinatario: 'me' | 'interlocutore';
}

export function PreassessmentAlertsPage() {
  const { clientId } = useParams<{ clientId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCliente = user?.ruolo === 'cliente';

  const [preassessmentId, setPreassessmentId] = useState<string | null>(null);
  // clientUserId is the CheckupUser.id of the client — needed by admin to target alert at client
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<PreassessmentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filtroPriority, setFiltroPriority] = useState<PriorityFilter>('tutti');
  const [currentPage, setCurrentPage] = useState(1);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormData>({
    messaggio: '',
    priority: 'info',
    destinatario: 'interlocutore',
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const { ConfirmDialog } = useConfirmDialog();

  // ── Load preassessmentId ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        if (isCliente) {
          const pre = await preassessmentApi.get();
          setPreassessmentId(pre.id);
        } else if (clientId) {
          const data = await preassessmentApi.getClient(clientId);
          setPreassessmentId(data.preassessment.id);
          // data.client.id is the CheckupUser.id for the client user
          setClientUserId(data.client.id);
        } else {
          setError('Pre-assessment non trovato');
          setLoading(false);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Errore nel caricamento del pre-assessment');
        setLoading(false);
      }
    };
    load();
  }, [isCliente, clientId]);

  useEffect(() => {
    if (preassessmentId) {
      loadAlerts();
      // Mark alerts as seen to reset the sidebar badge
      if (isCliente) {
        threadsUnreadApi.markSeen(preassessmentId, 'alerts').catch(() => {});
      }
    }
  }, [preassessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadAlerts = async () => {
    if (!preassessmentId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await preassessmentAlertApi.list(preassessmentId);
      setAlerts(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Errore nel caricamento degli alert');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Filtering & pagination ──────────────────────────────────────────────────
  const filteredAlerts = filtroPriority === 'tutti'
    ? alerts
    : alerts.filter(a => a.priority === filtroPriority);

  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Actions ─────────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setCreateForm({
      messaggio: '',
      priority: 'info',
      destinatario: 'interlocutore',
    });
    setSubmitAttempted(false);
    setShowCreateModal(true);
  };

  const handleCreateAlert = async () => {
    if (!createForm.messaggio.trim()) {
      setSubmitAttempted(true);
      return;
    }
    if (!preassessmentId) return;

    // Determine targetUserId based on role and destinatario choice
    let targetUserId: string | undefined;

    if (isCliente) {
      if (createForm.destinatario === 'me') {
        // Personal reminder for the client themselves
        targetUserId = user?.id;
      } else {
        // Alert for studio — no targetUserId (null on server)
        targetUserId = undefined;
      }
    } else {
      // admin_studio
      if (createForm.destinatario === 'interlocutore' && clientUserId) {
        // Alert targeted at the client user
        targetUserId = clientUserId;
      } else {
        // Studio internal alert — no targetUserId (null on server)
        targetUserId = undefined;
      }
    }

    setCreateLoading(true);
    try {
      await preassessmentAlertApi.create(preassessmentId, {
        messaggio: createForm.messaggio.trim(),
        priority: createForm.priority,
        targetUserId,
      });
      setShowCreateModal(false);
      setSubmitAttempted(false);
      showSuccess('Alert creato con successo');
      loadAlerts();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la creazione dell\'alert');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getTargetLabel = (alert: PreassessmentAlert) => {
    if (alert.targetUser) {
      const ruolo = alert.targetUser.ruolo === 'cliente' ? 'Cliente' : 'Studio';
      return `${ruolo}: ${alert.targetUser.nome} ${alert.targetUser.cognome}`;
    }
    // null targetUserId = for studio (or general)
    return 'Studio';
  };

  const getCreatorLabel = (alert: PreassessmentAlert) => {
    if (!alert.createdBy) return 'Sconosciuto';
    const ruolo = alert.createdBy.ruolo === 'cliente' ? 'Cliente' : 'Studio';
    return `${ruolo} · ${alert.createdBy.nome} ${alert.createdBy.cognome}`;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="flex flex-col gap-4 p-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {!isCliente && clientId && (
              <button
                onClick={() => navigate(`/checkup/clienti/${clientId}`)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                title="Torna al pre-assessment"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="wow-chip">Notifiche</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            Alert
          </h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            {isCliente
              ? 'Visualizza gli alert ricevuti dal tuo consulente e invia notifiche.'
              : 'Invia alert al cliente e visualizza le notifiche ricevute.'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="wow-button"
        >
          <Plus className="h-4 w-4" />
          Nuovo Alert
        </button>
      </div>

      {/* Success/Error banners */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="wow-panel p-4 relative z-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">Priorità:</span>
            <div className="flex flex-wrap gap-1.5">
              {(['tutti', 'info', 'warning', 'urgent'] as PriorityFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setFiltroPriority(p); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    filtroPriority === p
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {p === 'tutti' ? 'Tutti' : PRIORITY_LABELS[p as PreassessmentAlert['priority']]}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white/80 rounded-full hover:bg-white dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3 wow-stagger">
        {loading && alerts.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Caricamento...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="wow-panel py-12 text-center text-slate-400">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              {filtroPriority === 'tutti' ? 'Nessun alert presente' : `Nessun alert con priorità "${PRIORITY_LABELS[filtroPriority as PreassessmentAlert['priority']]}"`}
            </p>
          </div>
        ) : (
          paginatedAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`wow-panel border-l-4 p-4 transition-all ${PRIORITY_BORDER[alert.priority]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Priority badge + target */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_BADGE[alert.priority]}`}>
                      {alert.priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
                      {alert.priority === 'warning' && <Clock className="h-3 w-3" />}
                      {alert.priority === 'info' && <Info className="h-3 w-3" />}
                      {PRIORITY_LABELS[alert.priority]}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Per: {getTargetLabel(alert)}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-2">
                    {alert.messaggio}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>Da: {getCreatorLabel(alert)}</span>
                    <span>{new Date(alert.createdAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE)}
          totalItems={filteredAlerts.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Create alert modal ────────────────────────────────────────────────── */}
      {showCreateModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowCreateModal(false); setSubmitAttempted(false); }}
            />
            <div className="modal-content relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Nuovo Alert
                </h2>
                <button
                  onClick={() => { setShowCreateModal(false); setSubmitAttempted(false); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Destinatario */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Destinatario
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, destinatario: 'interlocutore' })}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        createForm.destinatario === 'interlocutore'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isCliente ? 'Per lo Studio' : 'Per il Cliente'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, destinatario: 'me' })}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        createForm.destinatario === 'me'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      Per me
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {createForm.destinatario === 'interlocutore'
                      ? (isCliente ? 'L\'alert sarà visibile allo studio consulente.' : 'L\'alert sarà visibile al cliente.')
                      : (isCliente ? 'Promemoria personale visibile solo a te.' : 'Nota interna visibile solo allo studio.')}
                  </p>
                </div>

                {/* Priorità */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priorità
                  </label>
                  <div className="flex gap-2">
                    {(['info', 'warning', 'urgent'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, priority: p })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          createForm.priority === p
                            ? `${PRIORITY_BADGE[p]} border-current`
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messaggio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Messaggio *
                  </label>
                  <textarea
                    value={createForm.messaggio}
                    onChange={(e) => setCreateForm({ ...createForm, messaggio: e.target.value })}
                    rows={4}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 resize-none',
                      submitAttempted && !createForm.messaggio.trim() ? '!border-rose-400' : '',
                    ].join(' ')}
                    placeholder="Scrivi il testo dell'alert..."
                  />
                  {submitAttempted && !createForm.messaggio.trim() && (
                    <p className="mt-1 text-xs text-rose-500">Campo obbligatorio</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => { setShowCreateModal(false); setSubmitAttempted(false); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateAlert}
                  disabled={createLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Invia Alert
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      <ConfirmDialog />
    </div>
  );
}
