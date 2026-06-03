// apps/checkup-frontend/src/pages/PreassessmentAlertsPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Plus,
  X,
  Save,
  RefreshCw,
  AlertTriangle,
  Info,
  ArrowLeft,
  User,
  Clock,
  Pencil,
  Trash2,
  CheckCircle,
  Lock,
  CalendarClock,
  RotateCcw,
  Archive,
  Printer,
  Search,
} from 'lucide-react';
import {
  preassessmentAlertApi,
  preassessmentApi,
  preassessmentStaffChatApi,
  threadsUnreadApi,
  type PreassessmentClientEntry,
  type PreassessmentAlert,
} from '../api/preassessment';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { DateField } from '../components/ui/DateField';
import { Pagination } from '../components/Pagination';
import {
  downloadTextFile,
  formatDateOnly as formatExportDateOnly,
  formatDateTime as formatExportDateTime,
  sanitizeFilename,
} from '../utils/textExport';

type PriorityFilter = 'tutti' | 'info' | 'warning' | 'urgent';
type StatoFilter = 'tutti' | 'aperto' | 'chiuso' | 'scaduto';

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
  info: 'bg-indigo-100 text-indigo-700',
  warning: 'bg-amber-100 text-amber-700',
  urgent: 'bg-rose-100 text-rose-700',
};

const STATO_BADGE: Record<'aperto' | 'chiuso' | 'scaduto', string> = {
  aperto: 'bg-emerald-100 text-emerald-700',
  chiuso: 'bg-slate-200 text-slate-600',
  scaduto: 'bg-orange-100 text-orange-700',
};

const STATO_LABELS: Record<'aperto' | 'chiuso' | 'scaduto', string> = {
  aperto: 'Aperto',
  chiuso: 'Chiuso',
  scaduto: 'Scaduto',
};

const ITEMS_PER_PAGE = 10;

function getErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || err?.message || fallback;
}

interface StudioMember {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string;
}

interface ClientUser {
  id: string;
  nome: string;
  cognome: string;
  email?: string;
  ruolo?: string;
  azienda?: string | null;
}

interface RecipientClient {
  id: string;
  label: string;
  subtitle: string;
  users: ClientUser[];
}

interface AlertFormData {
  messaggio: string;
  priority: 'info' | 'warning' | 'urgent';
  destinatario: 'me' | 'studio_user' | 'client_user';
  studioUserId: string;
  clientUserId: string;
  contextClientId: string;
  dataScadenza: string;
  preavvisoGiorni: string;
}

type AlertEditFormData = Pick<AlertFormData, 'messaggio' | 'priority' | 'dataScadenza' | 'preavvisoGiorni'>;

const emptyForm = (): AlertFormData => ({
  messaggio: '',
  priority: 'info',
  destinatario: 'client_user',
  studioUserId: '',
  clientUserId: '',
  contextClientId: '',
  dataScadenza: '',
  preavvisoGiorni: '',
});

/** Returns true if the alert is within the warning window (approaching expiry) */
function isInWarningWindow(alert: PreassessmentAlert): boolean {
  if (!alert.dataScadenza || !alert.preavvisoGiorni || (alert.stato ?? 'aperto') !== 'aperto') return false;
  const now = Date.now();
  const expiry = new Date(alert.dataScadenza).getTime();
  const warnMs = alert.preavvisoGiorni * 24 * 60 * 60 * 1000;
  return expiry > now && expiry - now <= warnMs;
}

function isExpiredOrClose(alert: PreassessmentAlert): boolean {
  if (!alert.dataScadenza || (alert.stato ?? 'aperto') !== 'aperto') return false;
  return new Date(alert.dataScadenza).getTime() < Date.now();
}

