// apps/frontend/src/pages/TicketsPage.tsx
import { useState, useEffect } from 'react';
import {
  Ticket as TicketIcon,
  Plus,
  X,
  Save,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Power,
  PowerOff,
  Send,
  MessageSquare,
  PlayCircle,
} from 'lucide-react';
import { ticketsApi, type Ticket, type CreateTicketDto, type UpdateTicketDto, type TicketPriorita, type TicketCategoria } from '../api/tickets';
import { fetchPratiche, type Pratica, getDebitoreDisplayName } from '../api/pratiche';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BodyPortal } from '../components/ui/BodyPortal';

type FiltroStato = 'tutti' | 'aperto' | 'in_gestione' | 'chiuso';

export function TicketsPage() {
  const { user } = useAuth();
  const isCliente = user?.ruolo === 'cliente';
  const canCreateTicket = isCliente;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [filtroStato, setFiltroStato] = useState<FiltroStato>('tutti');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Chat modal
  const [showChatModal, setShowChatModal] = useState(false);
  const [nuovoMessaggio, setNuovoMessaggio] = useState('');

  // Form data - autore is now set from logged-in user
  const [formData, setFormData] = useState<CreateTicketDto>({
    praticaId: null,
    oggetto: '',
    descrizione: '',
    autore: user ? `${user.nome} ${user.cognome}` : 'Studio',
    categoria: 'richiesta_informazioni',
    priorita: 'normale',
  });

  const { success, error: toastError, info: toastInfo } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadData();
  }, [showInactive, filtroStato]);

  // Gestione apertura modale tramite URL parameter
  useEffect(() => {
    const ticketId = searchParams.get('id');
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        if (searchParams.get('chat') === '1') {
          setSelectedTicket(ticket);
          setShowChatModal(true);
          setShowDetailModal(false);
        } else {
          setSelectedTicket(ticket);
          setShowDetailModal(true);
        }
        // Rimuovi il parametro dall'URL
        searchParams.delete('id');
        searchParams.delete('chat');
        setSearchParams(searchParams);
      }
    }
  }, [tickets, searchParams, setSearchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ticketsData, praticheData] = await Promise.all([
        filtroStato === 'tutti'
          ? ticketsApi.getAll(showInactive)
          : ticketsApi.getAllByStato(filtroStato as 'aperto' | 'in_gestione' | 'chiuso', showInactive),
        fetchPratiche({ includeInactive: true }),
      ]);

      setTickets(ticketsData);
      setPratiche(praticheData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Errore nel caricamento dei ticket';
      setError(msg);
      toastError(msg, 'Errore');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setIsEditing(false);
    setSelectedTicket(null);
    setSubmitAttempted(false);
    setFormData({
      praticaId: null,
      oggetto: '',
      descrizione: '',
      autore: user ? `${user.nome} ${user.cognome}` : 'Studio',
      categoria: 'richiesta_informazioni',
      priorita: 'normale',
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      handleOpenNew();
      searchParams.delete('new');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleEdit = (ticket: Ticket) => {
    setIsEditing(true);
    setSelectedTicket(ticket);
    setSubmitAttempted(false);
    setFormData({
      praticaId: ticket.praticaId,
      oggetto: ticket.oggetto,
      descrizione: ticket.descrizione,
      autore: ticket.autore,
      categoria: ticket.categoria,
      priorita: ticket.priorita,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.oggetto || !formData.descrizione || (isCliente && !formData.praticaId)) {
        setSubmitAttempted(true);
        toastError('Compila tutti i campi obbligatori', 'Validazione');
        return;
      }

      if (isEditing && selectedTicket) {
        const updateDto: UpdateTicketDto = {
          oggetto: formData.oggetto,
          descrizione: formData.descrizione,
          priorita: formData.priorita,
        };
        await ticketsApi.update(selectedTicket.id, updateDto);
        success('Ticket aggiornato con successo');
      } else {
        if (!canCreateTicket) {
          toastError('Solo il cliente può aprire un nuovo ticket', 'Errore');
          return;
        }
        await ticketsApi.create(formData);
        success('Ticket creato con successo');
      }

      setShowModal(false);
      setSubmitAttempted(false);
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Errore durante il salvataggio';
      setSubmitAttempted(true);
      toastError(msg, 'Errore');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm({
      title: 'Elimina ticket',
      message: 'Sei sicuro di voler eliminare questo ticket?',
      confirmText: 'Elimina',
      variant: 'danger',
    })) {
      try {
        await ticketsApi.delete(id);
        success('Ticket eliminato con successo');
        loadData();
      } catch (err: any) {
        toastError('Errore durante l\'eliminazione', 'Errore');
      }
    }
  };

  const handleToggleActive = async (ticket: Ticket) => {
    try {
      if (ticket.attivo) {
        await ticketsApi.deactivate(ticket.id);
        success('Ticket disattivato');
      } else {
        if (!(await confirm({
          title: 'Riattiva ticket',
          message: 'Riattivare questo ticket?',
          confirmText: 'Riattiva',
          variant: 'info',
        }))) {
          return;
        }
        await ticketsApi.reactivate(ticket.id);
        success('Ticket riattivato');
      }
      loadData();
    } catch (err: any) {
      toastError('Errore durante l\'operazione', 'Errore');
    }
  };

  const handlePrendiInCarico = async (id: string) => {
    try {
      await ticketsApi.prendiInCarico(id);
      success('Ticket preso in carico');
      loadData();
    } catch (err: any) {
      toastError('Errore durante l\'operazione', 'Errore');
    }
  };

  const handleChiudi = async (ticket: Ticket): Promise<boolean> => {
    if (ticket.stato !== 'in_gestione') {
      toastInfo('Il ticket deve essere prima preso in carico.', 'Workflow ticket');
      return false;
    }
    if (await confirm({
      title: 'Chiudi ticket',
      message: 'Confermi la chiusura di questo ticket?',
      confirmText: 'Chiudi',
      variant: 'warning',
    })) {
      try {
        await ticketsApi.chiudi(ticket.id);
        success('Ticket chiuso con successo');
        loadData();
        return true;
      } catch (err: any) {
        toastError('Errore durante la chiusura', 'Errore');
        return false;
      }
    }
    return false;
  };

  const handleRiapri = async (id: string) => {
    try {
      await ticketsApi.riapri(id);
      success('Ticket riaperto con successo');
      loadData();
    } catch (err: any) {
      toastError('Errore durante la riapertura', 'Errore');
    }
  };

  const handleOpenChat = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNuovoMessaggio('');
    setShowChatModal(true);
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !nuovoMessaggio.trim()) return;

    try {
      const isClienteSender = user?.ruolo === 'cliente';
      const senderName = user
        ? `${user.nome} ${user.cognome}`.trim()
        : isClienteSender
          ? 'Referente'
          : 'Studio';
      const updatedTicket = await ticketsApi.addMessaggio(selectedTicket.id, {
        autore: isClienteSender ? 'cliente' : 'studio',
        autoreNome: senderName || (isClienteSender ? 'Referente' : 'Studio'),
        testo: nuovoMessaggio,
      });

      setSelectedTicket(updatedTicket);
      setNuovoMessaggio('');
      success('Messaggio inviato');
      loadData();
    } catch (err: any) {
      toastError('Errore durante l\'invio del messaggio', 'Errore');
    }
  };

  const getPrioritaColor = (priorita: TicketPriorita) => {
    switch (priorita) {
      case 'urgente':
        return 'border-rose-500 dark:border-rose-600';
      case 'alta':
        return 'border-amber-500 dark:border-amber-600';
      case 'normale':
        return 'border-indigo-500 dark:border-indigo-600';
      case 'bassa':
        return 'border-slate-300 dark:border-slate-600';
      default:
        return 'border-slate-300 dark:border-slate-600';
    }
  };

  const getPrioritaBadgeColor = (priorita: TicketPriorita) => {
    switch (priorita) {
      case 'urgente':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400';
      case 'alta':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400';
      case 'normale':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400';
      case 'bassa':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getCategoriaBadgeColor = (categoria: TicketCategoria) => {
    switch (categoria) {
      case 'richiesta_informazioni':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400';
      case 'documentazione':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400';
      case 'pagamenti':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400';
      case 'segnalazione_problema':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400';
      case 'altro':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getCategoriaLabel = (categoria: TicketCategoria) => {
    switch (categoria) {
      case 'richiesta_informazioni':
        return 'Richiesta informazioni';
      case 'documentazione':
        return 'Documentazione';
      case 'pagamenti':
        return 'Pagamenti';
      case 'segnalazione_problema':
        return 'Segnalazione problema';
      case 'altro':
        return 'Altro';
      default:
        return categoria;
    }
  };

  const praticheOptions = [
    ...(isCliente ? [] : [{ value: '', label: 'Richiesta generica (senza pratica)' }]),
    ...pratiche
      .filter(p => p.attivo && p.aperta)
      .map(p => ({
        value: p.id,
        label: `${p.cliente?.ragioneSociale || 'N/D'} vs ${getDebitoreDisplayName(p.debitore)}`,
        sublabel: `Capitale: € ${p.capitale?.toLocaleString('it-IT')}`,
      })),
  ];

  const categoriaOptions = [
    { value: 'richiesta_informazioni', label: 'Richiesta informazioni' },
    { value: 'documentazione', label: 'Documentazione' },
    { value: 'pagamenti', label: 'Pagamenti' },
    { value: 'segnalazione_problema', label: 'Segnalazione problema' },
    { value: 'altro', label: 'Altro' },
  ];

  const prioritaOptions = [
    { value: 'bassa', label: 'Bassa' },
    { value: 'normale', label: 'Normale' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' },
  ];

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="space-y-1.5">
          <span className="wow-chip">Assistenza</span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">Tickets</h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Gestisci le richieste di assistenza e intervento in modo centralizzato.
          </p>
        </div>
        {canCreateTicket && (
          <button
            onClick={handleOpenNew}
            className="wow-button"
          >
            <Plus className="h-4 w-4" />
            Nuovo Ticket
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="wow-panel p-5 relative z-30">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Mostra disattivati
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">Stato:</span>
            <div className="flex gap-2">
              {(['tutti', 'aperto', 'in_gestione', 'chiuso'] as FiltroStato[]).map((stato) => (
                <button
                  key={stato}
                  onClick={() => setFiltroStato(stato)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    filtroStato === stato
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {stato === 'tutti' ? 'Tutti' : stato === 'aperto' ? 'Aperti' : stato === 'in_gestione' ? 'In gestione' : 'Chiusi'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white/80 rounded-full hover:bg-white dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3 wow-stagger">
        {loading && (!tickets || tickets.length === 0) ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Caricamento...</span>
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="wow-panel py-12 text-center text-slate-400">
            <TicketIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Nessun ticket presente</p>
          </div>
        ) : (
          (tickets || [])
            .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
            .map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => {
                setSelectedTicket(ticket);
                setShowDetailModal(true);
              }}
              className={`wow-panel border-l-4 p-4 transition-all cursor-pointer hover:-translate-y-0.5 ${
                !ticket.attivo
                  ? 'opacity-50 border-l-slate-300'
                  : getPrioritaColor(ticket.priorita)
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      #{ticket.numeroTicket}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {ticket.oggetto}
                    </h3>

                    {/* Badges */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getCategoriaBadgeColor(ticket.categoria)}`}>
                      {getCategoriaLabel(ticket.categoria)}
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getPrioritaBadgeColor(ticket.priorita)}`}>
                      {ticket.priorita === 'urgente' && <AlertTriangle className="h-3 w-3" />}
                      {ticket.priorita.charAt(0).toUpperCase() + ticket.priorita.slice(1)}
                    </span>

                    {ticket.stato === 'aperto' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Aperto
                      </span>
                    )}

                    {ticket.stato === 'in_gestione' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                        <PlayCircle className="h-3 w-3" />
                        In gestione
                      </span>
                    )}

                    {ticket.stato === 'chiuso' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        <CheckCircle className="h-3 w-3" />
                        Chiuso
                      </span>
                    )}

                    {!ticket.attivo && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                        Disattivato
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {ticket.descrizione}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      <strong>Richiedente:</strong> {ticket.autore}
                    </span>
                    <span>
                      <strong>Stato:</strong> {ticket.attivo ? 'Attivo' : 'Disattivato'}
                    </span>
                    <span>
                      <strong>Creato:</strong> {new Date(ticket.dataCreazione).toLocaleDateString('it-IT')}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {ticket.messaggi?.length || 0} messaggi
                    </span>
                  </div>

                  {ticket.pratica ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      <strong>Pratica:</strong> {ticket.pratica.cliente?.ragioneSociale} vs{' '}
                      {getDebitoreDisplayName(ticket.pratica.debitore)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                      Richiesta generica (non collegata a pratica)
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenChat(ticket);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                    title="Chat"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>

                  {ticket.stato === 'aperto' && !isCliente && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrendiInCarico(ticket.id);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/50"
                      title="Prendi in carico"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </button>
                  )}

                  {ticket.stato === 'in_gestione' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChiudi(ticket);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                      title="Chiudi ticket"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}

                  {ticket.stato === 'chiuso' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRiapri(ticket.id);
                      }}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg dark:text-amber-400 dark:hover:bg-amber-900/50"
                      title="Riapri ticket"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(ticket);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                    title="Modifica"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(ticket);
                    }}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg dark:text-amber-400 dark:hover:bg-amber-900/50"
                    title={ticket.attivo ? 'Disattiva' : 'Riattiva'}
                  >
                    {ticket.attivo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(ticket.id);
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg dark:text-rose-400 dark:hover:bg-rose-900/50"
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil((tickets?.length || 0) / ITEMS_PER_PAGE)}
          totalItems={tickets?.length || 0}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Form */}
      {showModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowModal(false);
                setSubmitAttempted(false);
              }}
            />
            <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {isEditing ? 'Modifica Ticket' : 'Nuovo Ticket'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSubmitAttempted(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isCliente ? 'Pratica *' : 'Pratica (opzionale)'}
                </label>
                <CustomSelect
                  options={praticheOptions}
                  value={formData.praticaId || ''}
                  onChange={(value) => setFormData({ ...formData, praticaId: value || null })}
                  placeholder={
                    isCliente
                      ? 'Seleziona la pratica di riferimento...'
                      : 'Seleziona pratica o lascia vuoto per richiesta generica...'
                  }
                  triggerClassName={
                    submitAttempted && isCliente && !formData.praticaId
                      ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                      : ''
                  }
                />
                {!isCliente && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Lascia vuoto se la richiesta non è collegata a una pratica specifica
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Oggetto *
                </label>
                <input
                  type="text"
                  value={formData.oggetto}
                  onChange={(e) => setFormData({ ...formData, oggetto: e.target.value })}
                  className={[
                    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
                    submitAttempted && !formData.oggetto ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                  ].join(' ')}
                  placeholder="Es: Richiesta chiarimenti su documento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows={4}
                  className={[
                    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
                    submitAttempted && !formData.descrizione ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                  ].join(' ')}
                  placeholder="Descrizione dettagliata della richiesta..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <CustomSelect
                    options={categoriaOptions}
                    value={formData.categoria || 'richiesta_informazioni'}
                    onChange={(value) => setFormData({ ...formData, categoria: value as TicketCategoria })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priorità
                  </label>
                  <CustomSelect
                    options={prioritaOptions}
                    value={formData.priorita || 'normale'}
                    onChange={(value) => setFormData({ ...formData, priorita: value as TicketPriorita })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSubmitAttempted(false);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <Save className="h-4 w-4" />
                Salva
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
      )}

      {/* Chat Modal */}
      {showChatModal && selectedTicket && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowChatModal(false)} />
            <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Chat - {selectedTicket.oggetto}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Stato: {selectedTicket.stato === 'aperto' ? 'Aperto' : selectedTicket.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'} • Priorità: {selectedTicket.priorita}
                </p>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {selectedTicket.messaggi && selectedTicket.messaggi.length > 0 ? (
                selectedTicket.messaggi.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.autore === 'studio' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.autore === 'studio'
                          ? 'bg-indigo-600 text-white'
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'
                      }`}
                    >
                      <p className="text-xs font-medium text-right">
                        {msg.autoreNome || (msg.autore === 'studio' ? 'Studio' : 'Referente')}
                      </p>
                      <p className="text-sm text-left">{msg.testo}</p>
                      <p className="text-[10px] mt-1 opacity-70">
                        {new Date(msg.dataInvio).toLocaleString('it-IT')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-slate-400 py-8">Nessun messaggio</p>
              )}
            </div>

            {/* Input */}
            {selectedTicket.stato !== 'chiuso' && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuovoMessaggio}
                    onChange={(e) => setNuovoMessaggio(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!nuovoMessaggio.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Invia
                  </button>
                </div>
              </div>
            )}

            {/* Footer con azioni */}
            {selectedTicket.stato !== 'chiuso' && (
              <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedTicket.stato === 'aperto' ? 'Ticket in attesa di essere preso in carico' : 'Ticket in gestione'}
                </p>
                <div className="flex gap-2">
                  {selectedTicket.stato === 'aperto' && !isCliente && (
                    <button
                      onClick={() => {
                        handlePrendiInCarico(selectedTicket.id);
                        setShowChatModal(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Prendi in carico
                    </button>
                  )}
                  <button
                    onClick={() => setShowChatModal(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Chiudi chat
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </BodyPortal>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedTicket.oggetto}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getPrioritaBadgeColor(selectedTicket.priorita)}`}>
                    {selectedTicket.priorita === 'urgente' && <AlertTriangle className="h-3 w-3" />}
                    {selectedTicket.priorita.charAt(0).toUpperCase() + selectedTicket.priorita.slice(1)}
                  </span>
                  {selectedTicket.stato === 'aperto' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      Aperto
                    </span>
                  )}
                  {selectedTicket.stato === 'in_gestione' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                      <PlayCircle className="h-3 w-3" />
                      In gestione
                    </span>
                  )}
                  {selectedTicket.stato === 'chiuso' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      <CheckCircle className="h-3 w-3" />
                      Chiuso
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTicket.stato === 'in_gestione' && (
                  <button
                    onClick={async () => {
                      const closed = await handleChiudi(selectedTicket);
                      if (closed) setShowDetailModal(false);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Chiudi ticket
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* Descrizione */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                  Descrizione
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {selectedTicket.descrizione}
                </p>
              </div>

              {/* Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Numero Ticket
                  </h3>
                  <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    #{selectedTicket.numeroTicket}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Richiedente
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedTicket.autore}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Data Creazione
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(selectedTicket.dataCreazione).toLocaleString('it-IT')}
                  </p>
                </div>
              </div>

              {/* Pratica */}
              {selectedTicket.pratica ? (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    Pratica Collegata
                  </h3>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <strong>Cliente:</strong> {selectedTicket.pratica.cliente?.ragioneSociale}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      <strong>Debitore:</strong> {getDebitoreDisplayName(selectedTicket.pratica.debitore)}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    Pratica
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Richiesta generica (non collegata a pratica)
                  </p>
                </div>
              )}

              {/* Messaggi */}
              {selectedTicket.messaggi && selectedTicket.messaggi.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                    Messaggi ({selectedTicket.messaggi.length})
                  </h3>
                  <div className="space-y-1.5">
                    {selectedTicket.messaggi.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.autore === 'studio' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.autore === 'studio'
                              ? 'bg-indigo-600 text-white'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'
                          }`}
                        >
                          <p className="text-xs font-medium text-right">
                            {msg.autoreNome || (msg.autore === 'studio' ? 'Studio' : 'Referente')}
                          </p>
                          <p className="text-sm text-left">{msg.testo}</p>
                          <p className="text-[10px] mt-1 opacity-70">
                            {new Date(msg.dataInvio).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(selectedTicket);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Edit2 className="h-4 w-4" />
                Modifica
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Chiudi
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
