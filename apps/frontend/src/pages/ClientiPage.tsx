import { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Eye,
  EyeOff,
  X,
  Save,
  Edit,
  RefreshCw,
  Share2,
  Copy,
  AlertCircle,
} from 'lucide-react';
import type { Cliente, ClienteTipoSoggetto, ConfigurazioneCondivisione, TipologiaAzienda } from '../api/clienti';
import {
  fetchClienti,
  createCliente,
  updateCliente,
  deleteCliente,
  deactivateCliente,
  reactivateCliente,
  fetchConfigurazioneCondivisione,
  updateConfigurazioneCondivisione,
} from '../api/clienti';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/ToastProvider';
import { CustomSelect } from '../components/ui/CustomSelect';
import { SearchableNazioneSelect } from '../components/ui/SearchableNazioneSelect';
import { PhoneInput } from '../components/ui/PhoneInput';
import { nazioniApi, type Nazione } from '../api/nazioni';

type ClienteFormState = {
  tipoSoggetto: ClienteTipoSoggetto;
  ragioneSociale: string;
  codiceFiscale: string;
  partitaIva: string;
  tipologia: TipologiaAzienda | '';
  sedeLegale: string;
  sedeOperativa: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  nazione: string;
  referente: string;
  referenteNome: string;
  referenteCognome: string;
  referenteEmail: string;
  telefono: string;
  email: string;
  pec: string;
};

const EMPTY_FORM: ClienteFormState = {
  tipoSoggetto: 'persona_giuridica',
  ragioneSociale: '',
  codiceFiscale: '',
  partitaIva: '',
  tipologia: '',
  sedeLegale: '',
  sedeOperativa: '',
  indirizzo: '',
  cap: '',
  citta: '',
  provincia: '',
  nazione: '',
  referente: '',
  referenteNome: '',
  referenteCognome: '',
  referenteEmail: '',
  telefono: '',
  email: '',
  pec: '',
};

function normalizeNazioneValue(value: string, nazioni: Nazione[]): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  const byCode = nazioni.find((n) => n.codice === upper);
  if (byCode) return byCode.codice;
  const lower = trimmed.toLowerCase();
  const byName = nazioni.find((n) => n.nome.toLowerCase() === lower);
  return byName ? byName.codice : trimmed;
}

function clienteToFormState(c: Cliente | null, nazioni: Nazione[]): ClienteFormState {
  if (!c) return EMPTY_FORM;
  return {
    tipoSoggetto: c.tipoSoggetto ?? 'persona_giuridica',
    ragioneSociale: c.ragioneSociale ?? '',
    codiceFiscale: c.codiceFiscale ?? '',
    partitaIva: c.partitaIva ?? '',
    tipologia: c.tipologia ?? '',
    sedeLegale: c.sedeLegale ?? '',
    sedeOperativa: c.sedeOperativa ?? '',
    indirizzo: c.indirizzo ?? '',
    cap: c.cap ?? '',
    citta: c.citta ?? '',
    provincia: c.provincia ?? '',
    nazione: normalizeNazioneValue(c.nazione ?? '', nazioni),
    referente: c.referente ?? '',
    referenteNome: c.referenteNome ?? '',
    referenteCognome: c.referenteCognome ?? '',
    referenteEmail: c.referenteEmail ?? '',
    telefono: c.telefono ?? '',
    email: c.email ?? '',
    pec: c.pec ?? '',
  };
}