export function PreassessmentAlertsPage() {
  const { clientId } = useParams<{ clientId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isCliente = user?.ruolo === 'cliente';
  const scopedClientId = clientId ?? searchParams.get('clientId') ?? undefined;
  const isGlobalStaffView = !isCliente && !scopedClientId;

  const [preassessmentId, setPreassessmentId] = useState<string | null>(null);
  const [clientNome, setClientNome] = useState<string>('');
  const [alerts, setAlerts] = useState<PreassessmentAlert[]>([]);
  const [studioMembers, setStudioMembers] = useState<StudioMember[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [recipientClients, setRecipientClients] = useState<RecipientClient[]>([]);
  const [availableClients, setAvailableClients] = useState<PreassessmentClientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filtroPriority, setFiltroPriority] = useState<PriorityFilter>('tutti');
  const [filtroStato, setFiltroStato] = useState<StatoFilter>('tutti');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('search') ?? '');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<AlertFormData>(emptyForm());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [editingAlert, setEditingAlert] = useState<PreassessmentAlert | null>(null);
  const [editForm, setEditForm] = useState<AlertEditFormData>(
    { messaggio: '', priority: 'info', dataScadenza: '', preavvisoGiorni: '' }
  );
  const [editSubmitAttempted, setEditSubmitAttempted] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const { confirm, ConfirmDialog } = useConfirmDialog();
  const clientCompanyLabel =
    user?.client?.ragioneSociale ||
    user?.azienda ||
    user?.clientNome ||
    user?.client?.nome ||
    'azienda sublicenziataria';
  const consultantStudioLabel =
    user?.licenziatarioNome ||
    user?.studioNome ||
    'studio';
  const currentStudioLabel =
    user?.studioNome ||
    user?.licenziatarioNome ||
    'studio';
  const clientRecipientLabel = isCliente
    ? `Verso collega ${clientCompanyLabel}`
    : 'Verso cliente';
  const studioRecipientLabel = isCliente
    ? `Verso consulente ${consultantStudioLabel}`
    : `Verso collega ${currentStudioLabel}`;

  // ── Load preassessmentId ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        if (isCliente) {
          const pre = await preassessmentApi.get();
          setPreassessmentId(pre.id);
        } else if (scopedClientId) {
          const data = await preassessmentApi.getClient(scopedClientId);
          setPreassessmentId(data.preassessment.id);
          setClientNome(data.client.azienda || data.client.nome || '');
        } else {
          setPreassessmentId(null);
          setClientNome('');
          setLoading(false);
        }
      } catch (err: any) {
        setError(getErrorMessage(err, 'Errore nel caricamento del pre-assessment'));
        setLoading(false);
      }
    };
    load();
  }, [isCliente, scopedClientId]);

  useEffect(() => {
    if (preassessmentId || isGlobalStaffView) {
      loadAlerts();
      if (preassessmentId) {
        threadsUnreadApi.markSeen(preassessmentId, 'alerts').catch(() => {});
      } else if (isGlobalStaffView) {
        preassessmentApi.listClients()
          .then((entries) => Promise.all(
            entries
              .map((entry) => entry.preassessment?.id)
              .filter((id): id is string => !!id)
              .map((id) => threadsUnreadApi.markSeen(id, 'alerts').catch(() => {})),
          ))
          .catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('checkup:mark-seen', { detail: 'alerts' }));
    }
  }, [preassessmentId, isGlobalStaffView, appliedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch recipients and accessible clients ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    preassessmentStaffChatApi.listRecipients()
      .then((data) => {
        setStudioMembers(
          data.studioUsers.map((entry) => ({
            id: entry.id,
            nome: entry.nome,
            cognome: entry.cognome,
            ruolo: entry.ruolo,
          })),
        );
        setClientUsers(
          isCliente
            ? data.colleagueUsers.map((entry) => ({
                id: entry.id,
                nome: entry.nome,
                cognome: entry.cognome,
                email: entry.email,
                ruolo: entry.ruolo,
                azienda: entry.azienda,
              }))
            : [],
        );
        setRecipientClients(data.clients);
      })
      .catch(() => {
        setStudioMembers([]);
        setClientUsers([]);
        setRecipientClients([]);
      });

    if (!isCliente) {
      preassessmentApi.listClients()
        .then(setAvailableClients)
        .catch(() => setAvailableClients([]));
    } else {
      setAvailableClients([]);
    }
  }, [isCliente, user]);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = isGlobalStaffView
        ? await preassessmentAlertApi.listAll(appliedSearch || undefined)
        : preassessmentId
          ? await preassessmentAlertApi.list(preassessmentId)
          : [];
      setAlerts(data);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Errore nel caricamento degli alert'));
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Filtering & pagination ──────────────────────────────────────────────────
  const filteredAlerts = alerts.filter((a) => {
    if (!showArchived && a.archiviato) return false;
    if (showArchived && !a.archiviato) return false;
    if (filtroPriority !== 'tutti' && a.priority !== filtroPriority) return false;
    if (filtroStato !== 'tutti' && a.stato !== filtroStato) return false;
    return true;
  });

  const archivedCount = alerts.filter((a) => a.archiviato).length;

  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Create ───────────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setCreateForm({
      ...emptyForm(),
      destinatario: isCliente ? 'studio_user' : 'client_user',
      contextClientId: scopedClientId ?? '',
    });
    setSubmitAttempted(false);
    setShowCreateModal(true);
  };

  const handleCreateAlert = async () => {
    const activeClientContextId = isCliente ? scopedClientId ?? '' : createForm.contextClientId;
    const selectedClientEntry = availableClients.find((entry) => entry.client.id === activeClientContextId);
    const targetPreassessmentId = isCliente
      ? preassessmentId
      : scopedClientId
        ? preassessmentId
        : createForm.destinatario === 'client_user'
          ? selectedClientEntry?.preassessment?.id ?? null
          : fallbackStaffPreassessment?.preassessment?.id ?? null;
    const missingTarget =
      (createForm.destinatario === 'studio_user' && !createForm.studioUserId) ||
      (createForm.destinatario === 'client_user' && !createForm.clientUserId) ||
      (!isCliente && !scopedClientId && createForm.destinatario === 'client_user' && !createForm.contextClientId);
    if (!createForm.messaggio.trim() || missingTarget) {
      setSubmitAttempted(true);
      return;
    }
    if (!targetPreassessmentId) {
      setSubmitAttempted(true);
      setError(
        createForm.destinatario === 'client_user'
          ? 'Seleziona prima il cliente a cui associare l\'alert'
          : 'Nessun checkup disponibile per associare l\'alert',
      );
      return;
    }
    const ok = await confirm({
      title: 'Crea alert',
      message: 'Confermi la creazione di questo alert?',
      confirmText: 'Crea',
      variant: 'info',
    });
    if (!ok) return;

    const payload = {
      messaggio: createForm.messaggio.trim(),
      priority: createForm.priority,
      dataScadenza: createForm.dataScadenza || null,
      preavvisoGiorni: createForm.preavvisoGiorni ? parseInt(createForm.preavvisoGiorni, 10) : null,
    };

    setCreateLoading(true);
    try {
      if (isCliente) {
        const targetUserId =
          createForm.destinatario === 'me'
            ? user?.id
            : createForm.destinatario === 'client_user'
              ? createForm.clientUserId || undefined
              : createForm.studioUserId || undefined;
        await preassessmentAlertApi.create(targetPreassessmentId, { ...payload, targetUserId });
      } else {
        const targetUserId =
          createForm.destinatario === 'me'
            ? user?.id
            : createForm.destinatario === 'studio_user'
              ? createForm.studioUserId || undefined
              : createForm.clientUserId || undefined;
        await preassessmentAlertApi.create(targetPreassessmentId, { ...payload, targetUserId });
      }

      setShowCreateModal(false);
      setSubmitAttempted(false);
      showSuccess('Alert creato con successo');
      loadAlerts();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Errore durante la creazione dell\'alert'));
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const openEditModal = (alert: PreassessmentAlert) => {
    setEditingAlert(alert);
    setEditForm({
      messaggio: alert.messaggio,
      priority: alert.priority,
      dataScadenza: alert.dataScadenza ? new Date(alert.dataScadenza).toISOString().split('T')[0] : '',
      preavvisoGiorni: alert.preavvisoGiorni != null ? String(alert.preavvisoGiorni) : '',
    });
    setEditSubmitAttempted(false);
  };

  const handleEditAlert = async () => {
    if (!editingAlert || !editForm.messaggio.trim()) {
      setEditSubmitAttempted(true);
      return;
    }
    const ok = await confirm({
      title: 'Salva modifiche',
      message: 'Confermi il salvataggio delle modifiche a questo alert?',
      confirmText: 'Salva',
      variant: 'info',
    });
    if (!ok) return;
    setEditLoading(true);
    try {
      await preassessmentAlertApi.update(editingAlert.id, {
        messaggio: editForm.messaggio.trim(),
        priority: editForm.priority,
        dataScadenza: editForm.dataScadenza || null,
        preavvisoGiorni: editForm.preavvisoGiorni ? parseInt(editForm.preavvisoGiorni, 10) : null,
      });
      setEditingAlert(null);
      showSuccess('Alert modificato con successo');
      loadAlerts();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Errore durante la modifica dell\'alert'));
    } finally {
      setEditLoading(false);
    }
  };

  // ── Close ────────────────────────────────────────────────────────────────────
  const handleCloseAlert = async (alert: PreassessmentAlert) => {
    const ok = await confirm({
      title: 'Chiudi alert',
      message: 'Vuoi chiudere questo alert? L\'azione non è reversibile.',
      confirmText: 'Chiudi alert',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await preassessmentAlertApi.close(alert.id);
      showSuccess('Alert chiuso');
      loadAlerts();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Errore durante la chiusura dell\'alert'));
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDeleteAlert = async (alert: PreassessmentAlert) => {
    const ok = await confirm({
      title: 'Elimina alert',
      message: 'Sei sicuro di voler eliminare questo alert? L\'operazione è irreversibile.',
      confirmText: 'Elimina',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await preassessmentAlertApi.delete(alert.id);
      showSuccess('Alert eliminato');
      loadAlerts();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Errore durante l\'eliminazione dell\'alert'));
    }
  };

  // ── Mute / Restore ───────────────────────────────────────────────────────────
  const handleMuteAlert = async (alert: PreassessmentAlert) => {
    try {
      await preassessmentAlertApi.mute(alert.id);
      showSuccess('Alert tacitato — non riceverai preavvisi via email');
      loadAlerts();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Errore durante la tacitazione dell\'alert'));
    }
  };

  const handleRestoreAlert = async (alert: PreassessmentAlert) => {
    try {
      await preassessmentAlertApi.restore(alert.id);
      showSuccess('Alert ripristinato — riceverai di nuovo i preavvisi via email');
      loadAlerts();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Errore durante il ripristino dell\'alert'));
    }
  };

  const handleArchiveAlert = async (alert: PreassessmentAlert) => {
    const ok = await confirm({
      title: 'Archivia alert',
      message: 'Confermi l\'archiviazione di questo alert?',
      confirmText: 'Archivia',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await preassessmentAlertApi.archive(alert.id);
      showSuccess('Alert archiviato');
      loadAlerts();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Errore durante l\'archiviazione dell\'alert'));
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getTargetLabel = (alert: PreassessmentAlert) => {
    // Private alert (target = creator)
    if (alert.targetUserId && alert.targetUserId === alert.createdById) {
      return '🔒 Privato';
    }
    if (alert.targetUser) {
      const name = `${alert.targetUser.nome} ${alert.targetUser.cognome}`;
      if (alert.targetUser.ruolo === 'cliente') {
        const azienda =
          alert.targetUser.client?.ragioneSociale ||
          alert.targetUser.client?.nome ||
          alert.targetUser.azienda ||
          clientNome;
        return azienda ? `${azienda} · ${name}` : name;
      }
      return `Studio · ${name}`;
    }
    return 'Studio';
  };

  const getCreatorLabel = (alert: PreassessmentAlert) => {
    if (!alert.createdBy) return 'Sconosciuto';
    const name = `${alert.createdBy.nome} ${alert.createdBy.cognome}`;
    if (alert.createdBy.ruolo === 'cliente') {
      const azienda =
        alert.createdBy.client?.ragioneSociale ||
        alert.createdBy.client?.nome ||
        alert.createdBy.azienda ||
        clientNome;
      return azienda ? `${azienda} · ${name}` : name;
    }
    return `Studio · ${name}`;
  };

  const isMyAlert = (alert: PreassessmentAlert) => alert.createdById === user?.id;
  const selectedClientBucket = recipientClients.find((entry) => entry.id === (createForm.contextClientId || scopedClientId || ''));
  const selectableClientUsers = isCliente ? clientUsers : (selectedClientBucket?.users ?? []);
  const showClientSelector = !isCliente && !scopedClientId && createForm.destinatario === 'client_user';
  const fallbackStaffPreassessment = !isCliente && !scopedClientId
    ? availableClients.find((entry) => entry.preassessment?.id)
    : undefined;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

  const formatDateOnly = (d: string) =>
    new Date(d).toLocaleDateString('it-IT', { dateStyle: 'medium' });

  const handlePrint = () => {
    const lines: string[] = [
      'ESPORTAZIONE ALERT',
      `Cliente: ${clientNome || (isGlobalStaffView ? 'Tutti i clienti' : 'Non specificato')}`,
      `Generato il: ${formatExportDateTime(new Date().toISOString())}`,
      `Numero alert: ${filteredAlerts.length}`,
      '',
    ];

    filteredAlerts.forEach((alert, index) => {
      const stato = alert.stato ?? 'aperto';
      const isExpired = alert.dataScadenza && stato === 'aperto' && new Date(alert.dataScadenza).getTime() < Date.now();
      const statoEffettivo = isExpired ? 'scaduto' : stato;
      lines.push(`ALERT #${index + 1}`);
      lines.push(`Priorita: ${PRIORITY_LABELS[alert.priority]}`);
      lines.push(`Stato: ${STATO_LABELS[statoEffettivo as 'aperto' | 'chiuso' | 'scaduto'] || statoEffettivo}`);
      lines.push(`Creato il: ${formatExportDateTime(alert.createdAt)}`);
      lines.push(`Da: ${getCreatorLabel(alert)}`);
      lines.push(`A: ${getTargetLabel(alert)}`);
      if (alert.dataScadenza) {
        lines.push(`Scadenza: ${formatExportDateOnly(alert.dataScadenza)}${alert.preavvisoGiorni ? ` (preavviso ${alert.preavvisoGiorni} giorni)` : ''}`);
      }
      lines.push('Messaggio:');
      lines.push(alert.messaggio);
      if (alert.stato === 'chiuso') {
        lines.push('Esito: Alert chiuso');
      }
      lines.push('');
      lines.push('------------------------------------------------------------');
      lines.push('');
    });

    downloadTextFile(
      `alert-${sanitizeFilename(clientNome || 'studio')}-${new Date().toISOString().slice(0, 10)}.txt`,
      lines.join('\n'),
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="flex flex-col gap-4 p-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
              title="Torna indietro"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="wow-chip">Notifiche</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            Alert
          </h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            {isCliente
              ? 'Visualizza gli alert ricevuti dal tuo consulente e invia notifiche.'
              : isGlobalStaffView
                ? 'Gestisci gli alert aperti verso lo studio o l’utente loggato.'
                : 'Invia alert al cliente e visualizza le notifiche ricevute.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="wow-button-ghost"
            title="Stampa alert"
          >
            <Printer className="h-4 w-4" />
            Stampa
          </button>
          <button onClick={openCreateModal} className="wow-button">
            <Plus className="h-4 w-4" />
            Nuovo Alert
          </button>
        </div>
      </div>
      {/* Success/Error banners */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="wow-panel p-4 relative z-20 no-print">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setAppliedSearch(search.trim());
                      setCurrentPage(1);
                    }
                  }}
                  placeholder="Cerca cliente, alert o utente"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <button
                onClick={() => {
                  setAppliedSearch(search.trim());
                  setCurrentPage(1);
                }}
                className="wow-button"
              >
                <Search className="h-4 w-4" />
                Cerca
              </button>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                  showArchived
                    ? 'bg-slate-700 text-white'
                    : 'bg-white/80 text-slate-600 hover:bg-white'
                }`}
              >
                <Archive className="h-3 w-3" />
                Archiviati{archivedCount > 0 && !showArchived ? ` (${archivedCount})` : ''}
              </button>
              <button
                onClick={loadAlerts}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white/80 rounded-full hover:bg-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-600 w-14">Stato:</span>
            <div className="flex flex-wrap gap-1.5">
              {(['tutti', 'aperto', 'chiuso', 'scaduto'] as StatoFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setFiltroStato(s); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    filtroStato === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/80 text-slate-600 hover:bg-white'
                  }`}
                >
                  {s === 'tutti' ? 'Tutti' : STATO_LABELS[s as 'aperto' | 'chiuso' | 'scaduto']}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-600 w-14">Priorità:</span>
              <div className="flex flex-wrap gap-1.5">
                {(['tutti', 'info', 'warning', 'urgent'] as PriorityFilter[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setFiltroPriority(p); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      filtroPriority === p
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/80 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {p === 'tutti' ? 'Tutti' : PRIORITY_LABELS[p as PreassessmentAlert['priority']]}
                  </button>
                ))}
              </div>
            </div>
            <div />
          </div>
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
            <p className="text-xs">Nessun alert trovato</p>
          </div>
        ) : (
          paginatedAlerts.map((alert) => {
            const warning = isInWarningWindow(alert);
            const expired = isExpiredOrClose(alert);
            const canEdit = isMyAlert(alert) && (alert.stato ?? 'aperto') === 'aperto';
            const canClose = ((isMyAlert(alert) || alert.targetUserId === user?.id || !isCliente) && (alert.stato ?? 'aperto') === 'aperto');
            const canDelete = isMyAlert(alert);
            const canArchive = (alert.stato ?? 'aperto') !== 'aperto' && !alert.archiviato;
            const isPrivate = alert.targetUserId != null && alert.targetUserId === alert.createdById;

            return (
              <div
                key={alert.id}
                className={`wow-panel border-l-4 p-4 transition-all ${PRIORITY_BORDER[alert.priority]} ${
                  (alert.stato ?? 'aperto') !== 'aperto' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {/* Priority */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_BADGE[alert.priority]}`}>
                        {alert.priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
                        {alert.priority === 'warning' && <Clock className="h-3 w-3" />}
                        {alert.priority === 'info' && <Info className="h-3 w-3" />}
                        {PRIORITY_LABELS[alert.priority]}
                      </span>
                      {/* Stato */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATO_BADGE[alert.stato ?? 'aperto']}`}>
                        {(alert.stato ?? 'aperto') === 'chiuso' && <CheckCircle className="h-3 w-3" />}
                        {(alert.stato ?? 'aperto') === 'scaduto' && <AlertTriangle className="h-3 w-3" />}
                        {STATO_LABELS[alert.stato ?? 'aperto']}
                      </span>
                      {/* Taciuto */}
                      {alert.taciuto && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          <BellOff className="h-3 w-3" />
                          Tacitato
                        </span>
                      )}
                      {/* Private */}
                      {isPrivate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          <Lock className="h-3 w-3" />
                          Privato
                        </span>
                      )}
                      {/* Target */}
                      {!isPrivate && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Per: {getTargetLabel(alert)}
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                      {alert.messaggio}
                    </p>

                    {!isCliente && alert.client?.label && (
                      <p className="mb-2 text-xs font-medium text-slate-500">
                        Cliente: {alert.client.label}
                      </p>
                    )}

                    {/* Expiry info */}
                    {alert.dataScadenza && (
                      <div className={`flex items-center gap-1.5 mb-2 text-xs font-medium ${
                        expired ? 'text-rose-600' : warning ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        <CalendarClock className="h-3.5 w-3.5" />
                        {expired ? 'Scaduto il' : warning ? '⚠ Scade il' : 'Scade il'}{' '}
                        {formatDateOnly(alert.dataScadenza)}
                        {alert.preavvisoGiorni && !expired && (
                          <span className="text-slate-400 font-normal ml-1">
                            (preavviso {alert.preavvisoGiorni}gg)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Da: {getCreatorLabel(alert)}</span>
                      <span>{formatDate(alert.createdAt)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {(canEdit || canClose || canDelete || canArchive || (alert.stato ?? 'aperto') === 'aperto') && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Mute / Restore (visible when in warning window or taciuto) */}
                      {(alert.stato ?? 'aperto') === 'aperto' && (warning || alert.taciuto) && (
                        alert.taciuto ? (
                          <button
                            onClick={() => handleRestoreAlert(alert)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                            title="Ripristina notifiche"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMuteAlert(alert)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                            title="Tacita notifiche email"
                          >
                            <BellOff className="h-4 w-4" />
                          </button>
                        )
                      )}
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(alert)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canClose && (
                        <button
                          onClick={() => handleCloseAlert(alert)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                          title="Chiudi alert"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteAlert(alert)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {canArchive && (
                        <button
                          onClick={() => handleArchiveAlert(alert)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                          title="Archivia"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
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
            <div className="modal-content relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Nuovo Alert</h2>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1"><span>Destinatario <span className="text-rose-500">*</span></span></label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, destinatario: 'client_user', clientUserId: '' })}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        createForm.destinatario === 'client_user'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {clientRecipientLabel}
                    </button>
                    {studioMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, destinatario: 'studio_user', studioUserId: '' })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          createForm.destinatario === 'studio_user'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {studioRecipientLabel}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, destinatario: 'me', studioUserId: '', clientUserId: '' })}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        createForm.destinatario === 'me'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Per me (privato)
                    </button>
                  </div>
                  {showClientSelector && (
                    <select
                      value={createForm.contextClientId}
                      onChange={(e) => setCreateForm({ ...createForm, contextClientId: e.target.value, clientUserId: '' })}
                      className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${
                        submitAttempted && !createForm.contextClientId ? 'border-rose-400' : 'border-slate-300'
                      }`}
                    >
                      <option value="">— Seleziona cliente —</option>
                      {availableClients.map((entry) => (
                        <option key={entry.client.id} value={entry.client.id}>
                          {entry.client.ragioneSociale || entry.client.azienda || entry.client.nome}
                        </option>
                      ))}
                    </select>
                  )}
                  {createForm.destinatario === 'client_user' && (
                    <select
                      value={createForm.clientUserId}
                      onChange={(e) => setCreateForm({ ...createForm, clientUserId: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">— Seleziona utente —</option>
                      {selectableClientUsers.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.nome} {entry.cognome}{entry.email ? ` (${entry.email})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {createForm.destinatario === 'studio_user' && (
                    <select
                      value={createForm.studioUserId}
                      onChange={(e) => setCreateForm({ ...createForm, studioUserId: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">— Seleziona consulente —</option>
                      {studioMembers.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.nome} {entry.cognome} ({entry.ruolo})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">
                    {createForm.destinatario === 'client_user'
                      ? 'L\'alert sarà visibile solo all\'utente selezionato del cliente.'
                      : createForm.destinatario === 'studio_user'
                        ? 'L\'alert sarà visibile solo al consulente selezionato.'
                        : 'Promemoria privato visibile solo a te.'}
                  </p>
                </div>

                {/* Priorità */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><span>Priorita <span className="text-rose-500">*</span></span></label>
                  <div className="flex gap-2">
                    {(['info', 'warning', 'urgent'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, priority: p })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          createForm.priority === p
                            ? `${PRIORITY_BADGE[p]} border-current`
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messaggio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><span>Messaggio <span className="text-rose-500">*</span></span></label>
                  <textarea
                    value={createForm.messaggio}
                    onChange={(e) => setCreateForm({ ...createForm, messaggio: e.target.value })}
                    rows={4}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none',
                      submitAttempted && !createForm.messaggio.trim() ? '!border-rose-400' : '',
                    ].join(' ')}
                    placeholder="Scrivi il testo dell'alert..."
                  />
                  {submitAttempted && !createForm.messaggio.trim() && (
                    <p className="mt-1 text-xs text-rose-500">Campo obbligatorio</p>
                  )}
                </div>

                {/* Data scadenza + preavviso */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      <CalendarClock className="inline h-3.5 w-3.5 mr-1" />
                      Scadenza (opzionale)
                    </label>
                    <DateField
                      value={createForm.dataScadenza}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(v) => setCreateForm({ ...createForm, dataScadenza: v })}
                    />
                  </div>
                  {createForm.dataScadenza && (
                    <div className="w-36">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Preavviso (giorni)
                      </label>
                      <input
                        type="number"
                        value={createForm.preavvisoGiorni}
                        min="1"
                        max="365"
                        onChange={(e) => setCreateForm({ ...createForm, preavvisoGiorni: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        placeholder="es. 7"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  onClick={() => { setShowCreateModal(false); setSubmitAttempted(false); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateAlert}
                  disabled={createLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Invia Alert
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* ── Edit alert modal ──────────────────────────────────────────────────── */}
      {editingAlert && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setEditingAlert(null)}
            />
            <div className="modal-content relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Modifica Alert</h2>
                <button
                  onClick={() => setEditingAlert(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Priorità */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><span>Priorita <span className="text-rose-500">*</span></span></label>
                  <div className="flex gap-2">
                    {(['info', 'warning', 'urgent'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, priority: p })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          editForm.priority === p
                            ? `${PRIORITY_BADGE[p]} border-current`
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messaggio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1"><span>Messaggio <span className="text-rose-500">*</span></span></label>
                  <textarea
                    value={editForm.messaggio}
                    onChange={(e) => setEditForm({ ...editForm, messaggio: e.target.value })}
                    rows={4}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none',
                      editSubmitAttempted && !editForm.messaggio.trim() ? '!border-rose-400' : '',
                    ].join(' ')}
                    placeholder="Scrivi il testo dell'alert..."
                  />
                  {editSubmitAttempted && !editForm.messaggio.trim() && (
                    <p className="mt-1 text-xs text-rose-500">Campo obbligatorio</p>
                  )}
                </div>

                {/* Data scadenza + preavviso */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      <CalendarClock className="inline h-3.5 w-3.5 mr-1" />
                      Scadenza (opzionale)
                    </label>
                    <DateField
                      value={editForm.dataScadenza}
                      onChange={(v) => setEditForm({ ...editForm, dataScadenza: v })}
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Preavviso (giorni)
                    </label>
                    <input
                      type="number"
                      value={editForm.preavvisoGiorni}
                      min="1"
                      max="365"
                      onChange={(e) => setEditForm({ ...editForm, preavvisoGiorni: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="es. 7"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
                <button
                  onClick={() => setEditingAlert(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Annulla
                </button>
                <button
                  onClick={handleEditAlert}
                  disabled={editLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {editLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salva modifiche
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
