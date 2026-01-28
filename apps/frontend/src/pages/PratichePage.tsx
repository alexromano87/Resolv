// apps/frontend/src/pages/PratichePage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  Edit2,
} from 'lucide-react';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { SearchableClienteSelect } from '../components/ui/SearchableClienteSelect';
import { SearchableDebitoreSelect } from '../components/ui/SearchableDebitoreSelect';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DateField } from '../components/ui/DateField';
import { AvvocatiMultiSelect } from '../components/ui/AvvocatiMultiSelect';
import { CollaboratoriMultiSelect } from '../components/ui/CollaboratoriMultiSelect';
import { movimentiFinanziariApi, type TotaliMovimenti } from '../api/movimenti-finanziari';
import {
  fetchPratiche,
  createPratica,
  cambiaFasePratica,
  formatCurrency,
  getDebitoreDisplayName,
  type Pratica,
  type PraticaCreatePayload,
  type CambiaFasePayload,
} from '../api/pratiche';
import { fetchFasi, type Fase } from '../api/fasi';
import { fetchClienti, type Cliente } from '../api/clienti';
import { fetchDebitoriForCliente, type Debitore } from '../api/debitori';
import { avvocatiApi, type Avvocato } from '../api/avvocati';
import { collaboratoriApi } from '../api/collaboratori';
import type { User } from '../api/auth';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/ui/ToastProvider';
import { useAuth } from '../contexts/AuthContext';

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

const toNumber = (value: number | string | null | undefined) => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const defaultTotals: TotaliMovimenti = {
  capitale: 0,
  anticipazioni: 0,
  compensi: 0,
  interessi: 0,
  recuperoCapitale: 0,
  recuperoAnticipazioni: 0,
  recuperoCompensi: 0,
  recuperoInteressi: 0,
};

