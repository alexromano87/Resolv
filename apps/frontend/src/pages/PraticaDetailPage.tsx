// apps/frontend/src/pages/PraticaDetailPage.tsx
import { useState, useEffect, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Save, ChevronRight, ChevronDown, RefreshCw, ArrowLeft,
  Power, PowerOff, Trash2, ArrowRight, RotateCcw, Building2, User,
  Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle, MessageSquare, Banknote,
  CalendarDays, Calendar, StickyNote, History, FileEdit, Edit, Briefcase, Receipt,
  Folder, Upload, Download, Send, X, Plus, Bell, Ticket as TicketIcon, GanttChart,
  FileDown, Move, Search, Check, Layers,
} from 'lucide-react';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DateField } from '../components/ui/DateField';
import { CollaboratoriMultiSelect } from '../components/ui/CollaboratoriMultiSelect';
import { AvvocatiMultiSelect } from '../components/ui/AvvocatiMultiSelect';
import { useToast } from '../components/ui/ToastProvider';
import { BodyPortal } from '../components/ui/BodyPortal';
import { PianoAmmortamento } from '../components/PianoAmmortamento';
import { useAuth } from '../contexts/AuthContext';
import { pianiAmmortamentoApi } from '../api/piani-ammortamento';
import {
  fetchPratica,
  updatePratica,
  cambiaFasePratica,
  deactivatePratica,
  reactivatePratica,
  deletePratica,
  riapriPratica,
  formatCurrency,
  getDebitoreDisplayName,
  calcolaInteressiPratica,
  type Pratica,
  type StoricoFase,
  type CambiaFasePayload,
  type EsitoOpposizione,
  type TipoPignoramento,
  type EsitoPignoramento,
  type CalcoloInteressiResponse,
} from '../api/pratiche';
import { fetchFasi, type Fase } from '../api/fasi';
import {
  movimentiFinanziariApi,
  getTipoMovimentoLabel,
  isRecupero,
  type MovimentoFinanziario,
  type TipoMovimento,
} from '../api/movimenti-finanziari';
import { ApiError } from '../api/config';
import { documentiApi, type Documento, type TipologiaDocumento } from '../api/documenti';
import { avvocatiApi, type Avvocato } from '../api/avvocati';
import {
  alertsApi,
  type Alert,
} from '../api/alerts';
import {
  ticketsApi,
  type Ticket,
  type TicketPriorita,
  type CreateTicketDto,
} from '../api/tickets';
import { collaboratoriApi } from '../api/collaboratori';
import { studiApi, type Studio } from '../api/studi';
import type { User as UserAccount } from '../api/auth';
import { cartelleApi, type Cartella, type TipologiaCartella } from '../api/cartelle';

type DetailTab = 'overview' | 'financials' | 'movimenti' | 'documenti' | 'alerts' | 'tickets' | 'chat' | 'storico' | 'gantt';

const formatoItalianoANumero = (valore: string): number => {
  if (!valore) return 0;
  return parseFloat(String(valore).replace(/\./g, '').replace(',', '.')) || 0;
};

