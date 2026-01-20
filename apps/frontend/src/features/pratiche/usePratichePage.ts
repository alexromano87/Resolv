// apps/frontend/src/features/pratiche/usePratichePage.ts
import { useState, useEffect, useCallback } from 'react';
import {
  fetchPratiche,
  fetchPratica,
  createPratica,
  updatePratica,
  deletePratica,
  deactivatePratica,
  reactivatePratica,
  cambiaFasePratica,
  riapriPratica,
  type Pratica,
  type PraticaCreatePayload,
  type PraticaUpdatePayload,
} from '../../api/pratiche';
import { fetchFasi, type Fase } from '../../api/fasi';
import { fetchClienti, type Cliente } from '../../api/clienti';
import { fetchDebitoriForCliente, type Debitore } from '../../api/debitori';
import { avvocatiApi, type Avvocato } from '../../api/avvocati';

export interface UsePratichePageOptions {
  initialClienteId?: string | null;
  initialPraticaId?: string | null;
}

export function usePratichePage(options: UsePratichePageOptions = {}) {
  // === Stati base ===
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [loadingPratiche, setLoadingPratiche] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === Fasi ===
  const [fasi, setFasi] = useState<Fase[]>([]);
  const [loadingFasi, setLoadingFasi] = useState(false);

  // === Clienti per filtro e form ===
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loadingClienti, setLoadingClienti] = useState(false);
  const [filterClienteId, setFilterClienteId] = useState<string | null>(
    options.initialClienteId || null
  );

  // === Debitori per form (caricati quando si seleziona un cliente) ===
  const [debitoriForCliente, setDebitoriForCliente] = useState<Debitore[]>([]);
  const [loadingDebitori, setLoadingDebitori] = useState(false);

  // === Avvocati per form ===
  const [avvocati, setAvvocati] = useState<Avvocato[]>([]);
  const [loadingAvvocati, setLoadingAvvocati] = useState(false);

  // === Pratica selezionata (dettaglio) ===
  const [selectedPraticaId, setSelectedPraticaId] = useState<string | null>(
    options.initialPraticaId || null
  );
  const [selectedPratica, setSelectedPratica] = useState<Pratica | null>(null);

  // === Form nuova pratica ===
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<PraticaCreatePayload>({
    clienteId: '',
    debitoreId: '',
    avvocatiIds: [],
    capitale: 0,
    anticipazioni: 0,
    compensiLegali: 0,
    dataAffidamento: new Date().toISOString().split('T')[0],
  });
  const [savingNew, setSavingNew] = useState(false);

  // === Form modifica pratica ===
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<PraticaUpdatePayload>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // === Form cambio fase ===
  const [showCambioFase, setShowCambioFase] = useState(false);
  const [cambioFaseData, setCambioFaseData] = useState<{
    nuovaFaseId: string;
    note: string;
  }>({ nuovaFaseId: '', note: '' });
  const [savingCambioFase, setSavingCambioFase] = useState(false);

  // === Caricamento iniziale ===
  useEffect(() => {
    loadFasi();
    loadClienti();
    loadAvvocati();
  }, []);

  // === Carica pratiche quando cambia il filtro cliente o showInactive ===
  useEffect(() => {
    loadPratiche();
  }, [filterClienteId, showInactive]);

  // === Carica dettaglio pratica selezionata ===
  useEffect(() => {
    if (selectedPraticaId) {
      loadPraticaDetail(selectedPraticaId);
    } else {
      setSelectedPratica(null);
    }
  }, [selectedPraticaId]);

  // === Carica debitori quando cambia il cliente nel form ===
  useEffect(() => {
    if (newForm.clienteId) {
      loadDebitoriForCliente(newForm.clienteId);
    } else {
      setDebitoriForCliente([]);
    }
  }, [newForm.clienteId]);

  // === Funzioni di caricamento ===

  const loadFasi = async () => {
    try {
      setLoadingFasi(true);
      const data = await fetchFasi();
      setFasi(data);
    } catch (err: any) {
      console.error('Errore caricamento fasi:', err);
      setError(err.message || 'Errore nel caricamento delle fasi');
    } finally {
      setLoadingFasi(false);
    }
  };

  const loadClienti = async () => {
    try {
      setLoadingClienti(true);
      const data = await fetchClienti();
      setClienti(data);
    } catch (err: any) {
      console.error('Errore caricamento clienti:', err);
    } finally {
      setLoadingClienti(false);
    }
  };

  const loadPratiche = async () => {
    try {
      setLoadingPratiche(true);
      setError(null);
      const data = await fetchPratiche({
        includeInactive: showInactive,
        clienteId: filterClienteId || undefined,
      });
      setPratiche(data);
    } catch (err: any) {
      console.error('Errore caricamento pratiche:', err);
      setError(err.message || 'Errore nel caricamento delle pratiche');
    } finally {
      setLoadingPratiche(false);
    }
  };

  const loadPraticaDetail = async (id: string) => {
    try {
      const data = await fetchPratica(id);
      setSelectedPratica(data);
      // Inizializza il form di modifica
      setEditForm({
        capitale: data.capitale,
        anticipazioni: data.anticipazioni,
        compensiLegali: data.compensiLegali,
        importoRecuperatoCapitale: data.importoRecuperatoCapitale,
        importoRecuperatoAnticipazioni: data.importoRecuperatoAnticipazioni,
        compensiLiquidati: data.compensiLiquidati,
        note: data.note,
        riferimentoCredito: data.riferimentoCredito,
        dataAffidamento: data.dataAffidamento,
        dataScadenza: data.dataScadenza,
      });
    } catch (err: any) {
      console.error('Errore caricamento dettaglio pratica:', err);
      setError(err.message || 'Errore nel caricamento della pratica');
    }
  };

  const loadDebitoriForCliente = async (clienteId: string) => {
    try {
      setLoadingDebitori(true);
      const data = await fetchDebitoriForCliente(clienteId);
      setDebitoriForCliente(data);
    } catch (err: any) {
      console.error('Errore caricamento debitori:', err);
    } finally {
      setLoadingDebitori(false);
    }
  };

  const loadAvvocati = async () => {
    try {
      setLoadingAvvocati(true);
      console.log('🔄 Caricamento avvocati...');
      const data = await avvocatiApi.getAll();
      console.log('✅ Avvocati caricati:', data);
      setAvvocati(data);
    } catch (err: any) {
      console.error('❌ Errore caricamento avvocati:', err);
    } finally {
      setLoadingAvvocati(false);
    }
  };

  // === Handlers ===

  const handleSelectPratica = useCallback((praticaId: string | null) => {
    setSelectedPraticaId(praticaId);
    setIsEditing(false);
    setShowCambioFase(false);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPraticaId(null);
    setSelectedPratica(null);
    setIsEditing(false);
    setShowCambioFase(false);
  }, []);

  const handleFilterByCliente = useCallback((clienteId: string | null) => {
    setFilterClienteId(clienteId);
  }, []);

  // === Form nuova pratica ===

  const updateNewForm = useCallback(
    (field: keyof PraticaCreatePayload, value: any) => {
      setNewForm((prev) => ({ ...prev, [field]: value }));
      // Reset debitore se cambia cliente
      if (field === 'clienteId') {
        setNewForm((prev) => ({ ...prev, debitoreId: '' }));
      }
    },
    []
  );

  const resetNewForm = useCallback(() => {
    setNewForm({
      clienteId: '',
      debitoreId: '',
      avvocatiIds: [],
      capitale: 0,
      anticipazioni: 0,
      compensiLegali: 0,
      dataAffidamento: new Date().toISOString().split('T')[0],
    });
    setDebitoriForCliente([]);
  }, []);

  const submitNewPratica = async (): Promise<boolean> => {
    if (!newForm.clienteId || !newForm.debitoreId) {
      setError('Seleziona cliente e debitore');
      return false;
    }

    try {
      setSavingNew(true);
      setError(null);
      await createPratica(newForm);
      await loadPratiche();
      resetNewForm();
      setShowNewForm(false);
      return true;
    } catch (err: any) {
      console.error('Errore creazione pratica:', err);
      setError(err.message || 'Errore nella creazione della pratica');
      return false;
    } finally {
      setSavingNew(false);
    }
  };

  // === Form modifica pratica ===

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    // Ripristina i valori originali
    if (selectedPratica) {
      setEditForm({
        capitale: selectedPratica.capitale,
        anticipazioni: selectedPratica.anticipazioni,
        compensiLegali: selectedPratica.compensiLegali,
        importoRecuperatoCapitale: selectedPratica.importoRecuperatoCapitale,
        importoRecuperatoAnticipazioni: selectedPratica.importoRecuperatoAnticipazioni,
        compensiLiquidati: selectedPratica.compensiLiquidati,
        note: selectedPratica.note,
        riferimentoCredito: selectedPratica.riferimentoCredito,
        dataAffidamento: selectedPratica.dataAffidamento,
        dataScadenza: selectedPratica.dataScadenza,
      });
    }
  }, [selectedPratica]);

  const updateEditForm = useCallback(
    (field: keyof PraticaUpdatePayload, value: any) => {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const submitEditForm = async (): Promise<boolean> => {
    if (!selectedPratica) return false;

    try {
      setSavingEdit(true);
      setError(null);
      const updated = await updatePratica(selectedPratica.id, editForm);
      setSelectedPratica(updated);
      setIsEditing(false);
      await loadPratiche();
      return true;
    } catch (err: any) {
      console.error('Errore aggiornamento pratica:', err);
      setError(err.message || 'Errore nell\'aggiornamento della pratica');
      return false;
    } finally {
      setSavingEdit(false);
    }
  };

  // === Cambio fase ===

  const handleOpenCambioFase = useCallback(() => {
    setShowCambioFase(true);
    setCambioFaseData({ nuovaFaseId: '', note: '' });
  }, []);

  const handleCloseCambioFase = useCallback(() => {
    setShowCambioFase(false);
    setCambioFaseData({ nuovaFaseId: '', note: '' });
  }, []);

  const updateCambioFaseData = useCallback(
    (field: 'nuovaFaseId' | 'note', value: string) => {
      setCambioFaseData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const submitCambioFase = async (): Promise<boolean> => {
    if (!selectedPratica || !cambioFaseData.nuovaFaseId) {
      setError('Seleziona una fase');
      return false;
    }

    try {
      setSavingCambioFase(true);
      setError(null);
      const updated = await cambiaFasePratica(selectedPratica.id, {
        nuovaFaseId: cambioFaseData.nuovaFaseId,
        note: cambioFaseData.note || undefined,
      });
      setSelectedPratica(updated);
      setShowCambioFase(false);
      setCambioFaseData({ nuovaFaseId: '', note: '' });
      await loadPratiche();
      return true;
    } catch (err: any) {
      console.error('Errore cambio fase:', err);
      setError(err.message || 'Errore nel cambio fase');
      return false;
    } finally {
      setSavingCambioFase(false);
    }
  };

  // === Azioni pratica ===

  const handleRiapriPratica = async (): Promise<boolean> => {
    if (!selectedPratica) return false;

    try {
      setError(null);
      const updated = await riapriPratica(selectedPratica.id);
      setSelectedPratica(updated);
      await loadPratiche();
      return true;
    } catch (err: any) {
      console.error('Errore riapertura pratica:', err);
      setError(err.message || 'Errore nella riapertura della pratica');
      return false;
    }
  };

  const handleDeactivatePratica = async (): Promise<boolean> => {
    if (!selectedPratica) return false;

    try {
      setError(null);
      await deactivatePratica(selectedPratica.id);
      await loadPratiche();
      handleCloseDetail();
      return true;
    } catch (err: any) {
      console.error('Errore disattivazione pratica:', err);
      setError(err.message || 'Errore nella disattivazione della pratica');
      return false;
    }
  };

  const handleReactivatePratica = async (): Promise<boolean> => {
    if (!selectedPratica) return false;

    try {
      setError(null);
      const updated = await reactivatePratica(selectedPratica.id);
      setSelectedPratica(updated);
      await loadPratiche();
      return true;
    } catch (err: any) {
      console.error('Errore riattivazione pratica:', err);
      setError(err.message || 'Errore nella riattivazione della pratica');
      return false;
    }
  };

  const handleDeletePratica = async (): Promise<boolean> => {
    if (!selectedPratica) return false;

    try {
      setError(null);
      await deletePratica(selectedPratica.id);
      await loadPratiche();
      handleCloseDetail();
      return true;
    } catch (err: any) {
      console.error('Errore eliminazione pratica:', err);
      setError(err.message || 'Errore nell\'eliminazione della pratica');
      return false;
    }
  };

  // === Helper per ottenere la fase corrente ===
  const getFaseById = useCallback(
    (faseId: string): Fase | undefined => {
      return fasi.find((f) => f.id === faseId);
    },
    [fasi]
  );

  // === Fasi disponibili per cambio (esclude la fase corrente) ===
  const fasiDisponibili = selectedPratica
    ? fasi.filter((f) => f.id !== selectedPratica.faseId)
    : fasi;

  return {
    // Dati
    pratiche,
    loadingPratiche,
    fasi,
    loadingFasi,
    clienti,
    loadingClienti,
    debitoriForCliente,
    loadingDebitori,
    avvocati,
    loadingAvvocati,
    error,

    // Filtri
    filterClienteId,
    showInactive,
    setShowInactive,
    handleFilterByCliente,

    // Pratica selezionata
    selectedPraticaId,
    selectedPratica,
    handleSelectPratica,
    handleCloseDetail,

    // Form nuova pratica
    showNewForm,
    setShowNewForm,
    newForm,
    updateNewForm,
    resetNewForm,
    submitNewPratica,
    savingNew,

    // Form modifica
    isEditing,
    editForm,
    updateEditForm,
    handleStartEditing,
    handleCancelEditing,
    submitEditForm,
    savingEdit,

    // Cambio fase
    showCambioFase,
    cambioFaseData,
    fasiDisponibili,
    handleOpenCambioFase,
    handleCloseCambioFase,
    updateCambioFaseData,
    submitCambioFase,
    savingCambioFase,

    // Azioni
    handleRiapriPratica,
    handleDeactivatePratica,
    handleReactivatePratica,
    handleDeletePratica,

    // Helpers
    getFaseById,
    refreshPratiche: loadPratiche,
  };
}