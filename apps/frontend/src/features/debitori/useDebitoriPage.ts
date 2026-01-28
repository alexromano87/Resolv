// apps/frontend/src/features/debitori/useDebitoriPage.ts
import { useEffect, useMemo, useState } from 'react';
import type { Cliente, TipologiaAzienda } from '../../api/clienti';
import { fetchClienti } from '../../api/clienti';
import type {
  Debitore,
  DebitoreCreatePayload,
  TipoSoggetto,
} from '../../api/debitori';
import {
  createDebitore,
  updateDebitore,
  fetchDebitoriForCliente,
  fetchDebitori,
  fetchClientiForDebitore,
  linkDebitoreToCliente,
  unlinkDebitoreFromCliente,
  deactivateDebitore,
  reactivateDebitore,
  deleteDebitore,
} from '../../api/debitori';
import { getDebitoreDisplayName } from '../../api/debitori';
import { useToast } from '../../components/ui/ToastProvider';

// Form state per nuovo debitore (semplificato)
export interface NewDebitoreFormState {
  tipoSoggetto: TipoSoggetto;
  nome: string;
  cognome: string;
  ragioneSociale: string;
  codiceFiscale: string;
  partitaIva: string;
  tipologia: TipologiaAzienda | '';
  dataNascita: string;
  luogoNascita: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  nazione: string;
  telefono: string;
  email: string;
  pec: string;
  referente: string;
}

// Form state completo per dettaglio/modifica debitore
export interface DebitoreFormState {
  tipoSoggetto: TipoSoggetto;
  // Persona fisica
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita: string;
  luogoNascita: string;
  // Persona giuridica
  ragioneSociale: string;
  partitaIva: string;
  tipologia: TipologiaAzienda | '';
  // Comuni
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  nazione: string;
  referente: string;
  telefono: string;
  email: string;
  pec: string;
}

const INITIAL_NEW_FORM: NewDebitoreFormState = {
  tipoSoggetto: 'persona_fisica',
  nome: '',
  cognome: '',
  ragioneSociale: '',
  codiceFiscale: '',
  partitaIva: '',
  tipologia: '',
  dataNascita: '',
  luogoNascita: '',
  indirizzo: '',
  cap: '',
  citta: '',
  provincia: '',
  nazione: '',
  telefono: '',
  email: '',
  pec: '',
  referente: '',
};

const INITIAL_DETAIL_FORM: DebitoreFormState = {
  tipoSoggetto: 'persona_fisica',
  nome: '',
  cognome: '',
  codiceFiscale: '',
  dataNascita: '',
  luogoNascita: '',
  ragioneSociale: '',
  partitaIva: '',
  tipologia: '',
  indirizzo: '',
  cap: '',
  citta: '',
  provincia: '',
  nazione: '',
  referente: '',
  telefono: '',
  email: '',
  pec: '',
};

function debitoreToFormState(d: Debitore): DebitoreFormState {
  return {
    tipoSoggetto: d.tipoSoggetto,
    nome: d.nome ?? '',
    cognome: d.cognome ?? '',
    codiceFiscale: d.codiceFiscale ?? '',
    dataNascita: d.dataNascita ?? '',
    luogoNascita: d.luogoNascita ?? '',
    ragioneSociale: d.ragioneSociale ?? '',
    partitaIva: d.partitaIva ?? '',
    tipologia: d.tipologia ?? '',
    indirizzo: d.indirizzo ?? '',
    cap: d.cap ?? '',
    citta: d.citta ?? '',
    provincia: d.provincia ?? '',
    nazione: d.nazione ?? '',
    referente: d.referente ?? '',
    telefono: d.telefono ?? '',
    email: d.email ?? '',
    pec: d.pec ?? '',
  };
}

export interface UseDebitoriPageParams {
  initialClienteId?: string | null;
  initialDebitoreId?: string | null;
}

