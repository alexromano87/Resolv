// apps/checkup-frontend/src/pages/PreassessmentTicketsPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  Plus,
  X,
  Save,
  Send,
  MessageSquare,
  RefreshCw,
  Clock,
  CheckCircle,
  PlayCircle,
  ArrowLeft,
  User,
  AlertTriangle,
} from 'lucide-react';
import {
  preassessmentTicketApi,
  preassessmentApi,
  threadsUnreadApi,
  type PreassessmentTicket,
  type PreassessmentTicketMessage,
} from '../api/preassessment';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { Pagination } from '../components/Pagination';

type StatusFilter = 'tutti' | 'open' | 'in_progress' | 'pending_close' | 'closed';

const STATUS_LABELS: Record<PreassessmentTicket['status'], string> = {
  open: 'Aperto',
  in_progress: 'In gestione',
  pending_close: 'Richiesta chiusura',
  closed: 'Chiuso',
};

const STATUS_BORDER: Record<PreassessmentTicket['status'], string> = {
  open: 'border-l-indigo-400',
  in_progress: 'border-l-amber-400',
  pending_close: 'border-l-orange-500',
  closed: 'border-l-slate-300',
};

const STATUS_BADGE: Record<PreassessmentTicket['status'], string> = {
  open: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  pending_close: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  closed: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const ITEMS_PER_PAGE = 10;

export function PreassessmentTicketsPage() {
  const { clientId } = useParams<{ clientId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCliente = user?.ruolo === 'cliente';

  const [preassessmentId, setPreassessmentId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<PreassessmentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filtroStato, setFiltroStato] = useState<StatusFilter>('tutti');
  const [currentPage, setCurrentPage] = useState(1);

  // Create modal (cliente only)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ subject: '', body: '' });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Thread modal
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<PreassessmentTicket | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      loadTickets();
      // Mark tickets as seen to reset the sidebar badge
      if (isCliente) {
        threadsUnreadApi.markSeen(preassessmentId, 'tickets').catch(() => {});
        window.dispatchEvent(new CustomEvent('checkup:mark-seen', { detail: 'tickets' }));
      }
    }
  }, [preassessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    if (showThreadModal) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [selectedTicket?.messages, showThreadModal]);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadTickets = async () => {
    if (!preassessmentId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await preassessmentTicketApi.list(preassessmentId);
      setTickets(data);
      // If a ticket was selected, update it from the fresh list
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Errore nel caricamento dei ticket');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Filtering & pagination ──────────────────────────────────────────────────
  const filteredTickets = filtroStato === 'tutti'
    ? tickets
    : tickets.filter(t => t.status === filtroStato);

  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleCreateTicket = async () => {
    if (!createForm.subject.trim() || !createForm.body.trim()) {
      setSubmitAttempted(true);
      return;
    }
    if (!preassessmentId) return;
    setCreateLoading(true);
    try {
      await preassessmentTicketApi.create(preassessmentId, createForm.subject.trim(), createForm.body.trim());
      setShowCreateModal(false);
      setCreateForm({ subject: '', body: '' });
      setSubmitAttempted(false);
      showSuccess('Ticket creato con successo');
      loadTickets();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la creazione del ticket');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMsg.trim()) return;
    setReplyLoading(true);
    try {
      const msg = await preassessmentTicketApi.reply(selectedTicket.id, replyMsg.trim());
      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: [...(prev.messages || []), msg as PreassessmentTicketMessage],
      } : null);
      setReplyMsg('');
      loadTickets();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante l\'invio del messaggio');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleAssign = async (ticketId: string) => {
    try {
      await preassessmentTicketApi.assign(ticketId);
      showSuccess('Ticket preso in carico');
      loadTickets();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante l\'assegnazione');
    }
  };

  const handleRequestClose = async (ticketId: string) => {
    const ok = await confirm({
      title: 'Richiedi chiusura ticket',
      message: 'Vuoi richiedere la chiusura di questo ticket? Il cliente dovrà confermare la chiusura.',
      confirmText: 'Richiedi chiusura',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await preassessmentTicketApi.requestClose(ticketId);
      showSuccess('Richiesta di chiusura inviata al cliente');
      loadTickets();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la richiesta di chiusura');
    }
  };

  const handleConfirmClose = async (ticketId: string) => {
    const ok = await confirm({
      title: 'Conferma chiusura ticket',
      message: 'Confermi la chiusura di questo ticket? Lo studio lo potrà riaprire se necessario.',
      confirmText: 'Chiudi ticket',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await preassessmentTicketApi.confirmClose(ticketId);
      if (showThreadModal && selectedTicket?.id === ticketId) {
        setShowThreadModal(false);
      }
      showSuccess('Ticket chiuso con successo');
      loadTickets();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la chiusura');
    }
  };

  const handleReopen = async (ticketId: string) => {
    const ok = await confirm({
      title: 'Riapri ticket',
      message: 'Vuoi riaprire questo ticket e rimettere in gestione?',
      confirmText: 'Riapri',
      variant: 'info',
    });
    if (!ok) return;
    try {
      await preassessmentTicketApi.reopen(ticketId);
      showSuccess('Ticket riaperto');
      loadTickets();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore durante la riapertura');
    }
  };

  const openThread = (ticket: PreassessmentTicket) => {
    setSelectedTicket(ticket);
    setReplyMsg('');
    setShowThreadModal(true);
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
            <span className="wow-chip">Supporto</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            Ticket di supporto
          </h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            {isCliente
              ? 'Apri richieste di supporto verso il tuo consulente e monitora il loro stato.'
              : 'Gestisci e rispondi alle richieste di supporto dei clienti.'}
          </p>
        </div>
        {isCliente && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setSubmitAttempted(false);
              setCreateForm({ subject: '', body: '' });
            }}
            className="wow-button"
          >
            <Plus className="h-4 w-4" />
            Nuovo Ticket
          </button>
        )}
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
            <span className="text-xs text-slate-600 dark:text-slate-400">Stato:</span>
            <div className="flex flex-wrap gap-1.5">
              {(['tutti', 'open', 'in_progress', 'pending_close', 'closed'] as StatusFilter[]).map((stato) => (
                <button
                  key={stato}
                  onClick={() => { setFiltroStato(stato); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    filtroStato === stato
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {stato === 'tutti' ? 'Tutti' : STATUS_LABELS[stato as PreassessmentTicket['status']]}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={loadTickets}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white/80 rounded-full hover:bg-white dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Ticket list */}
      <div className="space-y-3 wow-stagger">
        {loading && tickets.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Caricamento...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="wow-panel py-12 text-center text-slate-400">
            <TicketIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              {filtroStato === 'tutti' ? 'Nessun ticket presente' : `Nessun ticket con stato "${STATUS_LABELS[filtroStato as PreassessmentTicket['status']]}"`}
            </p>
          </div>
        ) : (
          paginatedTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`wow-panel border-l-4 p-4 transition-all ${STATUS_BORDER[ticket.status]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {ticket.subject}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[ticket.status]}`}>
                      {ticket.status === 'open' && <Clock className="h-3 w-3" />}
                      {ticket.status === 'in_progress' && <PlayCircle className="h-3 w-3" />}
                      {ticket.status === 'pending_close' && <AlertTriangle className="h-3 w-3" />}
                      {ticket.status === 'closed' && <CheckCircle className="h-3 w-3" />}
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                    {ticket.body}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      Aperto da: {ticket.createdBy?.nome} {ticket.createdBy?.cognome}
                    </span>
                    {ticket.assignedTo && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        In carico a: {ticket.assignedTo.nome} {ticket.assignedTo.cognome}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {ticket.messages?.length || 0} messaggi
                    </span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString('it-IT')}</span>
                  </div>

                  {ticket.status === 'pending_close' && ticket.closeRequestedBy && (
                    <p className="mt-1.5 text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                      Chiusura richiesta da {ticket.closeRequestedBy.nome} {ticket.closeRequestedBy.cognome}
                      {ticket.closeRequestedAt && ` il ${new Date(ticket.closeRequestedAt).toLocaleDateString('it-IT')}`}
                    </p>
                  )}
                  {ticket.status === 'closed' && ticket.closedBy && (
                    <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 italic">
                      Chiuso da {ticket.closedBy.nome} {ticket.closedBy.cognome}
                      {ticket.closedAt && ` il ${new Date(ticket.closedAt).toLocaleDateString('it-IT')}`}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Reply/View thread */}
                  <button
                    onClick={() => openThread(ticket)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
                    title="Visualizza conversazione"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>

                  {/* Admin: Assign (open only) */}
                  {!isCliente && ticket.status === 'open' && (
                    <button
                      onClick={() => handleAssign(ticket.id)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors"
                      title="Prendi in carico"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </button>
                  )}

                  {/* Admin: Request close (in_progress only) */}
                  {!isCliente && ticket.status === 'in_progress' && (
                    <button
                      onClick={() => handleRequestClose(ticket.id)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
                      title="Richiedi chiusura"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}

                  {/* Admin: Reopen (closed only) */}
                  {!isCliente && ticket.status === 'closed' && (
                    <button
                      onClick={() => handleReopen(ticket.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                      title="Riapri ticket"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}

                  {/* Cliente: Confirm close (pending_close only) */}
                  {isCliente && ticket.status === 'pending_close' && (
                    <button
                      onClick={() => handleConfirmClose(ticket.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
                      title="Conferma chiusura"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredTickets.length / ITEMS_PER_PAGE)}
          totalItems={filteredTickets.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Create ticket modal ───────────────────────────────────────────────── */}
      {showCreateModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowCreateModal(false); setSubmitAttempted(false); }}
            />
            <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Nuovo Ticket
                </h2>
                <button
                  onClick={() => { setShowCreateModal(false); setSubmitAttempted(false); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Oggetto *
                  </label>
                  <input
                    type="text"
                    value={createForm.subject}
                    onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
                      submitAttempted && !createForm.subject.trim() ? '!border-rose-400' : '',
                    ].join(' ')}
                    placeholder="Es: Domanda sulla sezione finanziaria"
                    maxLength={255}
                  />
                  {submitAttempted && !createForm.subject.trim() && (
                    <p className="mt-1 text-xs text-rose-500">Campo obbligatorio</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrizione *
                  </label>
                  <textarea
                    value={createForm.body}
                    onChange={(e) => setCreateForm({ ...createForm, body: e.target.value })}
                    rows={5}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 resize-none',
                      submitAttempted && !createForm.body.trim() ? '!border-rose-400' : '',
                    ].join(' ')}
                    placeholder="Descrivi la tua richiesta nel dettaglio..."
                  />
                  {submitAttempted && !createForm.body.trim() && (
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
                  onClick={handleCreateTicket}
                  disabled={createLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Apri Ticket
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* ── Thread modal ──────────────────────────────────────────────────────── */}
      {showThreadModal && selectedTicket && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowThreadModal(false)}
            />
            <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 truncate">
                    {selectedTicket.subject}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Stato: <span className={`font-semibold ${STATUS_BADGE[selectedTicket.status].split(' ').slice(0, 2).join(' ')}`}>{STATUS_LABELS[selectedTicket.status]}</span>
                    {' · '}Aperto da {selectedTicket.createdBy?.nome} {selectedTicket.createdBy?.cognome}
                  </p>
                </div>
                <button
                  onClick={() => setShowThreadModal(false)}
                  className="ml-2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Original body */}
              <div className="px-4 pt-4 pb-2">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descrizione originale</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedTicket.body}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto px-4 py-2 space-y-3">
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((msg) => {
                    const isOwn = msg.userId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl p-3 ${
                          isOwn
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                        }`}>
                          <p className="text-[10px] font-semibold mb-1 opacity-80">
                            {msg.user?.nome} {msg.user?.cognome}
                            {' · '}
                            {msg.user?.ruolo === 'cliente' ? 'Cliente' : 'Studio'}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{msg.messaggio}</p>
                          <p className="text-[10px] mt-1 opacity-60 text-right">
                            {new Date(msg.createdAt).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-xs text-slate-400 py-6">Nessun messaggio ancora. Inizia la conversazione.</p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input (only for non-closed tickets) */}
              {selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyMsg}
                      onChange={(e) => setReplyMsg(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                      placeholder="Scrivi un messaggio..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyMsg.trim() || replyLoading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {replyLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Invia
                    </button>
                  </div>
                </div>
              )}

              {/* Footer with role-based actions */}
              <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                {/* Admin actions */}
                {!isCliente && (
                  <div className="flex items-center gap-2">
                    {selectedTicket.status === 'open' && (
                      <button
                        onClick={() => { handleAssign(selectedTicket.id); setShowThreadModal(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full hover:bg-amber-200 transition-colors"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Prendi in carico
                      </button>
                    )}
                    {selectedTicket.status === 'in_progress' && (
                      <button
                        onClick={() => { handleRequestClose(selectedTicket.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-colors"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Richiedi chiusura
                      </button>
                    )}
                    {selectedTicket.status === 'closed' && (
                      <button
                        onClick={() => { handleReopen(selectedTicket.id); setShowThreadModal(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Riapri
                      </button>
                    )}
                  </div>
                )}

                {/* Cliente actions */}
                {isCliente && (
                  <div className="flex items-center gap-2">
                    {selectedTicket.status === 'pending_close' && (
                      <button
                        onClick={() => handleConfirmClose(selectedTicket.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full hover:bg-emerald-200 transition-colors"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Conferma chiusura
                      </button>
                    )}
                  </div>
                )}

                <div className="ml-auto">
                  {selectedTicket.status === 'pending_close' && isCliente && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Il consulente ha richiesto la chiusura del ticket
                    </p>
                  )}
                  {selectedTicket.status === 'pending_close' && !isCliente && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      In attesa di conferma dal cliente
                    </p>
                  )}
                  {selectedTicket.status === 'closed' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ticket chiuso</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      <ConfirmDialog />
    </div>
  );
}
