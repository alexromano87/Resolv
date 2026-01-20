// apps/frontend/src/components/PianoAmmortamento.tsx
import { useState, useEffect, useMemo } from 'react';
import { pianiAmmortamentoApi } from '../api/piani-ammortamento';
import type { RataAmmortamento, StatistichePiano, CreatePianoAmmortamentoDto, PianoAmmortamento as PianoAmmortamentoType } from '../api/piani-ammortamento';
import { Calendar, Check, X, Plus, Trash2, Euro, TrendingUp, FileDown, RefreshCw, FileText } from 'lucide-react';
import { BodyPortal } from './ui/BodyPortal';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { useToast } from './ui/ToastProvider';
import { DateField } from './ui/DateField';
import { CustomSelect } from './ui/CustomSelect';
import { tassiInteresseApi, type TassoInteresse } from '../api/tassi-interesse';

interface PianoAmmortamentoProps {
  praticaId: string;
  openCreateOnMount?: boolean;
  onMovimentiUpdated?: () => Promise<void> | void;
  onPraticaUpdated?: () => Promise<void> | void;
  onClose?: () => void;
}

export function PianoAmmortamento({ praticaId, openCreateOnMount, onMovimentiUpdated, onPraticaUpdated, onClose }: PianoAmmortamentoProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { success: toastSuccess, error: toastError } = useToast();
  const [piano, setPiano] = useState<PianoAmmortamentoType | null>(null);
  const [statistiche, setStatistiche] = useState<StatistichePiano | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generaReport, setGeneraReport] = useState(false);
  const [formData, setFormData] = useState<CreatePianoAmmortamentoDto>({
    praticaId,
    capitaleIniziale: 10000,
    numeroRate: 10,
    dataInizioRate: new Date().toISOString().split('T')[0],
    note: '',
    applicaInteressi: false,
    tipoInteresse: undefined,
    tassoInteresse: undefined,
    tipoAmmortamento: 'italiano',
    capitalizzazione: 'nessuna',
    dataInizioInteressi: undefined,
    moratorioPre2013: false,
    moratorioMaggiorazione: false,
    moratorioPctMaggiorazione: 4,
    applicaArt1194: true,
  });
  const [capitaleInizialeInput, setCapitaleInizialeInput] = useState('');
  const [isEditingCapitale, setIsEditingCapitale] = useState(false);
  const [tassiInteresse, setTassiInteresse] = useState<TassoInteresse[]>([]);
  const [tassiLoading, setTassiLoading] = useState(false);
  const [tassiError, setTassiError] = useState<string | null>(null);

  // Stati per modal registrazione pagamento
  const [showRegistraPagamento, setShowRegistraPagamento] = useState(false);
  const [rataSelezionata, setRataSelezionata] = useState<RataAmmortamento | null>(null);
  const [dataPagamento, setDataPagamento] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [codicePagamento, setCodicePagamento] = useState('');
  const [notePagamento, setNotePagamento] = useState('');
  const [ricevutaFile, setRicevutaFile] = useState<File | null>(null);
  const [loadingPagamento, setLoadingPagamento] = useState(false);

  // Stati per modal dettagli pagamento
  const [showDettagliPagamento, setShowDettagliPagamento] = useState(false);
  const [rataDettaglio, setRataDettaglio] = useState<RataAmmortamento | null>(null);

  const parseAmount = (value: string) => {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const calcolaGiorni = (dataInizio: Date, dataFine: Date) => {
    const diff = dataFine.getTime() - dataInizio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const pianoData = await pianiAmmortamentoApi.getPianoByPratica(praticaId);
      setPiano(pianoData);

      if (pianoData) {
        const statsData = await pianiAmmortamentoApi.getStatistiche(pianoData.id);
        setStatistiche(statsData);
      } else {
        setStatistiche(null);
      }
    } catch (error) {
      console.error('Errore caricamento piano:', error);
      setPiano(null);
      setStatistiche(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [praticaId]);

  useEffect(() => {
    if (openCreateOnMount) {
      setShowCreateModal(true);
    }
  }, [openCreateOnMount]);

  useEffect(() => {
    if (!isEditingCapitale) {
      setCapitaleInizialeInput(formatAmount(formData.capitaleIniziale));
    }
  }, [formData.capitaleIniziale, isEditingCapitale]);

  useEffect(() => {
    let isActive = true;
    const shouldLoad =
      formData.applicaInteressi &&
      (formData.tipoInteresse === 'legale' || formData.tipoInteresse === 'moratorio');
    if (!shouldLoad) {
      setTassiInteresse([]);
      setTassiError(null);
      setTassiLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadTassi = async () => {
      try {
        setTassiLoading(true);
        const data = await tassiInteresseApi.getByTipo(formData.tipoInteresse as 'legale' | 'moratorio');
        if (!isActive) return;
        setTassiInteresse(data);
        setTassiError(null);
      } catch (err: any) {
        if (!isActive) return;
        setTassiInteresse([]);
        setTassiError(err?.message || 'Impossibile recuperare i tassi di interesse');
      } finally {
        if (isActive) {
          setTassiLoading(false);
        }
      }
    };

    loadTassi();
    return () => {
      isActive = false;
    };
  }, [formData.applicaInteressi, formData.tipoInteresse]);

  const tassoSelezionato = useMemo(() => {
    if (!formData.applicaInteressi) return null;
    if (formData.tipoInteresse === 'fisso') return null;
    if (!tassiInteresse.length) return null;
    const riferimento = new Date(formData.dataInizioInteressi || formData.dataInizioRate);
    const validi = tassiInteresse.filter((tasso) => {
      const inizio = new Date(tasso.dataInizioValidita);
      const fine = tasso.dataFineValidita ? new Date(tasso.dataFineValidita) : null;
      return riferimento >= inizio && (!fine || riferimento <= fine);
    });
    if (validi.length) {
      return validi.sort((a, b) => new Date(b.dataInizioValidita).getTime() - new Date(a.dataInizioValidita).getTime())[0];
    }
    if (formData.tipoInteresse === 'moratorio') {
      const fallback = tassiInteresse
        .filter((tasso) => new Date(tasso.dataInizioValidita) <= riferimento)
        .sort((a, b) => new Date(b.dataInizioValidita).getTime() - new Date(a.dataInizioValidita).getTime());
      return fallback[0] || null;
    }
    return null;
  }, [formData.applicaInteressi, formData.tipoInteresse, formData.dataInizioInteressi, formData.dataInizioRate, tassiInteresse]);

  const tassoEffettivo = useMemo(() => {
    if (!formData.applicaInteressi) return null;
    if (formData.tipoInteresse === 'fisso') {
      return formData.tassoInteresse && formData.tassoInteresse > 0 ? formData.tassoInteresse : null;
    }
    if (!tassoSelezionato) return null;
    let tasso = Number(tassoSelezionato.tassoPercentuale);
    if (formData.tipoInteresse === 'moratorio') {
      if (formData.moratorioPre2013) {
        tasso = Math.max(tasso - 1, 0);
      }
      if (formData.moratorioMaggiorazione) {
        tasso += formData.moratorioPctMaggiorazione ?? 4;
      }
    }
    return tasso;
  }, [
    formData.applicaInteressi,
    formData.tipoInteresse,
    formData.tassoInteresse,
    formData.moratorioPre2013,
    formData.moratorioMaggiorazione,
    formData.moratorioPctMaggiorazione,
    tassoSelezionato,
  ]);

  const isMoratorioFallback = useMemo(() => {
    if (!formData.applicaInteressi || formData.tipoInteresse !== 'moratorio') return false;
    if (!tassiInteresse.length || !tassoSelezionato) return false;
    const riferimento = new Date(formData.dataInizioInteressi || formData.dataInizioRate);
    const validi = tassiInteresse.filter((tasso) => {
      const inizio = new Date(tasso.dataInizioValidita);
      const fine = tasso.dataFineValidita ? new Date(tasso.dataFineValidita) : null;
      return riferimento >= inizio && (!fine || riferimento <= fine);
    });
    return validi.length === 0;
  }, [
    formData.applicaInteressi,
    formData.tipoInteresse,
    formData.dataInizioInteressi,
    formData.dataInizioRate,
    tassiInteresse,
    tassoSelezionato,
  ]);

  const ratePreview = useMemo(() => {
    if (!formData.capitaleIniziale || !formData.numeroRate) return null;
    const quotaCapitale = formData.capitaleIniziale / formData.numeroRate;

    if (!formData.applicaInteressi || !tassoEffettivo) {
      return [{
        numeroRata: 1,
        importo: quotaCapitale,
        quotaCapitale,
        quotaInteressi: 0,
        giorni: 0,
        capitaleResiduo: formData.capitaleIniziale - quotaCapitale
      }];
    }

    const dataInizio = new Date(formData.dataInizioRate);
    const dataInizioInteressi = new Date(formData.dataInizioInteressi || formData.dataInizioRate);
    const tipoAmmortamento = formData.tipoAmmortamento || 'italiano';

    if (tipoAmmortamento === 'italiano') {
      // Ammortamento italiano: quota capitale costante
      const rate = [];
      let capitaleResiduo = formData.capitaleIniziale;
      let dataScadenzaPrecedente = dataInizioInteressi;

      for (let i = 0; i < formData.numeroRate; i++) {
        const dataScadenza = new Date(dataInizio);
        dataScadenza.setMonth(dataScadenza.getMonth() + i);

        const giorni = calcolaGiorni(dataScadenzaPrecedente, dataScadenza);
        const quotaInteressi = (capitaleResiduo * tassoEffettivo * giorni) / 36500;

        rate.push({
          numeroRata: i + 1,
          quotaCapitale,
          quotaInteressi,
          importo: quotaCapitale + quotaInteressi,
          dataScadenza,
          giorni,
          capitaleResiduo: capitaleResiduo - quotaCapitale,
        });

        capitaleResiduo -= quotaCapitale;
        dataScadenzaPrecedente = dataScadenza;
      }

      return rate;
    } else {
      // Ammortamento francese: rata costante
      const rate = [];
      const tassoMensile = (tassoEffettivo / 100) / 12;
      const rataFissa = formData.capitaleIniziale * (tassoMensile * Math.pow(1 + tassoMensile, formData.numeroRate)) /
                        (Math.pow(1 + tassoMensile, formData.numeroRate) - 1);

      let capitaleResiduo = formData.capitaleIniziale;
      let dataScadenzaPrecedente = dataInizioInteressi;

      for (let i = 0; i < formData.numeroRate; i++) {
        const dataScadenza = new Date(dataInizio);
        dataScadenza.setMonth(dataScadenza.getMonth() + i);

        const giorni = calcolaGiorni(dataScadenzaPrecedente, dataScadenza);
        const quotaInteressi = (capitaleResiduo * tassoEffettivo * giorni) / 36500;

        let quotaCapitaleRata = rataFissa - quotaInteressi;
        if (i === formData.numeroRate - 1) {
          quotaCapitaleRata = capitaleResiduo;
        }

        rate.push({
          numeroRata: i + 1,
          quotaCapitale: quotaCapitaleRata,
          quotaInteressi,
          importo: quotaCapitaleRata + quotaInteressi,
          dataScadenza,
          giorni,
          capitaleResiduo: capitaleResiduo - quotaCapitaleRata,
        });

        capitaleResiduo -= quotaCapitaleRata;
        dataScadenzaPrecedente = dataScadenza;
      }

      return rate;
    }
  }, [
    formData.capitaleIniziale,
    formData.numeroRate,
    formData.dataInizioRate,
    formData.dataInizioInteressi,
    formData.applicaInteressi,
    formData.tipoAmmortamento,
    tassoEffettivo,
  ]);

  const handleCreaPiano = async () => {
    if (!formData.capitaleIniziale || !formData.numeroRate || !formData.dataInizioRate) {
      toastError('Compila tutti i campi obbligatori', 'Validazione');
      return;
    }

    if (formData.applicaInteressi) {
      if (!formData.tipoInteresse) {
        toastError('Seleziona il tipo di interesse', 'Validazione');
        return;
      }
      if (formData.tipoInteresse === 'fisso' && (!formData.tassoInteresse || formData.tassoInteresse <= 0)) {
        toastError('Inserisci un tasso percentuale valido per il tasso fisso', 'Validazione');
        return;
      }
      if ((formData.tipoInteresse === 'legale' || formData.tipoInteresse === 'moratorio') && (tassoEffettivo === null || tassoEffettivo <= 0)) {
        toastError('Impossibile recuperare il tasso di interesse dal database. Verifica che ci siano tassi validi per la data selezionata.', 'Validazione');
        return;
      }
    }

    if (piano) {
      const proceed = await confirm({
        title: 'Rigenerare il piano di ammortamento?',
        message: 'Il piano attuale verrà sostituito con il nuovo piano. Vuoi continuare?',
        confirmText: 'Rigenera',
        cancelText: 'Annulla',
        variant: 'warning',
      });
      if (!proceed) return;
    }

    try {
      setLoading(true);

      // Prepara i dati da inviare, assicurandosi che tassoInteresse sia valorizzato
      const dataToSend = { ...formData };
      if (dataToSend.applicaInteressi && tassoEffettivo !== null) {
        dataToSend.tassoInteresse = tassoEffettivo;
      }

      const created = await pianiAmmortamentoApi.creaPiano(dataToSend);
      setShowCreateModal(false);
      await loadData();
      if (generaReport && created) {
        try {
          const blob = await pianiAmmortamentoApi.downloadReport(created.id);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `piano-ammortamento-${created.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (err) {
          console.error('Errore creazione report piano:', err);
        }
      }
      toastSuccess('Piano di ammortamento creato con successo');
    } catch (error: any) {
      console.error('Errore creazione piano:', error);
      toastError(error.message || 'Errore nella creazione del piano');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegistraPagamento = (rata: RataAmmortamento) => {
    setRataSelezionata(rata);
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setMetodoPagamento('');
    setCodicePagamento('');
    setNotePagamento('');
    setRicevutaFile(null);
    setShowRegistraPagamento(true);
  };

  const handleRegistraPagamento = async () => {
    if (!rataSelezionata || !dataPagamento || !metodoPagamento) {
      toastError('Compila tutti i campi obbligatori');
      return;
    }

    setLoadingPagamento(true);
    try {
      await pianiAmmortamentoApi.registraPagamentoRata(
        rataSelezionata.id,
        {
          dataPagamento,
          metodoPagamento,
          codicePagamento: codicePagamento || undefined,
          note: notePagamento || undefined,
        },
        ricevutaFile || undefined
      );

      toastSuccess('Pagamento registrato con successo');
      setShowRegistraPagamento(false);
      setRataSelezionata(null);
      await loadData();

      // Aggiorna la lista dei movimenti finanziari
      if (onMovimentiUpdated) {
        await onMovimentiUpdated();
      }

      // Aggiorna la pratica per ricaricare lo storico
      if (onPraticaUpdated) {
        await onPraticaUpdated();
      }
    } catch (error: any) {
      console.error('Errore registrazione pagamento:', error);
      toastError(error.message || 'Errore durante la registrazione del pagamento');
    } finally {
      setLoadingPagamento(false);
    }
  };

  const handleStornaPagamento = async (rata: RataAmmortamento) => {
    const proceed = await confirm({
      title: 'Stornare il pagamento?',
      message: `Vuoi stornare il pagamento della rata ${rata.numeroRata}? Questa azione annullerà il pagamento e rimuoverà il movimento finanziario associato.`,
      confirmText: 'Storna pagamento',
      cancelText: 'Annulla',
      variant: 'warning',
    });
    if (!proceed) return;

    try {
      await pianiAmmortamentoApi.stornaPagamentoRata(rata.id);
      toastSuccess('Pagamento stornato con successo');
      await loadData();
      if (onMovimentiUpdated) {
        await onMovimentiUpdated();
      }
      if (onPraticaUpdated) {
        await onPraticaUpdated();
      }
    } catch (error: any) {
      console.error('Errore storno pagamento:', error);
      toastError(error.message || 'Errore durante lo storno del pagamento');
    }
  };

  const handleOpenDettagliPagamento = (rata: RataAmmortamento) => {
    setRataDettaglio(rata);
    setShowDettagliPagamento(true);
  };

  const handleDownloadRicevuta = async (rataId: string) => {
    try {
      const blob = await pianiAmmortamentoApi.downloadRicevutaRata(rataId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ricevuta-rata-${rataId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toastSuccess('Ricevuta scaricata con successo');
    } catch (error: any) {
      console.error('Errore download ricevuta:', error);
      toastError(error.message || 'Errore durante il download della ricevuta');
    }
  };

  const handleEliminaPiano = async () => {
    if (!piano) return;
    const proceed = await confirm({
      title: 'Eliminare il piano di ammortamento?',
      message: 'Questa azione elimina piano e rate. Vuoi continuare?',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger',
    });
    if (!proceed) return;

    try {
      setLoading(true);
      await pianiAmmortamentoApi.deletePiano(piano.id);
      await loadData();
      toastSuccess('Piano di ammortamento eliminato');
    } catch (error: any) {
      console.error('Errore eliminazione piano:', error);
      toastError(error.message || 'Errore nell\'eliminazione del piano');
    } finally {
      setLoading(false);
    }
  };

  const handleChiudiPiano = async (esito: 'positivo' | 'negativo') => {
    if (!piano) return;
    const proceed = await confirm({
      title: esito === 'positivo' ? 'Chiudere il piano positivamente?' : 'Chiudere il piano negativamente?',
      message: esito === 'positivo'
        ? 'Il piano verrà chiuso e il capitale recuperato sarà registrato. Vuoi continuare?'
        : 'Il piano verrà chiuso come non recuperato. Vuoi continuare?',
      confirmText: 'Conferma chiusura',
      cancelText: 'Annulla',
      variant: 'warning',
    });
    if (!proceed) return;
    try {
      setLoading(true);
      await pianiAmmortamentoApi.chiudiPiano(piano.id, { esito });
      await loadData();
      if (onMovimentiUpdated) {
        await onMovimentiUpdated();
      }
      toastSuccess('Piano chiuso con successo');
    } catch (error: any) {
      console.error('Errore chiusura piano:', error);
      toastError(error.message || 'Errore durante la chiusura');
    } finally {
      setLoading(false);
    }
  };

  const handleRiapri = async () => {
    if (!piano) return;
    const proceed = await confirm({
      title: 'Riaprire il piano di ammortamento?',
      message: 'Il piano tornerà attivo mantenendo le rate già pagate. Vuoi continuare?',
      confirmText: 'Riapri',
      cancelText: 'Annulla',
      variant: 'warning',
    });
    if (!proceed) return;
    try {
      setLoading(true);
      await pianiAmmortamentoApi.riapriPiano(piano.id);
      await loadData();
      if (onMovimentiUpdated) {
        await onMovimentiUpdated();
      }
      toastSuccess('Piano riaperto');
    } catch (error: any) {
      console.error('Errore riapertura piano:', error);
      toastError(error.message || 'Errore durante la riapertura');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!piano) return;
    try {
      setLoading(true);
      const blob = await pianiAmmortamentoApi.downloadReport(piano.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `piano-ammortamento-${piano.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Errore download report:', error);
      toastError(error.message || 'Errore nel download del report');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const rate = [...(piano?.rate || [])].sort((a, b) => a.numeroRata - b.numeroRata);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
              <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Piano di ammortamento</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dettaglio piano</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700"
              >
                <X className="h-4 w-4" />
                Chiudi Finestra
              </button>
            )}
            {piano && (
              <button
                onClick={handleEliminaPiano}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-800"
              >
                <Trash2 className="h-4 w-4" />
                Elimina Piano
              </button>
            )}
            {piano && (
              <button
                onClick={handleDownloadReport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800"
              >
                <FileDown className="h-4 w-4" />
                Report
              </button>
            )}
            {piano && piano.stato !== 'attivo' && (
              <button
                onClick={handleRiapri}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300 dark:bg-amber-900/50"
              >
                <RefreshCw className="h-4 w-4" />
                Riapri
              </button>
            )}
            {piano && piano.stato === 'attivo' && (
              <>
                <button
                  onClick={() => handleChiudiPiano('negativo')}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700"
                >
                  <X className="h-4 w-4" />
                  Chiudi (negativo)
                </button>
                <button
                  onClick={() => handleChiudiPiano('positivo')}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300 dark:bg-emerald-900/50"
                >
                  <Check className="h-4 w-4" />
                  Chiudi (positivo)
                </button>
              </>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800"
            >
              <Plus className="h-4 w-4" />
              {piano ? 'Rigenera Piano' : 'Crea Piano'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-6 space-y-6">
        {statistiche && statistiche.numeroRateTotali > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="wow-panel p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Euro className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Capitale Totale</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    € {formatAmount(statistiche.totaleCapitale)}
                  </p>
                </div>
              </div>
            </div>

            <div className="wow-panel p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Capitale Pagato</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    € {formatAmount(statistiche.capitalePagato)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {statistiche.ratePagate}/{statistiche.numeroRateTotali} rate
                  </p>
                </div>
              </div>
            </div>

            <div className="wow-panel p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Capitale Residuo</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    € {formatAmount(statistiche.capitaleResiduo)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {statistiche.rateResidue} rate rimanenti
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {piano && piano.applicaInteressi && (
          <div className="wow-panel p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800">
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3">Informazioni Interessi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Tipo Interesse:</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {piano.tipoInteresse === 'legale' && 'Interesse Legale'}
                  {piano.tipoInteresse === 'moratorio' && 'Interesse Moratorio'}
                  {piano.tipoInteresse === 'fisso' && 'Tasso Fisso Personalizzato'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Tasso Applicato:</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {piano.tassoInteresse ? `${piano.tassoInteresse}%` : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Capitalizzazione:</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {piano.capitalizzazione === 'nessuna' && 'Nessuna (interessi semplici)'}
                  {piano.capitalizzazione === 'trimestrale' && 'Trimestrale'}
                  {piano.capitalizzazione === 'semestrale' && 'Semestrale'}
                  {piano.capitalizzazione === 'annuale' && 'Annuale'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Totale Interessi:</p>
                <p className="font-bold text-indigo-600 dark:text-indigo-400">
                  € {formatAmount(Number(piano.totaleInteressi || 0))}
                </p>
              </div>
              {piano.dataInizioInteressi && (
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Data Inizio Maturazione:</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {formatDate(piano.dataInizioInteressi)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {rate.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Rata
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Importo
                    </th>
                    {piano?.applicaInteressi && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                          Quota Capitale
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                          Quota Interessi
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Scadenza
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Stato
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Data Pagamento
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {rate.map((rata) => (
                    <tr
                      key={rata.id}
                      className={`transition-colors ${
                        rata.pagata
                          ? 'bg-green-50/50 dark:bg-green-900/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                        Rata {rata.numeroRata}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                        € {formatAmount(Number(rata.importo))}
                      </td>
                      {piano?.applicaInteressi && (
                        <>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            € {formatAmount(Number(rata.quotaCapitale))}
                          </td>
                          <td className="px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400">
                            € {formatAmount(Number(rata.quotaInteressi))}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(rata.dataScadenza)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {rata.pagata ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            Pagata
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            <X className="h-3 w-3" />
                            Da pagare
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {rata.dataPagamento ? formatDate(rata.dataPagamento) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!rata.pagata ? (
                          <button
                            onClick={() => handleOpenRegistraPagamento(rata)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            Registra Pagamento
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <button
                              onClick={() => handleOpenDettagliPagamento(rata)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                            >
                              Visualizza Dettagli
                            </button>
                            <button
                              onClick={() => handleStornaPagamento(rata)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                              Storna Pagamento
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nessun piano di ammortamento presente. Crea un nuovo piano per iniziare.
            </p>
          </div>
        )}
      </div>

      {/* Modale Creazione Piano */}
      {showCreateModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowCreateModal(false)}
              aria-label="Chiudi modale"
            />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 display-font">
                  {piano ? 'Rigenera Piano di Ammortamento' : 'Crea Piano di Ammortamento'}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 rounded-lg dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contenuto */}
              <div className="flex-1 overflow-auto space-y-4 p-4">
                <div className="wow-panel p-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Capitale Iniziale (€)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={capitaleInizialeInput}
                    onFocus={() => setIsEditingCapitale(true)}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setCapitaleInizialeInput(nextValue);
                      setFormData({ ...formData, capitaleIniziale: parseAmount(nextValue) });
                    }}
                    onBlur={() => {
                      setIsEditingCapitale(false);
                      setCapitaleInizialeInput(formatAmount(formData.capitaleIniziale));
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="1.000,00"
                  />
                </div>

                <div className="wow-panel p-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Numero di Rate
                  </label>
                  <input
                    type="number"
                    value={formData.numeroRate}
                    onChange={(e) => setFormData({ ...formData, numeroRate: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="10"
                    min="1"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {!formData.applicaInteressi && (
                      <>Importo rata: € {formatAmount(formData.capitaleIniziale / formData.numeroRate)}</>
                    )}
                      {formData.applicaInteressi && (
                      <>
                        {tassiLoading && (formData.tipoInteresse === 'legale' || formData.tipoInteresse === 'moratorio')
                          ? 'Recupero tasso in corso...'
                          : tassiError
                            ? tassiError
                            : !tassoEffettivo
                              ? 'Inserisci un tasso valido o seleziona una data con tasso disponibile'
                              : ratePreview && ratePreview.length > 0
                                ? `Importo rata (1ª): € ${formatAmount(ratePreview[0].importo)} (capitale € ${formatAmount(ratePreview[0].quotaCapitale)} + interessi € ${formatAmount(ratePreview[0].quotaInteressi)}, ${ratePreview[0].giorni} giorni, tasso ${tassoEffettivo.toFixed(2)}%)`
                                : ''}
                        {isMoratorioFallback && (
                          <span className="block text-[11px] text-amber-600">
                            Tasso moratorio scaduto: applicato l'ultimo disponibile fino a nuovo inserimento.
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>

                <div className="wow-panel p-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Data Prima Rata
                  </label>
                  <DateField
                    value={formData.dataInizioRate}
                    onChange={(value) => setFormData({ ...formData, dataInizioRate: value })}
                    placeholder="Seleziona una data"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Le rate successive saranno mensili
                  </p>
                </div>

                {/* Sezione Interessi */}
                <div className="wow-panel p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    <input
                      type="checkbox"
                      checked={formData.applicaInteressi}
                      onChange={(e) => setFormData({
                        ...formData,
                        applicaInteressi: e.target.checked,
                        tipoInteresse: e.target.checked ? 'legale' : undefined,
                        tassoInteresse: undefined,
                        dataInizioInteressi: e.target.checked ? formData.dataInizioRate : undefined,
                        moratorioPre2013: false,
                        moratorioMaggiorazione: false,
                        moratorioPctMaggiorazione: 4,
                        applicaArt1194: true,
                      })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    Applica interessi
                  </label>

                  {formData.applicaInteressi && (
                    <div className="space-y-4 mt-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Tipo Interesse *
                        </label>
                        <CustomSelect
                          options={[
                            { value: '', label: 'Seleziona tipo' },
                            { value: 'legale', label: 'Interesse Legale' },
                            { value: 'moratorio', label: 'Interesse Moratorio' },
                            { value: 'fisso', label: 'Tasso Fisso Personalizzato' },
                          ]}
                          value={formData.tipoInteresse || ''}
                          onChange={(value) => setFormData({
                            ...formData,
                            tipoInteresse: value as 'legale' | 'moratorio' | 'fisso',
                            tassoInteresse: value === 'fisso' ? 0 : undefined
                          })}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {formData.tipoInteresse === 'legale' && 'Tasso legale stabilito dal Ministero del Tesoro'}
                          {formData.tipoInteresse === 'moratorio' && 'Tasso BCE + maggiorazioni ex D.Lgs. 231/2002'}
                          {formData.tipoInteresse === 'fisso' && 'Inserisci manualmente il tasso percentuale'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Tipo Ammortamento *
                        </label>
                        <CustomSelect
                          options={[
                            { value: 'italiano', label: 'Ammortamento Italiano' },
                            { value: 'francese', label: 'Ammortamento Francese' },
                          ]}
                          value={formData.tipoAmmortamento || 'italiano'}
                          onChange={(value) => setFormData({
                            ...formData,
                            tipoAmmortamento: value as 'italiano' | 'francese'
                          })}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {formData.tipoAmmortamento === 'italiano' && 'Quota capitale costante, interessi decrescenti (rate decrescenti)'}
                          {formData.tipoAmmortamento === 'francese' && 'Rata costante, quota capitale crescente, interessi decrescenti'}
                        </p>
                      </div>

                      {formData.tipoInteresse === 'fisso' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tasso Percentuale (%) *
                          </label>
                          <input
                            type="text"
                            value={formData.tassoInteresse || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              tassoInteresse: parseFloat(e.target.value) || 0
                            })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            placeholder="es. 5.50"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Inserisci il tasso di interesse annuo (es. 5.50 per 5,50%)
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Capitalizzazione
                        </label>
                        <CustomSelect
                          options={[
                            { value: 'nessuna', label: 'Nessuna (interessi semplici)' },
                            { value: 'trimestrale', label: 'Trimestrale' },
                            { value: 'semestrale', label: 'Semestrale' },
                            { value: 'annuale', label: 'Annuale' },
                          ]}
                          value={formData.capitalizzazione || 'nessuna'}
                          onChange={(value) => setFormData({
                            ...formData,
                            capitalizzazione: value as 'nessuna' | 'trimestrale' | 'semestrale' | 'annuale'
                          })}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Frequenza di capitalizzazione degli interessi maturati
                        </p>
                        <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                          <p>La capitalizzazione decorre da date prefissate:</p>
                          <p>Trimestrale: 1° gennaio, 1° aprile, 1° luglio, 1° ottobre.</p>
                          <p>Semestrale: 1° gennaio e 1° luglio. Annuale: 1° gennaio.</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Data Inizio Maturazione Interessi
                        </label>
                        <DateField
                          value={formData.dataInizioInteressi || formData.dataInizioRate}
                          onChange={(value) => setFormData({ ...formData, dataInizioInteressi: value })}
                          placeholder="Seleziona data"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Data da cui iniziano a maturare gli interessi
                        </p>
                      </div>

                      {formData.tipoInteresse === 'moratorio' && (
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                          <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={formData.moratorioPre2013}
                              onChange={(e) => setFormData({ ...formData, moratorioPre2013: e.target.checked })}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span>
                              Transazione conclusa entro il 31/12/2012 (maggiorazione previgente 7%).
                            </span>
                          </label>

                          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={formData.moratorioMaggiorazione}
                                onChange={(e) => setFormData({ ...formData, moratorioMaggiorazione: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                              />
                              <span>Applica maggiorazione per prodotti agricoli e agroalimentari</span>
                            </label>
                            {formData.moratorioMaggiorazione && (
                              <div className="flex items-center gap-2">
                                <CustomSelect
                                  options={[
                                    { value: '2', label: '2%' },
                                    { value: '4', label: '4%' },
                                  ]}
                                  value={String(formData.moratorioPctMaggiorazione ?? 4)}
                                  onChange={(value) => setFormData({ ...formData, moratorioPctMaggiorazione: Number(value) })}
                                  triggerClassName="!min-h-[28px] !px-2 !py-1 !text-xs"
                                />
                                <span className="text-[11px] text-slate-500">
                                  Art. 4, comma 2, D.Lgs. 198/2021.
                                </span>
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500">
                            Gli interessi moratori sono calcolati senza anatocismo (interessi sugli interessi).
                          </p>
                        </div>
                      )}

                      <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.applicaArt1194 ?? true}
                          onChange={(e) => setFormData({ ...formData, applicaArt1194: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <span>
                          Applica art. 1194 c.c.: gli acconti vengono imputati prima agli interessi maturati e poi al capitale residuo.
                        </span>
                      </label>

                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          <strong>Nota legale:</strong> Il calcolo degli interessi è conforme agli artt. 1283 e 1284 del Codice Civile.
                          Per interessi legali e moratori, i tassi sono recuperati automaticamente dal database secondo le normative vigenti.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Note (Opzionale)
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Note sul piano di ammortamento..."
                  />
                </div>

                {/* Prospetto Rate */}
                {formData.applicaInteressi && tassoEffettivo && ratePreview && ratePreview.length > 0 && (
                  <div className="wow-panel p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Prospetto Rate Calcolate con Interessi
                    </h3>
                    <div className="max-h-60 overflow-y-auto rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-100 dark:bg-blue-900/30 sticky top-0">
                          <tr>
                            <th className="px-2 py-2 text-left font-semibold">Rata</th>
                            <th className="px-2 py-2 text-right font-semibold">Capitale</th>
                            <th className="px-2 py-2 text-right font-semibold">Interessi</th>
                            <th className="px-2 py-2 text-right font-semibold">Totale</th>
                            <th className="px-2 py-2 text-center font-semibold">Giorni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100 dark:divide-blue-900/30">
                          {ratePreview.map((rata) => (
                            <tr key={rata.numeroRata} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                              <td className="px-2 py-1.5 font-medium">{rata.numeroRata}</td>
                              <td className="px-2 py-1.5 text-right">€ {formatAmount(rata.quotaCapitale)}</td>
                              <td className="px-2 py-1.5 text-right text-indigo-600 dark:text-indigo-400">
                                € {formatAmount(rata.quotaInteressi)}
                              </td>
                              <td className="px-2 py-1.5 text-right font-semibold">€ {formatAmount(rata.importo)}</td>
                              <td className="px-2 py-1.5 text-center text-slate-600 dark:text-slate-400">
                                {rata.giorni}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-blue-100 dark:bg-blue-900/30">
                          <tr className="font-bold">
                            <td className="px-2 py-2">Totale</td>
                            <td className="px-2 py-2 text-right">
                              € {formatAmount(ratePreview.reduce((sum, r) => sum + r.quotaCapitale, 0))}
                            </td>
                            <td className="px-2 py-2 text-right text-indigo-600 dark:text-indigo-400">
                              € {formatAmount(ratePreview.reduce((sum, r) => sum + r.quotaInteressi, 0))}
                            </td>
                            <td className="px-2 py-2 text-right">
                              € {formatAmount(ratePreview.reduce((sum, r) => sum + r.importo, 0))}
                            </td>
                            <td className="px-2 py-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                      <strong>Nota:</strong> Gli interessi sono calcolati sul capitale residuo decrescente.
                      Formula: I = C × S × N / 36500 (anno civile 365 giorni).
                    </p>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={generaReport}
                    onChange={(e) => setGeneraReport(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  Genera subito il report del piano
                </label>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="wow-button-ghost"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreaPiano}
                  disabled={loading}
                  className="wow-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Creazione...' : piano ? 'Rigenera' : 'Crea Piano'}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* Modal Registrazione Pagamento */}
      {showRegistraPagamento && rataSelezionata && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div
              className="modal-overlay absolute inset-0 bg-black/50"
              onClick={() => setShowRegistraPagamento(false)}
            />
            <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  Registra Pagamento - Rata {rataSelezionata.numeroRata}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Importo: € {formatAmount(Number(rataSelezionata.importo))} - Scadenza: {formatDate(rataSelezionata.dataScadenza)}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Data Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Data Pagamento *
                  </label>
                  <DateField
                    value={dataPagamento}
                    onChange={(value) => setDataPagamento(value || '')}
                    placeholder="Seleziona data"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Data in cui è stato effettuato il pagamento
                  </p>
                </div>

                {/* Metodo Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Metodo di Pagamento *
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Seleziona metodo' },
                      { value: 'bollettino-postale', label: 'Bollettino Postale' },
                      { value: 'bonifico-bancario', label: 'Bonifico Bancario' },
                      { value: 'bonifico-sepa', label: 'Bonifico SEPA' },
                      { value: 'assegno', label: 'Assegno' },
                      { value: 'contanti', label: 'Contanti' },
                      { value: 'carta-credito', label: 'Carta di Credito' },
                      { value: 'rid', label: 'RID/SDD' },
                      { value: 'altro', label: 'Altro' },
                    ]}
                    value={metodoPagamento}
                    onChange={setMetodoPagamento}
                  />
                </div>

                {/* Codice Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Codice/Riferimento Pagamento
                  </label>
                  <input
                    type="text"
                    value={codicePagamento}
                    onChange={(e) => setCodicePagamento(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Es: CRO, TRN, numero assegno, ecc."
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Numero di riferimento della transazione
                  </p>
                </div>

                {/* Carica Ricevuta */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Carica Ricevuta
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-600">
                        <FileText className="h-5 w-5" />
                        <span>{ricevutaFile ? ricevutaFile.name : 'Seleziona file (JPG, PNG, PDF)'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,application/pdf"
                        onChange={(e) => setRicevutaFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {ricevutaFile && (
                      <button
                        onClick={() => setRicevutaFile(null)}
                        className="px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Formato supportati: JPG, PNG, GIF, PDF (max 10MB)
                  </p>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Note
                  </label>
                  <textarea
                    value={notePagamento}
                    onChange={(e) => setNotePagamento(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Eventuali note aggiuntive sul pagamento"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={() => setShowRegistraPagamento(false)}
                  disabled={loadingPagamento}
                  className="wow-button-ghost"
                >
                  Annulla
                </button>
                <button
                  onClick={handleRegistraPagamento}
                  disabled={loadingPagamento || !dataPagamento || !metodoPagamento}
                  className="wow-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPagamento ? 'Registrazione...' : 'Registra Pagamento'}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* Modale Dettagli Pagamento */}
      {showDettagliPagamento && rataDettaglio && (
        <BodyPortal>
          <div className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="modal-content relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              {/* Header */}
              <div className="border-b border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Dettagli Pagamento Rata {rataDettaglio.numeroRata}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Informazioni complete sul pagamento registrato
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDettagliPagamento(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Informazioni rata */}
                  <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Informazioni Rata
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Importo Totale</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          € {formatAmount(Number(rataDettaglio.importo))}
                        </p>
                      </div>
                      {piano?.applicaInteressi && (
                        <>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Quota Capitale</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              € {formatAmount(Number(rataDettaglio.quotaCapitale))}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Quota Interessi</p>
                            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                              € {formatAmount(Number(rataDettaglio.quotaInteressi))}
                            </p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Data Scadenza</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDate(rataDettaglio.dataScadenza)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dettagli pagamento */}
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Dettagli Pagamento
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Data Pagamento</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {rataDettaglio.dataPagamento ? formatDate(rataDettaglio.dataPagamento) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Metodo di Pagamento</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {rataDettaglio.metodoPagamento || '-'}
                        </p>
                      </div>
                      {rataDettaglio.codicePagamento && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Codice/Riferimento Pagamento</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white font-mono">
                            {rataDettaglio.codicePagamento}
                          </p>
                        </div>
                      )}
                      {rataDettaglio.note && (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Note</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {rataDettaglio.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ricevuta */}
                  {rataDettaglio.ricevutaPath && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/50">
                            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                              Ricevuta Disponibile
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Copia della ricevuta di pagamento allegata
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadRicevuta(rataDettaglio.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <FileDown className="h-4 w-4" />
                          Scarica
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={() => setShowDettagliPagamento(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
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