export function PratichePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const canChangeFase = user?.ruolo !== 'segreteria';

  // Data states
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [fasi, setFasi] = useState<Fase[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [debitoriForCliente, setDebitoriForCliente] = useState<Debitore[]>([]);
  const [avvocati, setAvvocati] = useState<Avvocato[]>([]);
  const [collaboratori, setCollaboratori] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Loading states
  const [loadingPratiche, setLoadingPratiche] = useState(false);
  const [loadingClienti, setLoadingClienti] = useState(true);
  const [loadingDebitori, setLoadingDebitori] = useState(false);
  const [loadingAvvocati, setLoadingAvvocati] = useState(true);
  const [loadingCollaboratori, setLoadingCollaboratori] = useState(true);
  const [movimentiPerPratica, setMovimentiPerPratica] = useState<Record<string, TotaliMovimenti>>({});

  // Filter states
  const [filterClienteId, setFilterClienteId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedClienteId, setAppliedClienteId] = useState<string | null>(null);
  const [appliedShowInactive, setAppliedShowInactive] = useState(false);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // New pratica form states
  const [showNewForm, setShowNewForm] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [newForm, setNewForm] = useState<PraticaCreatePayload>({
    clienteId: '',
    debitoreId: '',
    numeroPratica: '',
    capitale: 0,
    anticipazioni: 0,
    compensiLegali: 0,
    interessi: 0,
    dataAffidamento: '',
    note: '',
    avvocatiIds: [],
    collaboratoriIds: [],
    applicaInteressi: false,
    tipoInteresse: undefined,
    tassoInteresse: undefined,
    dataInizioInteressi: undefined,
    dataFineMaturazione: undefined,
    moratorioPre2013: false,
    moratorioMaggiorazione: false,
    moratorioPctMaggiorazione: undefined,
  });
  const [capitaleInput, setCapitaleInput] = useState('');
  const [noteNuovaPratica, setNoteNuovaPratica] = useState('');
  const [suggerimentoNumero, setSuggerimentoNumero] = useState<string>('');
  const [loadingSuggerimento, setLoadingSuggerimento] = useState(false);

  // Status modification states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPratica, setSelectedPratica] = useState<Pratica | null>(null);
  const [selectedFaseId, setSelectedFaseId] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const getPraticaImporti = (p: Pratica) => {
    const t = movimentiPerPratica[p.id] || defaultTotals;
    return {
      capitale: toNumber(p.capitale) + toNumber(t.capitale),
      recuperatoCapitale: toNumber(p.importoRecuperatoCapitale) + toNumber(t.recuperoCapitale),
      anticipazioni: toNumber(p.anticipazioni) + toNumber(t.anticipazioni),
      recuperatoAnticipazioni: toNumber(p.importoRecuperatoAnticipazioni) + toNumber(t.recuperoAnticipazioni),
      compensi: toNumber(p.compensiLegali) + toNumber(t.compensi),
      recuperatoCompensi: toNumber(p.compensiLiquidati) + toNumber(t.recuperoCompensi),
      interessi: toNumber(p.interessi) + toNumber(t.interessi),
      recuperatoInteressi: toNumber(p.interessiRecuperati) + toNumber(t.recuperoInteressi),
    };
  };

  // Load initial data (don't load pratiche immediately)
  useEffect(() => {
    loadFasi();
    loadClienti();
    loadAvvocati();
    loadCollaboratori();
  }, []);


  // Load debitori when cliente changes in new form
  useEffect(() => {
    if (newForm.clienteId) {
      loadDebitoriForCliente(newForm.clienteId);
    } else {
      setDebitoriForCliente([]);
    }
  }, [newForm.clienteId]);

  const loadPratiche = async (params?: {
    clienteId: string | null;
    includeInactive: boolean;
    searchTerm: string;
  }) => {
    try {
      setLoadingPratiche(true);
      const current = params ?? {
        clienteId: appliedClienteId,
        includeInactive: appliedShowInactive,
        searchTerm: appliedSearchTerm,
      };
      // Passa il clienteId al backend per filtrare lato server
      const options: { includeInactive?: boolean; clienteId?: string } = {
        includeInactive: current.includeInactive,
      };
      if (current.clienteId) {
        options.clienteId = current.clienteId;
      }
      const data = await fetchPratiche(options);
      setPratiche(data);

      // Carica totali movimenti per allineare capitale/anticipazioni/compensi con i movimenti finanziari
      const totals = await Promise.all(
        data.map(async (p) => {
          try {
            const t = await movimentiFinanziariApi.getTotaliByPratica(p.id);
            return { id: p.id, totals: t };
          } catch (err) {
            console.error('Errore caricamento totali movimenti pratica', p.id, err);
            return { id: p.id, totals: null };
          }
        }),
      );
      const map: Record<string, TotaliMovimenti> = {};
      totals.forEach(({ id, totals }) => {
        if (totals) map[id] = totals;
      });
      setMovimentiPerPratica(map);
    } catch (err) {
      console.error('Errore caricamento pratiche:', err);
      setError('Impossibile caricare le pratiche');
    } finally {
      setLoadingPratiche(false);
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

  const loadClienti = async () => {
    try {
      setLoadingClienti(true);
      const data = await fetchClienti();
      setClienti(data);
    } catch (err) {
      console.error('Errore caricamento clienti:', err);
    } finally {
      setLoadingClienti(false);
    }
  };

  const loadDebitoriForCliente = async (clienteId: string) => {
    try {
      setLoadingDebitori(true);
      const data = await fetchDebitoriForCliente(clienteId);
      setDebitoriForCliente(data);
    } catch (err) {
      console.error('Errore caricamento debitori:', err);
    } finally {
      setLoadingDebitori(false);
    }
  };

  const loadAvvocati = async () => {
    try {
      setLoadingAvvocati(true);
      const data = await avvocatiApi.getAll();
      setAvvocati(data);
    } catch (err) {
      console.error('Errore caricamento avvocati:', err);
    } finally {
      setLoadingAvvocati(false);
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

  const updateNewForm = (field: keyof PraticaCreatePayload, value: any) => {
    setNewForm((prev) => ({ ...prev, [field]: value }));
  };

  const computeSuggerimentoNumero = async () => {
    try {
      setLoadingSuggerimento(true);
      const tutte = await fetchPratiche({ includeInactive: true });
      let maxProgressivo = 0;
      tutte.forEach((p) => {
        const raw = p.numeroPratica;
        if (!raw) return;
        const numericPart = parseInt(String(raw).replace(/\D/g, ''), 10);
        if (!Number.isNaN(numericPart)) {
          maxProgressivo = Math.max(maxProgressivo, numericPart);
        }
      });
      const next = (maxProgressivo || 0) + 1;
      setSuggerimentoNumero(String(next));
      // se l'utente non ha già scritto un numero, proponi il suggerimento
      setNewForm((prev) => ({
        ...prev,
        numeroPratica: prev.numeroPratica && prev.numeroPratica.trim() !== '' ? prev.numeroPratica : String(next),
      }));
    } catch (err) {
      console.error('Errore calcolo suggerimento numero pratica:', err);
    } finally {
      setLoadingSuggerimento(false);
    }
  };

  const resetNewForm = () => {
    setNewForm({
      clienteId: '',
      debitoreId: '',
      numeroPratica: '',
      capitale: 0,
      anticipazioni: 0,
      compensiLegali: 0,
      interessi: 0,
      dataAffidamento: '',
      note: '',
      avvocatiIds: [],
      collaboratoriIds: [],
      applicaInteressi: false,
      tipoInteresse: undefined,
      tassoInteresse: undefined,
      dataInizioInteressi: undefined,
      dataFineMaturazione: undefined,
      moratorioPre2013: false,
      moratorioMaggiorazione: false,
      moratorioPctMaggiorazione: undefined,
    });
    setCapitaleInput('');
    setNoteNuovaPratica('');
    setSubmitAttempted(false);
    setSuggerimentoNumero('');
  };

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      resetNewForm();
      setShowNewForm(true);
      searchParams.delete('new');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (showNewForm) {
      computeSuggerimentoNumero();
    }
  }, [showNewForm]);

  const handleCreatePratica = async () => {
    setSubmitAttempted(true);
    if (!newForm.clienteId || !newForm.debitoreId) {
      toastError('Compila i campi obbligatori per creare la pratica');
      return;
    }
    const cliente = clienti.find((c) => c.id === newForm.clienteId);
    const debitore = debitoriForCliente.find((d) => d.id === newForm.debitoreId);
    const clienteNome = cliente?.ragioneSociale || 'Cliente';
    const debitoreNome =
      debitore?.tipoSoggetto === 'persona_fisica'
        ? `${debitore.nome || ''} ${debitore.cognome || ''}`.trim() || 'Debitore'
        : debitore?.ragioneSociale || 'Debitore';
    const capitaleStr = newForm.capitale
      ? `€ ${newForm.capitale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
      : 'non specificato';

    const conferma = await confirm({
      title: 'Conferma apertura',
      message: `Cliente: ${clienteNome}\nDebitore: ${debitoreNome}\nNumero pratica: ${newForm.numeroPratica || suggerimentoNumero || 'non assegnato'}\nCapitale: ${capitaleStr}`,
      confirmText: 'Apri pratica',
      variant: 'info',
    });
    if (!conferma) return;

    try {
      setSavingNew(true);
      const formData: PraticaCreatePayload = {
        ...newForm,
        numeroPratica: newForm.numeroPratica?.trim() || suggerimentoNumero || undefined,
      };
      if (noteNuovaPratica.trim()) formData.note = noteNuovaPratica.trim();

      const created = await createPratica(formData);
      success('Pratica creata con successo');
      if (hasSearched) {
        await loadPratiche();
      }
      setShowNewForm(false);
      resetNewForm();
      if (created?.id) {
        navigate(`/pratiche/${created.id}`);
      }
    } catch (err) {
      console.error('Errore creazione pratica:', err);
      toastError('Errore durante la creazione della pratica');
    } finally {
      setSavingNew(false);
    }
  };

  const handleFilterByCliente = (clienteId: string | null) => {
    setFilterClienteId(clienteId);
  };

  const handleSearch = async () => {
    if (!filterClienteId && !searchTerm.trim()) {
      toastError('Seleziona un cliente o inserisci un criterio di ricerca');
      return;
    }
    const next = {
      clienteId: filterClienteId,
      includeInactive: showInactive,
      searchTerm: searchTerm.trim(),
    };
    setAppliedClienteId(next.clienteId);
    setAppliedShowInactive(next.includeInactive);
    setAppliedSearchTerm(next.searchTerm);
    setHasSearched(true);
    setCurrentPage(1);
    await loadPratiche(next);
  };


  const getFaseById = (faseId: string): Fase | undefined => {
    return fasi.find((f) => f.id === faseId);
  };

  const handleOpenStatusModal = (pratica: Pratica, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPratica(pratica);
    setSelectedFaseId(pratica.faseId);
    setStatusNote('');
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedPratica(null);
    setSelectedFaseId('');
    setStatusNote('');
  };

  const handleChangeFase = async () => {
    if (!selectedPratica || !selectedFaseId) return;

    const nuovaFase = getFaseById(selectedFaseId);
    if (!nuovaFase) return;

    const cliente = selectedPratica.cliente?.ragioneSociale || 'Cliente';
    const debitore = getDebitoreDisplayName(selectedPratica.debitore);

    if (
      await confirm({
        title: 'Conferma modifica stato',
        message: `Vuoi cambiare lo stato della pratica "${cliente} vs ${debitore}" in "${nuovaFase.nome}"?`,
        confirmText: 'Modifica stato',
        variant: 'info',
      })
    ) {
      try {
        setSavingStatus(true);
        const payload: CambiaFasePayload = {
          nuovaFaseId: selectedFaseId,
        };
        if (statusNote.trim()) {
          payload.note = statusNote.trim();
        }

        await cambiaFasePratica(selectedPratica.id, payload);
        success('Stato pratica aggiornato');
        await loadPratiche();
        handleCloseStatusModal();
      } catch (err) {
        console.error('Errore cambio fase:', err);
        toastError('Errore durante il cambio stato');
      } finally {
        setSavingStatus(false);
      }
    }
  };

  // Filtered pratiche (client-side filtering for search only)
  // Il filtro per cliente e showInactive è già applicato lato server
  const filteredPratiche = pratiche.filter((p) => {
    // Filter by search term (client-side per ricerca testuale)
    if (appliedSearchTerm) {
      const search = appliedSearchTerm.toLowerCase();
      const clienteMatch = p.cliente?.ragioneSociale?.toLowerCase().includes(search);
      const debitoreMatch = getDebitoreDisplayName(p.debitore).toLowerCase().includes(search);
      const praticaNumeroMatch = p.numeroPratica?.toLowerCase().includes(search) || false;
      if (!clienteMatch && !debitoreMatch && !praticaNumeroMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="space-y-1.5">
          <span className="wow-chip">Operatività</span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            Pratiche
          </h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Gestisci le pratiche di recupero crediti e monitora ogni fase in tempo reale.
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="wow-button"
        >
          <Plus className="h-5 w-5" />
          Nuova pratica
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="wow-panel p-5 relative z-30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Filtra per cliente
            </label>
            <SearchableClienteSelect
              clienti={clienti}
              loading={loadingClienti}
              value={filterClienteId}
              onChange={handleFilterByCliente}
              placeholder="Tutti i clienti..."
              allowClear
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cerca
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca cliente, debitore o numero pratica..."
                className="w-full rounded-2xl border border-white/70 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Opzioni
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="flex items-center gap-1.5">
                  {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Mostra disattivate
                </span>
              </label>
              <button
                type="button"
                onClick={handleSearch}
                className="wow-button text-xs"
                disabled={loadingPratiche}
              >
                Cerca
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pratiche Grid */}
      <div className="wow-panel overflow-hidden">
        {!hasSearched ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <span className="text-sm">Seleziona i filtri e clicca "Cerca" per visualizzare le pratiche.</span>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {filteredPratiche.length} {filteredPratiche.length === 1 ? 'pratica' : 'pratiche'}
              </h2>
              <button
                onClick={() => loadPratiche()}
                disabled={loadingPratiche}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <RefreshCw className={`h-4 w-4 ${loadingPratiche ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingPratiche ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin mr-3" />
                <span className="text-sm">Caricamento...</span>
              </div>
            ) : filteredPratiche.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nessuna pratica trovata</p>
                {(filterClienteId || searchTerm || !showInactive) && (
                  <button
                    onClick={() => {
                      setFilterClienteId(null);
                      setSearchTerm('');
                      setShowInactive(true);
                      setAppliedClienteId(null);
                      setAppliedSearchTerm('');
                      setAppliedShowInactive(true);
                      setHasSearched(false);
                      setPratiche([]);
                    }}
                    className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Rimuovi filtri
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 p-4 wow-stagger">
                  {filteredPratiche
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((pratica) => {
                      const fase = getFaseById(pratica.faseId);
                      return (
                        <div
                          key={pratica.id}
                          className="relative text-left p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all group"
                        >
                          <button
                            onClick={() => navigate(`/pratiche/${pratica.id}`)}
                            className="absolute inset-0 z-0"
                            aria-label="Apri dettaglio pratica"
                          />
                          <div className="flex items-start gap-3">
                            <div
                              className="w-1.5 h-16 rounded-full flex-shrink-0"
                              style={{ backgroundColor: fase?.colore || '#6B7280' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {pratica.cliente?.ragioneSociale}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    vs {getDebitoreDisplayName(pratica.debitore)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 relative z-10">
                                  {canChangeFase && (
                                    <button
                                      onClick={(e) => handleOpenStatusModal(pratica, e)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                                      title="Modifica stato"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                  )}
                                  {!pratica.aperta && (
                                    <div
                                      className={`p-1 rounded-full ${
                                        pratica.esito === 'positivo'
                                          ? 'bg-indigo-100 dark:bg-indigo-900/50'
                                          : 'bg-rose-100 dark:bg-rose-900/50'
                                      }`}
                                    >
                                      {pratica.esito === 'positivo' ? (
                                        <CheckCircle className="h-3.5 w-3.5 text-indigo-600" />
                                      ) : (
                                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                                  style={{
                                    backgroundColor: `${fase?.colore}20`,
                                    color: fase?.colore,
                                  }}
                                >
                                  {fase?.nome || 'N/D'}
                                </span>
                                {!pratica.attivo && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                                    Disattivata
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Capitale</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  € {formatCurrency(getPraticaImporti(pratica).capitale)}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Stato</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {pratica.attivo ? 'Attiva' : 'Disattivata'}
                                </span>
                              </div>

                              {pratica.dataAffidamento && (
                                <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                  Affidamento: {new Date(pratica.dataAffidamento).toLocaleDateString('it-IT')}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Pratica numero: {pratica.numeroPratica || 'N/D'}
                            </span>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 group-hover:underline">
                              Vedi dettaglio →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredPratiche.length / ITEMS_PER_PAGE)}
                  totalItems={filteredPratiche.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* New Pratica Modal */}
      {showNewForm && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              resetNewForm();
              setShowNewForm(false);
            }}
          />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Nuova pratica</h2>
              <button
                onClick={() => {
                  resetNewForm();
                  setShowNewForm(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Cliente *
                  </label>
                  <SearchableClienteSelect
                    clienti={clienti}
                    loading={loadingClienti}
                    value={newForm.clienteId || null}
                    onChange={(id) => updateNewForm('clienteId', id || '')}
                    placeholder="Seleziona cliente..."
                    triggerClassName={
                      submitAttempted && !newForm.clienteId
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                        : ''
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Debitore *
                  </label>
                  <SearchableDebitoreSelect
                    debitori={debitoriForCliente}
                    loading={loadingDebitori}
                    value={newForm.debitoreId || null}
                    onChange={(id) => updateNewForm('debitoreId', id || '')}
                    placeholder={!newForm.clienteId ? 'Prima seleziona cliente' : 'Seleziona debitore...'}
                    disabled={!newForm.clienteId}
                    triggerClassName={
                      submitAttempted && !newForm.debitoreId
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                        : ''
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Avvocati
                </label>
                <AvvocatiMultiSelect
                  avvocati={avvocati}
                  selectedIds={newForm.avvocatiIds || []}
                  onChange={(ids) => updateNewForm('avvocatiIds', ids)}
                  loading={loadingAvvocati}
                  placeholder="Seleziona avvocati..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Collaboratori
                </label>
                <CollaboratoriMultiSelect
                  collaboratori={collaboratori}
                  selectedIds={newForm.collaboratoriIds || []}
                  onChange={(ids) => updateNewForm('collaboratoriIds', ids)}
                  loading={loadingCollaboratori}
                  placeholder="Seleziona collaboratori..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Numero pratica (proposto)
                  </label>
                  <input
                    type="text"
                    value={newForm.numeroPratica || ''}
                    onChange={(e) => updateNewForm('numeroPratica', e.target.value)}
                    placeholder={loadingSuggerimento ? 'Calcolo in corso...' : suggerimentoNumero || 'Inserisci numero pratica'}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {suggerimentoNumero && (
                    <p className="mt-1 text-xs text-slate-500">
                      Suggerimento: {suggerimentoNumero} (puoi modificarlo liberamente)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Capitale
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={capitaleInput}
                      onChange={(e) => setCapitaleInput(e.target.value)}
                      onFocus={() =>
                        setCapitaleInput(newForm.capitale ? newForm.capitale.toString().replace('.', ',') : '')
                      }
                      onBlur={(e) => {
                        const n = formatoItalianoANumero(e.target.value);
                        updateNewForm('capitale', n);
                        setCapitaleInput(numeroAFormatoItaliano(n));
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data affidamento
                  </label>
                  <DateField
                    value={newForm.dataAffidamento || ''}
                    onChange={(value) => updateNewForm('dataAffidamento', value)}
                    placeholder="Seleziona data affidamento"
                  />
                </div>
              </div>

              {/* Sezione Calcolo Interessi */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
                  Calcolo Interessi
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={newForm.applicaInteressi || false}
                      onChange={(e) => updateNewForm('applicaInteressi', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Applica calcolo automatico interessi
                  </label>

                  {newForm.applicaInteressi && (
                    <div className="space-y-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Tipo interesse
                        </label>
                        <CustomSelect
                          options={[
                            { value: '', label: 'Seleziona tipo' },
                            { value: 'legale', label: 'Interesse Legale' },
                            { value: 'moratorio', label: 'Interesse Moratorio' },
                            { value: 'fisso', label: 'Tasso Fisso Personalizzato' },
                          ]}
                          value={newForm.tipoInteresse || ''}
                          onChange={(value) => updateNewForm('tipoInteresse', value || null)}
                          placeholder="Seleziona tipo interesse..."
                        />
                      </div>

                      {newForm.tipoInteresse === 'fisso' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Tasso fisso (%)
                          </label>
                          <input
                            type="text"
                            value={newForm.tassoInteresse || ''}
                            onChange={(e) => updateNewForm('tassoInteresse', parseFloat(e.target.value) || null)}
                            placeholder="es. 5.50"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Data inizio interessi
                        </label>
                        <DateField
                          value={newForm.dataInizioInteressi || ''}
                          onChange={(value) => updateNewForm('dataInizioInteressi', value || null)}
                          placeholder="Seleziona data inizio interessi"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Data fine maturazione interessi <span className="text-xs text-slate-500">(opzionale)</span>
                        </label>
                        <DateField
                          value={newForm.dataFineMaturazione || ''}
                          onChange={(value) => updateNewForm('dataFineMaturazione', value || null)}
                          placeholder="Lascia vuoto per calcolare fino ad oggi"
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Se specificata, gli interessi verranno calcolati fino a questa data invece che fino ad oggi
                        </p>
                      </div>

                      {newForm.tipoInteresse === 'moratorio' && (
                        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={newForm.moratorioPre2013 || false}
                              onChange={(e) => updateNewForm('moratorioPre2013', e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Transazione conclusa entro il 31/12/2012
                          </label>

                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={newForm.moratorioMaggiorazione || false}
                              onChange={(e) => updateNewForm('moratorioMaggiorazione', e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Maggiorazione aggiuntiva per prodotti agricoli/agroalimentari
                          </label>

                          {newForm.moratorioMaggiorazione && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Percentuale maggiorazione (%)
                              </label>
                              <input
                                type="text"
                                value={newForm.moratorioPctMaggiorazione || ''}
                                onChange={(e) => updateNewForm('moratorioPctMaggiorazione', parseFloat(e.target.value) || null)}
                                placeholder="es. 4"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Note iniziali
                </label>
                <textarea
                  value={noteNuovaPratica}
                  onChange={(e) => setNoteNuovaPratica(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Note per la fase iniziale..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => {
                  resetNewForm();
                  setShowNewForm(false);
                }}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleCreatePratica}
                disabled={savingNew}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/30"
              >
                <Plus className="h-4 w-4" />
                {savingNew ? 'Creazione...' : 'Crea pratica'}
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
      )}

      {/* Status Modification Modal */}
      {showStatusModal && selectedPratica && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseStatusModal}
          />
          <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Modifica Stato</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {selectedPratica.cliente?.ragioneSociale} vs {getDebitoreDisplayName(selectedPratica.debitore)}
                </p>
              </div>
              <button
                onClick={handleCloseStatusModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Stato attuale
                </label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getFaseById(selectedPratica.faseId)?.colore || '#6B7280' }}
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {getFaseById(selectedPratica.faseId)?.nome || 'N/D'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nuovo stato *
                </label>
                <CustomSelect
                  options={fasi.map((f) => ({
                    value: f.id,
                    label: f.nome,
                    sublabel: f.codice,
                  }))}
                  value={selectedFaseId}
                  onChange={setSelectedFaseId}
                  placeholder="Seleziona nuovo stato..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Note
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Inserisci eventuali note sul cambio stato..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={handleCloseStatusModal}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleChangeFase}
                disabled={savingStatus || !selectedFaseId || selectedFaseId === selectedPratica.faseId}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/30"
              >
                <Edit2 className="h-4 w-4" />
                {savingStatus ? 'Salvataggio...' : 'Modifica stato'}
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