export function useDebitoriPage(params?: UseDebitoriPageParams) {
  const { success: toastSuccess, error: toastError } = useToast();

  // === STATO CLIENTI ===
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loadingClienti, setLoadingClienti] = useState(true);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);

  // === STATO DEBITORI ===
  const [debitori, setDebitori] = useState<Debitore[]>([]);
  const [allDebitori, setAllDebitori] = useState<Debitore[]>([]);
  const [loadingDebitori, setLoadingDebitori] = useState(false);
  const [inactiveFetchAttempted, setInactiveFetchAttempted] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [clientiPerDebitore, setClientiPerDebitore] = useState<Record<string, string[]>>({});

  // === STATO SELEZIONE DEBITORE ===
  const [selectedDebitoreId, setSelectedDebitoreId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [detailForm, setDetailForm] = useState<DebitoreFormState>(INITIAL_DETAIL_FORM);
  const [savingDetail, setSavingDetail] = useState(false);

  // === FLAG PER GESTIONE PARAMETRI INIZIALI ===
  const [initialParamsHandled, setInitialParamsHandled] = useState(false);

  // === STATO NUOVO DEBITORE ===
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewDebitoreFormState>(INITIAL_NEW_FORM);
  const [newClienteId, setNewClienteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // === STATO GENERALE ===
  const [error, setError] = useState<string | null>(null);

  // === COMPUTED ===
  const selectedCliente = useMemo(
    () => clienti.find((c) => c.id === selectedClienteId) ?? null,
    [clienti, selectedClienteId],
  );

  const selectedDebitore = useMemo(
    () => debitori.find((d) => d.id === selectedDebitoreId) ?? null,
    [debitori, selectedDebitoreId],
  );

  // === CARICAMENTO CLIENTI ===
  useEffect(() => {
    const loadClienti = async () => {
      try {
        setLoadingClienti(true);
        const data = await fetchClienti();
        setClienti(data);
      } catch (err: any) {
        console.error(err);
        const msg = err.message || 'Errore nel caricamento dei clienti';
        setError(msg);
        toastError(msg, 'Errore caricamento clienti');
      } finally {
        setLoadingClienti(false);
      }
    };

    loadClienti();
  }, [toastError]);

  // === GESTIONE PARAMETRI INIZIALI (da URL) ===
  useEffect(() => {
    if (initialParamsHandled || loadingClienti || clienti.length === 0) return;
    if (!params?.initialClienteId) {
      setInitialParamsHandled(true);
      return;
    }

    // Cerca il cliente
    const cliente = clienti.find((c) => c.id === params.initialClienteId);
    if (cliente) {
      setSelectedClienteId(cliente.id);
      // Il debitore verrà selezionato dopo il caricamento dei debitori
    }
    setInitialParamsHandled(true);
  }, [clienti, loadingClienti, params?.initialClienteId, initialParamsHandled]);

  // === FLAG PER SELEZIONE DEBITORE INIZIALE ===
  const [initialDebitoreSelected, setInitialDebitoreSelected] = useState(false);

  const filterDebitori = (items: Debitore[], term?: string): Debitore[] => {
    const activeOnly = !showInactive;
    const filteredByStatus = activeOnly ? items.filter((d) => d.attivo !== false) : items;
    const normalizedTerm = term?.trim().toLowerCase() || '';
    if (!normalizedTerm) return filteredByStatus;
    return filteredByStatus.filter((d) => {
      const nome = getDebitoreDisplayName(d).toLowerCase();
      const cf = (d.codiceFiscale || '').toLowerCase();
      const piva = (d.partitaIva || '').toLowerCase();
      const email = (d.email || '').toLowerCase();
      const tel = (d.telefono || '').toLowerCase();
      return (
        nome.includes(normalizedTerm) ||
        cf.includes(normalizedTerm) ||
        piva.includes(normalizedTerm) ||
        email.includes(normalizedTerm) ||
        tel.includes(normalizedTerm)
      );
    });
  };

  // === CARICAMENTO DEBITORI ===
  const loadDebitori = async (term?: string) => {
    setLoadingDebitori(true);
    try {
      setError(null);
      const effectiveTerm = term !== undefined ? term : searchTerm;
      const hasTerm = Boolean(effectiveTerm && effectiveTerm.trim());
      if (!selectedClienteId && !hasTerm) {
        setDebitori([]);
        setAllDebitori([]);
        setLoadingDebitori(false);
        return;
      }
      const data = selectedClienteId
        ? await fetchDebitoriForCliente(selectedClienteId, true)
        : await fetchDebitori(true);

      // Precarica associazioni clienti per i debitori caricati
      if (data.length > 0) {
        const results = await Promise.all(
          data.map(async (d) => {
            try {
              const res = await fetchClientiForDebitore(d.id);
              return { id: d.id, clientiIds: res.clientiIds };
            } catch (err) {
              console.error('Errore caricamento clienti per debitore', err);
              return { id: d.id, clientiIds: [] as string[] };
            }
          }),
        );
        setClientiPerDebitore((prev) => {
          const updated = { ...prev };
          results.forEach(({ id, clientiIds }) => {
            updated[id] = clientiIds
              .map((cid) => clienti.find((c) => c.id === cid)?.ragioneSociale || '')
              .filter(Boolean);
          });
          return updated;
        });
      }

      setAllDebitori(data);
      setDebitori(filterDebitori(data, effectiveTerm));

      if (!params?.initialDebitoreId || initialDebitoreSelected) {
        setSelectedDebitoreId(null);
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Errore nel caricamento dei debitori';
      setError(msg);
      toastError(msg, 'Errore caricamento debitori');
    } finally {
      setLoadingDebitori(false);
    }
  };

  useEffect(() => {
    const loadDebitori = async () => {
      await loadDebitori();
    };

    loadDebitori();
  }, [
    selectedClienteId,
    toastError,
    params?.initialDebitoreId,
    initialDebitoreSelected,
    clienti,
  ]);

  useEffect(() => {
    if (allDebitori.length === 0) return;
    const term = searchTerm.trim() ? searchTerm : undefined;
    setDebitori(filterDebitori(allDebitori, term));
  }, [showInactive, searchTerm, allDebitori]);

  useEffect(() => {
    if (!showInactive || loadingDebitori || allDebitori.length === 0) return;
    const hasInactive = allDebitori.some((d) => d.attivo === false);
    if (!hasInactive && !inactiveFetchAttempted) {
      setInactiveFetchAttempted(true);
      void loadDebitori(searchTerm);
    }
  }, [showInactive, loadingDebitori, allDebitori, inactiveFetchAttempted, searchTerm]);

  useEffect(() => {
    if (!showInactive) {
      setInactiveFetchAttempted(false);
    }
  }, [showInactive]);

  // === SELEZIONE DEBITORE INIZIALE (dopo caricamento debitori) ===
  useEffect(() => {
    if (initialDebitoreSelected || !params?.initialDebitoreId || loadingDebitori || debitori.length === 0) return;

    const debitore = debitori.find((d) => d.id === params.initialDebitoreId);
    if (debitore) {
      setSelectedDebitoreId(debitore.id);
      setDetailForm(debitoreToFormState(debitore));
      setIsEditing(false);
    }
    setInitialDebitoreSelected(true);
  }, [debitori, loadingDebitori, params?.initialDebitoreId, initialDebitoreSelected]);

  // === HANDLERS CLIENTE ===
  const handleSelectCliente = (clienteId: string | null) => {
    setSelectedClienteId(clienteId);
    setShowNewForm(false);
    setNewForm(INITIAL_NEW_FORM);
    setSelectedDebitoreId(null);
    setIsEditing(false);
  };

  // === HANDLERS SELEZIONE DEBITORE ===
  const handleSelectDebitore = (debitore: Debitore) => {
    setSelectedDebitoreId(debitore.id);
    setDetailForm(debitoreToFormState(debitore));
    setIsEditing(false);
    setShowNewForm(false);
    setError(null);
  };

  const handleCloseDetail = () => {
    setSelectedDebitoreId(null);
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    if (selectedDebitore) {
      setDetailForm(debitoreToFormState(selectedDebitore));
    }
    setIsEditing(false);
  };

  const updateDetailForm = <K extends keyof DebitoreFormState>(
    field: K,
    value: DebitoreFormState[K],
  ) => {
    setDetailForm((prev) => ({ ...prev, [field]: value }));
  };

  const isDetailFormDirty = (): boolean => {
    if (!selectedDebitore) return false;
    const original = debitoreToFormState(selectedDebitore);
    return Object.keys(detailForm).some(
      (key) => detailForm[key as keyof DebitoreFormState] !== original[key as keyof DebitoreFormState],
    );
  };

  // === SALVATAGGIO MODIFICA DEBITORE ===
  const submitDetailForm = async (): Promise<boolean> => {
    if (!selectedDebitoreId) return false;

    // Validazione
    if (detailForm.tipoSoggetto === 'persona_fisica') {
      if (!detailForm.nome.trim() || !detailForm.cognome.trim()) {
        const msg = 'Nome e cognome sono obbligatori per persona fisica.';
        setError(msg);
        toastError(msg, 'Dati mancanti');
        return false;
      }
    } else {
      if (!detailForm.ragioneSociale.trim()) {
        const msg = 'La ragione sociale è obbligatoria per persona giuridica.';
        setError(msg);
        toastError(msg, 'Dati mancanti');
        return false;
      }
    }

    try {
      setSavingDetail(true);
      setError(null);

      const payload = {
        tipoSoggetto: detailForm.tipoSoggetto,
        nome: detailForm.tipoSoggetto === 'persona_fisica' ? detailForm.nome.trim() || undefined : undefined,
        cognome: detailForm.tipoSoggetto === 'persona_fisica' ? detailForm.cognome.trim() || undefined : undefined,
        codiceFiscale: detailForm.codiceFiscale.trim() || undefined,
        dataNascita: detailForm.dataNascita || undefined,
        luogoNascita: detailForm.luogoNascita.trim() || undefined,
        ragioneSociale: detailForm.tipoSoggetto === 'persona_giuridica' ? detailForm.ragioneSociale.trim() || undefined : undefined,
        partitaIva: detailForm.partitaIva.trim() || undefined,
        tipologia: detailForm.tipoSoggetto === 'persona_giuridica' ? detailForm.tipologia || undefined : undefined,
        indirizzo: detailForm.indirizzo.trim() || undefined,
        cap: detailForm.cap.trim() || undefined,
        citta: detailForm.citta.trim() || undefined,
        provincia: detailForm.provincia.trim() || undefined,
        nazione: detailForm.nazione.trim() || undefined,
        referente: detailForm.referente.trim() || undefined,
        telefono: detailForm.telefono.trim() || undefined,
        email: detailForm.email.trim() || undefined,
        pec: detailForm.pec.trim() || undefined,
      };

      const updated = await updateDebitore(selectedDebitoreId, payload);
      setDebitori((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setDetailForm(debitoreToFormState(updated));
      setIsEditing(false);
      toastSuccess('Debitore aggiornato correttamente', 'Operazione riuscita');
      return true;
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Errore durante il salvataggio';
      setError(msg);
      toastError(msg, 'Errore salvataggio');
      return false;
    } finally {
      setSavingDetail(false);
    }
  };

  // === HANDLERS NUOVO DEBITORE ===
  const updateNewForm = <K extends keyof NewDebitoreFormState>(
    field: K,
    value: NewDebitoreFormState[K],
  ) => {
    setNewForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetNewForm = () => {
    setNewForm(INITIAL_NEW_FORM);
    setShowNewForm(false);
    setNewClienteId(null);
  };

  const isNewFormDirty = (): boolean => {
    return (
      newForm.nome.trim() !== '' ||
      newForm.cognome.trim() !== '' ||
      newForm.ragioneSociale.trim() !== '' ||
      newForm.codiceFiscale.trim() !== '' ||
      newForm.partitaIva.trim() !== '' ||
      newForm.tipologia !== '' ||
      newForm.telefono.trim() !== '' ||
      newForm.email.trim() !== ''
    );
  };

  const submitNewDebitore = async (clienteId: string | null): Promise<boolean> => {
    if (!clienteId) {
      const msg = 'Nessun cliente selezionato.';
      setError(msg);
      toastError(msg, 'Errore');
      return false;
    }

    // Validazione base
    if (newForm.tipoSoggetto === 'persona_fisica') {
      if (!newForm.nome.trim() || !newForm.cognome.trim()) {
        const msg = 'Nome e cognome sono obbligatori per persona fisica.';
        setError(msg);
        toastError(msg, 'Dati mancanti');
        return false;
      }
    } else {
      if (!newForm.ragioneSociale.trim()) {
        const msg = 'Ragione sociale obbligatoria per persona giuridica.';
        setError(msg);
        toastError(msg, 'Dati mancanti');
        return false;
      }
    }

    try {
      const payload: DebitoreCreatePayload = {
        tipoSoggetto: newForm.tipoSoggetto,
        nome: newForm.nome.trim() || undefined,
        cognome: newForm.cognome.trim() || undefined,
        ragioneSociale: newForm.ragioneSociale.trim() || undefined,
        codiceFiscale: newForm.codiceFiscale.trim() || undefined,
        partitaIva: newForm.partitaIva.trim() || undefined,
        tipologia: newForm.tipoSoggetto === 'persona_giuridica' ? newForm.tipologia || undefined : undefined,
        telefono: newForm.telefono.trim() || undefined,
        email: newForm.email.trim() || undefined,
        pec: newForm.pec.trim() || undefined,
        indirizzo: newForm.indirizzo.trim() || undefined,
        cap: newForm.cap.trim() || undefined,
        citta: newForm.citta.trim() || undefined,
        provincia: newForm.provincia.trim() || undefined,
        nazione: newForm.nazione.trim() || undefined,
        luogoNascita: newForm.luogoNascita.trim() || undefined,
        dataNascita: newForm.dataNascita || undefined,
        clientiIds: [clienteId],
      };

      const created = await createDebitore(payload);
      setDebitori((prev) => [created, ...prev]);
      setAllDebitori((prev) => [created, ...prev]);

      try {
        if (clienteId) {
          await linkDebitoreToCliente(clienteId, created.id);
        }
        const { clientiIds } = await fetchClientiForDebitore(created.id);
        const linkedIds = clientiIds ?? [];
        if (linkedIds.length > 0) {
          setClientiPerDebitore((prev) => ({
            ...prev,
            [created.id]: linkedIds
              .map((id) => clienti.find((c) => c.id === id)?.ragioneSociale || '')
              .filter(Boolean),
          }));
        }
      } catch (linkErr) {
        console.warn('Errore aggiornamento associazione cliente-debitore', linkErr);
      }

      resetNewForm();
      toastSuccess('Debitore creato e collegato correttamente', 'Operazione riuscita');
      return true;
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Errore nella creazione del debitore';
      setError(msg);
      toastError(msg, 'Errore creazione');
      return false;
    }
  };

  // === AZIONI DEBITORE ===
  const unlinkDebitoreAction = async (debitoreId: string): Promise<boolean> => {
    if (!selectedClienteId) return false;

    try {
      await unlinkDebitoreFromCliente(selectedClienteId, debitoreId);
      setDebitori((prev) => prev.filter((d) => d.id !== debitoreId));
      setAllDebitori((prev) => prev.filter((d) => d.id !== debitoreId));
      if (selectedDebitoreId === debitoreId) {
        setSelectedDebitoreId(null);
        setIsEditing(false);
      }
      toastSuccess('Debitore scollegato dal cliente', 'Operazione riuscita');
      return true;
    } catch (err: any) {
      console.error(err);
      toastError(err?.message || 'Errore durante lo scollegamento', 'Errore');
      return false;
    }
  };

  const deactivateDebitoreAction = async (debitoreId: string): Promise<boolean> => {
    try {
      const updated = await deactivateDebitore(debitoreId);
      setAllDebitori((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (showInactive) {
        setDebitori((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        if (selectedDebitoreId === debitoreId) {
          setDetailForm(debitoreToFormState(updated));
        }
      } else {
        setDebitori((prev) => prev.filter((d) => d.id !== debitoreId));
        if (selectedDebitoreId === debitoreId) {
          setSelectedDebitoreId(null);
          setIsEditing(false);
        }
      }
      toastSuccess('Debitore disattivato', 'Operazione riuscita');
      return true;
    } catch (err: any) {
      console.error(err);
      toastError(err?.message || 'Errore durante la disattivazione', 'Errore');
      return false;
    }
  };

  const reactivateDebitoreAction = async (debitoreId: string): Promise<boolean> => {
    try {
      const updated = await reactivateDebitore(debitoreId);
      setAllDebitori((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setDebitori((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (selectedDebitoreId === debitoreId) {
        setDetailForm(debitoreToFormState(updated));
      }
      toastSuccess('Debitore riattivato', 'Operazione riuscita');
      return true;
    } catch (err: any) {
      console.error(err);
      toastError(err?.message || 'Errore durante la riattivazione', 'Errore');
      return false;
    }
  };

  const deleteDebitoreAction = async (debitoreId: string): Promise<boolean> => {
    try {
      await deleteDebitore(debitoreId);
      setDebitori((prev) => prev.filter((d) => d.id !== debitoreId));
      setAllDebitori((prev) => prev.filter((d) => d.id !== debitoreId));
      if (selectedDebitoreId === debitoreId) {
        setSelectedDebitoreId(null);
        setIsEditing(false);
      }
      toastSuccess('Debitore eliminato definitivamente', 'Operazione riuscita');
      return true;
    } catch (err: any) {
      console.error(err);
      toastError(err?.message || 'Errore durante l\'eliminazione', 'Errore');
      return false;
    }
  };

  return {
    // Stato clienti
    clienti,
    loadingClienti,
    selectedClienteId,
    selectedCliente,

    // Stato debitori
    debitori,
    loadingDebitori,
    showInactive,
    setShowInactive,

    // Stato selezione debitore
    selectedDebitoreId,
    selectedDebitore,
    isEditing,
    detailForm,
    savingDetail,
    clientiPerDebitore,

    // Stato nuovo debitore
    showNewForm,
    newForm,
    newClienteId,
    searchTerm,

    // Stato generale
    error,
    setError,

    // Handlers cliente
    handleSelectCliente,

    // Handlers selezione debitore
    handleSelectDebitore,
    handleCloseDetail,
    handleStartEditing,
    handleCancelEditing,
    updateDetailForm,
    isDetailFormDirty,
    submitDetailForm,

    // Handlers nuovo debitore
    setShowNewForm,
    updateNewForm,
    resetNewForm,
    isNewFormDirty,
    submitNewDebitore,
    setNewClienteId,
    setSearchTerm,
    loadDebitori,

    // Azioni debitore
    unlinkDebitore: unlinkDebitoreAction,
    deactivateDebitore: deactivateDebitoreAction,
    reactivateDebitore: reactivateDebitoreAction,
    deleteDebitore: deleteDebitoreAction,
  };
}
