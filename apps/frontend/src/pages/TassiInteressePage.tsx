import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, AlertCircle, TrendingUp, Calendar, Info, BarChart3, Download } from 'lucide-react';
import { tassiInteresseApi, type TassoInteresse, type FetchTassiResultDto, type FetchedRateData, type FetchedRateWithStatus } from '../api/tassi-interesse';
import { TassiStoricoChart } from '../components/TassiStoricoChart';
import { FetchedRatesPreview } from '../components/FetchedRatesPreview';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DateField } from '../components/ui/DateField';
import { BodyPortal } from '../components/ui/BodyPortal';

interface TassoFormData {
  tipo: 'legale' | 'moratorio';
  tassoPercentuale: string;
  dataInizioValidita: string;
  dataFineValidita: string;
  decretoRiferimento?: string;
  note?: string;
}

export default function TassiInteressePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tassi, setTassi] = useState<TassoInteresse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTasso, setEditingTasso] = useState<TassoInteresse | null>(null);
  const [filterTipo, setFilterTipo] = useState<'all' | 'legale' | 'moratorio'>('all');
  const [showOnlyCurrent, setShowOnlyCurrent] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State per fetch automatico
  const [isFetching, setIsFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<FetchTassiResultDto | null>(null);
  const [showFetchModal, setShowFetchModal] = useState(false);

  const [formData, setFormData] = useState<TassoFormData>({
    tipo: 'legale',
    tassoPercentuale: '',
    dataInizioValidita: new Date().toISOString().split('T')[0],
    dataFineValidita: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0],
    decretoRiferimento: '',
    note: '',
  });

  useEffect(() => {
    loadTassi();
  }, [showOnlyCurrent, filterTipo]);

  useEffect(() => {
    const shouldFetch = searchParams.get('fetch') === '1';
    if (!shouldFetch || isFetching) return;
    handleFetchRates().finally(() => {
      searchParams.delete('fetch');
      setSearchParams(searchParams, { replace: true });
    });
  }, [searchParams, setSearchParams, isFetching]);

  const loadTassi = async () => {
    try {
      setLoading(true);
      setError(null);

      let data: TassoInteresse[];

      if (showOnlyCurrent) {
        data = await tassiInteresseApi.getCurrentRates();
      } else if (filterTipo !== 'all') {
        data = await tassiInteresseApi.getByTipo(filterTipo);
      } else {
        data = await tassiInteresseApi.getAll();
      }

      // Ordina per data inizio validità decrescente
      data.sort((a, b) => new Date(b.dataInizioValidita).getTime() - new Date(a.dataInizioValidita).getTime());

      setTassi(data);
    } catch (err) {
      setError('Errore nel caricamento dei tassi di interesse');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tasso?: TassoInteresse) => {
    if (tasso) {
      setEditingTasso(tasso);
      setFormData({
        tipo: tasso.tipo,
        tassoPercentuale: tasso.tassoPercentuale.toString(),
        dataInizioValidita: tasso.dataInizioValidita.split('T')[0],
        dataFineValidita: tasso.dataFineValidita?.split('T')[0] || '',
        decretoRiferimento: tasso.decretoRiferimento || '',
        note: tasso.note || '',
      });
    } else {
      setEditingTasso(null);
      setFormData({
        tipo: 'legale',
        tassoPercentuale: '',
        dataInizioValidita: new Date().toISOString().split('T')[0],
        dataFineValidita: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0],
        decretoRiferimento: '',
        note: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTasso(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        tipo: formData.tipo,
        tassoPercentuale: parseFloat(formData.tassoPercentuale),
        dataInizioValidita: formData.dataInizioValidita,
        dataFineValidita: formData.dataFineValidita || undefined,
        decretoRiferimento: formData.decretoRiferimento || undefined,
        note: formData.note || undefined,
      };

      if (editingTasso) {
        await tassiInteresseApi.update(editingTasso.id, payload);
      } else {
        await tassiInteresseApi.create(payload);
      }

      handleCloseModal();
      await loadTassi();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante il salvataggio');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo tasso di interesse?')) {
      return;
    }

    try {
      await tassiInteresseApi.delete(id);
      await loadTassi();
    } catch (err) {
      setError('Errore durante l\'eliminazione');
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isCurrentlyValid = (tasso: TassoInteresse) => {
    const now = new Date();
    const inizio = new Date(tasso.dataInizioValidita);
    const fine = tasso.dataFineValidita ? new Date(tasso.dataFineValidita) : null;

    return inizio <= now && (!fine || fine >= now);
  };

  const getTassoTypeColor = (tipo: string) => {
    return tipo === 'legale' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  // Handler per recupero automatico tassi
  const handleFetchRates = async () => {
    try {
      setIsFetching(true);
      setError(null);

      const result = await tassiInteresseApi.fetchCurrentRates();
      setFetchResult(result);

      if (result.autoSaved > 0) {
        // Mostra messaggio di successo
        alert(`${result.autoSaved} ${result.autoSaved === 1 ? 'tasso salvato' : 'tassi salvati'} automaticamente da fonti ufficiali.`);
        await loadTassi(); // Ricarica tabella
      }

      if (result.needsApproval > 0 || result.errors > 0 || result.skipped > 0) {
        // Mostra modal per revisione
        setShowFetchModal(true);
      }

      if (result.totalFetched === 0 && result.fetchErrors.length > 0) {
        // Nessun tasso recuperato e ci sono errori
        setError('Impossibile recuperare tassi. Verifica la connessione alle fonti esterne.');
      }

    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante il recupero dei tassi');
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  // Handler per approvazione tasso
  const handleApproveRate = async (rate: FetchedRateData) => {
    try {
      await tassiInteresseApi.approveFetchedRate(rate);
      await loadTassi(); // Ricarica tabella

      // Rimuovi il tasso approvato dal result
      if (fetchResult) {
        const updatedRates = fetchResult.rates.filter(r => r.data !== rate);
        setFetchResult({
          ...fetchResult,
          rates: updatedRates,
          needsApproval: updatedRates.filter(r => r.status === 'needs-approval').length,
          skipped: updatedRates.filter(r => r.status === 'skipped').length,
        });

        // Se non ci sono più tassi da approvare, chiudi il modal
        if (updatedRates.filter(r => r.status === 'needs-approval').length === 0) {
          setShowFetchModal(false);
          setFetchResult(null);
        }
      }

      alert('Tasso approvato e salvato con successo!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante l\'approvazione');
      console.error(err);
    }
  };

  const handleApproveSelectedRates = async (items: FetchedRateWithStatus[]) => {
    if (items.length === 0) return;
    try {
      for (const item of items) {
        await tassiInteresseApi.approveFetchedRate(item.data);
      }
      await loadTassi();

      if (fetchResult) {
        const selectedSet = new Set(items);
        const updatedRates = fetchResult.rates.filter((r) => !selectedSet.has(r));
        setFetchResult({
          ...fetchResult,
          rates: updatedRates,
          needsApproval: updatedRates.filter(r => r.status === 'needs-approval').length,
          skipped: updatedRates.filter(r => r.status === 'skipped').length,
        });

        if (updatedRates.filter(r => r.status === 'needs-approval' || r.status === 'skipped').length === 0) {
          setShowFetchModal(false);
          setFetchResult(null);
        }
      }

      alert('Tassi salvati con successo!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante il salvataggio');
      console.error(err);
    }
  };

  const removeFetchedRate = (item: FetchedRateWithStatus) => {
    if (!fetchResult) return;
    const updatedRates = fetchResult.rates.filter(r => r !== item);
    setFetchResult({
      ...fetchResult,
      rates: updatedRates,
      needsApproval: updatedRates.filter(r => r.status === 'needs-approval').length,
      skipped: updatedRates.filter(r => r.status === 'skipped').length,
    });

    if (updatedRates.filter(r => r.status === 'needs-approval' || r.status === 'skipped').length === 0) {
      setShowFetchModal(false);
      setFetchResult(null);
    }
  };

  const handleOverwriteRate = async (item: FetchedRateWithStatus) => {
    const existingId = item.duplicateCheck.existingRateId;
    if (!existingId) {
      setError('Impossibile sovrascrivere: tasso esistente non trovato.');
      return;
    }

    if (!window.confirm('Vuoi sovrascrivere il tasso esistente con quello recuperato?')) {
      return;
    }

    try {
      await tassiInteresseApi.overwriteFetchedRate(item.data, existingId);
      await loadTassi();
      removeFetchedRate(item);
      alert('Tasso sovrascritto con successo!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante la sovrascrittura');
      console.error(err);
    }
  };

  const handleDiscardRate = (item: FetchedRateWithStatus) => {
    if (!window.confirm('Vuoi scartare questo tasso recuperato?')) {
      return;
    }
    removeFetchedRate(item);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center wow-card p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">Caricamento tassi di interesse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6 wow-stagger">
        {/* Header */}
        <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <span className="wow-chip">Amministrazione</span>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
              Gestione Tassi di Interesse
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Configura e monitora i tassi di interesse legali e moratori.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleFetchRates}
              disabled={isFetching}
              className="wow-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Recupero in corso...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Recupera Tassi Automaticamente
                </>
              )}
            </button>
            <button
              onClick={() => setShowChart(!showChart)}
              className="wow-button-ghost"
            >
              <BarChart3 className="w-4 h-4" />
              {showChart ? 'Nascondi Grafico' : 'Mostra Grafico'}
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="wow-button"
            >
              <Plus className="w-5 h-5" />
              Nuovo Tasso
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="wow-panel p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Informazioni sui tassi:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                <li><strong>Tasso Legale:</strong> Fissato dal MEF con decreto ministeriale.</li>
                <li><strong>Tasso Moratorio:</strong> Tasso BCE + 8% per transazioni dopo il 31/12/2012 (semestralmente dal MEF).</li>
                <li><strong>Formula:</strong> I = C × S × N / 36500 (anno civile 365 giorni).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="wow-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo:</label>
                <div className="w-48">
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'Tutti' },
                      { value: 'legale', label: 'Legale' },
                      { value: 'moratorio', label: 'Moratorio' },
                    ]}
                    value={filterTipo}
                    onChange={(value) => setFilterTipo(value as any)}
                    placeholder="Seleziona tipo"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showOnlyCurrent}
                  onChange={(e) => setShowOnlyCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                Solo tassi validi oggi
              </label>
            </div>
          </div>
        </div>

        {/* Chart */}
        {showChart && <TassiStoricoChart tassi={tassi} />}

        {/* Error Alert */}
        {error && (
          <div className="wow-panel p-4 flex items-center gap-3 border border-rose-200 bg-rose-50/80">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <p className="text-sm text-rose-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-rose-600 hover:text-rose-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Tassi List */}
        <div className="wow-panel overflow-hidden">
          {tassi.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Nessun tasso di interesse configurato
              </h3>
              <p className="text-slate-500 mb-6">
                Inizia aggiungendo il primo tasso di interesse
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="wow-button"
              >
                <Plus className="w-5 h-5" />
                Aggiungi Tasso
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 wow-stagger-rows">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Tasso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Validità
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Decreto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Stato
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {tassi.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((tasso) => (
                    <tr key={tasso.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTassoTypeColor(tasso.tipo)}`}>
                          {tasso.tipo.charAt(0).toUpperCase() + tasso.tipo.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">
                          {tasso.tassoPercentuale.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {formatDate(tasso.dataInizioValidita)}
                        </div>
                        {tasso.dataFineValidita && (
                          <div className="text-sm text-slate-500">
                            al {formatDate(tasso.dataFineValidita)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 max-w-xs truncate">
                          {tasso.decretoRiferimento || '-'}
                        </div>
                        {tasso.note && (
                          <div className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={tasso.note}>
                            {tasso.note}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCurrentlyValid(tasso) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Valido
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            Scaduto
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(tasso.id)}
                          className="text-rose-600 hover:text-rose-800"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {tassi.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, tassi.length)}</span> di <span className="font-medium">{tassi.length}</span> risultati
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Precedente
                  </button>
                  {Array.from({ length: Math.ceil(tassi.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded-md text-sm font-medium ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(tassi.length / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(tassi.length / itemsPerPage)}
                    className="px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Successiva
                  </button>
                </div>
              </div>
            )}
          </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <BodyPortal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto dark:bg-slate-900">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {editingTasso ? 'Modifica Tasso di Interesse' : 'Nuovo Tasso di Interesse'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-4">
                <div className="space-y-4">
                  {/* Tipo */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tipo Tasso <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      options={[
                        { value: 'legale', label: 'Legale' },
                        { value: 'moratorio', label: 'Moratorio' },
                      ]}
                      value={formData.tipo}
                      onChange={(value) => setFormData({ ...formData, tipo: value as 'legale' | 'moratorio' })}
                      placeholder="Seleziona tipo"
                    />
                  </div>

                  {/* Tasso Percentuale */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tasso Percentuale <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.tassoPercentuale}
                        onChange={(e) => setFormData({ ...formData, tassoPercentuale: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-950"
                        placeholder="Es: 1.60"
                        required
                      />
                      <span className="absolute right-3 top-2 text-slate-500">%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Inserire il valore percentuale (es: 1.60 per 1,60%)
                    </p>
                  </div>

                  {/* Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Data Inizio Validità <span className="text-red-500">*</span>
                      </label>
                      <DateField
                        value={formData.dataInizioValidita}
                        onChange={(value) => setFormData({ ...formData, dataInizioValidita: value })}
                        placeholder="Seleziona data"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Data Fine Validità
                      </label>
                      <DateField
                        value={formData.dataFineValidita}
                        onChange={(value) => setFormData({ ...formData, dataFineValidita: value })}
                        placeholder="Seleziona data"
                      />
                      <p className="mt-1 text-xs text-slate-500">Opzionale</p>
                    </div>
                  </div>

                  {/* Decreto Riferimento */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Decreto di Riferimento
                    </label>
                    <input
                      type="text"
                      value={formData.decretoRiferimento}
                      onChange={(e) => setFormData({ ...formData, decretoRiferimento: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Es: Decreto MEF 10/12/2025 - GU n.289"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Note
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-950"
                      placeholder="Eventuali note aggiuntive..."
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="wow-button-ghost"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="wow-button"
                  >
                    {editingTasso ? 'Salva Modifiche' : 'Crea Tasso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* Modal Fetch Result */}
      {showFetchModal && fetchResult && (
        <FetchedRatesPreview
          result={fetchResult}
          onApprove={handleApproveRate}
          onApproveSelected={handleApproveSelectedRates}
          onOverwrite={handleOverwriteRate}
          onDiscard={handleDiscardRate}
          onClose={() => {
            setShowFetchModal(false);
            setFetchResult(null);
          }}
        />
      )}
    </div>
  );
}
