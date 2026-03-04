// apps/checkup-frontend/src/pages/PreassessmentAlertsPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import {
  preassessmentAlertApi,
  preassessmentApi,
  preassessmentCoParticipantsApi,
  threadsUnreadApi,
  type CoParticipant,
  type PreassessmentAlert,
} from '../api/preassessment';
import { api } from '../api/config';
import { usersApi } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { DateField } from '../components/ui/DateField';
import { Pagination } from '../components/Pagination';

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
}

interface AlertFormData {
  messaggio: string;
  priority: 'info' | 'warning' | 'urgent';
  destinatario: 'me' | 'interlocutore' | 'collega' | 'partecipante';
  colleagueId: string;
  /** 'tutti' or a specific CheckupUser.id for the client side (staff targeting clients) */
  interlocutoreUserId: 'tutti' | string;
  /** CheckupUser.id for a co-participant (cliente targeting another cliente same clientId) */
  partecipanteId: string;
  dataScadenza: string;
  preavvisoGiorni: string;
}

const emptyForm = (): AlertFormData => ({
  messaggio: '',
  priority: 'info',
  destinatario: 'interlocutore',
  colleagueId: '',
  interlocutoreUserId: 'tutti',
  partecipanteId: '',
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
  const isCliente = user?.ruolo === 'cliente';

  const [preassessmentId, setPreassessmentId] = useState<string | null>(null);
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const [clientNome, setClientNome] = useState<string>('');
  const [alerts, setAlerts] = useState<PreassessmentAlert[]>([]);
  const [studioMembers, setStudioMembers] = useState<StudioMember[]>([]);
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [coParticipants, setCoParticipants] = useState<CoParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filtroPriority, setFiltroPriority] = useState<PriorityFilter>('tutti');
  const [filtroStato, setFiltroStato] = useState<StatoFilter>('tutti');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<AlertFormData>(emptyForm());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [editingAlert, setEditingAlert] = useState<PreassessmentAlert | null>(null);
  const [editForm, setEditForm] = useState<Omit<AlertFormData, 'destinatario' | 'colleagueId' | 'interlocutoreUserId' | 'partecipanteId'>>(
    { messaggio: '', priority: 'info', dataScadenza: '', preavvisoGiorni: '' }
  );
  const [editSubmitAttempted, setEditSubmitAttempted] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const { confirm, ConfirmDialog } = useConfirmDialog();

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
          setClientUserId(data.client.id);
          setClientNome(data.client.azienda || data.client.nome || '');
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
      // Mark alerts as seen to reset the badge for all users
      threadsUnreadApi.markSeen(preassessmentId, 'alerts').catch(() => {});
      window.dispatchEvent(new CustomEvent('checkup:mark-seen', { detail: 'alerts' }));
    }
  }, [preassessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch studio colleagues and client users (staff only) ──────────────────
  useEffect(() => {
    if (isCliente) return;
    // Studio colleagues (admin_studio only)
    if (user?.ruolo === 'admin_studio') {
      api.get<StudioMember[]>('/checkup/users')
        .then((members) => setStudioMembers(members.filter((m) => m.id !== user?.id && m.ruolo !== 'cliente')))
        .catch(() => setStudioMembers([]));
    }
    // Client users for this specific client
    if (clientUserId) {
      usersApi.getAll(undefined, false)
        .then((all) => {
          const cu = all
            .filter((u) => u.ruolo === 'cliente' && u.clientId === clientUserId)
            .map((u) => ({ id: u.id, nome: u.nome, cognome: u.cognome }));
          setClientUsers(cu);
        })
        .catch(() => setClientUsers([]));
    }
  }, [isCliente, user?.ruolo, user?.id, clientUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch co-participants (cliente only) ───────────────────────────────────
  useEffect(() => {
    if (!isCliente || !preassessmentId) return;
    preassessmentCoParticipantsApi.list(preassessmentId)
      .then(setCoParticipants)
      .catch(() => setCoParticipants([]));
  }, [isCliente, preassessmentId]);

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
    setCreateForm(emptyForm());
    setSubmitAttempted(false);
    setShowCreateModal(true);
  };

  const handleCreateAlert = async () => {
    const missingTarget =
      (createForm.destinatario === 'collega' && !createForm.colleagueId) ||
      (createForm.destinatario === 'partecipante' && !createForm.partecipanteId);
    if (!createForm.messaggio.trim() || missingTarget) {
      setSubmitAttempted(true);
      return;
    }
    if (!preassessmentId) return;

    const payload = {
      messaggio: createForm.messaggio.trim(),
      priority: createForm.priority,
      dataScadenza: createForm.dataScadenza || null,
      preavvisoGiorni: createForm.preavvisoGiorni ? parseInt(createForm.preavvisoGiorni, 10) : null,
    };

    setCreateLoading(true);
    try {
      if (isCliente) {
        let targetUserId: string | undefined;
        if (createForm.destinatario === 'me') targetUserId = user?.id;
        else if (createForm.destinatario === 'partecipante') targetUserId = createForm.partecipanteId || undefined;
        // 'interlocutore' → undefined (goes to studio)
        await preassessmentAlertApi.create(preassessmentId, { ...payload, targetUserId });
      } else if (createForm.destinatario === 'me') {
        await preassessmentAlertApi.create(preassessmentId, { ...payload, targetUserId: user?.id });
      } else if (createForm.destinatario === 'collega') {
        await preassessmentAlertApi.create(preassessmentId, { ...payload, targetUserId: createForm.colleagueId || undefined });
      } else {
        // 'interlocutore' — per il cliente
        if (createForm.interlocutoreUserId === 'tutti') {
          // Create one alert per client user (or fallback to CheckupClient.id if no users)
          const targets = clientUsers.length > 0 ? clientUsers.map((u) => u.id) : [clientUserId ?? undefined];
          await Promise.all(
            targets.map((tid) => preassessmentAlertApi.create(preassessmentId!, { ...payload, targetUserId: tid ?? undefined })),
          );
        } else {
          await preassessmentAlertApi.create(preassessmentId, { ...payload, targetUserId: createForm.interlocutoreUserId || undefined });
        }
      }

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
      setError(err?.response?.data?.message || 'Errore durante la modifica dell\'alert');
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
      setError(err?.response?.data?.message || 'Errore durante la chiusura dell\'alert');
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
      setError(err?.response?.data?.message || 'Errore durante l\'eliminazione dell\'alert');
    }
  };

  // ── Mute / Restore ───────────────────────────────────────────────────────────
  const handleMuteAlert = async (alert: PreassessmentAlert) => {
    try {
      await preassessmentAlertApi.mute(alert.id);
      showSuccess('Alert tacitato — non riceverai preavvisi via email');
      loadAlerts();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la tacitazione dell\'alert');
    }
  };

  const handleRestoreAlert = async (alert: PreassessmentAlert) => {
    try {
      await preassessmentAlertApi.restore(alert.id);
      showSuccess('Alert ripristinato — riceverai di nuovo i preavvisi via email');
      loadAlerts();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante il ripristino dell\'alert');
    }
  };

  const handleArchiveAlert = async (alert: PreassessmentAlert) => {
    try {
      await preassessmentAlertApi.archive(alert.id);
      showSuccess('Alert archiviato');
      loadAlerts();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante l\'archiviazione dell\'alert');
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

  const formatDateOnly = (d: string) =>
    new Date(d).toLocaleDateString('it-IT', { dateStyle: 'medium' });

  const escHtml = (s: string) =>
    (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const handlePrint = () => {
    const now = new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    const nowTime = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    const priorityColors: Record<PreassessmentAlert['priority'], string> = {
      info: '#4f46e5', warning: '#d97706', urgent: '#e11d48',
    };
    const statoColors: Record<string, string> = {
      aperto: '#16a34a', chiuso: '#64748b', scaduto: '#dc2626',
    };

    const priorityBadge = (p: PreassessmentAlert['priority']) =>
      `<span style="background:${priorityColors[p]}1a;color:${priorityColors[p]};padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid ${priorityColors[p]}40">${PRIORITY_LABELS[p]}</span>`;

    const statoBadge = (stato: string) => {
      const c = statoColors[stato] || '#64748b';
      const label = STATO_LABELS[stato as 'aperto' | 'chiuso' | 'scaduto'] || stato;
      return `<span style="background:${c}1a;color:${c};padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid ${c}40">${label}</span>`;
    };

    const alertsHtml = filteredAlerts.map((a, i) => {
      const stato = a.stato ?? 'aperto';
      const isExpired = a.dataScadenza && stato === 'aperto' && new Date(a.dataScadenza).getTime() < Date.now();
      const statoEffettivo = isExpired ? 'scaduto' : stato;
      const borderColor = priorityColors[a.priority];
      return `
      <div class="alert-card" style="border-left-color:${borderColor}">
        <div class="alert-header">
          <span class="alert-num">#${i + 1}</span>
          <div class="alert-badges">${priorityBadge(a.priority)} ${statoBadge(statoEffettivo)}</div>
          <span class="alert-date">${new Date(a.createdAt).toLocaleDateString('it-IT')}</span>
        </div>
        <div class="alert-msg">${escHtml(a.messaggio)}</div>
        <div class="alert-meta">
          <span>Da: <strong>${escHtml(getCreatorLabel(a))}</strong></span>
          <span>A: <strong>${escHtml(getTargetLabel(a))}</strong></span>
          ${a.dataScadenza ? `<span>Scadenza: <strong>${formatDateOnly(a.dataScadenza)}</strong>${a.preavvisoGiorni ? ` (preavviso ${a.preavvisoGiorni}gg)` : ''}</span>` : ''}
        </div>
        ${a.stato === 'chiuso' ? `<div class="alert-closed">Alert chiuso</div>` : ''}
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="it"><head>
<meta charset="utf-8"/>
<title>Alert</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;padding:32px 36px;background:#fff}
.print-header{border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:24px}
.print-header h1{font-size:20px;font-weight:700;color:#1e293b}
.print-header .sub{color:#64748b;font-size:11px;margin-top:3px}
.alert-card{border:1px solid #e2e8f0;border-left:4px solid #6366f1;border-radius:8px;padding:14px 16px;margin-bottom:16px;page-break-inside:avoid}
.alert-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.alert-num{font-size:10px;font-weight:700;color:#94a3b8;min-width:24px}
.alert-badges{display:flex;gap:6px;flex-wrap:wrap}
.alert-date{margin-left:auto;font-size:11px;color:#94a3b8}
.alert-msg{font-size:13px;font-weight:500;color:#1e293b;line-height:1.6;white-space:pre-wrap;margin-bottom:10px;background:#f8fafc;padding:10px 12px;border-radius:6px;border:1px solid #e2e8f0}
.alert-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:#64748b;margin-bottom:6px}
.alert-note{font-size:11px;color:#475569;background:#fefce8;border:1px solid #fde68a;padding:8px 10px;border-radius:6px;margin-top:8px;white-space:pre-wrap}
.note-label{font-weight:700;color:#92400e}
.alert-closed{font-size:11px;color:#94a3b8;font-style:italic;margin-top:8px;border-top:1px dashed #e2e8f0;padding-top:6px}
@media print{body{padding:16px}@page{margin:20mm}}
</style></head>
<body>
<div class="print-header">
  <h1>Alert${clientNome ? ` — ${escHtml(clientNome)}` : ''}</h1>
  <div class="sub">Generato il ${now} alle ${nowTime} &nbsp;·&nbsp; ${filteredAlerts.length} alert</div>
</div>
${alertsHtml || '<p style="color:#94a3b8;text-align:center;padding:40px 0">Nessun alert da stampare</p>'}
</body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
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
            // Staff can close any open alert; clients can only close their own
            const canClose = (isMyAlert(alert) || !isCliente) && (alert.stato ?? 'aperto') === 'aperto';
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Destinatario</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, destinatario: 'interlocutore', colleagueId: '', partecipanteId: '' })}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        createForm.destinatario === 'interlocutore'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isCliente ? 'Per lo Studio' : 'Per il Cliente'}
                    </button>
                    {isCliente && coParticipants.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, destinatario: 'partecipante', colleagueId: '' })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          createForm.destinatario === 'partecipante'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Per un partecipante
                      </button>
                    )}
                    {!isCliente && studioMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, destinatario: 'collega', colleagueId: '', partecipanteId: '' })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          createForm.destinatario === 'collega'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Per un collega
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, destinatario: 'me', colleagueId: '', partecipanteId: '' })}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        createForm.destinatario === 'me'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Per me (privato)
                    </button>
                  </div>
                  {/* Co-participant selector (cliente only) */}
                  {createForm.destinatario === 'partecipante' && isCliente && (
                    <>
                      <select
                        value={createForm.partecipanteId}
                        onChange={(e) => setCreateForm({ ...createForm, partecipanteId: e.target.value })}
                        className={`mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${
                          submitAttempted && !createForm.partecipanteId ? 'border-rose-400' : 'border-slate-300'
                        }`}
                      >
                        <option value="">— Seleziona un partecipante —</option>
                        {coParticipants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} {p.cognome}
                          </option>
                        ))}
                      </select>
                      {submitAttempted && !createForm.partecipanteId && (
                        <p className="mt-1 text-xs text-rose-500">Seleziona un partecipante</p>
                      )}
                    </>
                  )}
                  {/* Colleague selector */}
                  {createForm.destinatario === 'collega' && (
                    <select
                      value={createForm.colleagueId}
                      onChange={(e) => setCreateForm({ ...createForm, colleagueId: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">— Seleziona un collega —</option>
                      {studioMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome} {m.cognome} ({m.ruolo})
                        </option>
                      ))}
                    </select>
                  )}
                  {/* Client user picker (staff only, when interlocutore) */}
                  {createForm.destinatario === 'interlocutore' && !isCliente && clientUsers.length > 0 && (
                    <select
                      value={createForm.interlocutoreUserId}
                      onChange={(e) => setCreateForm({ ...createForm, interlocutoreUserId: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="tutti">Tutti i partecipanti</option>
                      {clientUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} {u.cognome}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">
                    {createForm.destinatario === 'interlocutore'
                      ? (isCliente
                          ? 'L\'alert sarà visibile allo studio consulente.'
                          : createForm.interlocutoreUserId === 'tutti'
                            ? 'L\'alert sarà inviato a tutti i partecipanti del cliente.'
                            : 'L\'alert sarà visibile al partecipante selezionato.')
                      : createForm.destinatario === 'partecipante'
                        ? 'L\'alert sarà visibile al partecipante selezionato.'
                        : createForm.destinatario === 'collega'
                          ? 'L\'alert sarà visibile al collega selezionato.'
                          : 'Promemoria privato visibile solo a te.'}
                  </p>
                </div>

                {/* Priorità */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priorità</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Messaggio *</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priorità</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Messaggio *</label>
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