export function ClientiPage() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { success, error: toastError } = useToast();

  if (!['admin', 'titolare_studio', 'segreteria'].includes(user?.ruolo ?? '')) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">
          Accesso negato
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Non hai i permessi per accedere a questa sezione.
        </p>
      </div>
    );
  }

  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClienteFormState>(EMPTY_FORM);
  const [nazioni, setNazioni] = useState<Nazione[]>([]);
  const [nazioniLoading, setNazioniLoading] = useState(false);
  const tipologiaDisabled = isViewing || formData.tipoSoggetto === 'persona_fisica';

  // Sharing configuration
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [sharingCliente, setSharingCliente] = useState<Cliente | null>(null);
  const [sharingConfig, setSharingConfig] = useState<ConfigurazioneCondivisione | null>(null);
  const [loadingSharing, setLoadingSharing] = useState(false);

  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    ragioneSociale: '',
    partitaIva: '',
    codiceFiscale: '',
    citta: '',
    email: '',
    telefono: '',
  });

  const loadNazioni = async () => {
    try {
      setNazioniLoading(true);
      const data = await nazioniApi.getAll(true);
      setNazioni(data);
    } catch (err: any) {
      console.error('Errore caricamento nazioni:', err);
      toastError(err.message || 'Errore durante il caricamento delle nazioni');
    } finally {
      setNazioniLoading(false);
    }
  };

  useEffect(() => {
    loadNazioni();
  }, []);

  useEffect(() => {
    if (!nazioni.length) return;
    if (!formData.nazione) return;
    const normalized = normalizeNazioneValue(formData.nazione, nazioni);
    if (normalized !== formData.nazione) {
      setFormData((prev) => ({ ...prev, nazione: normalized }));
    }
  }, [nazioni, formData.nazione]);

  const loadClienti = async () => {
    try {
      setLoading(true);
      const data = await fetchClienti(showInactive);
      const filtered = data.filter((cliente) => {
        const ragione = cliente.ragioneSociale?.toLowerCase() || '';
        const piva = cliente.partitaIva?.toLowerCase() || '';
        const cf = cliente.codiceFiscale?.toLowerCase() || '';
        const citta = cliente.citta?.toLowerCase() || '';
        const email = cliente.email?.toLowerCase() || '';
        const telefono = cliente.telefono || '';

        return (
          (!filters.ragioneSociale || ragione.includes(filters.ragioneSociale.toLowerCase())) &&
          (!filters.partitaIva || piva.includes(filters.partitaIva.toLowerCase())) &&
          (!filters.codiceFiscale || cf.includes(filters.codiceFiscale.toLowerCase())) &&
          (!filters.citta || citta.includes(filters.citta.toLowerCase())) &&
          (!filters.email || email.includes(filters.email.toLowerCase())) &&
          (!filters.telefono || telefono.includes(filters.telefono))
        );
      });
      setClienti(filtered);
      setError(null);
    } catch (err: any) {
      console.error('Errore caricamento clienti:', err);
      setError(err.message || 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = async () => {
    setHasSearched(true);
    setCurrentPage(1);
    await loadClienti();
  };

  const getDefaultNazione = () => {
    return nazioni.find((n) => n.codice === 'IT') ? 'IT' : '';
  };

  const handleResetFilters = () => {
    setFilters({
      ragioneSociale: '',
      partitaIva: '',
      codiceFiscale: '',
      citta: '',
      email: '',
      telefono: '',
    });
    setHasSearched(false);
    setClienti([]);
    setError(null);
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM, nazione: getDefaultNazione() });
    setSubmitAttempted(false);
  };

  const handleCreate = async () => {
    if (!formData.ragioneSociale || !formData.email) {
      setSubmitAttempted(true);
      setInlineError('Compila i campi obbligatori: Ragione sociale ed Email.');
      return;
    }

    if (await confirm({
      title: 'Conferma creazione',
      message: `Creare cliente ${formData.ragioneSociale}?`,
      confirmText: 'Crea',
      variant: 'info',
    })) {
      try {
        setSaving(true);
        setInlineError(null);
        const payload = {
          tipoSoggetto: formData.tipoSoggetto,
          ragioneSociale: formData.ragioneSociale.trim(),
          codiceFiscale: formData.codiceFiscale.trim() || undefined,
          partitaIva: formData.partitaIva.trim() || undefined,
          tipologia: formData.tipologia || undefined,
          sedeLegale: formData.sedeLegale.trim() || undefined,
          sedeOperativa: formData.sedeOperativa.trim() || undefined,
          indirizzo: formData.indirizzo.trim() || undefined,
          cap: formData.cap.trim() || undefined,
          citta: formData.citta.trim() || undefined,
          provincia: formData.provincia.trim() || undefined,
          nazione: formData.nazione.trim() ? formData.nazione.trim().toUpperCase() : undefined,
          referente: formData.referente.trim() || undefined,
          referenteNome: formData.referenteNome.trim() || undefined,
          referenteCognome: formData.referenteCognome.trim() || undefined,
          referenteEmail: formData.referenteEmail.trim() || undefined,
          telefono: formData.telefono.trim() || undefined,
          email: formData.email.trim(),
          pec: formData.pec.trim() || undefined,
        };
        await createCliente(payload as any);
        success('Cliente creato con successo');
        await loadClienti();
        setShowNewForm(false);
        resetForm();
      } catch (err: any) {
        setSubmitAttempted(true);
        setInlineError(err.message || 'Errore nella creazione');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedCliente) return;
    if (!formData.ragioneSociale || !formData.email) {
      setSubmitAttempted(true);
      setInlineError('Compila i campi obbligatori: Ragione sociale ed Email.');
      return;
    }

    if (await confirm({
      title: 'Conferma modifica',
      message: `Salvare le modifiche per ${selectedCliente.ragioneSociale}?`,
      confirmText: 'Salva',
      variant: 'info',
    })) {
      try {
        setSaving(true);
        setInlineError(null);
        const payload = {
          tipoSoggetto: formData.tipoSoggetto,
          ragioneSociale: formData.ragioneSociale.trim(),
          codiceFiscale: formData.codiceFiscale.trim() || undefined,
          partitaIva: formData.partitaIva.trim() || undefined,
          tipologia: formData.tipologia || undefined,
          sedeLegale: formData.sedeLegale.trim() || undefined,
          sedeOperativa: formData.sedeOperativa.trim() || undefined,
          indirizzo: formData.indirizzo.trim() || undefined,
          cap: formData.cap.trim() || undefined,
          citta: formData.citta.trim() || undefined,
          provincia: formData.provincia.trim() || undefined,
          nazione: formData.nazione.trim() ? formData.nazione.trim().toUpperCase() : undefined,
          referente: formData.referente.trim() || undefined,
          referenteNome: formData.referenteNome.trim() || undefined,
          referenteCognome: formData.referenteCognome.trim() || undefined,
          referenteEmail: formData.referenteEmail.trim() || undefined,
          telefono: formData.telefono.trim() || undefined,
          email: formData.email.trim(),
          pec: formData.pec.trim() || undefined,
        };
        await updateCliente(selectedCliente.id, payload as any);
        success('Cliente aggiornato con successo');
        await loadClienti();
        setIsEditing(false);
        setIsViewing(true);
        const updatedCliente = await fetchClienti(showInactive).then(data =>
          data.find(c => c.id === selectedCliente.id)
        );
        if (updatedCliente) {
          setSelectedCliente(updatedCliente);
          setFormData(clienteToFormState(updatedCliente, nazioni));
        }
      } catch (err: any) {
        setSubmitAttempted(true);
        setInlineError(err.message || 'Errore nell\'aggiornamento');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeactivate = async (cliente: Cliente) => {
    if (await confirm({
      title: 'Disattiva cliente',
      message: `Disattivare ${cliente.ragioneSociale}?`,
      confirmText: 'Disattiva',
      variant: 'warning',
    })) {
      try {
        await deactivateCliente(cliente.id);
        success('Cliente disattivato');
        await loadClienti();
      } catch (err: any) {
        toastError(err.message || 'Errore durante la disattivazione');
      }
    }
  };

  const handleReactivate = async (cliente: Cliente) => {
    if (await confirm({
      title: 'Riattiva cliente',
      message: `Riattivare ${cliente.ragioneSociale}?`,
      confirmText: 'Riattiva',
      variant: 'info',
    })) {
      try {
        await reactivateCliente(cliente.id);
        success('Cliente riattivato');
        await loadClienti();
      } catch (err: any) {
        toastError(err.message || 'Errore durante la riattivazione');
      }
    }
  };

  const handleDelete = async (cliente: Cliente) => {
    if (await confirm({
      title: 'Elimina cliente',
      message: `Eliminare definitivamente ${cliente.ragioneSociale}?\nQuesta operazione è irreversibile e fallirà se il cliente è associato a pratiche.`,
      confirmText: 'Elimina',
      variant: 'danger',
    })) {
      try {
        await deleteCliente(cliente.id);
        success('Cliente eliminato');
        await loadClienti();
      } catch (err: any) {
        toastError(err.message || 'Impossibile eliminare: cliente associato a pratiche');
      }
    }
  };

  const handleRowClick = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData(clienteToFormState(cliente, nazioni));
    setIsViewing(true);
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setIsViewing(false);
    setIsEditing(true);
    setSubmitAttempted(false);
  };

  const handleCancelEditing = () => {
    if (selectedCliente) {
      setFormData(clienteToFormState(selectedCliente, nazioni));
      setIsViewing(true);
      setIsEditing(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedCliente(null);
    setIsViewing(false);
    setIsEditing(false);
    setFormData(EMPTY_FORM);
  };

  const handleOpenSharing = async (cliente: Cliente) => {
    setSharingCliente(cliente);
    setShowSharingModal(true);
    setLoadingSharing(true);
    try {
      const config = await fetchConfigurazioneCondivisione(cliente.id);
      setSharingConfig(config);
    } catch (err: any) {
      console.error('Errore caricamento configurazione:', err);
      toastError('Errore nel caricamento della configurazione');
    } finally {
      setLoadingSharing(false);
    }
  };

  const handleCloseSharing = () => {
    setShowSharingModal(false);
    setSharingCliente(null);
    setSharingConfig(null);
  };


  const handleSaveSharing = async () => {
    if (!sharingCliente || !sharingConfig) return;

    try {
      setSaving(true);
      await updateConfigurazioneCondivisione(sharingCliente.id, sharingConfig);
      success('Configurazione salvata con successo');
      handleCloseSharing();
      await loadClienti();
    } catch (err: any) {
      console.error('Errore salvataggio configurazione:', err);
      toastError('Errore nel salvataggio della configurazione');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSharing = (
    section: 'abilitata' | 'dashboard.stats' | 'dashboard.kpi' | 'pratiche.elenco' | 'pratiche.dettagli' | 'pratiche.documenti' | 'pratiche.movimentiFinanziari' | 'pratiche.timeline',
    value: boolean
  ) => {
    if (!sharingConfig) return;

    const newConfig = { ...sharingConfig };

    if (section === 'abilitata') {
      newConfig.abilitata = value;
    } else if (section.startsWith('dashboard.')) {
      const key = section.split('.')[1] as 'stats' | 'kpi';
      newConfig.dashboard[key] = value;
    } else if (section.startsWith('pratiche.')) {
      const key = section.split('.')[1] as 'elenco' | 'dettagli' | 'documenti' | 'movimentiFinanziari' | 'timeline';
      newConfig.pratiche[key] = value;
    }

    setSharingConfig(newConfig);
  };

  const handleCopyShareLink = () => {
    if (!sharingCliente) return;

    const url = `${window.location.origin}/dashboard-condivisa?clienteId=${sharingCliente.id}`;
    navigator.clipboard.writeText(url).then(() => {
      success('Link copiato negli appunti!');
    }).catch(() => {
      toastError('Errore nella copia del link');
    });
  };

  return (
    <div className="space-y-6 wow-stagger">
      {/* HEADER */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="space-y-1.5">
          <span className="wow-chip">Anagrafiche</span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">Clienti</h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Crea, gestisci e condividi le anagrafiche con una vista completa.
          </p>
        </div>
        <button
          onClick={() => {
            setShowNewForm(true);
            setSubmitAttempted(false);
            setFormData({ ...EMPTY_FORM, nazione: getDefaultNazione() });
          }}
          className="wow-button"
        >
          <Plus className="h-4 w-4" />
          Nuovo Cliente
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* FILTRI */}
      <div className="wow-panel p-5 relative z-30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Ragione sociale</label>
              <input
                type="text"
                value={filters.ragioneSociale}
                onChange={(e) => setFilters({ ...filters, ragioneSociale: e.target.value })}
                className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Es. Alfa Srl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Partita IVA</label>
              <input
                type="text"
                value={filters.partitaIva}
                onChange={(e) => setFilters({ ...filters, partitaIva: e.target.value })}
                className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Es. 12345678901"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Codice fiscale</label>
              <input
                type="text"
                value={filters.codiceFiscale}
                onChange={(e) => setFilters({ ...filters, codiceFiscale: e.target.value })}
                className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Città</label>
              <input
                type="text"
                value={filters.citta}
                onChange={(e) => setFilters({ ...filters, citta: e.target.value })}
                className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
              <input
                type="text"
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Telefono</label>
              <input
                type="text"
                value={filters.telefono}
                onChange={(e) => setFilters({ ...filters, telefono: e.target.value })}
                className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1">
                {showInactive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Mostra disattivati
              </span>
            </label>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
            >
              Reset
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Cerca
            </button>
          </div>
        </div>
      </div>

      {/* LISTA CLIENTI */}
      <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Caricamento...</span>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-12 text-slate-400">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Imposta i filtri e clicca su Cerca per vedere i clienti.</p>
          </div>
        ) : !clienti || clienti.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Nessun cliente</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Contatti</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Località</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Stato</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {clienti
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => handleRowClick(cliente)}
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${!cliente.attivo ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {cliente.ragioneSociale}
                        </p>
                        {cliente.partitaIva && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">P.IVA {cliente.partitaIva}</p>
                        )}
                        {!cliente.partitaIva && cliente.codiceFiscale && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">CF {cliente.codiceFiscale}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {cliente.email && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">{cliente.email}</p>
                        )}
                        {cliente.telefono && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">{cliente.telefono}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {cliente.citta && cliente.provincia ? `${cliente.citta} (${cliente.provincia})` : cliente.citta || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        cliente.attivo
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      }`}>
                        {cliente.attivo ? 'Attivo' : 'Disattivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSharing(cliente);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg dark:hover:bg-indigo-900/30"
                          title="Condivisione Dashboard"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        {cliente.attivo ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivate(cliente);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                            title="Disattiva"
                          >
                            <PowerOff className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReactivate(cliente);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Riattiva"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cliente);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(clienti.length / ITEMS_PER_PAGE)}
              totalItems={clienti.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* MODAL NUOVO/MODIFICA/VISUALIZZA */}
      {(showNewForm || isEditing || isViewing) && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                if (isViewing) {
                  handleCloseDetail();
                } else {
                  setShowNewForm(false);
                  setIsEditing(false);
                  resetForm();
                }
              }}
            />
          <div className="modal-content relative z-10 w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {isViewing ? 'Dettaglio Cliente' : isEditing ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </h2>
              <div className="flex items-center gap-2">
                {isViewing && (
                  <button
                    onClick={handleStartEditing}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    title="Modifica"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                {isEditing && selectedCliente && (
                  <button
                    onClick={handleCancelEditing}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                )}
                <button
                  onClick={() => {
                    if (isViewing) {
                      handleCloseDetail();
                    } else {
                      setShowNewForm(false);
                      setIsEditing(false);
                      resetForm();
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {inlineError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{inlineError}</span>
                </div>
              )}
              {isViewing && selectedCliente && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                    <span className="block text-[11px] uppercase tracking-wide text-slate-400">Stato</span>
                    {selectedCliente.attivo ? 'Attivo' : 'Disattivo'}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Ragione Sociale *
                    </label>
                    <input
                      type="text"
                      value={formData.ragioneSociale}
                      onChange={(e) => setFormData({ ...formData, ragioneSociale: e.target.value })}
                      disabled={isViewing}
                      className={[
                        'w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed',
                        submitAttempted && !formData.ragioneSociale ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                      ].join(' ')}
                      placeholder="Azienda S.r.l."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tipo soggetto
                      </label>
                      <CustomSelect
                        options={[
                          { value: 'persona_giuridica', label: 'Persona giuridica' },
                          { value: 'persona_fisica', label: 'Persona fisica' },
                        ]}
                        value={formData.tipoSoggetto}
                        onChange={(val) => setFormData({ ...formData, tipoSoggetto: val as ClienteFormState['tipoSoggetto'] })}
                        disabled={isViewing}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tipologia (se persona giuridica)
                      </label>
                      <CustomSelect
                        options={[
                          { value: '', label: 'Seleziona tipologia' },
                          { value: 'impresa_individuale', label: 'Impresa individuale' },
                          { value: 'impresa_individuale_agricola', label: 'Impresa individuale agricola' },
                          { value: 'srl', label: 'SRL' },
                          { value: 'spa', label: 'SPA' },
                          { value: 'scpa', label: 'SCPA' },
                          { value: 'srl_agricola', label: 'SRL Agricola' },
                          { value: 'snc', label: 'SNC' },
                          { value: 'sas', label: 'SAS' },
                        ]}
                        value={formData.tipologia}
                        onChange={(val) => setFormData({ ...formData, tipologia: val as TipologiaAzienda | '' })}
                        disabled={tipologiaDisabled}
                        placeholder={tipologiaDisabled ? 'Non applicabile per persona fisica' : 'Seleziona tipologia'}
                        triggerClassName={tipologiaDisabled ? '!bg-slate-100 !text-slate-500 !border-slate-200 !opacity-70 dark:!bg-slate-800 dark:!text-slate-400 dark:!border-slate-700' : ''}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Codice Fiscale
                      </label>
                      <input
                        type="text"
                        value={formData.codiceFiscale}
                        onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value })}
                        disabled={isViewing}
                        className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        maxLength={16}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Partita IVA
                      </label>
                      <input
                        type="text"
                        value={formData.partitaIva}
                        onChange={(e) => setFormData({ ...formData, partitaIva: e.target.value })}
                        disabled={isViewing}
                        className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        maxLength={11}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Sede legale
                      </label>
                      <input
                        type="text"
                        value={formData.sedeLegale}
                        onChange={(e) => setFormData({ ...formData, sedeLegale: e.target.value })}
                        disabled={isViewing}
                        className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Via Roma 1, Milano"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Sede operativa
                      </label>
                      <input
                        type="text"
                        value={formData.sedeOperativa}
                        onChange={(e) => setFormData({ ...formData, sedeOperativa: e.target.value })}
                        disabled={isViewing}
                        className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="(se diversa)"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Indirizzo
                    </label>
                    <input
                      type="text"
                      value={formData.indirizzo}
                      onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                      disabled={isViewing}
                      className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Via Roma, 1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        CAP
                      </label>
                      <input
                        type="text"
                        value={formData.cap}
                        onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                        disabled={isViewing}
                        className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        maxLength={5}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Città
                      </label>
                      <input
                        type="text"
                        value={formData.citta}
                        onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                        disabled={isViewing}
                        className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Provincia
                      </label>
                      <input
                        type="text"
                        value={formData.provincia}
                        onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                        disabled={isViewing}
                        className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nazione
                    </label>
                    <SearchableNazioneSelect
                      nazioni={nazioni}
                      value={formData.nazione || null}
                      onChange={(value) => setFormData({ ...formData, nazione: value || '' })}
                      loading={nazioniLoading}
                      disabled={isViewing}
                      placeholder="Seleziona nazione..."
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Referente cliente
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  L'email del referente permette l'accesso al portale cliente.
                </p>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Referente / ruolo
                    </label>
                    <input
                      type="text"
                      value={formData.referente}
                      onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                      disabled={isViewing}
                      className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Referente commerciale / legale"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={formData.referenteNome}
                      onChange={(e) => setFormData({ ...formData, referenteNome: e.target.value })}
                      disabled={isViewing}
                      className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Cognome
                    </label>
                    <input
                      type="text"
                      value={formData.referenteCognome}
                      onChange={(e) => setFormData({ ...formData, referenteCognome: e.target.value })}
                      disabled={isViewing}
                      className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email referente
                    </label>
                    <input
                      type="email"
                      value={formData.referenteEmail}
                      onChange={(e) => setFormData({ ...formData, referenteEmail: e.target.value })}
                      disabled={isViewing}
                      className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="cliente@azienda.it"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Telefono
                  </label>
                  <PhoneInput
                    value={formData.telefono}
                    onChange={(value) => setFormData({ ...formData, telefono: value })}
                    placeholder="Numero di telefono"
                    disabled={isViewing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    PEC
                  </label>
                  <input
                    type="email"
                    value={formData.pec}
                    onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                    disabled={isViewing}
                    className="w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="pec@azienda.it"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isViewing}
                    className={[
                      'w-full rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed',
                      submitAttempted && !formData.email ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                    ].join(' ')}
                    placeholder="info@azienda.it"
                  />
                </div>
              </div>
            </div>

            {!isViewing && (
              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setIsEditing(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  onClick={isEditing ? handleUpdate : handleCreate}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea Cliente'}
                </button>
              </div>
            )}
            {isViewing && (
              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleCloseDetail}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Chiudi
                </button>
              </div>
            )}
          </div>
        </div>
        </BodyPortal>
      )}

      {/* SHARING MODAL */}
      {showSharingModal && sharingCliente && (
        <BodyPortal>
          <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Condivisione Dashboard
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Configura le informazioni da condividere con {sharingCliente.ragioneSociale}
                </p>
              </div>
              <button
                onClick={handleCloseSharing}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {loadingSharing ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">Caricamento...</span>
                </div>
              ) : sharingConfig ? (
                <>
                  {/* Abilitazione generale */}
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sharingConfig.abilitata}
                        onChange={(e) => handleToggleSharing('abilitata', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          Abilita condivisione
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Il cliente potrà visualizzare le informazioni selezionate
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Dashboard Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      Dashboard
                    </h3>
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sharingConfig.dashboard.stats}
                          onChange={(e) => handleToggleSharing('dashboard.stats', e.target.checked)}
                          disabled={!sharingConfig.abilitata}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Statistiche generali
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Numero pratiche, importi affidati e recuperati
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sharingConfig.dashboard.kpi}
                          onChange={(e) => handleToggleSharing('dashboard.kpi', e.target.checked)}
                          disabled={!sharingConfig.abilitata}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            KPI e performance
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Tasso di chiusura, esiti positivi/negativi, recuperi
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Pratiche Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      Pratiche
                    </h3>
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sharingConfig.pratiche.elenco}
                          onChange={(e) => handleToggleSharing('pratiche.elenco', e.target.checked)}
                          disabled={!sharingConfig.abilitata}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Elenco pratiche
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Lista di tutte le pratiche affidate
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sharingConfig.pratiche.dettagli}
                          onChange={(e) => handleToggleSharing('pratiche.dettagli', e.target.checked)}
                          disabled={!sharingConfig.abilitata}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Dettagli pratiche
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Informazioni dettagliate su ogni pratica
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sharingConfig.pratiche.documenti}
                          onChange={(e) => handleToggleSharing('pratiche.documenti', e.target.checked)}
                          disabled={!sharingConfig.abilitata}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Documenti
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Accesso ai documenti caricati nelle pratiche
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sharingConfig.pratiche.movimentiFinanziari}
                          onChange={(e) => handleToggleSharing('pratiche.movimentiFinanziari', e.target.checked)}
                          disabled={!sharingConfig.abilitata}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Movimenti finanziari
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Storico dei movimenti finanziari
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sharingConfig.pratiche.timeline}
                          onChange={(e) => handleToggleSharing('pratiche.timeline', e.target.checked)}
                          disabled={!sharingConfig.abilitata}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Timeline e fasi
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Visualizzazione cronologica delle fasi
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-slate-500">
                  Nessuna configurazione disponibile
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
              <button
                onClick={handleCopyShareLink}
                disabled={!sharingConfig?.abilitata}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
                title={sharingConfig?.abilitata ? 'Copia link dashboard condivisa' : 'Abilita la condivisione per copiare il link'}
              >
                <Copy className="h-4 w-4" />
                Copia link
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCloseSharing}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveSharing}
                  disabled={saving || loadingSharing}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salva configurazione
                    </>
                  )}
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
