// apps/frontend/src/pages/AlertsPage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell,
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
  Calendar,
  User,
  MessageSquare,
} from 'lucide-react';
import {
  alertsApi,
  type Alert,
  type CreateAlertDto,
  type UpdateAlertDto,
  type AlertModalitaNotifica,
} from '../api/alerts';
import { fetchPratiche, type Pratica, getDebitoreDisplayName } from '../api/pratiche';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DateField } from '../components/ui/DateField';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

type FiltroStato = 'tutti' | 'in_gestione' | 'chiuso';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [filtroStato, setFiltroStato] = useState<FiltroStato>('tutti');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { user } = useAuth();
  const canManageAlertStatus = user?.ruolo !== 'cliente';
  const [searchParams, setSearchParams] = useSearchParams();

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Chat modal
  const [showChatModal, setShowChatModal] = useState(false);
  const [nuovoMessaggio, setNuovoMessaggio] = useState('');

  // Form data
  const [formData, setFormData] = useState<CreateAlertDto>({
    praticaId: '',
    titolo: '',
    descrizione: '',
    destinatario: 'cliente',
    modalitaNotifica: 'popup',
    dataScadenza: '',
    giorniAnticipo: 3,
  });

  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    loadData();
  }, [showInactive, filtroStato]);

  useEffect(() => {
    const alertId = searchParams.get('id');
    if (alertId && alerts.length > 0 && searchParams.get('chat') === '1') {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        setSelectedAlert(alert);
        setShowChatModal(true);
      }
      searchParams.delete('id');
      searchParams.delete('chat');
      setSearchParams(searchParams);
    }
  }, [alerts, searchParams, setSearchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alertsData, praticheData] = await Promise.all([
        filtroStato === 'tutti'
          ? alertsApi.getAll(showInactive)
          : alertsApi.getAllByStato(filtroStato as 'in_gestione' | 'chiuso', showInactive),
        fetchPratiche({ includeInactive: true }),
      ]);

      setAlerts(alertsData);
      setPratiche(praticheData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Errore nel caricamento degli alert';
      setError(msg);
      toastError(msg, 'Errore');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setIsEditing(false);
    setSelectedAlert(null);
    setSubmitAttempted(false);
    setFormData({
      praticaId: '',
      titolo: '',
      descrizione: '',
      destinatario: 'cliente',
      modalitaNotifica: 'popup',
      dataScadenza: '',
      giorniAnticipo: 3,
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

  const handleEdit = (alert: Alert) => {
    setIsEditing(true);
    setSelectedAlert(alert);
    setSubmitAttempted(false);
    setFormData({
      praticaId: alert.praticaId,
      titolo: alert.titolo,
      descrizione: alert.descrizione,
      destinatario: alert.destinatario,
      modalitaNotifica: alert.modalitaNotifica ?? 'popup',
      dataScadenza: new Date(alert.dataScadenza).toISOString().split('T')[0] as string,
      giorniAnticipo: alert.giorniAnticipo,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.praticaId || !formData.titolo || !formData.descrizione || !formData.dataScadenza) {
        setSubmitAttempted(true);
        toastError('Compila tutti i campi obbligatori', 'Validazione');
        return;
      }

      // Converti la data in formato ISO 8601
      const dataScadenzaISO = new Date(formData.dataScadenza).toISOString();

      // Assicurati che giorniAnticipo sia un numero valido
      const giorniAnticipo = typeof formData.giorniAnticipo === 'number' && !isNaN(formData.giorniAnticipo)
        ? formData.giorniAnticipo
        : 3;

      if (isEditing && selectedAlert) {
        const updateDto: UpdateAlertDto = {
          titolo: formData.titolo,
          descrizione: formData.descrizione,
          destinatario: formData.destinatario,
          modalitaNotifica: formData.modalitaNotifica,
          dataScadenza: dataScadenzaISO,
          giorniAnticipo: giorniAnticipo,
        };
        await alertsApi.update(selectedAlert.id, updateDto);
        success('Alert aggiornato con successo');
      } else {
        const createDto: CreateAlertDto = {
          praticaId: formData.praticaId,
          titolo: formData.titolo,
          descrizione: formData.descrizione,
          destinatario: formData.destinatario,
          modalitaNotifica: formData.modalitaNotifica,
          dataScadenza: dataScadenzaISO,
          giorniAnticipo: giorniAnticipo,
        };
        await alertsApi.create(createDto);
        success('Alert creato con successo');
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
      title: 'Elimina alert',
      message: 'Sei sicuro di voler eliminare questo alert?',
      confirmText: 'Elimina',
      variant: 'danger',
    })) {
      try {
        await alertsApi.delete(id);
        success('Alert eliminato con successo');
        loadData();
      } catch (err: any) {
        toastError('Errore durante l\'eliminazione', 'Errore');
      }
    }
  };

  const handleToggleActive = async (alert: Alert) => {
    try {
      if (alert.attivo) {
        await alertsApi.deactivate(alert.id);
        success('Alert disattivato');
      } else {
        await alertsApi.reactivate(alert.id);
        success('Alert riattivato');
      }
      loadData();
    } catch (err: any) {
      toastError('Errore durante l\'operazione', 'Errore');
    }
  };

  const handleChiudi = async (id: string) => {
    if (await confirm({
      title: 'Chiudi alert',
      message: 'Confermi la chiusura di questo alert?',
      confirmText: 'Chiudi',
      variant: 'warning',
    })) {
      try {
        await alertsApi.chiudi(id);
        success('Alert chiuso con successo');
        loadData();
        setShowChatModal(false);
      } catch (err: any) {
        toastError('Errore durante la chiusura', 'Errore');
      }
    }
  };

  const handleRiapri = async (id: string) => {
    if (await confirm({
      title: 'Prendi in gestione alert',
      message: 'Confermi di rimettere in gestione questo alert?',
      confirmText: 'Conferma',
      variant: 'warning',
    })) {
      try {
        await alertsApi.riapri(id);
        success('Alert rimesso in gestione');
        loadData();
      } catch (err: any) {
        toastError('Errore durante la riapertura', 'Errore');
      }
    }
  };

  const handleOpenChat = (alert: Alert) => {
    setSelectedAlert(alert);
    setNuovoMessaggio('');
    setShowChatModal(true);
  };

  const handleSendMessage = async () => {
    if (!selectedAlert || !nuovoMessaggio.trim()) return;

    try {
      const updatedAlert = await alertsApi.addMessaggio(selectedAlert.id, {
        autore: 'studio',
        testo: nuovoMessaggio,
      });

      setSelectedAlert(updatedAlert);
      setNuovoMessaggio('');
      success('Messaggio inviato');
      loadData();
    } catch (err: any) {
      toastError('Errore durante l\'invio del messaggio', 'Errore');
    }
  };

  const getGiorniRimanenti = (dataScadenza: Date) => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const scadenza = new Date(dataScadenza);
    scadenza.setHours(0, 0, 0, 0);
    return Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
  };

  const praticheOptions = pratiche
    .filter(p => p.attivo && p.aperta)
    .map(p => ({
      value: p.id,
      label: `${p.cliente?.ragioneSociale || 'N/D'} vs ${getDebitoreDisplayName(p.debitore)}`,
      sublabel: `Capitale: € ${p.capitale?.toLocaleString('it-IT')}`,
    }));

  const destinatarioOptions = [
    { value: 'studio', label: 'Studio Legale' },
    { value: 'cliente', label: 'Cliente' },
  ];

  const modalitaNotificaOptions = [
    { value: 'popup', label: 'Popup in app' },
  ];

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="space-y-1.5">
          <span className="wow-chip">Gestione</span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">Alert & Scadenze</h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Monitora alert e scadenze con una vista immediata delle priorità.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="wow-button"
        >
          <Plus className="h-4 w-4" />
          Nuovo Alert
        </button>
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
              {(['tutti', 'in_gestione', 'chiuso'] as FiltroStato[]).map((stato) => (
                <button
                  key={stato}
                  onClick={() => setFiltroStato(stato)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    filtroStato === stato
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {stato === 'tutti' ? 'Tutti' : stato === 'in_gestione' ? 'In gestione' : 'Chiusi'}
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

      {/* Alerts List */}
      <div className="space-y-3 wow-stagger">
        {loading && (!alerts || alerts.length === 0) ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Caricamento...</span>
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="wow-panel py-12 text-center text-slate-400">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Nessun alert presente</p>
          </div>
        ) : (
          (alerts || [])
            .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
            .map((alert) => {
            const giorniRimanenti = getGiorniRimanenti(alert.dataScadenza);
            const isScaduto = giorniRimanenti < 0;
            const isInScadenza = giorniRimanenti >= 0 && giorniRimanenti <= alert.giorniAnticipo;

            return (
              <div
                key={alert.id}
                className={`wow-panel border-l-4 p-4 transition-all ${
                  !alert.attivo
                    ? 'opacity-50 border-l-slate-300'
                    : alert.stato === 'chiuso'
                    ? 'border-l-slate-300'
                    : isScaduto
                    ? 'border-l-rose-400'
                    : isInScadenza
                    ? 'border-l-amber-400'
                    : 'border-l-indigo-400'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {alert.titolo}
                      </h3>

                      {/* Badges */}
                      <div className="flex items-center gap-2">
                        {isScaduto && alert.stato === 'in_gestione' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400">
                            <AlertTriangle className="h-3 w-3" />
                            Scaduto
                          </span>
                        )}
                        {isInScadenza && !isScaduto && alert.stato === 'in_gestione' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            In scadenza
                          </span>
                        )}
                        {alert.stato === 'in_gestione' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                            <Clock className="h-3 w-3" />
                            In gestione
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            <CheckCircle className="h-3 w-3" />
                            Chiuso
                          </span>
                        )}
                        {!alert.attivo && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                            Disattivato
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      {alert.descrizione}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Scadenza: {new Date(alert.dataScadenza).toLocaleDateString('it-IT')}
                        {giorniRimanenti >= 0 && ` (${giorniRimanenti} giorni)`}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Per: {alert.destinatario === 'studio' ? 'Studio Legale' : 'Cliente'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {alert.messaggi?.length || 0} messaggi
                      </span>
                    </div>

                    {(alert.pratica || alert.creatoDa) && (
                      <div className="flex items-center justify-between mt-2">
                        {alert.pratica && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            <strong>Pratica:</strong> {alert.pratica.cliente?.ragioneSociale} vs{' '}
                            {getDebitoreDisplayName(alert.pratica.debitore)}
                          </p>
                        )}
                        {alert.creatoDa && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic ml-auto">
                            Creato da: <span className="font-semibold">{alert.creatoDa}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenChat(alert)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                      title="Chat"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>

                    {canManageAlertStatus && alert.stato === 'in_gestione' && (
                      <button
                        onClick={() => handleChiudi(alert.id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                        title="Chiudi alert"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}

                    {canManageAlertStatus && alert.stato === 'chiuso' && (
                      <button
                        onClick={() => handleRiapri(alert.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/50"
                        title="Riapri alert"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleEdit(alert)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                      title="Modifica"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleToggleActive(alert)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg dark:text-amber-400 dark:hover:bg-amber-900/50"
                      title={alert.attivo ? 'Disattiva' : 'Riattiva'}
                    >
                      {alert.attivo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg dark:text-rose-400 dark:hover:bg-rose-900/50"
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil((alerts?.length || 0) / ITEMS_PER_PAGE)}
          totalItems={alerts?.length || 0}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modal Form */}
      {showModal && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              setSubmitAttempted(false);
            }}
          />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {isEditing ? 'Modifica Alert' : 'Nuovo Alert'}
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
                  Pratica *
                </label>
                <CustomSelect
                  options={praticheOptions}
                  value={formData.praticaId}
                  onChange={(value) => setFormData({ ...formData, praticaId: value })}
                  placeholder="Seleziona pratica..."
                  triggerClassName={
                    submitAttempted && !formData.praticaId
                      ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                      : ''
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={formData.titolo}
                  onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                  required
                  className={[
                    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
                    submitAttempted && !formData.titolo ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                  ].join(' ')}
                  placeholder="Es: Scadenza deposito ricorso"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows={3}
                  required
                  className={[
                    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
                    submitAttempted && !formData.descrizione ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                  ].join(' ')}
                  placeholder="Descrizione dettagliata dell'alert..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Destinatario *
                  </label>
                <CustomSelect
                  options={destinatarioOptions}
                  value={formData.destinatario}
                  onChange={(value) => setFormData({ ...formData, destinatario: value as 'studio' | 'cliente' })}
                />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Giorni anticipo notifica
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.giorniAnticipo}
                    onChange={(e) => setFormData({ ...formData, giorniAnticipo: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Modalità notifica
                </label>
                <CustomSelect
                  options={modalitaNotificaOptions}
                  value={formData.modalitaNotifica as AlertModalitaNotifica}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      modalitaNotifica: value as AlertModalitaNotifica,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data scadenza *
                </label>
                <DateField
                  value={typeof formData.dataScadenza === 'string' ? formData.dataScadenza : ''}
                  onChange={(value) => setFormData({ ...formData, dataScadenza: value })}
                  placeholder="Seleziona data scadenza"
                  min={new Date().toISOString().split('T')[0]}
                  className={submitAttempted && !formData.dataScadenza ? 'border-rose-400' : ''}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  La data di scadenza non può essere nel passato
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowModal(false)}
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
      {showChatModal && selectedAlert && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowChatModal(false)} />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Chat - {selectedAlert.titolo}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Stato: {selectedAlert.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'}
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
              {selectedAlert.messaggi && selectedAlert.messaggi.length > 0 ? (
                selectedAlert.messaggi.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.autore === 'studio' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.autore === 'studio'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1">
                        {msg.autore === 'studio' ? 'Studio' : 'Cliente'}
                      </p>
                      <p className="text-sm">{msg.testo}</p>
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
            {selectedAlert.stato === 'in_gestione' && (
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

            {/* Footer con azione chiusura */}
            {selectedAlert.stato === 'in_gestione' && (
              <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Solo lo studio legale può chiudere l'alert
                </p>
                {canManageAlertStatus && (
                  <button
                    onClick={() => handleChiudi(selectedAlert.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Chiudi Alert
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </BodyPortal>
      )}

      <ConfirmDialog />
    </div>
  );
}