const numeroAFormatoItaliano = (valore: number | string | undefined): string => {
  if (valore === undefined || valore === null || valore === '' || valore === 0) return '';
  const numero = typeof valore === 'string' ? parseFloat(valore) : valore;
  if (isNaN(numero) || numero === 0) return '';
  return numero.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isValidUuid = (id?: string) =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const ESITO_OPPOSIZIONE_LABELS: Record<EsitoOpposizione, string> = {
  rigetto: 'Rigetto opposizione',
  accoglimento_parziale: 'Accoglimento parziale',
  accoglimento_totale: 'Accoglimento totale',
};

const TIPO_PIGNORAMENTO_LABELS: Record<TipoPignoramento, string> = {
  mobiliare_debitore: 'Mobiliare presso debitore',
  mobiliare_terzi: 'Mobiliare presso terzi',
  immobiliare: 'Immobiliare',
};

const ESITO_PIGNORAMENTO_LABELS: Record<EsitoPignoramento, string> = {
  iscrizione_a_ruolo: 'Iscrizione a ruolo',
  desistenza: 'Desistenza',
  opposizione: 'Opposizione',
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return 'N/D';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/D';
  return date.toLocaleDateString('it-IT');
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return 'N/D';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/D';
  return date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
};

export function PraticaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { user } = useAuth();
  const canManageAlertStatus = user?.ruolo !== 'cliente';
  const canChangeFase = user?.ruolo !== 'segreteria';
  const { success, error: toastError, info: toastInfo } = useToast();
  const uploadLimitMb = Number(import.meta.env.VITE_UPLOAD_DOCUMENT_MAX_MB ?? '50');
  const uploadLimitBytes = uploadLimitMb * 1024 * 1024;

  // Data states
  const [pratica, setPratica] = useState<Pratica | null>(null);
  const [fasi, setFasi] = useState<Fase[]>([]);
  const [collaboratori, setCollaboratori] = useState<UserAccount[]>([]);
  const [avvocati, setAvvocati] = useState<Avvocato[]>([]);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCollaboratori, setLoadingCollaboratori] = useState(true);
  const [loadingAvvocati, setLoadingAvvocati] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // Editing states for individual fields
  const [isEditingAvvocati, setIsEditingAvvocati] = useState(false);
  const [savingAvvocati, setSavingAvvocati] = useState(false);
  const [tempAvvocatiIds, setTempAvvocatiIds] = useState<string[]>([]);

  const [isEditingCollaboratori, setIsEditingCollaboratori] = useState(false);
  const [savingCollaboratori, setSavingCollaboratori] = useState(false);
  const [tempCollaboratoriIds, setTempCollaboratoriIds] = useState<string[]>([]);

  const [isEditingDataAffidamento, setIsEditingDataAffidamento] = useState(false);
  const [savingDataAffidamento, setSavingDataAffidamento] = useState(false);
  const [tempDataAffidamento, setTempDataAffidamento] = useState('');

  // Note editing states
  const [isEditingNotePratica, setIsEditingNotePratica] = useState(false);
  const [savingNotePratica, setSavingNotePratica] = useState(false);
  const [tempNotePratica, setTempNotePratica] = useState('');

  const [isEditingNoteFase, setIsEditingNoteFase] = useState(false);
  const [savingNoteFase, setSavingNoteFase] = useState(false);
  const [tempNoteFase, setTempNoteFase] = useState('');

  // Ripresa interessi states
  const [showRiprendiInteressi, setShowRiprendiInteressi] = useState(false);
  const [nuovaDataInizioInteressi, setNuovaDataInizioInteressi] = useState('');

  // Cambio fase states
  const [showCambioFase, setShowCambioFase] = useState(false);
  const [savingCambioFase, setSavingCambioFase] = useState(false);
  const [cambioFaseData, setCambioFaseData] = useState<CambiaFasePayload>({
    nuovaFaseId: '',
    note: '',
  });

  // Storico fase modal
  const [selectedStoricoFase, setSelectedStoricoFase] = useState<StoricoFase | null>(null);

  // Storico espansione dettagli
  const [expandedFaseIndex, setExpandedFaseIndex] = useState<number | null>(null);

  // Movimenti states
  const [movimenti, setMovimenti] = useState<MovimentoFinanziario[]>([]);
  const [loadingMovimenti, setLoadingMovimenti] = useState(false);
  const [showMovimentoForm, setShowMovimentoForm] = useState(false);
  const [editingMovimento, setEditingMovimento] = useState<MovimentoFinanziario | null>(null);
  const [movimentiFiltro, setMovimentiFiltro] = useState<
    'tutto' | 'capitale' | 'compensi' | 'interessi' | 'anticipazioni' | 'altro'
  >('tutto');
  const [movimentoForm, setMovimentoForm] = useState({
    tipo: '' as TipoMovimento | '',
    importo: '',
    data: new Date().toISOString().split('T')[0],
    oggetto: '',
  });
  const [pianoPresente, setPianoPresente] = useState(false);
  const [showPianoModal, setShowPianoModal] = useState(false);
  const [openPianoCreate, setOpenPianoCreate] = useState(false);

  // Documenti states
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [allDocumenti, setAllDocumenti] = useState<Documento[]>([]);
  const [cartelle, setCartelle] = useState<Cartella[]>([]);
  const [allCartelle, setAllCartelle] = useState<Cartella[]>([]);
  const [currentCartellaId, setCurrentCartellaId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Cartella[]>([]);
  const [documentiSearch, setDocumentiSearch] = useState('');
  const [selectedTipologia, setSelectedTipologia] = useState<TipologiaDocumento | null>(null);
  const [loadingDocumenti, setLoadingDocumenti] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTipologia, setUploadTipologia] = useState<TipologiaDocumento | ''>('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Cartella | null>(null);
  const [folderNome, setFolderNome] = useState('');
  const [folderDescrizione, setFolderDescrizione] = useState('');
  const [folderColore, setFolderColore] = useState('#3b82f6');
  const [folderTipologia, setFolderTipologia] = useState<TipologiaCartella | ''>('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [documentoDaSpostare, setDocumentoDaSpostare] = useState<Documento | null>(null);
  const [targetCartellaId, setTargetCartellaId] = useState<string>('');
  const handlePraticaFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setUploadFile(null);
      return;
    }

    if (file.size > uploadLimitBytes) {
      toastError(`Il file supera il limite massimo di ${uploadLimitMb} MB`);
      setUploadFile(null);
      event.target.value = '';
      return;
    }

    setUploadFile(file);
  };

  // Alert states
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertChatInput, setAlertChatInput] = useState('');

  // Ticket states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketFormSubmitted, setTicketFormSubmitted] = useState(false);
  const [ticketForm, setTicketForm] = useState<CreateTicketDto>({
    praticaId: id || '',
    oggetto: '',
    descrizione: '',
    autore: 'studio',
    priorita: 'normale' as TicketPriorita,
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketChatInput, setTicketChatInput] = useState('');

  // Chat states
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; text: string; sender: string; timestamp: Date }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Interest calculation state
  const [interessiCalcolati, setInteressiCalcolati] = useState<CalcoloInteressiResponse | null>(null);

  const calculateMovimentiTotals = (lista: MovimentoFinanziario[] = []) =>
    lista.reduce(
      (acc, m) => {
        const importo = Number(m.importo) || 0;
        const tipo = String(m.tipo);

        switch (tipo) {
          case 'capitale':
          case 'capitale_originario':
            acc.capitaleOriginario += importo;
            break;
          case 'nuovo_capitale':
            acc.nuovoCapitale += importo;
            break;
          case 'anticipazione':
          case 'anticipazioni':
            acc.anticipazioni += importo;
            break;
          case 'compenso':
          case 'compensi':
            acc.compensi += importo;
            break;
          case 'interessi':
            acc.interessi += importo;
            break;
          case 'altro':
            acc.altro += importo;
            break;
          case 'recupero_capitale':
            acc.recuperoCapitale += importo;
            break;
          case 'recupero_anticipazione':
          case 'recupero_anticipazioni':
            acc.recuperoAnticipazioni += importo;
            break;
          case 'recupero_compenso':
          case 'recupero_compensi':
            acc.recuperoCompensi += importo;
            break;
          case 'recupero_interessi':
            acc.recuperoInteressi += importo;
            break;
          case 'recupero_altro':
            acc.altroRecuperato += importo;
            break;
          default:
            break;
        }
        return acc;
      },
      {
        capitaleOriginario: 0,
        nuovoCapitale: 0,
        anticipazioni: 0,
        compensi: 0,
        interessi: 0,
        altro: 0,
        recuperoCapitale: 0,
        recuperoAnticipazioni: 0,
        recuperoCompensi: 0,
        recuperoInteressi: 0,
        altroRecuperato: 0,
      }
    );

  // Load initial data
  useEffect(() => {
    if (id) {
      loadPratica();
      loadFasi();
      loadCollaboratori();
      loadAvvocati();
    }
  }, [id]);

  useEffect(() => {
    setCurrentCartellaId(null);
    setBreadcrumb([]);
    setDocumentiSearch('');
    setCartelle([]);
    setDocumenti([]);
    setAllDocumenti([]);
  }, [id]);

  // Load related data when pratica changes
  useEffect(() => {
    if (pratica) {
      loadMovimenti();
      loadDocumenti();
      loadAlerts();
      loadTickets();
      refreshPianoPresente();
    }
  }, [pratica?.id]);

  useEffect(() => {
    const loadStudio = async () => {
      if (!pratica?.studioId) {
        setStudio(null);
        return;
      }
      try {
        const data = await studiApi.getOne(pratica.studioId);
        setStudio(data);
      } catch (err) {
        console.error('Errore caricamento studio:', err);
        setStudio(null);
      }
    };

    loadStudio();
  }, [pratica?.studioId]);

  // Load interest calculation from backend when pratica is loaded
  useEffect(() => {
    if (pratica?.applicaInteressi && pratica.id) {
      calcolaInteressiPratica(pratica.id)
        .then(setInteressiCalcolati)
        .catch(err => console.error('Errore calcolo interessi:', err));
    } else {
      setInteressiCalcolati(null);
    }
  }, [pratica?.id, pratica?.applicaInteressi]);

  const refreshPianoPresente = async () => {
    const targetId = pratica?.id || id;
    if (!targetId) return;
    try {
      const pianoData = await pianiAmmortamentoApi.getPianoByPratica(targetId);
      setPianoPresente(!!pianoData);
    } catch (error) {
      console.error('Errore caricamento piano ammortamento:', error);
      setPianoPresente(false);
    }
  };

  const loadPratica = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPratica(id);
      setPratica(data);
    } catch (err) {
      console.error('Errore caricamento pratica:', err);
      setError('Impossibile caricare la pratica');
    } finally {
      setLoading(false);
    }
  };

  const loadFasi = async () => {
    try {
      const data = await fetchFasi();
      setFasi(data);
    } catch (err) {
      console.error('Errore caricamento fasi:', err);
    }
  };

  const loadCollaboratori = async () => {
    try {
      setLoadingCollaboratori(true);
      const data = await collaboratoriApi.getAll(true);
      setCollaboratori(data);
    } catch (err) {
      console.error('Errore caricamento collaboratori:', err);
    } finally {
      setLoadingCollaboratori(false);
    }
  };

  const loadAvvocati = async () => {
    try {
      setLoadingAvvocati(true);
      const data = await avvocatiApi.getAll(true);
      setAvvocati(data);
    } catch (err) {
      console.error('Errore caricamento avvocati:', err);
    } finally {
      setLoadingAvvocati(false);
    }
  };

  const loadMovimenti = async () => {
    if (!pratica) return;
    try {
      setLoadingMovimenti(true);
      const data = await movimentiFinanziariApi.getAllByPratica(pratica.id);
      setMovimenti(data);
    } catch (err) {
      console.error('Errore caricamento movimenti:', err);
    } finally {
      setLoadingMovimenti(false);
    }
  };

  const loadDocumenti = async (overrideCartellaId?: string | null, overrideTipologia?: TipologiaDocumento | null) => {
    if (!pratica) return;
    const targetCartellaId = overrideCartellaId !== undefined ? overrideCartellaId : currentCartellaId;
    const targetTipologia = overrideTipologia !== undefined ? overrideTipologia : selectedTipologia;

    try {
      setLoadingDocumenti(true);
      const [folders, docs] = await Promise.all([
        cartelleApi.getAllByPratica(pratica.id),
        documentiApi.getAllByPratica(pratica.id),
      ]);

      setAllCartelle(folders);
      setAllDocumenti(docs);

      // Se è selezionata una tipologia, filtra per quella
      if (targetTipologia) {
        const visibleDocs = docs.filter((doc) => doc.tipologia === targetTipologia && !doc.cartellaId);
        // Mostra solo le cartelle di primo livello con quella tipologia
        const visibleFolders = folders.filter((folder) => folder.tipologia === targetTipologia && !folder.cartellaParent);
        setDocumenti(visibleDocs);
        setCartelle(visibleFolders);
        setBreadcrumb([]);
        setCurrentCartellaId(null);
      } else{
        // Altrimenti usa la logica normale basata su cartella
        const visibleDocs = targetCartellaId
          ? docs.filter((doc) => doc.cartellaId === targetCartellaId)
          : docs.filter((doc) => !doc.cartellaId);
        const visibleFolders = targetCartellaId
          ? folders.filter((folder) => folder.cartellaParent?.id === targetCartellaId)
          : folders.filter((folder) => !folder.cartellaParent);

        setDocumenti(visibleDocs);
        setCartelle(visibleFolders);

        if (targetCartellaId) {
          const ancestors = await cartelleApi.getAncestors(targetCartellaId);
          setBreadcrumb(ancestors.reverse());
          setCurrentCartellaId(targetCartellaId);
        } else {
          setBreadcrumb([]);
          setCurrentCartellaId(null);
        }
      }
    } catch (err) {
      console.error('Errore caricamento documenti/cartelle:', err);
    } finally {
      setLoadingDocumenti(false);
    }
  };

  const loadAlerts = async () => {
    if (!pratica) return;
    try {
      setLoadingAlerts(true);
      const data = await alertsApi.getAllByPratica(pratica.id);
      setAlerts(data);
    } catch (err) {
      console.error('Errore caricamento alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const loadTickets = async () => {
    if (!pratica) return;
    try {
      setLoadingTickets(true);
      const data = await ticketsApi.getAllByPratica(pratica.id);
      setTickets(data);
    } catch (err) {
      console.error('Errore caricamento tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Handlers for Avvocati
  const handleStartEditAvvocati = () => {
    if (!pratica) return;
    setTempAvvocatiIds(pratica.avvocati?.map((a) => a.id) || []);
    setIsEditingAvvocati(true);
  };

  const handleCancelEditAvvocati = () => {
    setIsEditingAvvocati(false);
    setTempAvvocatiIds([]);
  };

  const handleSaveAvvocati = async () => {
    if (!pratica) return;
    try {
      setSavingAvvocati(true);
      await updatePratica(pratica.id, { avvocatiIds: tempAvvocatiIds });
      success('Avvocati aggiornati');
      await loadPratica();
      setIsEditingAvvocati(false);
      setTempAvvocatiIds([]);
    } catch (err) {
      console.error('Errore aggiornamento avvocati:', err);
      toastError('Errore durante il salvataggio');
    } finally {
      setSavingAvvocati(false);
    }
  };

  // Handlers for Collaboratori
  const handleStartEditCollaboratori = () => {
    if (!pratica) return;
    setTempCollaboratoriIds(pratica.collaboratori?.map((c) => c.id) || []);
    setIsEditingCollaboratori(true);
  };

  const handleCancelEditCollaboratori = () => {
    setIsEditingCollaboratori(false);
    setTempCollaboratoriIds([]);
  };

  const handleSaveCollaboratori = async () => {
    if (!pratica) return;
    try {
      setSavingCollaboratori(true);
      await updatePratica(pratica.id, { collaboratoriIds: tempCollaboratoriIds });
      success('Collaboratori aggiornati');
      await loadPratica();
      setIsEditingCollaboratori(false);
      setTempCollaboratoriIds([]);
    } catch (err) {
      console.error('Errore aggiornamento collaboratori:', err);
      toastError('Errore durante il salvataggio');
    } finally {
      setSavingCollaboratori(false);
    }
  };

  // Handlers for Data Affidamento
  const handleStartEditDataAffidamento = () => {
    if (!pratica) return;
    setTempDataAffidamento(pratica.dataAffidamento || '');
    setIsEditingDataAffidamento(true);
  };

  const handleCancelEditDataAffidamento = () => {
    setIsEditingDataAffidamento(false);
    setTempDataAffidamento('');
  };

  const handleSaveDataAffidamento = async () => {
    if (!pratica) return;
    try {
      setSavingDataAffidamento(true);
      await updatePratica(pratica.id, { dataAffidamento: tempDataAffidamento });
      success('Data affidamento aggiornata');
      await loadPratica();
      setIsEditingDataAffidamento(false);
      setTempDataAffidamento('');
    } catch (err) {
      console.error('Errore aggiornamento data affidamento:', err);
      toastError('Errore durante il salvataggio');
    } finally {
      setSavingDataAffidamento(false);
    }
  };

  const handleStartEditNotePratica = () => {
    if (!pratica) return;
    setTempNotePratica(pratica.note || '');
    setIsEditingNotePratica(true);
  };

  const handleCancelEditNotePratica = () => {
    setIsEditingNotePratica(false);
    setTempNotePratica('');
  };

  const handleSaveNotePratica = async () => {
    if (!pratica) return;
    try {
      setSavingNotePratica(true);
      await updatePratica(pratica.id, { note: tempNotePratica });
      success('Note pratica salvate');
      await loadPratica();
      setIsEditingNotePratica(false);
      setTempNotePratica('');
    } catch (err) {
      console.error('Errore salvataggio note pratica:', err);
      toastError('Errore durante il salvataggio');
    } finally {
      setSavingNotePratica(false);
    }
  };

  const handleTerminaInteressi = async () => {
    if (!pratica) return;

    const proceed = await confirm({
      title: 'Terminare la maturazione degli interessi?',
      message: `Gli interessi verranno bloccati alla data di oggi (${new Date().toLocaleDateString('it-IT')}). L'importo rimarrà fisso e non aumenterà più. Vuoi continuare?`,
      confirmText: 'Termina maturazione',
      cancelText: 'Annulla',
      variant: 'warning',
    });

    if (!proceed) return;

    try {
      const oggi = new Date().toISOString().split('T')[0];
      await updatePratica(pratica.id, { dataFineMaturazione: oggi });
      success('Maturazione interessi terminata');
      await loadPratica();
      // Ricarica anche il calcolo degli interessi
      if (pratica.applicaInteressi) {
        const calcolo = await calcolaInteressiPratica(pratica.id);
        setInteressiCalcolati(calcolo);
      }
    } catch (err) {
      console.error('Errore terminazione interessi:', err);
      toastError('Errore durante la terminazione degli interessi');
    }
  };

  const handleOpenRiprendiInteressi = () => {
    if (!pratica?.dataFineMaturazione) return;
    // Imposta come default il giorno dopo la data di fine precedente
    const dataFine = new Date(pratica.dataFineMaturazione);
    dataFine.setDate(dataFine.getDate() + 1);
    setNuovaDataInizioInteressi(dataFine.toISOString().split('T')[0]);
    setShowRiprendiInteressi(true);
  };

  const handleRiprendiInteressi = async () => {
    if (!pratica || !nuovaDataInizioInteressi) return;

    try {
      await updatePratica(pratica.id, {
        dataInizioInteressi: nuovaDataInizioInteressi,
        dataFineMaturazione: undefined, // Rimuove la data fine per riprendere la maturazione
      });
      success('Maturazione interessi ripresa');
      setShowRiprendiInteressi(false);
      setNuovaDataInizioInteressi('');
      await loadPratica();
      // Ricarica anche il calcolo degli interessi
      if (pratica.applicaInteressi) {
        const calcolo = await calcolaInteressiPratica(pratica.id);
        setInteressiCalcolati(calcolo);
      }
    } catch (err) {
      console.error('Errore ripresa interessi:', err);
      toastError('Errore durante la ripresa degli interessi');
    }
  };

  const handleStartEditNoteFase = () => {
    if (!pratica) return;
    setTempNoteFase(pratica.noteFase || '');
    setIsEditingNoteFase(true);
  };

  const handleCancelEditNoteFase = () => {
    setIsEditingNoteFase(false);
    setTempNoteFase('');
  };

  const handleSaveNoteFase = async () => {
    if (!pratica) return;
    try {
      setSavingNoteFase(true);
      await updatePratica(pratica.id, { noteFase: tempNoteFase });
      success('Note fase salvate');
      await loadPratica();
      setIsEditingNoteFase(false);
      setTempNoteFase('');
    } catch (err) {
      console.error('Errore salvataggio note fase:', err);
      toastError('Errore durante il salvataggio');
    } finally {
      setSavingNoteFase(false);
    }
  };

  const handleOpenCambioFase = () => {
    setCambioFaseData({ nuovaFaseId: '', note: '' });
    setShowCambioFase(true);
  };

  const handleCloseCambioFase = () => {
    setShowCambioFase(false);
    setCambioFaseData({ nuovaFaseId: '', note: '' });
  };

  const updateCambioFaseData = (field: keyof CambiaFasePayload, value: string) => {
    setCambioFaseData((prev) => ({ ...prev, [field]: value }));
  };

  const submitCambioFase = async () => {
    if (!pratica || !cambioFaseData.nuovaFaseId) return;
    try {
      setSavingCambioFase(true);
      await cambiaFasePratica(pratica.id, cambioFaseData);
      success('Fase aggiornata');
      await loadPratica();
      handleCloseCambioFase();
    } catch (err) {
      console.error('Errore cambio fase:', err);
      toastError('Errore durante il cambio fase');
    } finally {
      setSavingCambioFase(false);
    }
  };

  const handleDeactivatePratica = async () => {
    if (!pratica) return;
    try {
      await deactivatePratica(pratica.id);
      await loadPratica();
    } catch (err) {
      console.error('Errore disattivazione pratica:', err);
    }
  };

  const handleReactivatePratica = async () => {
    if (!pratica) return;
    try {
      await reactivatePratica(pratica.id);
      await loadPratica();
    } catch (err) {
      console.error('Errore riattivazione pratica:', err);
    }
  };

  const handleDeletePratica = async () => {
    if (!pratica) return;
    try {
      await deletePratica(pratica.id);
      navigate('/pratiche');
    } catch (err) {
      console.error('Errore eliminazione pratica:', err);
    }
  };

  const handleRiapriPratica = async () => {
    if (!pratica) return;
    try {
      await riapriPratica(pratica.id);
      await loadPratica();
    } catch (err) {
      console.error('Errore riapertura pratica:', err);
    }
  };

  const handleExportReport = () => {
    if (!pratica) return;
    if (pratica.aperta) {
      toastInfo('Il report PDF è disponibile solo a pratica chiusa.', 'Report pratica');
      return;
    }

    const clienteNome = pratica.cliente?.ragioneSociale || 'N/D';
    const debitoreNome = getDebitoreDisplayName(pratica.debitore);
    const avvocatiNomi = pratica.avvocati?.length
      ? pratica.avvocati.map((avvocato) => `${avvocato.nome} ${avvocato.cognome}`).join(', ')
      : 'N/D';
    const collaboratoriNomi = pratica.collaboratori?.length
      ? pratica.collaboratori
          .map((collaboratore) => `${collaboratore.nome ?? ''} ${collaboratore.cognome ?? ''}`.trim())
          .filter(Boolean)
          .join(', ')
      : 'N/D';
    const studioNome = studio?.ragioneSociale || studio?.nome || 'N/D';
    const studioIndirizzo = [
      studio?.indirizzo,
      studio?.cap,
      studio?.citta,
      studio?.provincia,
    ]
      .filter(Boolean)
      .join(' ');
    const studioContatti = [studio?.telefono, studio?.email].filter(Boolean).join(' • ') || 'N/D';
    const responsabileNome =
      pratica.avvocati?.length && pratica.avvocati[0]
        ? `${pratica.avvocati[0].nome} ${pratica.avvocati[0].cognome}`
        : user
          ? `${user.nome} ${user.cognome}`
          : 'N/D';
    const faseChiusuraId = fasi.find((fase) => fase.isFaseChiusura)?.id;
    const noteChiusura =
      pratica.storico?.slice().reverse().find((fase) => fase.faseId === faseChiusuraId)?.note || 'N/D';
    const logoUrl = `${window.location.origin}/icona_resolv.png`;

    const importi = [
      { label: 'Capitale affidato', value: formatCurrency(pratica.capitale) },
      { label: 'Capitale recuperato', value: formatCurrency(pratica.importoRecuperatoCapitale) },
      { label: 'Capitale da recuperare', value: formatCurrency((pratica.capitale || 0) - (pratica.importoRecuperatoCapitale || 0)) },
      { label: 'Anticipazioni affidate', value: formatCurrency(pratica.anticipazioni) },
      { label: 'Anticipazioni recuperate', value: formatCurrency(pratica.importoRecuperatoAnticipazioni) },
      { label: 'Anticipazioni da recuperare', value: formatCurrency((pratica.anticipazioni || 0) - (pratica.importoRecuperatoAnticipazioni || 0)) },
      { label: 'Compensi legali affidati', value: formatCurrency(pratica.compensiLegali) },
      { label: 'Compensi legali liquidati', value: formatCurrency(pratica.compensiLiquidati) },
      { label: 'Compensi legali da liquidare', value: formatCurrency((pratica.compensiLegali || 0) - (pratica.compensiLiquidati || 0)) },
      { label: 'Interessi affidati', value: formatCurrency(pratica.interessi) },
      { label: 'Interessi recuperati', value: formatCurrency(pratica.interessiRecuperati) },
      { label: 'Interessi da recuperare', value: formatCurrency((pratica.interessi || 0) - (pratica.interessiRecuperati || 0)) },
    ];

    const storicoRows = pratica.storico?.length
      ? pratica.storico
          .map(
            (fase) =>
              `<tr>
                <td>${fase.faseNome}</td>
                <td>${formatDate(fase.dataInizio)}</td>
                <td>${formatDate(fase.dataFine)}</td>
                <td>${fase.note ? fase.note : '-'}</td>
              </tr>`,
          )
          .join('')
      : `<tr><td colspan="4">Nessuno storico disponibile</td></tr>`;

    const movimentiRows = movimenti.length
      ? movimenti
          .map(
            (movimento) =>
              `<tr>
                <td>${formatDate(movimento.data)}</td>
                <td>${getTipoMovimentoLabel(movimento.tipo)}</td>
                <td>${movimento.oggetto || '-'}</td>
                <td>${formatCurrency(movimento.importo)}</td>
              </tr>`,
          )
          .join('')
      : `<tr><td colspan="4">Nessun movimento registrato</td></tr>`;

    const documentiRows = allDocumenti.length
      ? allDocumenti
          .map(
            (doc) =>
              `<tr>
                <td>${doc.nome}</td>
                <td>${doc.tipo.toUpperCase()}</td>
                <td>${doc.cartella?.nome || '-'}</td>
                <td>${formatDate(doc.dataCreazione)}</td>
              </tr>`,
          )
          .join('')
      : `<tr><td colspan="4">Nessun documento disponibile</td></tr>`;

    const alertsRows = alerts.length
      ? alerts
          .map(
            (alert) =>
              `<tr>
                <td>${alert.titolo}</td>
                <td>${alert.stato}</td>
                <td>${formatDate(alert.dataScadenza)}</td>
                <td>${alert.descrizione || '-'}</td>
              </tr>`,
          )
          .join('')
      : `<tr><td colspan="4">Nessun alert registrato</td></tr>`;

    const ticketsRows = tickets.length
      ? tickets
          .map(
            (ticket) =>
              `<tr>
                <td>${ticket.numeroTicket || '—'}</td>
                <td>${ticket.oggetto}</td>
                <td>${ticket.stato}</td>
                <td>${ticket.priorita}</td>
              </tr>`,
          )
          .join('')
      : `<tr><td colspan="4">Nessun ticket registrato</td></tr>`;

    const reportHtml = `<!doctype html>
      <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <title>Report pratica ${pratica.id.slice(0, 8)}</title>
        <style>
          @page { margin: 24mm; }
          body { font-family: "Roboto Flex", "Segoe UI", Arial, sans-serif; color: #0f172a; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; margin: 24px 0 8px; color: #1e293b; }
          p { margin: 0 0 6px; font-size: 12px; }
          .meta { font-size: 11px; color: #475569; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 6px 4px; vertical-align: top; }
          th { background: #f8fafc; font-weight: 600; }
          .section-note { font-size: 10px; color: #64748b; margin-top: 6px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
          .studio-logo { display: inline-flex; align-items: center; justify-content: center; width: 78px; height: 78px; border-radius: 16px; background: #ffffff; border: 1px solid #e2e8f0; overflow: hidden; }
          .studio-logo img { width: 100%; height: 100%; object-fit: contain; background: #ffffff; }
          .studio-block { display: flex; align-items: center; gap: 12px; }
          .signature { margin-top: 12px; border-top: 1px dashed #cbd5f5; padding-top: 12px; }
          .signature-line { margin-top: 16px; border-bottom: 1px solid #0f172a; width: 240px; height: 18px; }
        </style>
      </head>
      <body>
        <header>
          <div class="header">
            <div>
              <div class="badge">Report pratica chiusa</div>
              <h1>${clienteNome} vs ${debitoreNome}</h1>
              <p class="meta">Numero Pratica: ${pratica.numeroPratica || 'N/D'} • Fase: ${getFaseById(pratica.faseId)?.nome || 'N/D'} • Generato: ${formatDateTime(new Date())}</p>
            </div>
            <div class="studio-block">
              <div class="studio-logo">
                <img src="${logoUrl}" alt="Logo Resolv" />
              </div>
              <div>
                <p><strong>${studioNome}</strong></p>
                <p class="meta">${studioIndirizzo || 'Indirizzo non disponibile'}</p>
                <p class="meta">${studioContatti}</p>
              </div>
            </div>
          </div>
        </header>

        <section class="grid" style="margin-top: 16px;">
          <div class="card">
            <h2>Riepilogo pratica</h2>
            <p><strong>Cliente:</strong> ${clienteNome}</p>
            <p><strong>Debitore:</strong> ${debitoreNome}</p>
            <p><strong>Riferimento credito:</strong> ${pratica.riferimentoCredito || 'N/D'}</p>
            <p><strong>Data affidamento:</strong> ${formatDate(pratica.dataAffidamento)}</p>
            <p><strong>Data chiusura:</strong> ${formatDate(pratica.dataChiusura)}</p>
            <p><strong>Esito:</strong> ${pratica.esito || 'N/D'}</p>
            <p><strong>Note:</strong> ${pratica.note || 'N/D'}</p>
          </div>
          <div class="card">
            <h2>Assegnazioni</h2>
            <p><strong>Avvocati:</strong> ${avvocatiNomi}</p>
            <p><strong>Collaboratori:</strong> ${collaboratoriNomi}</p>
            <p><strong>Studio:</strong> ${pratica.studioId || 'N/D'}</p>
            <p><strong>Ultimo aggiornamento:</strong> ${formatDateTime(pratica.updatedAt)}</p>
          </div>
        </section>

        <section class="card">
          <h2>Riepilogo importi</h2>
          <div class="grid">
            ${importi.map((item) => `<p><strong>${item.label}:</strong> ${item.value}</p>`).join('')}
          </div>
        </section>

        <section class="card">
          <h2>Note finali e outcome legale</h2>
          <div class="grid">
            <div>
              <p><strong>Outcome legale:</strong> ${pratica.esito || 'N/D'}</p>
              <p><strong>Stato finale pratica:</strong> Chiusa</p>
              <p><strong>Data chiusura:</strong> ${formatDate(pratica.dataChiusura)}</p>
            </div>
            <div>
              <p><strong>Note finali:</strong> ${noteChiusura}</p>
            </div>
          </div>
          <div class="signature">
            <p class="meta">Responsabile pratica</p>
            <p><strong>${responsabileNome}</strong></p>
            <div class="signature-line"></div>
          </div>
        </section>

        <section class="card">
          <h2>Timeline fasi</h2>
          <table>
            <thead>
              <tr>
                <th>Fase</th>
                <th>Inizio</th>
                <th>Fine</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${storicoRows}
            </tbody>
          </table>
        </section>

        <section class="card">
          <h2>Movimenti finanziari</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Oggetto</th>
                <th>Importo</th>
              </tr>
            </thead>
            <tbody>
              ${movimentiRows}
            </tbody>
          </table>
        </section>

        <section class="card">
          <h2>Documenti</h2>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Cartella</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${documentiRows}
            </tbody>
          </table>
          <p class="section-note">Totale documenti: ${allDocumenti.length}</p>
        </section>

        <section class="card">
          <h2>Alert</h2>
          <table>
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Stato</th>
                <th>Scadenza</th>
                <th>Descrizione</th>
              </tr>
            </thead>
            <tbody>
              ${alertsRows}
            </tbody>
          </table>
        </section>

        <section class="card">
          <h2>Ticket</h2>
          <table>
            <thead>
              <tr>
                <th>Numero</th>
                <th>Oggetto</th>
                <th>Stato</th>
                <th>Priorità</th>
              </tr>
            </thead>
            <tbody>
              ${ticketsRows}
            </tbody>
          </table>
        </section>
      </body>
      </html>`;

    const reportWindow = window.open('', '_blank', 'width=960,height=1000');
    if (!reportWindow) {
      toastError('Impossibile aprire la finestra di stampa. Verifica il blocco popup.', 'Report pratica');
      return;
    }
    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  // Movimenti handlers
  const handleSaveMovimento = async () => {
    if (!pratica || !movimentoForm.tipo) {
      toastError('Seleziona il tipo di movimento');
      return;
    }

    const importo = formatoItalianoANumero(movimentoForm.importo);
    if (importo <= 0) {
      toastError('Inserisci un importo valido');
      return;
    }

    const conferma = await confirm({
      title: editingMovimento ? 'Modifica movimento' : 'Crea movimento',
      message: editingMovimento
        ? 'Confermi di salvare le modifiche al movimento?'
        : 'Confermi di creare questo movimento finanziario?',
      confirmText: editingMovimento ? 'Salva' : 'Crea',
      variant: 'default',
    });
    if (!conferma) return;

    try {
      if (editingMovimento) {
        await movimentiFinanziariApi.update(editingMovimento.id, {
          tipo: movimentoForm.tipo as TipoMovimento,
          importo,
          data: movimentoForm.data,
          oggetto: movimentoForm.oggetto || undefined,
        });
        success('Movimento aggiornato');
      } else {
        await movimentiFinanziariApi.create({
          praticaId: pratica.id,
          tipo: movimentoForm.tipo as TipoMovimento,
          importo,
          data: movimentoForm.data,
          oggetto: movimentoForm.oggetto || undefined,
        });
        success('Movimento creato');
      }
      await loadMovimenti();
      setShowMovimentoForm(false);
      resetMovimentoForm();
    } catch (err) {
      console.error('Errore salvataggio movimento:', err);
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'Errore durante il salvataggio del movimento';
      toastError(msg);
    }
  };

  const handleDeleteMovimento = async (movimentoId: string) => {
    if (!isValidUuid(movimentoId)) {
      toastError('ID movimento non valido');
      return;
    }
    if (
      await confirm({
        title: 'Elimina movimento',
        message: "Confermi l'eliminazione di questo movimento?",
        confirmText: 'Elimina',
        variant: 'danger',
      })
    ) {
      try {
        setLoadingMovimenti(true);
        await movimentiFinanziariApi.delete(movimentoId);
        success('Movimento eliminato');
        // Aggiorna subito la lista locale per rimuovere il record
        setMovimenti((prev) => prev.filter((m) => m.id !== movimentoId));
      } catch (err) {
        console.error('Errore eliminazione movimento:', err);
        if (err instanceof ApiError && err.status === 404) {
          // Già eliminato lato server: allinea UI e mostra successo
          setMovimenti((prev) => prev.filter((m) => m.id !== movimentoId));
          success('Movimento eliminato');
        } else {
          const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'Errore durante l’eliminazione del movimento';
          toastError(msg);
        }
      } finally {
        try {
          await loadMovimenti(); // riallinea con backend indipendentemente dall'esito
        } catch (e) {
          console.error('Errore aggiornamento lista movimenti dopo delete:', e);
        }
        setLoadingMovimenti(false);
      }
    }
  };

  const handleEditMovimento = (movimento: MovimentoFinanziario) => {
    setEditingMovimento(movimento);
    setMovimentoForm({
      tipo: movimento.tipo,
      importo: numeroAFormatoItaliano(movimento.importo),
      data: movimento.data,
      oggetto: movimento.oggetto || '',
    });
    setShowMovimentoForm(true);
  };

  const resetMovimentoForm = () => {
    setMovimentoForm({
      tipo: '',
      importo: '',
      data: new Date().toISOString().split('T')[0],
      oggetto: '',
    });
    setEditingMovimento(null);
  };

  // Documenti handlers
  const handleOpenRootDocumenti = () => {
    setSelectedTipologia(null);
    loadDocumenti(null, null);
  };

  const handleOpenCartella = (cartellaId: string) => {
    setSelectedTipologia(null);
    loadDocumenti(cartellaId, null);
  };

  const handleUploadDocument = async () => {
    if (!pratica || !uploadFile) return;
    if (!uploadTipologia) {
      toastError('Seleziona la tipologia del documento');
      return;
    }
    try {
      await documentiApi.upload({
        file: uploadFile,
        praticaId: pratica.id,
        cartellaId: currentCartellaId || undefined,
        tipologia: uploadTipologia,
      });
      success('Documento caricato');
      // Ricarica mantenendo il filtro tipologia se presente
      await loadDocumenti(currentCartellaId, selectedTipologia);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTipologia('');
    } catch (err) {
      console.error('Errore upload documento:', err);
      toastError('Errore durante il caricamento del documento');
    }
  };

  const resetFolderForm = () => {
    setEditingFolder(null);
    setFolderNome('');
    setFolderDescrizione('');
    setFolderColore('#3b82f6');
    setFolderTipologia('');
  };

  const handleOpenFolderModal = (folder?: Cartella) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderNome(folder.nome);
      setFolderDescrizione(folder.descrizione || '');
      setFolderColore(folder.colore || '#3b82f6');
      setFolderTipologia(folder.tipologia || '');
    } else {
      resetFolderForm();
    }
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    if (!pratica || !folderNome.trim()) {
      toastError('Inserisci un nome per la cartella');
      return;
    }
    try {
      if (editingFolder) {
        await cartelleApi.update(editingFolder.id, {
          nome: folderNome.trim(),
          descrizione: folderDescrizione.trim() || undefined,
          colore: folderColore,
          tipologia: folderTipologia || undefined,
        });
        success('Cartella aggiornata');
      } else {
        await cartelleApi.create({
          nome: folderNome.trim(),
          descrizione: folderDescrizione.trim() || undefined,
          colore: folderColore,
          tipologia: folderTipologia || undefined,
          praticaId: pratica.id,
          cartellaParentId: currentCartellaId || undefined,
        });
        success('Cartella creata');
      }
      setShowFolderModal(false);
      resetFolderForm();
      // Ricarica mantenendo il filtro tipologia se presente
      await loadDocumenti(currentCartellaId, selectedTipologia);
    } catch (err) {
      console.error('Errore salvataggio cartella:', err);
      toastError('Errore durante il salvataggio della cartella');
    }
  };

  const handleDeleteFolder = async (folder: Cartella) => {
    if (
      !(await confirm({
        title: 'Elimina cartella',
        message: "Confermi l'eliminazione di questa cartella e dei documenti contenuti?",
        confirmText: 'Elimina',
        variant: 'danger',
      }))
    ) {
      return;
    }

    const parentId = folder.cartellaParent?.id || null;
    try {
      await cartelleApi.delete(folder.id);
      success('Cartella eliminata');
      // Ricarica mantenendo il filtro tipologia se presente
      await loadDocumenti(currentCartellaId === folder.id ? parentId : currentCartellaId, selectedTipologia);
    } catch (err) {
      console.error('Errore eliminazione cartella:', err);
      if (err instanceof ApiError && err.status === 404) {
        // Ricarica mantenendo il filtro tipologia se presente
        await loadDocumenti(currentCartellaId === folder.id ? parentId : currentCartellaId, selectedTipologia);
        success('Cartella eliminata');
      } else {
        const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'Errore durante l\'eliminazione della cartella';
        toastError(msg);
      }
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!isValidUuid(docId)) {
      toastError('ID documento non valido');
      return;
    }
    if (
      await confirm({
        title: 'Elimina documento',
        message: "Confermi l'eliminazione di questo documento?",
        confirmText: 'Elimina',
        variant: 'danger',
      })
    ) {
      try {
        await documentiApi.delete(docId);
        success('Documento eliminato');
        // Ricarica mantenendo il filtro tipologia se presente
        await loadDocumenti(currentCartellaId, selectedTipologia);
      } catch (err) {
        console.error('Errore eliminazione documento:', err);
        if (err instanceof ApiError && err.status === 404) {
          // Già eliminato lato server: aggiorna UI comunque
          await loadDocumenti(currentCartellaId, selectedTipologia);
          success('Documento eliminato');
        } else {
          const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'Errore durante l\'eliminazione del documento';
          toastError(msg);
        }
      }
    }
  };

  const handleOpenMoveModal = (doc: Documento) => {
    setDocumentoDaSpostare(doc);
    setTargetCartellaId(doc.cartellaId || '');
    setShowMoveModal(true);
  };

  const handleMoveDocument = async () => {
    if (!documentoDaSpostare) return;
    try {
      await documentiApi.update(documentoDaSpostare.id, {
        cartellaId: targetCartellaId || null,
      });
      success('Documento spostato');
      setShowMoveModal(false);
      setDocumentoDaSpostare(null);
      setTargetCartellaId('');
      // Ricarica mantenendo il filtro tipologia se presente
      await loadDocumenti(currentCartellaId, selectedTipologia);
    } catch (err) {
      console.error('Errore durante lo spostamento del documento:', err);
      toastError('Errore durante lo spostamento del documento');
    }
  };

  // Chat handlers
  const handleSendMessage = () => {
    if (!chatInput.trim() || !pratica) return;
    const senderName = user ? `${user.nome} ${user.cognome}`.trim() || 'Studio' : 'Studio';
    const newMessage = {
      id: Date.now().toString(),
      text: chatInput.trim(),
      sender: senderName,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput('');
  };

  // Confirm handlers
  const handleDeactivate = async () => {
    if (
      await confirm({
        title: 'Disattiva pratica',
        message: 'Sei sicuro?',
        confirmText: 'Disattiva',
        variant: 'warning',
      })
    )
      await handleDeactivatePratica();
  };

  const handleDelete = async () => {
    if (
      await confirm({
        title: 'Elimina pratica',
        message: 'Eliminare definitivamente?',
        confirmText: 'Elimina',
        variant: 'danger',
      })
    )
      await handleDeletePratica();
  };

  const handleRiapri = async () => {
    if (
      await confirm({
        title: 'Riapri pratica',
        message: 'Riaprire la pratica?',
        confirmText: 'Riapri',
        variant: 'info',
      })
    )
      await handleRiapriPratica();
  };

  const handleCambiaFaseWithConfirm = async () => {
    const nuovaFase = fasi.find((f) => f.id === cambioFaseData.nuovaFaseId);
    if (!nuovaFase) return;
    if (
      await confirm({
        title: 'Conferma modifica fase',
        message: `Impostare la fase su "${nuovaFase.nome}"?${nuovaFase.isFaseChiusura ? '\n\n⚠️ La pratica verrà chiusa.' : ''}`,
        confirmText: nuovaFase.isFaseChiusura ? 'Chiudi pratica' : 'Imposta fase',
        variant: nuovaFase.isFaseChiusura ? 'warning' : 'info',
      })
    )
      await submitCambioFase();
  };

  const getFaseById = (faseId: string): Fase | undefined => {
    return fasi.find((f) => f.id === faseId);
  };

  const completedFaseIds = pratica?.storico?.filter((s) => s.dataFine).map((s) => s.faseId) ?? [];
  const completedFaseIdSet = new Set(completedFaseIds);

  // Tutte le fasi selezionabili tranne quella attuale (consente anche ritorno a fasi precedenti)
  const fasiDisponibili = pratica ? fasi.filter((f) => f.id !== pratica.faseId) : [];

  const faseOptions = fasiDisponibili.map((f) => ({
    value: f.id,
    label: f.nome,
    sublabel: f.isFaseChiusura ? 'Fase di chiusura' : completedFaseIdSet.has(f.id) ? 'Già eseguita' : undefined,
    status: completedFaseIdSet.has(f.id) ? ('completed' as const) : undefined,
  }));

  const isFaseChiusuraSelected = !!fasi.find(
    (fase) => fase.id === cambioFaseData.nuovaFaseId && fase.isFaseChiusura,
  );

  // === RENDER: Progress Stepper ===
  const renderProgressStepper = () => {
    if (!pratica) return null;
    const storico = pratica.storico || [];
    const allFasi = fasi.filter((f) => !f.isFaseChiusura);

    return (
      <div className="py-3 px-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {allFasi.map((fase, idx) => {
            const isCompleted = completedFaseIdSet.has(fase.id);
            const isCurrent = fase.id === pratica.faseId;
            const isRipresa = isCurrent && isCompleted;
            const storicoEntry = storico.find((s) => s.faseId === fase.id);
            const hasNotes = storicoEntry?.note;

            return (
              <div key={fase.id} className="flex items-center">
                <button
                  onClick={() => storicoEntry && setSelectedStoricoFase(storicoEntry)}
                  disabled={!storicoEntry}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all border text-xs ${
                    isRipresa
                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 shadow-sm'
                      : isCurrent
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-600 shadow-sm'
                      : isCompleted
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                      isRipresa
                        ? 'bg-amber-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-500 text-white'
                        : isCompleted
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-3 w-3" /> : idx + 1}
                  </div>
                  <div className="text-left">
                    <span
                      className={`text-[11px] font-semibold whitespace-nowrap block ${
                        isRipresa
                          ? 'text-amber-700 dark:text-amber-300'
                          : isCurrent
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : isCompleted
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {fase.nome}
                    </span>
                    {isRipresa && <span className="text-[10px] text-amber-600 dark:text-amber-300">Ripresa</span>}
                    {isCurrent && !isRipresa && (
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400">In corso</span>
                    )}
                    {isCompleted && !isCurrent && (
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400">Completata</span>
                    )}
                  </div>
                  {hasNotes && <MessageSquare className="h-3.5 w-3.5 text-indigo-500 ml-1" />}
                </button>
                {idx < allFasi.length - 1 && (
                  <div
                    className={`w-6 h-0.5 mx-1 rounded ${
                      isRipresa
                        ? 'bg-amber-300 dark:bg-amber-500'
                        : isCompleted
                        ? 'bg-indigo-300 dark:bg-indigo-600'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Old client-side calculation function - now replaced by backend API call
  // const calcolaInteressiPratica = (): number => {
  //   if (!pratica) return 0;
  //   if (!pratica.applicaInteressi) return 0;
  //   if (!pratica.dataInizioInteressi) return 0;

  //   const n = (v: number | string | null | undefined) => {
  //     const num = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  //     return Number.isFinite(num) ? Number(num) : 0;
  //   };

  //   // Calculate days from dataInizioInteressi to today
  //   const dataInizio = new Date(pratica.dataInizioInteressi);
  //   const oggi = new Date();
  //   const diffTime = Math.abs(oggi.getTime() - dataInizio.getTime());
  //   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  //   // Determine the rate based on tipoInteresse
  //   let tasso = 0;
  //   if (pratica.tipoInteresse === 'fisso') {
  //     tasso = n(pratica.tassoInteresse);
  //   }
  //   // TODO: Add rate fetching for 'legale' and 'moratorio' types later

  //   // Formula: I = C × S × N / 36500
  //   const capitale = n(pratica.capitale);
  //   const interessi = (capitale * tasso * diffDays) / 36500;

  //   return interessi;
  // };

  const getImportiData = () => {
    if (!pratica) return null;
    const n = (v: number | string | null | undefined) => {
      const num = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
      return Number.isFinite(num) ? Number(num) : 0;
    };

    const totaliMovimentiDerivati = calculateMovimentiTotals(movimenti || []);

    const capitaleOriginarioBase =
      (totaliMovimentiDerivati.capitaleOriginario || 0) > 0
        ? totaliMovimentiDerivati.capitaleOriginario
        : n(pratica.capitale);
    // Somma capitale originario e nuovo capitale per ottenere il totale
    const capitaleTotale = capitaleOriginarioBase + (totaliMovimentiDerivati.nuovoCapitale || 0);
    const anticipazioniTotale = n(pratica.anticipazioni) + (totaliMovimentiDerivati.anticipazioni || 0);
    const compensiTotale = n(pratica.compensiLegali) + (totaliMovimentiDerivati.compensi || 0);
    const interessiCalcolatiValue = interessiCalcolati?.interessiCalcolati || 0;
    const interessiTotale = n(pratica.interessi) + (totaliMovimentiDerivati.interessi || 0) + interessiCalcolatiValue;

    const capitaleRecuperato = n(pratica.importoRecuperatoCapitale) + (totaliMovimentiDerivati.recuperoCapitale || 0);
    const anticipazioniRecuperate = n(pratica.importoRecuperatoAnticipazioni) + (totaliMovimentiDerivati.recuperoAnticipazioni || 0);
    const compensiLiquidati = n(pratica.compensiLiquidati) + (totaliMovimentiDerivati.recuperoCompensi || 0);
    const interessiRecuperati = n(pratica.interessiRecuperati) + (totaliMovimentiDerivati.recuperoInteressi || 0);

    const totale = capitaleTotale + anticipazioniTotale + compensiTotale + interessiTotale;
    const totaleRecuperato = capitaleRecuperato + anticipazioniRecuperate + compensiLiquidati + interessiRecuperati;

    return {
      capitaleTotale,
      capitaleOriginario: capitaleOriginarioBase,
      nuovoCapitale: totaliMovimentiDerivati.nuovoCapitale || 0,
      anticipazioniTotale,
      compensiTotale,
      interessiTotale,
      capitaleRecuperato,
      anticipazioniRecuperate,
      compensiLiquidati,
      interessiRecuperati,
      totale,
      totaleRecuperato,
      interessiCalcolati: interessiCalcolatiValue,
    };
  };

  const renderImportiCards = (data: NonNullable<ReturnType<typeof getImportiData>>) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Capitale</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-left">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Originario</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">€ {formatCurrency(data.capitaleOriginario)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Aggiunto</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">€ {formatCurrency(data.nuovoCapitale)}</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Recuperato</span>
              <span className="font-bold text-emerald-600">
                {data.capitaleTotale > 0 ? Math.round((data.capitaleRecuperato / data.capitaleTotale) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${data.capitaleTotale > 0 ? Math.round((data.capitaleRecuperato / data.capitaleTotale) * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">€ {formatCurrency(data.capitaleRecuperato)}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Anticipazioni</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">€ {formatCurrency(data.anticipazioniTotale)}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Recuperato</span>
              <span className="font-bold text-amber-600">
                {data.anticipazioniTotale > 0 ? Math.round((data.anticipazioniRecuperate / data.anticipazioniTotale) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${data.anticipazioniTotale > 0 ? Math.round((data.anticipazioniRecuperate / data.anticipazioniTotale) * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">€ {formatCurrency(data.anticipazioniRecuperate)}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Compensi legali</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">€ {formatCurrency(data.compensiTotale)}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Recuperato</span>
              <span className="font-bold text-indigo-600">
                {data.compensiTotale > 0 ? Math.round((data.compensiLiquidati / data.compensiTotale) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${data.compensiTotale > 0 ? Math.round((data.compensiLiquidati / data.compensiTotale) * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">€ {formatCurrency(data.compensiLiquidati)}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Interessi</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">€ {formatCurrency(data.interessiTotale)}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Recuperato</span>
              <span className="font-bold text-rose-600">
                {data.interessiTotale > 0 ? Math.round((data.interessiRecuperati / data.interessiTotale) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-500 transition-all duration-500"
                style={{ width: `${data.interessiTotale > 0 ? Math.round((data.interessiRecuperati / data.interessiTotale) * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">€ {formatCurrency(data.interessiRecuperati)}</p>
            {pratica && pratica.applicaInteressi && interessiCalcolati && interessiCalcolati.interessiCalcolati > 0 && (
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <p>
                  <span className="font-medium">Tasso:</span> {interessiCalcolati.tassoInteresse ? `${interessiCalcolati.tassoInteresse}%` : 'N/D'} ({
                    interessiCalcolati.tipoInteresse === 'legale' ? 'Legale' :
                    interessiCalcolati.tipoInteresse === 'moratorio' ? 'Moratorio' :
                    interessiCalcolati.tipoInteresse === 'fisso' ? 'Fisso' :
                    'N/D'
                  })
                </p>
                {interessiCalcolati.dataInizioInteressi && (
                  <p>
                    <span className="font-medium">Dal:</span> {new Date(interessiCalcolati.dataInizioInteressi).toLocaleDateString('it-IT')}
                    {interessiCalcolati.dataFineMaturazione
                      ? ` al ${new Date(interessiCalcolati.dataFineMaturazione).toLocaleDateString('it-IT')}`
                      : ' ad oggi'
                    }
                  </p>
                )}
                {!interessiCalcolati.dataFineMaturazione ? (
                  <button
                    onClick={handleTerminaInteressi}
                    className="mt-2 px-2.5 py-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
                  >
                    Termina maturazione
                  </button>
                ) : (
                  <button
                    onClick={handleOpenRiprendiInteressi}
                    className="mt-2 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                  >
                    Riprendi maturazione
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Totale da recuperare</p>
            <p className="text-2xl font-bold mt-1">€ {formatCurrency(data.totale)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Totale recuperato</p>
            <p className="text-2xl font-bold mt-1 text-indigo-400">€ {formatCurrency(data.totaleRecuperato)}</p>
          </div>
        </div>
      </div>
    </>
  );

  // === RENDER: Tab Overview ===
  const renderOverviewTab = () => {
    if (!pratica) return null;
    const fase = getFaseById(pratica.faseId);
    const storicoCorrente = pratica.storico?.find((s) => s.faseId === pratica.faseId && !s.dataFine);
    const isOpposizionePhase = fase?.codice === 'opposizione';
    const isPignoramentoPhase = fase?.codice === 'pignoramento';

    const importiData = getImportiData();

    return (
      <div className="space-y-6">
        {/* Sezione informazioni principali */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cliente</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pratica.cliente?.ragioneSociale}</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center gap-2 mb-1.5">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Debitore</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getDebitoreDisplayName(pratica.debitore)}</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center gap-2 mb-1.5">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Data affidamento</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {pratica.dataAffidamento ? new Date(pratica.dataAffidamento).toLocaleDateString('it-IT') : '-'}
              </p>
              {!isEditingDataAffidamento && (
                <button
                  onClick={handleStartEditDataAffidamento}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {isEditingDataAffidamento && (
              <div className="mt-2 space-y-2">
                <DateField
                  value={tempDataAffidamento}
                  onChange={setTempDataAffidamento}
                  placeholder="Data affidamento"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleCancelEditDataAffidamento}
                    disabled={savingDataAffidamento}
                    className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveDataAffidamento}
                    disabled={savingDataAffidamento}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="h-3 w-3" />
                    {savingDataAffidamento ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Stato</span>
            </div>
            {pratica.aperta ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                <Clock className="h-3 w-3" />
                In corso
              </span>
            ) : pratica.esito === 'positivo' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                <CheckCircle className="h-3 w-3" />
                Chiusa +
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400">
                <XCircle className="h-3 w-3" />
                Chiusa -
              </span>
            )}
          </div>
        </div>

        {/* Avvocati e Collaboratori */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Avvocati</span>
              </div>
              {!isEditingAvvocati && (
                <button
                  onClick={handleStartEditAvvocati}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Modifica
                </button>
              )}
            </div>
            {isEditingAvvocati ? (
              <>
                <AvvocatiMultiSelect
                  avvocati={avvocati}
                  selectedIds={tempAvvocatiIds}
                  onChange={setTempAvvocatiIds}
                  loading={loadingAvvocati}
                  placeholder="Seleziona avvocati..."
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    onClick={handleCancelEditAvvocati}
                    disabled={savingAvvocati}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveAvvocati}
                    disabled={savingAvvocati}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingAvvocati ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              </>
            ) : pratica.avvocati && pratica.avvocati.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pratica.avvocati.map((avv) => (
                  <span
                    key={avv.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                  >
                    {avv.nome} {avv.cognome}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nessun avvocato associato</p>
            )}
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Collaboratori</span>
              </div>
              {!isEditingCollaboratori && (
                <button
                  onClick={handleStartEditCollaboratori}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Modifica
                </button>
              )}
            </div>
            {isEditingCollaboratori ? (
              <>
                <CollaboratoriMultiSelect
                  collaboratori={collaboratori}
                  selectedIds={tempCollaboratoriIds}
                  onChange={setTempCollaboratoriIds}
                  loading={loadingCollaboratori}
                  placeholder="Seleziona collaboratori..."
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    onClick={handleCancelEditCollaboratori}
                    disabled={savingCollaboratori}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveCollaboratori}
                    disabled={savingCollaboratori}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingCollaboratori ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              </>
            ) : pratica.collaboratori && pratica.collaboratori.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pratica.collaboratori.map((collaboratore) => (
                  <span
                    key={collaboratore.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                  >
                    {collaboratore.nome} {collaboratore.cognome}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nessun collaboratore associato</p>
            )}
          </div>
        </div>

        {/* Fase corrente compatta */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-white/80 uppercase tracking-wider font-medium">Fase corrente</p>
                <p className="text-lg font-bold mt-0.5">{fase?.nome || 'N/D'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] text-white/80">Iniziata il</p>
                <p className="text-sm font-semibold">
                  {storicoCorrente ? new Date(storicoCorrente.dataInizio).toLocaleDateString('it-IT') : '-'}
                </p>
              </div>
              {pratica.aperta && pratica.attivo && canChangeFase && (
                <button
                  onClick={handleOpenCambioFase}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition backdrop-blur-sm"
                >
                  <ArrowRight className="h-4 w-4" />
                  Modifica
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Importi finanziari */}
        {importiData && (
          <div className="wow-panel p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl dark:bg-emerald-900/30">
                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Importi finanziari</h3>
                <p className="text-xs text-slate-500">
                  Riepilogo capitale, anticipazioni, compensi e interessi
                  {pratica?.dataAffidamento && (
                    <span className="ml-2 font-medium">
                      • Data apertura: {new Date(pratica.dataAffidamento).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {renderImportiCards(importiData)}
          </div>
        )}

        {/* Note */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Note pratica</h3>
              </div>
            {!isEditingNotePratica && (
              <button
                onClick={handleStartEditNotePratica}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <Edit className="h-3.5 w-3.5" />
                Modifica
              </button>
            )}
          </div>
          {isEditingNotePratica ? (
            <>
              <textarea
                value={tempNotePratica}
                onChange={(e) => setTempNotePratica(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                placeholder="Inserisci note generali sulla pratica..."
              />
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={handleCancelEditNotePratica}
                  disabled={savingNotePratica}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveNotePratica}
                  disabled={savingNotePratica}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingNotePratica ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{pratica.note || 'Nessuna nota'}</p>
          )}
        </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Note fase</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({pratica.fase?.nome || 'N/D'})
                </span>
              </div>
              {!isEditingNoteFase && (
                <button
                  onClick={handleStartEditNoteFase}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Modifica
                </button>
              )}
            </div>
            {isEditingNoteFase ? (
              <>
                <textarea
                  value={tempNoteFase}
                  onChange={(e) => setTempNoteFase(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Inserisci note specifiche per questa fase..."
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Queste note sono specifiche per la fase corrente e verranno salvate nello storico quando la fase cambia.
                </p>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    onClick={handleCancelEditNoteFase}
                    disabled={savingNoteFase}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveNoteFase}
                    disabled={savingNoteFase}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingNoteFase ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{pratica.noteFase || 'Nessuna nota per questa fase'}</p>
            )}
          </div>
        </div>

        {/* Dettagli procedurali */}
        {(isOpposizionePhase || isPignoramentoPhase) && (
          <div className="wow-panel p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileEdit className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Dettagli procedurali
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isOpposizionePhase && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Opposizione</p>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <p>
                      <span className="font-medium">Esito: </span>
                      {pratica.opposizione?.esito ? ESITO_OPPOSIZIONE_LABELS[pratica.opposizione.esito] : 'N/D'}
                    </p>
                    <p>
                      <span className="font-medium">Data esito: </span>
                      {pratica.opposizione?.dataEsito
                        ? new Date(pratica.opposizione.dataEsito).toLocaleDateString('it-IT')
                        : 'N/D'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {pratica.opposizione?.note || 'Nessuna nota'}
                    </p>
                  </div>
                </div>
              )}

              {isPignoramentoPhase && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Pignoramento</p>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <p>
                      <span className="font-medium">Tipo: </span>
                      {pratica.pignoramento?.tipo ? TIPO_PIGNORAMENTO_LABELS[pratica.pignoramento.tipo] : 'N/D'}
                    </p>
                    <p>
                      <span className="font-medium">Data notifica: </span>
                      {pratica.pignoramento?.dataNotifica
                        ? new Date(pratica.pignoramento.dataNotifica).toLocaleDateString('it-IT')
                        : 'N/D'}
                    </p>
                    <p>
                      <span className="font-medium">Esito: </span>
                      {pratica.pignoramento?.esito ? ESITO_PIGNORAMENTO_LABELS[pratica.pignoramento.esito] : 'N/D'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {pratica.pignoramento?.note || 'Nessuna nota'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // === RENDER: Tab Movimenti ===
  const renderMovimentiTab = () => {
    if (!pratica) return null;

    const tipoMovimentoOptions = [
      { value: 'nuovo_capitale', label: 'Capitale' },
      { value: 'anticipazione', label: 'Anticipazione' },
      { value: 'compenso', label: 'Compenso' },
      { value: 'interessi', label: 'Interessi' },
      { value: 'altro', label: 'Altro' },
      { value: 'recupero_capitale', label: 'Recupero Capitale' },
      { value: 'recupero_anticipazione', label: 'Recupero Anticipazione' },
      { value: 'recupero_compenso', label: 'Recupero Compenso' },
      { value: 'recupero_interessi', label: 'Recupero Interessi' },
      { value: 'recupero_altro', label: 'Recupero Altro' },
    ];

    // Raggruppa movimenti per tipo e calcola totali
    const totali = calculateMovimentiTotals(movimenti || []);
    const movimentiFiltrati = (movimenti || []).filter((mov) => {
      if (movimentiFiltro === 'tutto') return true;
      if (movimentiFiltro === 'capitale') {
        return ['capitale', 'capitale_originario', 'nuovo_capitale', 'recupero_capitale'].includes(mov.tipo);
      }
      if (movimentiFiltro === 'compensi') {
        return ['compenso', 'recupero_compenso'].includes(mov.tipo);
      }
      if (movimentiFiltro === 'interessi') {
        return ['interessi', 'recupero_interessi'].includes(mov.tipo);
      }
      if (movimentiFiltro === 'anticipazioni') {
        return ['anticipazione', 'recupero_anticipazione'].includes(mov.tipo);
      }
      return ['altro', 'recupero_altro'].includes(mov.tipo);
    });
    const movimentiCounts = {
      tutto: movimenti.length,
      capitale: movimenti.filter((mov) =>
        ['capitale', 'capitale_originario', 'nuovo_capitale', 'recupero_capitale'].includes(mov.tipo),
      ).length,
      compensi: movimenti.filter((mov) => ['compenso', 'recupero_compenso'].includes(mov.tipo)).length,
      interessi: movimenti.filter((mov) => ['interessi', 'recupero_interessi'].includes(mov.tipo)).length,
      anticipazioni: movimenti.filter((mov) => ['anticipazione', 'recupero_anticipazione'].includes(mov.tipo)).length,
      altro: movimenti.filter((mov) => ['altro', 'recupero_altro'].includes(mov.tipo)).length,
    };

    return (
      <div className="space-y-4">
        {/* Totali */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">IMPORTI DOVUTI</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Capitale originario:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.capitaleOriginario)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Nuovo capitale:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.nuovoCapitale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Interessi maturati:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.interessi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Compensi maturati:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.compensi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Anticipazioni:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.anticipazioni)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Altro:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.altro || 0)}</span>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-2">IMPORTI RECUPERATI</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Capitale recuperato:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.recuperoCapitale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Interessi recuperati:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.recuperoInteressi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Compensi recuperati:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.recuperoCompensi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Anticipazioni recuperate:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(totali.recuperoAnticipazioni)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Altri recuperi:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totali.altroRecuperato || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {pianoPresente && (
          <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Piano di ammortamento presente
            </div>
            <button
              onClick={() => {
                setOpenPianoCreate(false);
                setShowPianoModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow hover:bg-slate-50 dark:bg-slate-800 dark:text-indigo-200 dark:hover:bg-slate-700"
            >
              <FileDown className="h-3.5 w-3.5" />
              Vedi dettagli
            </button>
          </div>
        )}

        {/* Lista movimenti */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Movimenti</h4>
          <div className="flex items-center gap-2">
            {!pianoPresente && (
              <button
                onClick={() => {
                  setOpenPianoCreate(true);
                  setShowPianoModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                <Calendar className="h-3 w-3" />
                Crea piano di rientro
              </button>
            )}
            <button
              onClick={() => setShowMovimentoForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="h-3 w-3" />
              Nuovo movimento
            </button>
          </div>
        </div>

        {/* Filtri rapidi per tipologia */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { id: 'tutto', label: 'Tutto' },
            { id: 'capitale', label: 'Capitale' },
            { id: 'compensi', label: 'Compensi' },
            { id: 'interessi', label: 'Interessi' },
            { id: 'anticipazioni', label: 'Anticipazioni' },
            { id: 'altro', label: 'Altro' },
          ].map((filtro) => {
            const isSelected = movimentiFiltro === filtro.id;
            const count = movimentiCounts[filtro.id as keyof typeof movimentiCounts];
            return (
              <button
                key={filtro.id}
                onClick={() => setMovimentiFiltro(filtro.id as typeof movimentiFiltro)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {filtro.label}
                {count > 0 && <span className="ml-2 text-xs">({count})</span>}
              </button>
            );
          })}
        </div>

        {loadingMovimenti ? (
          <div className="text-center py-8 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : !movimenti || movimenti.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nessun movimento registrato</p>
          </div>
        ) : movimentiFiltrati.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nessun movimento per questo filtro</p>
          </div>
        ) : (
          <div className="space-y-2">
            {movimentiFiltrati
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
              .map((mov) => (
                <div
                  key={mov.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isRecupero(mov.tipo)
                      ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-900/20'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold ${
                          isRecupero(mov.tipo) ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {getTipoMovimentoLabel(mov.tipo)}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(mov.data).toLocaleDateString('it-IT')}
                      </span>
                      {mov.giaFatturato && (
                        <>
                          <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            Già fatturato
                          </span>
                        </>
                      )}
                    </div>
                    {mov.oggetto && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{mov.oggetto}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-bold ${
                        isRecupero(mov.tipo) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {formatCurrency(mov.importo)}
                    </span>
                    <button
                      onClick={() => handleEditMovimento(mov)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMovimento(mov.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Modale Piano Ammortamento */}
        {showPianoModal && (
          <BodyPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowPianoModal(false);
                  setOpenPianoCreate(false);
                  refreshPianoPresente();
                }}
              />
              <div className="modal-content relative z-10 w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto p-6">
                  <PianoAmmortamento
                    praticaId={pratica.id}
                    openCreateOnMount={openPianoCreate}
                    onMovimentiUpdated={loadMovimenti}
                    onPraticaUpdated={loadPratica}
                    onClose={() => {
                      setShowPianoModal(false);
                      setOpenPianoCreate(false);
                      refreshPianoPresente();
                    }}
                  />
                </div>
              </div>
              <div>
              </div>
            </div>
          </BodyPortal>
        )}

        {/* Modal Form Movimento */}
        {showMovimentoForm && (
          <BodyPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowMovimentoForm(false);
                resetMovimentoForm();
              }}
            />
            <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {editingMovimento ? 'Modifica movimento' : 'Nuovo movimento'}
                </h2>
                <button
                  onClick={() => {
                    setShowMovimentoForm(false);
                    resetMovimentoForm();
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
                  <CustomSelect
                    options={tipoMovimentoOptions}
                    value={movimentoForm.tipo}
                    onChange={(tipo) => setMovimentoForm((prev) => ({ ...prev, tipo: tipo as TipoMovimento }))}
                    placeholder="Seleziona tipo..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Importo *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={movimentoForm.importo}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Permetti solo numeri, virgola e punto
                        if (value === '' || /^[0-9.,]*$/.test(value)) {
                          setMovimentoForm((prev) => ({ ...prev, importo: value }));
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value) {
                          const num = formatoItalianoANumero(value);
                          if (num > 0) {
                            setMovimentoForm((prev) => ({ ...prev, importo: numeroAFormatoItaliano(num) }));
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data *</label>
                  <DateField
                    value={movimentoForm.data}
                    onChange={(value) => setMovimentoForm((prev) => ({ ...prev, data: value }))}
                    placeholder="Data movimento"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Oggetto</label>
                  <textarea
                    value={movimentoForm.oggetto}
                    onChange={(e) => setMovimentoForm((prev) => ({ ...prev, oggetto: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Descrizione movimento..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setShowMovimentoForm(false);
                    resetMovimentoForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveMovimento}
                  disabled={!movimentoForm.tipo || !movimentoForm.importo}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Salva
                </button>
              </div>
            </div>
            </div>
          </BodyPortal>
        )}

      </div>
    );
  };

  // === RENDER: Tab Documenti ===
  const renderDocumentiTab = () => {
    if (!pratica) return null;

    const getTipoDocumentoColor = (tipo: string) => {
      switch (tipo) {
        case 'pdf':
          return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20';
        case 'word':
          return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
        case 'excel':
          return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
        case 'immagine':
          return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
        default:
          return 'text-slate-600 bg-slate-50 dark:bg-slate-800';
      }
    };

    const currentFolder = currentCartellaId
      ? allCartelle.find((cartella) => cartella.id === currentCartellaId)
      : null;
    const breadcrumbItems = [
      { id: null as string | null, label: 'Archivio pratica' },
      ...breadcrumb.map((b) => ({ id: b.id, label: b.nome })),
      ...(currentFolder ? [{ id: currentFolder.id, label: currentFolder.nome }] : []),
    ];
    const searchTerm = documentiSearch.trim().toLowerCase();
    const filteredCartelle = searchTerm
      ? cartelle.filter((cartella) => cartella.nome.toLowerCase().includes(searchTerm))
      : cartelle;
    const filteredDocumenti = searchTerm
      ? documenti.filter((doc) => doc.nome.toLowerCase().includes(searchTerm))
      : documenti;

    const countDocumentiInCartella = (cartellaId: string) =>
      allDocumenti.filter((doc) => doc.cartellaId === cartellaId).length;

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Documenti della pratica</h4>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {breadcrumbItems.map((item, idx) => {
                const isLast = idx === breadcrumbItems.length - 1;
                return (
                  <span key={`${item.id ?? 'root'}-${idx}`} className="flex items-center gap-1">
                    {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                    {isLast ? (
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
                    ) : (
                      <button
                        onClick={() => (item.id ? handleOpenCartella(item.id) : handleOpenRootDocumenti())}
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
                      >
                        {item.label}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={documentiSearch}
                onChange={(e) => setDocumentiSearch(e.target.value)}
                placeholder="Cerca documenti o cartelle..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenFolderModal()}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <Folder className="h-3.5 w-3.5" />
                Nuova cartella
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-700"
              >
                <Upload className="h-3.5 w-3.5" />
                Carica documento
              </button>
            </div>
          </div>
        </div>

        {/* Filtri rapidi per categorie predefinite */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {['Tutti', 'Cliente', 'Stragiudiziale', 'Ingiunzione', 'Esecuzione', 'Pagamenti', 'Altro'].map((categoria) => {
            const count = categoria === 'Tutti'
              ? allDocumenti.length
              : allDocumenti.filter((doc) => doc.tipologia === categoria).length +
                allCartelle.filter((c) => c.tipologia === categoria).length;
            const isSelected = categoria === 'Tutti'
              ? selectedTipologia === null && currentCartellaId === null && !documentiSearch
              : selectedTipologia === categoria;

            return (
              <button
                key={categoria}
                onClick={() => {
                  if (categoria === 'Tutti') {
                    setSelectedTipologia(null);
                    setDocumentiSearch('');
                    loadDocumenti(null, null);
                  } else {
                    setSelectedTipologia(categoria as TipologiaDocumento);
                    loadDocumenti(null, categoria as TipologiaDocumento);
                  }
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {categoria}
                {count > 0 && (
                  <span className="ml-2 text-xs">
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loadingDocumenti ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin" />
          </div>
        ) : filteredCartelle.length === 0 && filteredDocumenti.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">
            <Folder className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">
              {searchTerm ? 'Nessun risultato per questa ricerca.' : 'Nessun documento o cartella ancora presente.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCartelle.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredCartelle.map((cartella) => (
                  <div
                    key={cartella.id}
                    className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700"
                        style={{ background: cartella.colore || '#e0e7ff' }}
                      />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{cartella.nome}</p>
                        {cartella.descrizione && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{cartella.descrizione}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                          {countDocumentiInCartella(cartella.id)} documenti •{' '}
                          {cartella.sottoCartelle?.length ?? 0} sottocartelle
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenCartella(cartella.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                      >
                        Apri
                      </button>
                      <button
                        onClick={() => handleOpenFolderModal(cartella)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/70"
                        title="Modifica cartella"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(cartella)}
                        className="rounded-lg p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                        title="Elimina cartella"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredDocumenti.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {filteredDocumenti.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getTipoDocumentoColor(doc.tipo)}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{doc.nome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {doc.estensione.toUpperCase()} • {(doc.dimensione / 1024).toFixed(0)} KB
                        </p>
                        {doc.cartella?.nome && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Cartella: {doc.cartella.nome}</p>
                        )}
                        {doc.descrizione && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">{doc.descrizione}</p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {new Date(doc.dataCreazione).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => documentiApi.download(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"
                          title="Scarica"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenMoveModal(doc)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded"
                          title="Sposta"
                        >
                          <Move className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Elimina"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modale upload */}
        {showUploadModal && (
          <BodyPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadTipologia('');
                }}
              />
              <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Carica documento</h2>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                      setUploadTipologia('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipologia documento *</label>
                    <select
                      value={uploadTipologia}
                      onChange={(e) => setUploadTipologia(e.target.value as TipologiaDocumento | '')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    >
                      <option value="">Seleziona tipologia...</option>
                      <option value="Cliente">Cliente</option>
                      <option value="Stragiudiziale">Stragiudiziale</option>
                      <option value="Ingiunzione">Ingiunzione</option>
                      <option value="Esecuzione">Esecuzione</option>
                      <option value="Pagamenti">Pagamenti</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Seleziona file *</label>
                    <input
                      type="file"
                      onChange={handlePraticaFileSelect}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Limite per singolo upload: {uploadLimitMb} MB. Qualsiasi file più grande verrà rifiutato
                      dal backend e te ne verrà segnalato l'errore tramite il toast.
                    </p>
                    {uploadFile && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                        File: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                      setUploadTipologia('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleUploadDocument}
                    disabled={!uploadFile || !uploadTipologia}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    Carica
                  </button>
                </div>
              </div>
            </div>
          </BodyPortal>
        )}

        {/* Modale cartella */}
        {showFolderModal && (
          <BodyPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowFolderModal(false);
                  resetFolderForm();
                }}
              />
              <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {editingFolder ? 'Modifica cartella' : 'Nuova cartella'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowFolderModal(false);
                      resetFolderForm();
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                    <input
                      value={folderNome}
                      onChange={(e) => setFolderNome(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Nome cartella"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrizione</label>
                    <textarea
                      value={folderDescrizione}
                      onChange={(e) => setFolderDescrizione(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="A cosa serve questa cartella?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipologia</label>
                    <select
                      value={folderTipologia}
                      onChange={(e) => setFolderTipologia(e.target.value as TipologiaCartella | '')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200"
                    >
                      <option value="">Nessuna tipologia</option>
                      <option value="Cliente">Cliente</option>
                      <option value="Stragiudiziale">Stragiudiziale</option>
                      <option value="Ingiunzione">Ingiunzione</option>
                      <option value="Esecuzione">Esecuzione</option>
                      <option value="Pagamenti">Pagamenti</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Colore</label>
                    <input
                      type="color"
                      value={folderColore}
                      onChange={(e) => setFolderColore(e.target.value)}
                      className="h-10 w-16 rounded-lg border border-slate-200 bg-white px-1 py-1 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setShowFolderModal(false);
                      resetFolderForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveFolder}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    disabled={!folderNome.trim()}
                  >
                    <Save className="h-4 w-4" />
                    {editingFolder ? 'Salva' : 'Crea'}
                  </button>
                </div>
              </div>
            </div>
          </BodyPortal>
        )}

        {/* Modale spostamento documento */}
        {showMoveModal && documentoDaSpostare && (
          <BodyPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowMoveModal(false);
                  setDocumentoDaSpostare(null);
                  setTargetCartellaId('');
                }}
              />
              <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Sposta documento</h2>
                  <button
                    onClick={() => {
                      setShowMoveModal(false);
                      setDocumentoDaSpostare(null);
                      setTargetCartellaId('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Dove vuoi spostare <span className="font-semibold">{documentoDaSpostare.nome}</span>?
                  </p>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Nessuna cartella (radice)' },
                      ...allCartelle.map((c) => ({ value: c.id, label: c.nome })),
                    ]}
                    value={targetCartellaId}
                    onChange={(value) => setTargetCartellaId(value)}
                    placeholder="Seleziona cartella..."
                  />
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setShowMoveModal(false);
                      setDocumentoDaSpostare(null);
                      setTargetCartellaId('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleMoveDocument}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    <Move className="h-4 w-4" />
                    Sposta
                  </button>
                </div>
              </div>
            </div>
          </BodyPortal>
        )}
      </div>
    );
  };

  // === RENDER: Tab Alerts ===
  const renderAlertsTab = () => {
    if (!pratica) return null;

    const handleChiudiAlert = async (alertId: string) => {
      if (await confirm({
        title: 'Chiudi alert',
        message: 'Confermi la chiusura di questo alert?',
        confirmText: 'Chiudi',
        variant: 'warning',
      })) {
        try {
          await alertsApi.chiudi(alertId);
          success('Alert chiuso');
          await loadAlerts();
          setSelectedAlert(null);
        } catch (err) {
          console.error('Errore chiusura alert:', err);
          toastError('Errore durante la chiusura dell\'alert');
        }
      }
    };

    const handleSendAlertMessage = async (alertId: string) => {
      if (!alertChatInput.trim()) return;
      try {
        await alertsApi.addMessaggio(alertId, {
          autore: 'studio',
          testo: alertChatInput,
        });
        await loadAlerts();
        setAlertChatInput('');
        const updatedAlert = alerts.find((a) => a.id === alertId);
        if (updatedAlert) {
          setSelectedAlert(await alertsApi.getOne(alertId));
        }
      } catch (err) {
        console.error('Errore invio messaggio:', err);
      }
    };

    const getGiorniRimanenti = (dataScadenza: Date) => {
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      const scadenza = new Date(dataScadenza);
      scadenza.setHours(0, 0, 0, 0);
      return Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Alert e Scadenze ({alerts.length})
          </h3>
        </div>

        {loadingAlerts ? (
          <div className="text-center py-8 text-slate-500">Caricamento...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nessun alert presente per questa pratica</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const giorniRimanenti = getGiorniRimanenti(alert.dataScadenza);
              const isScaduto = giorniRimanenti < 0;
              const isInScadenza = giorniRimanenti >= 0 && giorniRimanenti <= alert.giorniAnticipo;

              return (
                <div
                  key={alert.id}
                  className={`wow-panel border-l-4 p-4 transition-all cursor-pointer ${
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
                  onClick={() => setSelectedAlert(alert)}
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

                      {alert.creatoDa && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-2">
                          Creato da: <span className="font-semibold">{alert.creatoDa}</span>
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {canManageAlertStatus && alert.stato === 'in_gestione' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChiudiAlert(alert.id);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                        title="Chiudi alert"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Alert Detail */}
        {selectedAlert && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedAlert(null)} />
            <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{selectedAlert.titolo}</h2>
                <button onClick={() => setSelectedAlert(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{selectedAlert.descrizione}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span>Scadenza: {new Date(selectedAlert.dataScadenza).toLocaleDateString('it-IT')}</span>
                    <span>Destinatario: {selectedAlert.destinatario === 'studio' ? 'Studio' : 'Cliente'}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        selectedAlert.stato === 'in_gestione'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}
                    >
                      {selectedAlert.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'}
                    </span>
                  </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Chat</h3>
                  <div className="space-y-3 mb-4">
                    {(!selectedAlert.messaggi || selectedAlert.messaggi.length === 0) ? (
                      <p className="text-sm text-slate-500">Nessun messaggio</p>
                    ) : (
                      selectedAlert.messaggi.map((msg) => (
                        <div key={msg.id} className="flex gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{msg.autore}</span>
                              <span className="text-xs text-slate-400">
                                {new Date(msg.dataInvio).toLocaleString('it-IT')}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100">
                              {msg.testo}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedAlert.stato === 'in_gestione' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={alertChatInput}
                        onChange={(e) => setAlertChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendAlertMessage(selectedAlert.id)}
                        placeholder="Scrivi un messaggio..."
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        onClick={() => handleSendAlertMessage(selectedAlert.id)}
                        disabled={!alertChatInput.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}
      </div>
    );
  };

  // === RENDER: Tab Tickets ===
  const renderTicketsTab = () => {
    if (!pratica) return null;

    const handleCreateTicket = async () => {
      if (!ticketForm.oggetto || !ticketForm.descrizione) {
        setTicketFormSubmitted(true);
        toastError('Compila tutti i campi obbligatori', 'Validazione');
        return;
      }
      try {
        await ticketsApi.create({
          ...ticketForm,
          praticaId: pratica.id,
        });
        success('Ticket creato');
        await loadTickets();
        setShowTicketForm(false);
        setTicketFormSubmitted(false);
        setTicketForm({
          praticaId: pratica.id,
          oggetto: '',
          descrizione: '',
          autore: 'studio',
          priorita: 'normale',
        });
      } catch (err) {
        console.error('Errore creazione ticket:', err);
        setTicketFormSubmitted(true);
        toastError('Errore durante la creazione del ticket');
      }
    };

    const handleChiudiTicket = async (ticket: Ticket) => {
      if (ticket.stato !== 'in_gestione') {
        toastInfo('Il ticket deve essere prima preso in carico.', 'Workflow ticket');
        return;
      }
      try {
        await ticketsApi.chiudi(ticket.id);
        success('Ticket chiuso');
        await loadTickets();
        setSelectedTicket(null);
      } catch (err) {
        console.error('Errore chiusura ticket:', err);
        toastError('Errore durante la chiusura del ticket');
      }
    };

    const handlePrendiInCaricoTicket = async (ticketId: string) => {
      try {
        await ticketsApi.prendiInCarico(ticketId);
        await loadTickets();
        const updatedTicket = await ticketsApi.getOne(ticketId);
        setSelectedTicket(updatedTicket);
      } catch (err) {
        console.error('Errore presa in carico:', err);
      }
    };

    const handleSendTicketMessage = async (ticketId: string) => {
      if (!ticketChatInput.trim()) return;
      try {
        await ticketsApi.addMessaggio(ticketId, {
          autore: 'studio',
          testo: ticketChatInput,
        });
        await loadTickets();
        setTicketChatInput('');
        const updatedTicket = await ticketsApi.getOne(ticketId);
        setSelectedTicket(updatedTicket);
      } catch (err) {
        console.error('Errore invio messaggio:', err);
      }
    };

    const getPrioritaColor = (priorita: TicketPriorita) => {
      switch (priorita) {
        case 'urgente':
          return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
        case 'alta':
          return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        case 'normale':
          return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'bassa':
          return 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400';
        default:
          return 'bg-slate-100 text-slate-700';
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Ticket di Supporto ({tickets.length})
          </h3>
          {user?.ruolo === 'cliente' && (
            <button
              onClick={() => {
                setShowTicketForm(true);
                setTicketFormSubmitted(false);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Nuovo Ticket
            </button>
          )}
        </div>

        {loadingTickets ? (
          <div className="text-center py-8 text-slate-500">Caricamento...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <TicketIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nessun ticket presente</p>
            <p className="text-xs text-slate-400 mt-1">Crea un ticket per richiedere supporto</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">{ticket.numeroTicket}</span>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-50">{ticket.oggetto}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPrioritaColor(ticket.priorita)}`}>
                        {ticket.priorita}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          ticket.stato === 'aperto'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : ticket.stato === 'in_gestione'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        }`}
                      >
                        {ticket.stato === 'aperto' ? 'Aperto' : ticket.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{ticket.descrizione}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Autore: {ticket.autore}</span>
                      <span>Messaggi: {ticket.messaggi?.length || 0}</span>
                      <span>Creato: {new Date(ticket.dataCreazione).toLocaleDateString('it-IT')}</span>
                    </div>
                  </div>
                  {ticket.stato !== 'chiuso' && (
                    <div className="flex gap-2">
                      {ticket.stato === 'aperto' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrendiInCaricoTicket(ticket.id);
                          }}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                          Prendi in carico
                        </button>
                      )}
                      {ticket.stato === 'in_gestione' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChiudiTicket(ticket);
                          }}
                          className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                        >
                          Chiudi
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Ticket Form */}
        {showTicketForm && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowTicketForm(false);
                setTicketFormSubmitted(false);
              }}
            />
            <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Nuovo Ticket</h2>
                <button
                  onClick={() => {
                    setShowTicketForm(false);
                    setTicketFormSubmitted(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Oggetto *</label>
                  <input
                    type="text"
                    value={ticketForm.oggetto}
                    onChange={(e) => setTicketForm({ ...ticketForm, oggetto: e.target.value })}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      ticketFormSubmitted && !ticketForm.oggetto ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                    ].join(' ')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrizione *</label>
                  <textarea
                    value={ticketForm.descrizione}
                    onChange={(e) => setTicketForm({ ...ticketForm, descrizione: e.target.value })}
                    rows={4}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      ticketFormSubmitted && !ticketForm.descrizione ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                    ].join(' ')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priorità</label>
                  <CustomSelect
                    options={[
                      { value: 'bassa', label: 'Bassa' },
                      { value: 'normale', label: 'Normale' },
                      { value: 'alta', label: 'Alta' },
                      { value: 'urgente', label: 'Urgente' },
                    ]}
                    value={ticketForm.priorita || 'normale'}
                    onChange={(value) => setTicketForm({ ...ticketForm, priorita: value as TicketPriorita })}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowTicketForm(false);
                      setTicketFormSubmitted(false);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleCreateTicket}
                    disabled={!ticketForm.oggetto || !ticketForm.descrizione}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Crea Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

        {/* Modal Ticket Detail */}
        {selectedTicket && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />
            <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">{selectedTicket.numeroTicket}</span>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{selectedTicket.oggetto}</h2>
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{selectedTicket.descrizione}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${getPrioritaColor(selectedTicket.priorita)}`}>
                      {selectedTicket.priorita}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        selectedTicket.stato === 'aperto'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : selectedTicket.stato === 'in_gestione'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}
                    >
                      {selectedTicket.stato === 'aperto' ? 'Aperto' : selectedTicket.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'}
                    </span>
                    <span className="text-slate-500">Autore: {selectedTicket.autore}</span>
                  </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">Conversazione</h3>
                  <div className="space-y-3 mb-4">
                    {(!selectedTicket.messaggi || selectedTicket.messaggi.length === 0) ? (
                      <p className="text-sm text-slate-500">Nessun messaggio</p>
                    ) : (
                      selectedTicket.messaggi.map((msg) => (
                        <div key={msg.id} className="flex gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{msg.autore}</span>
                              <span className="text-xs text-slate-400">
                                {new Date(msg.dataInvio).toLocaleString('it-IT')}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100">
                              {msg.testo}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {selectedTicket.stato !== 'chiuso' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ticketChatInput}
                        onChange={(e) => setTicketChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendTicketMessage(selectedTicket.id)}
                        placeholder="Scrivi un messaggio..."
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        onClick={() => handleSendTicketMessage(selectedTicket.id)}
                        disabled={!ticketChatInput.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}
      </div>
    );
  };

  // === RENDER: Tab Chat ===
  const renderChatTab = () => {
    if (!pratica) return null;
    const currentUserName = user ? `${user.nome} ${user.cognome}`.trim() || 'Studio' : 'Studio';

    return (
      <div className="flex flex-col h-[400px]">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {chatMessages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nessun messaggio</p>
              <p className="text-xs text-slate-400 mt-1">Inizia una conversazione per questa pratica</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isCurrentUser = msg.sender === currentUserName;
              return (
                <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isCurrentUser
                        ? 'bg-indigo-600 text-white'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'
                    }`}
                  >
                    <p className="text-xs font-medium text-right">
                      {msg.sender || (isCurrentUser ? 'Studio' : 'Referente')}
                    </p>
                    <p className="text-sm text-left">{msg.text}</p>
                    <p className="text-[10px] mt-1 opacity-70">
                      {msg.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Scrivi un messaggio..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Invia
            </button>
          </div>
        </div>
      </div>
    );
  };

  // === RENDER: Tab Gantt ===
  const renderGanttTab = () => {
    if (!pratica) return null;

    const now = new Date();
    const praticaStart = new Date(pratica.dataAffidamento || pratica.createdAt);

    const phaseBars = (pratica.storico || []).map((st, idx) => {
      const fase = fasi.find((f) => f.id === st.faseId);
      const start = st.dataInizio ? new Date(st.dataInizio) : praticaStart;
      const end = st.dataFine ? new Date(st.dataFine) : now;
      return {
        id: `fase-${st.faseId}-${idx}`,
        title: fase?.nome || 'Fase',
        start,
        end,
        colore: fase?.colore || '#6366F1',
      };
    });

    const milestones = [
      {
        id: 'apertura',
        title: 'Apertura Pratica',
        date: praticaStart,
        type: 'apertura' as const,
      },
      ...alerts.map((alert) => ({
        id: `alert-${alert.id}`,
        title: alert.titolo,
        date: new Date(alert.dataScadenza),
        type: alert.stato === 'chiuso' ? ('alert-chiuso' as const) : ('alert-attivo' as const),
      })),
      ...(!pratica.aperta && pratica.updatedAt
        ? [
            {
              id: 'chiusura',
              title: 'Chiusura Pratica',
              date: new Date(pratica.updatedAt),
              type: 'chiusura' as const,
            },
          ]
        : []),
    ];

    const allDates = [
      praticaStart.getTime(),
      ...phaseBars.flatMap((bar) => [bar.start.getTime(), bar.end.getTime()]),
      ...milestones.map((m) => m.date.getTime()),
      now.getTime(),
    ];
    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    const range = maxDate - minDate || 1;

    const getPosition = (date: Date) => ((date.getTime() - minDate) / range) * 100;
    const getWidth = (start: Date, end: Date) =>
      Math.max(2, ((end.getTime() - start.getTime()) / range) * 100);

    const getMilestoneColor = (type: typeof milestones[0]['type']) => {
      switch (type) {
        case 'apertura':
          return 'bg-blue-500';
        case 'alert-attivo':
          return 'bg-amber-500';
        case 'alert-chiuso':
          return 'bg-slate-400';
        case 'chiusura':
          return 'bg-indigo-500';
        default:
          return 'bg-slate-500';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Diagramma di Gantt - Timeline Pratica
          </h3>
          <div className="text-xs text-slate-500">
            {phaseBars.length} fasi • {milestones.length} milestone
          </div>
        </div>

        {phaseBars.length === 0 && milestones.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <GanttChart className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nessun dato da visualizzare</p>
            <p className="text-xs text-slate-400 mt-1">
              Le fasi e le scadenze appariranno qui
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Gantt con barre */}
            <div className="space-y-4">
              <div className="relative h-12 rounded-lg bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                  style={{ left: `${getPosition(now)}%` }}
                >
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-[10px] text-rose-500 font-semibold whitespace-nowrap">
                    Oggi
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {phaseBars.map((bar) => (
                  <div key={bar.id} className="flex items-center gap-3">
                    <div className="w-40 text-xs text-slate-600 dark:text-slate-400 truncate">
                      {bar.title}
                    </div>
                    <div className="relative flex-1 h-6 rounded bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full"
                        style={{
                          left: `${getPosition(bar.start)}%`,
                          width: `${getWidth(bar.start, bar.end)}%`,
                          backgroundColor: bar.colore,
                        }}
                        title={`${bar.title}: ${bar.start.toLocaleDateString('it-IT')} → ${bar.end.toLocaleDateString('it-IT')}`}
                      />
                    </div>
                    <div className="w-28 text-[10px] text-slate-500 text-right">
                      {bar.start.toLocaleDateString('it-IT')} → {bar.end.toLocaleDateString('it-IT')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Milestone */}
              <div className="relative h-8 rounded-lg bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${getPosition(milestone.date)}%` }}
                    title={`${milestone.title} - ${milestone.date.toLocaleDateString('it-IT')}`}
                  >
                    <div
                      className={`h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${getMilestoneColor(
                        milestone.type,
                      )}`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(minDate).toLocaleDateString('it-IT')}</span>
                <span>{new Date(maxDate).toLocaleDateString('it-IT')}</span>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Legenda:</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Apertura</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Alert Attivo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Alert Chiuso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Chiusura</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3 bg-rose-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Oggi</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // === RENDER: Tab Storico ===
  const renderStoricoTab = () => {
    if (!pratica?.storico?.length)
      return (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-500 dark:text-slate-400">Nessuna fase registrata</p>
        </div>
      );

    const storicoReversed = [...pratica.storico].reverse();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Storico Fasi</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {pratica.storico.length} {pratica.storico.length === 1 ? 'fase' : 'fasi'}
          </span>
        </div>

        <div className="space-y-3">
          {storicoReversed.map((evento, index) => {
            const isExpanded = expandedFaseIndex === index;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:shadow-md transition"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
                        <CalendarDays className="text-indigo-600 dark:text-indigo-300" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">{evento.faseNome}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(evento.dataInizio).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {evento.dataFine && (
                            <>
                              {' → '}
                              {new Date(evento.dataFine).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </>
                          )}
                        </p>
                        {evento.cambiatoDaNome && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Modificato da: {evento.cambiatoDaNome}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedFaseIndex(isExpanded ? null : index)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 transition"
                    >
                      {isExpanded ? 'Nascondi' : 'Vedi dettaglio'}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {evento.note && (
                    <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Note cambio fase:</p>
                      <p className="whitespace-pre-wrap">{evento.note}</p>
                    </div>
                  )}
                </div>

                {/* Sezione dettagli espandibile */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-4">
                    <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Dettagli Fase</h5>

                    {/* Note Fase */}
                    {evento.noteFase && (
                      <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">Note Fase:</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{evento.noteFase}</p>
                      </div>
                    )}

                    {/* Eventi durante la fase */}
                    {evento.eventi && evento.eventi.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-3">
                          Eventi durante questa fase ({evento.eventi.length}):
                        </p>
                        <div className="space-y-2">
                          {evento.eventi.map((ev, evIndex) => (
                            <div
                              key={evIndex}
                              className="flex items-start gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 rounded px-3 py-2 border-l-2 border-indigo-500"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`font-semibold ${
                                    ev.tipo === 'documento_caricato' ? 'text-emerald-700 dark:text-emerald-400' :
                                    ev.tipo === 'avvocato_aggiunto' || ev.tipo === 'avvocato_rimosso' ? 'text-indigo-700 dark:text-indigo-400' :
                                    ev.tipo === 'collaboratore_aggiunto' || ev.tipo === 'collaboratore_rimosso' ? 'text-purple-700 dark:text-purple-400' :
                                    ev.tipo === 'movimento_finanziario' ? 'text-amber-700 dark:text-amber-400' :
                                    ev.tipo === 'piano_ammortamento_creato' || ev.tipo === 'piano_ammortamento_pagamento' || ev.tipo === 'piano_ammortamento_storno' ? 'text-blue-700 dark:text-blue-400' :
                                    'text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {ev.tipo === 'documento_caricato' && '📄 Documento caricato'}
                                    {ev.tipo === 'avvocato_aggiunto' && '➕ Avvocato aggiunto'}
                                    {ev.tipo === 'avvocato_rimosso' && '➖ Avvocato rimosso'}
                                    {ev.tipo === 'collaboratore_aggiunto' && '➕ Collaboratore aggiunto'}
                                    {ev.tipo === 'collaboratore_rimosso' && '➖ Collaboratore rimosso'}
                                    {ev.tipo === 'movimento_finanziario' && '💰 Movimento finanziario'}
                                    {ev.tipo === 'note_fase_modificate' && '📝 Note fase modificate'}
                                    {ev.tipo === 'piano_ammortamento_creato' && '📅 Piano ammortamento creato'}
                                    {ev.tipo === 'piano_ammortamento_pagamento' && '💳 Pagamento rata'}
                                    {ev.tipo === 'piano_ammortamento_storno' && '↩️ Storno pagamento rata'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {new Date(ev.data).toLocaleString('it-IT', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <div className="text-slate-600 dark:text-slate-400">
                                  {ev.tipo === 'documento_caricato' && ev.dettagli?.nome}
                                  {(ev.tipo === 'avvocato_aggiunto' || ev.tipo === 'avvocato_rimosso') && ev.dettagli?.nome}
                                  {(ev.tipo === 'collaboratore_aggiunto' || ev.tipo === 'collaboratore_rimosso') && ev.dettagli?.nome}
                                  {ev.tipo === 'movimento_finanziario' && (
                                    <div>
                                      <span className="font-medium">{ev.dettagli?.tipo}</span>
                                      {' - '}
                                      <span className="font-semibold">{formatCurrency(ev.dettagli?.importo)}</span>
                                      {ev.dettagli?.oggetto && ` - ${ev.dettagli.oggetto}`}
                                      {ev.dettagli?.azione && (
                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                                          ev.dettagli.azione === 'inserimento'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                          {ev.dettagli.azione}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {ev.tipo === 'piano_ammortamento_creato' && (
                                    <div>
                                      <span>Capitale: <span className="font-semibold">{formatCurrency(ev.dettagli?.capitaleIniziale)}</span></span>
                                      {' - '}
                                      <span>Rate: <span className="font-semibold">{ev.dettagli?.numeroRate}</span></span>
                                      {ev.dettagli?.applicaInteressi && ev.dettagli?.totaleInteressi > 0 && (
                                        <>
                                          {' - '}
                                          <span>Interessi: <span className="font-semibold">{formatCurrency(ev.dettagli?.totaleInteressi)}</span></span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  {ev.tipo === 'piano_ammortamento_pagamento' && (
                                    <div>
                                      <span>Rata <span className="font-semibold">{ev.dettagli?.numeroRata}</span></span>
                                      {' - '}
                                      <span>Importo: <span className="font-semibold">{formatCurrency(ev.dettagli?.importo)}</span></span>
                                      {ev.dettagli?.quotaCapitale > 0 && (
                                        <span className="text-[10px] ml-2">
                                          (Cap: {formatCurrency(ev.dettagli?.quotaCapitale)}
                                          {ev.dettagli?.quotaInteressi > 0 && `, Int: ${formatCurrency(ev.dettagli?.quotaInteressi)}`})
                                        </span>
                                      )}
                                      {ev.dettagli?.codicePagamento && (
                                        <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
                                          Rif: {ev.dettagli.codicePagamento}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {ev.tipo === 'piano_ammortamento_storno' && (
                                    <div>
                                      <span>Rata <span className="font-semibold">{ev.dettagli?.numeroRata}</span></span>
                                      {' - '}
                                      <span>Importo stornato: <span className="font-semibold">{formatCurrency(ev.dettagli?.importo)}</span></span>
                                    </div>
                                  )}
                                </div>
                                {ev.eseguitoDa && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                    da {ev.eseguitoDa}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Messaggio se non ci sono eventi */}
                    {!evento.noteFase && (!evento.eventi || evento.eventi.length === 0) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-4">
                        Nessun evento durante questa fase
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !pratica) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <XCircle className="h-16 w-16 text-rose-500" />
        <p className="text-lg text-slate-600 dark:text-slate-400">{error || 'Pratica non trovata'}</p>
        <button
          onClick={() => navigate('/pratiche')}
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto p-6 space-y-6 wow-stagger">
        {/* Header con breadcrumb e azioni */}
        <div className="wow-card p-4 md:p-5 mb-6">
          <button
            onClick={() => navigate('/pratiche')}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alle pratiche
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {pratica.cliente?.ragioneSociale} vs {getDebitoreDisplayName(pratica.debitore)}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Numero Pratica: {pratica.numeroPratica || 'N/D'} • Fase: {getFaseById(pratica.faseId)?.nome || 'N/D'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!pratica.aperta && pratica.attivo && (
                <button
                  onClick={handleExportReport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800"
                >
                  <FileDown className="h-4 w-4" />
                  Esporta PDF
                </button>
              )}
              {!pratica.aperta && pratica.attivo && (
                <button
                  onClick={handleRiapri}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 dark:text-amber-300 dark:bg-amber-900/50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Riapri
                </button>
              )}
              {pratica.attivo ? (
                <button
                  onClick={handleDeactivate}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800"
                >
                  <PowerOff className="h-4 w-4" />
                  Disattiva
                </button>
              ) : (
                <button
                  onClick={handleReactivatePratica}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800"
                >
                  <Power className="h-4 w-4" />
                  Riattiva
                </button>
              )}
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-800"
              >
                <Trash2 className="h-4 w-4" />
                Elimina
              </button>
            </div>
          </div>

          {!pratica.attivo && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              Pratica disattivata
            </div>
          )}
        </div>

        {/* Progress Stepper */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 overflow-hidden">
          {renderProgressStepper()}
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Panoramica', icon: FileEdit },
              { id: 'movimenti', label: 'Movimenti', icon: Receipt },
              { id: 'documenti', label: 'Documenti', icon: Folder },
              { id: 'alerts', label: 'Alert', icon: Bell },
              { id: 'tickets', label: 'Ticket', icon: TicketIcon },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'storico', label: 'Storico', icon: History },
              { id: 'gantt', label: 'Gantt', icon: GanttChart },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === id
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 dark:text-slate-400 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'movimenti' && renderMovimentiTab()}
          {activeTab === 'documenti' && renderDocumentiTab()}
          {activeTab === 'alerts' && renderAlertsTab()}
          {activeTab === 'tickets' && renderTicketsTab()}
          {activeTab === 'chat' && renderChatTab()}
          {activeTab === 'storico' && renderStoricoTab()}
          {activeTab === 'gantt' && renderGanttTab()}
        </div>
      </div>

      {/* Modal Cambio Fase */}
      {showCambioFase && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseCambioFase} />
            <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Modifica fase</h2>
              <button onClick={handleCloseCambioFase} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Seleziona fase *</label>
                <CustomSelect
                  options={faseOptions}
                  value={cambioFaseData.nuovaFaseId}
                  onChange={(id) => updateCambioFaseData('nuovaFaseId', id)}
                  placeholder="Seleziona fase..."
                />
                {fasiDisponibili.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">Nessuna fase disponibile.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFaseChiusuraSelected ? 'Note finali per report' : 'Note chiusura fase'}
                </label>
                <textarea
                  value={cambioFaseData.note}
                  onChange={(e) => updateCambioFaseData('note', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder={isFaseChiusuraSelected ? 'Inserisci note finali da includere nel report...' : 'Note...'}
                />
                {isFaseChiusuraSelected && (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Queste note verranno mostrate nel report PDF della pratica chiusa.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleCloseCambioFase}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleCambiaFaseWithConfirm}
                disabled={savingCambioFase || !cambioFaseData.nuovaFaseId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4" />
                {savingCambioFase ? 'Cambio...' : 'Imposta'}
              </button>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}

      {/* Modal Storico Fase */}
      {selectedStoricoFase && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedStoricoFase(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-full ${
                    selectedStoricoFase.dataFine ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-indigo-100 dark:bg-indigo-900/50'
                  }`}
                >
                  {selectedStoricoFase.dataFine ? (
                    <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{selectedStoricoFase.faseNome}</h2>
                  <p className="text-xs text-slate-500">{selectedStoricoFase.dataFine ? 'Fase completata' : 'Fase in corso'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStoricoFase(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">Inizio</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {new Date(selectedStoricoFase.dataInizio).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ${
                    selectedStoricoFase.dataFine ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'
                  }`}
                >
                  <p
                    className={`text-[10px] font-medium uppercase tracking-wide mb-1 ${
                      selectedStoricoFase.dataFine ? 'text-indigo-600' : 'text-indigo-600'
                    }`}
                  >
                    {selectedStoricoFase.dataFine ? 'Fine' : 'Stato'}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      selectedStoricoFase.dataFine
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    {selectedStoricoFase.dataFine
                      ? new Date(selectedStoricoFase.dataFine).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'In corso'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Note cambio fase</p>
                {selectedStoricoFase.note ? (
                  <div
                    className={`p-3 rounded-xl border-l-4 ${
                      selectedStoricoFase.dataFine
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500'
                        : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500'
                    }`}
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedStoricoFase.note}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Nessuna nota</p>
                )}
              </div>
              {selectedStoricoFase.noteFase && (
                <div className="mt-4">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Note fase</p>
                  <div
                    className={`p-3 rounded-xl border-l-4 ${
                      selectedStoricoFase.dataFine
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                    }`}
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedStoricoFase.noteFase}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedStoricoFase(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}

      {/* Modal Riprendi Interessi */}
      {showRiprendiInteressi && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowRiprendiInteressi(false)}
            />
            <div className="modal-content relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900">
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                  Riprendi maturazione interessi
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Gli interessi riprenderanno a maturare dalla data che selezioni fino ad oggi.
                  L'importo calcolato nel periodo precedente (fino al {pratica?.dataFineMaturazione && new Date(pratica.dataFineMaturazione).toLocaleDateString('it-IT')})
                  rimarrà fisso, mentre il nuovo periodo verrà calcolato separatamente.
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nuova data inizio maturazione
                  </label>
                  <DateField
                    value={nuovaDataInizioInteressi}
                    onChange={(value) => setNuovaDataInizioInteressi(value || '')}
                    placeholder="Seleziona data"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Suggerito: {pratica?.dataFineMaturazione && new Date(new Date(pratica.dataFineMaturazione).getTime() + 86400000).toLocaleDateString('it-IT')} (giorno successivo alla fine precedente)
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRiprendiInteressi(false);
                      setNuovaDataInizioInteressi('');
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleRiprendiInteressi}
                    disabled={!nuovaDataInizioInteressi}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Riprendi maturazione
                  </button>
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
