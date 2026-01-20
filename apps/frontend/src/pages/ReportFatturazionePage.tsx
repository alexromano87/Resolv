// apps/frontend/src/pages/ReportFatturazionePage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { movimentiFinanziariApi, getTipoMovimentoLabel } from '../api/movimenti-finanziari';
import type { MovimentoFinanziario } from '../api/movimenti-finanziari';
import { fetchClienti, type Cliente } from '../api/clienti';
import { Search, Check, X, FileText, User, Users, Euro, Download } from 'lucide-react';
import { BodyPortal } from '../components/ui/BodyPortal';
import { SearchableClienteSelect } from '../components/ui/SearchableClienteSelect';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DateField } from '../components/ui/DateField';
import { useToast } from '../components/ui/ToastProvider';

export default function ReportFatturazionePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [movimenti, setMovimenti] = useState<MovimentoFinanziario[]>([]);
  const [allMovimenti, setAllMovimenti] = useState<MovimentoFinanziario[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMovimento, setSelectedMovimento] = useState<MovimentoFinanziario | null>(null);
  const { error: toastError, success } = useToast();

  // Filtri
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [statoFatturazione, setStatoFatturazione] = useState<'tutti' | 'da_fatturare' | 'gia_fatturato'>('tutti');
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [tipoMovimento, setTipoMovimento] = useState<string>('tutti');
  const statoOptions = [
    { value: 'tutti', label: 'Tutti' },
    { value: 'da_fatturare', label: 'Da fatturare' },
    { value: 'gia_fatturato', label: 'Già fatturato' },
  ];
  const tipoOptions = [
    { value: 'tutti', label: 'Tutti i movimenti' },
    { value: 'compenso,anticipazione', label: 'Compensi e Anticipazioni' },
    { value: 'compenso', label: 'Solo Compensi' },
    { value: 'anticipazione', label: 'Solo Anticipazioni' },
  ];

  // Carica i movimenti
  const caricaMovimenti = async () => {
    if (!clienteId) {
      toastError('Seleziona un cliente prima di effettuare la ricerca');
      return;
    }
    setLoading(true);
    try {
      const result = await movimentiFinanziariApi.getReportFatturazione({
        clienteId,
      });
      setAllMovimenti(result);
      // Applico subito i filtri correnti
      applicaFiltri(result, {
        statoFatturazione,
        tipoMovimento,
        dataInizio,
        dataFine,
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Errore nel caricamento movimenti:', error);
      toastError('Errore nel caricamento dei movimenti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadClienti = async () => {
      try {
        const data = await fetchClienti();
        setClienti(data);
      } catch (error) {
        console.error('Errore caricamento clienti:', error);
      }
    };
    loadClienti();
  }, []);

  const applicaFiltri = (
    base: MovimentoFinanziario[],
    filtri: {
      statoFatturazione: 'tutti' | 'da_fatturare' | 'gia_fatturato';
      tipoMovimento: string;
      dataInizio: string;
      dataFine: string;
    },
  ) => {
    let filtered = [...base];

    if (filtri.statoFatturazione !== 'tutti') {
      filtered = filtered.filter((m) =>
        filtri.statoFatturazione === 'da_fatturare'
          // consideriamo da fatturare anche i movimenti non ancora marcati (null) e non già fatturati
          ? m.giaFatturato !== true && m.daFatturare !== false
          : m.giaFatturato === true,
      );
    }

    if (filtri.tipoMovimento !== 'tutti') {
      const tipi = filtri.tipoMovimento.split(',').map((t) => t.trim()).filter(Boolean);
      filtered = filtered.filter((m) => tipi.includes(m.tipo as string));
    }

    if (filtri.dataInizio) {
      const start = new Date(filtri.dataInizio).getTime();
      filtered = filtered.filter((m) => new Date(m.data).getTime() >= start);
    }
    if (filtri.dataFine) {
      const end = new Date(filtri.dataFine).getTime();
      filtered = filtered.filter((m) => new Date(m.data).getTime() <= end);
    }

    setMovimenti(filtered);
  };

  // Riesegue i filtri quando cambiano
  useEffect(() => {
    applicaFiltri(allMovimenti, { statoFatturazione, tipoMovimento, dataInizio, dataFine });
  }, [statoFatturazione, tipoMovimento, dataInizio, dataFine, allMovimenti]);

  // Toggle selezione
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Seleziona/Deseleziona tutti
  const toggleSelectAll = () => {
    if (selectedIds.size === movimenti.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(movimenti.map((m) => m.id)));
    }
  };

  const isDaFatturare = (movimento: MovimentoFinanziario) =>
    movimento.giaFatturato !== true && movimento.daFatturare !== false;

  const marcaComeFatturatoSingolo = async (movimentoId: string) => {
    setLoading(true);
    try {
      await movimentiFinanziariApi.aggiornaStatoFatturazione([movimentoId], {
        daFatturare: false,
        giaFatturato: true,
      });
      setAllMovimenti((prev) =>
        prev.map((movimento) =>
          movimento.id === movimentoId
            ? { ...movimento, giaFatturato: true, daFatturare: false }
            : movimento,
        ),
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(movimentoId);
        return next;
      });
      success('Movimento marcato come fatturato');
    } catch (error) {
      console.error('Errore aggiornamento stato fatturazione:', error);
      toastError('Errore durante la marcatura come fatturato');
    } finally {
      setLoading(false);
    }
  };

  // Marca come fatturato
  const marcaComeFatturato = async () => {
    if (selectedIds.size === 0) {
      alert('Seleziona almeno un movimento');
      return;
    }

    if (!confirm(`Confermi di voler marcare ${selectedIds.size} movimenti come fatturati?`)) {
      return;
    }

    try {
      await movimentiFinanziariApi.aggiornaStatoFatturazione(Array.from(selectedIds), {
        daFatturare: false,
        giaFatturato: true,
      });
      alert('Stato aggiornato con successo');
      await caricaMovimenti();
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato:', error);
      alert('Errore nell\'aggiornamento dello stato');
    }
  };

  // Scarica PDF report
  const scaricaPdfReport = async () => {
    if (movimenti.length === 0) {
      alert('Nessun movimento da includere nel report');
      return;
    }

    try {
      setLoading(true);
      const filters: any = {
        statoFatturazione: statoFatturazione !== 'tutti' ? statoFatturazione : undefined,
      };
      if (clienteId) filters.clienteId = clienteId;
      if (dataInizio) filters.dataInizio = dataInizio;
      if (dataFine) filters.dataFine = dataFine;
      if (tipoMovimento && tipoMovimento !== 'tutti') filters.tipoMovimento = tipoMovimento;

      const blob = await movimentiFinanziariApi.downloadPdfFatturazione(filters);

      // Crea un link per il download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-fatturazione-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Errore nel download del PDF:', error);
      alert('Errore nel download del PDF');
    } finally {
      setLoading(false);
    }
  };

  // Calcola totale selezionati
  const totaleSelezionati = movimenti
    .filter((m) => selectedIds.has(m.id))
    .reduce((sum, m) => sum + Number(m.importo), 0);

  // Formatta valuta
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  // Formatta data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Report Fatturazione</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Gestisci compensi e anticipazioni da fatturare o già fatturati
          </p>
        </div>
        {movimenti.length > 0 && (
          <button
            onClick={scaricaPdfReport}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Scarica Report PDF
          </button>
        )}
      </div>

      {/* Filtri */}
      <div className="wow-panel space-y-3 pt-5 pb-4 px-5 md:px-6 lg:px-7">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          {/* Cliente */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Cliente</label>
            <SearchableClienteSelect
              clienti={clienti}
              value={clienteId}
              onChange={setClienteId}
              placeholder="Seleziona cliente"
              allowClear
            />
          </div>

          {/* Stato Fatturazione */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Stato Fatturazione</label>
            <CustomSelect
              options={statoOptions}
              value={statoFatturazione}
              onChange={(v) => setStatoFatturazione(v as any)}
            />
          </div>

          {/* Tipo Movimento */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Tipo Movimento</label>
            <CustomSelect
              options={tipoOptions}
              value={tipoMovimento}
              onChange={(v) => setTipoMovimento(v as string)}
            />
          </div>

          {/* Data Inizio */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Data Inizio</label>
            <DateField value={dataInizio} onChange={setDataInizio} placeholder="Seleziona data" />
          </div>

          {/* Data Fine */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Data Fine</label>
            <DateField value={dataFine} onChange={setDataFine} placeholder="Seleziona data" />
          </div>
        </div>
        <div className="flex items-center gap-3 justify-between flex-wrap pt-1">
          <p className="text-sm text-slate-500">Seleziona il cliente e applica i filtri, poi carica i movimenti.</p>
          <button
            onClick={caricaMovimenti}
            disabled={loading}
            className="wow-button flex items-center gap-2 text-xs"
          >
            <Search className="h-4 w-4" />
            Carica movimenti
          </button>
        </div>
      </div>

      {/* Azioni */}
      {statoFatturazione === 'da_fatturare' && movimenti.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {selectedIds.size === movimenti.length ? 'Deseleziona tutto' : 'Seleziona tutto'}
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {selectedIds.size} di {movimenti.length} selezionati
            </span>
            {selectedIds.size > 0 && (
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Totale: {formatCurrency(totaleSelezionati)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={marcaComeFatturato}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Marca come fatturato
            </button>
          </div>
        </div>
      )}

      {/* Tabella Movimenti */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : movimenti.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Search className="h-12 w-12 text-slate-400" />
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Nessun movimento trovato con i filtri selezionati
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  {statoFatturazione === 'da_fatturare' && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === movimenti.length && movimenti.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pratica
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Causale
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Importo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {movimenti.map((movimento) => (
                  <tr
                    key={movimento.id}
                    onClick={(e) => {
                      // Non aprire la modale se si clicca sulla checkbox
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                        return;
                      }
                      setSelectedMovimento(movimento);
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    {statoFatturazione === 'da_fatturare' && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(movimento.id)}
                          onChange={() => toggleSelection(movimento.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                      {formatDate(movimento.data)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {movimento.pratica?.numeroPratica || movimento.pratica?.oggetto || 'N/D'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {getTipoMovimentoLabel(movimento.tipo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {movimento.oggetto || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(Number(movimento.importo))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statoFatturazione === 'gia_fatturato' && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Fatturato
                        </span>
                      )}
                      {statoFatturazione === 'da_fatturare' && (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                          <X className="h-4 w-4" />
                          Da fatturare
                        </span>
                      )}
                      {statoFatturazione === 'tutti' && (
                        isDaFatturare(movimento) ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                              <X className="h-4 w-4" />
                              Da fatturare
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                marcaComeFatturatoSingolo(movimento.id);
                              }}
                              disabled={loading}
                              className="wow-button px-3 py-1 text-xs"
                            >
                              Fattura
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Check className="h-4 w-4" />
                            Fatturato
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <td
                    colSpan={statoFatturazione === 'da_fatturare' ? 5 : 4}
                    className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Totale:
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(movimenti.reduce((sum, m) => sum + Number(m.importo), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modale Dettagli Movimento */}
      {selectedMovimento && (
        <BodyPortal>
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Dettagli Movimento
              </h2>
              <button
                onClick={() => setSelectedMovimento(null)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenuto */}
            <div className="p-6 space-y-6">
              {/* Sezione Pratica */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  <FileText className="h-4 w-4" />
                  Informazioni Pratica
                </h3>
                <div className="rounded-lg bg-slate-50 p-4 space-y-2 dark:bg-slate-800/50">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Numero Pratica:</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {selectedMovimento.pratica?.numeroPratica || 'N/D'}
                    </span>
                  </div>
                  {selectedMovimento.pratica?.oggetto && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Oggetto:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {selectedMovimento.pratica.oggetto}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setSelectedMovimento(null);
                        navigate(`/pratiche/${selectedMovimento.praticaId}`);
                      }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Vai alla pratica →
                    </button>
                  </div>
                </div>
              </div>

              {/* Sezione Cliente (se disponibile) */}
              {selectedMovimento.pratica?.cliente && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    <User className="h-4 w-4" />
                    Cliente
                  </h3>
                  <div className="rounded-lg bg-slate-50 p-4 space-y-2 dark:bg-slate-800/50">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Ragione Sociale:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {selectedMovimento.pratica.cliente.ragioneSociale || 'N/D'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione Debitore (se disponibile) */}
              {selectedMovimento.pratica?.debitore && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    <Users className="h-4 w-4" />
                    Debitore
                  </h3>
                  <div className="rounded-lg bg-slate-50 p-4 space-y-2 dark:bg-slate-800/50">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Ragione Sociale:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {selectedMovimento.pratica.debitore.ragioneSociale || 'N/D'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione Movimento */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  <Euro className="h-4 w-4" />
                  Dettagli Movimento
                </h3>
                <div className="rounded-lg bg-slate-50 p-4 space-y-2 dark:bg-slate-800/50">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Tipo:</span>
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {getTipoMovimentoLabel(selectedMovimento.tipo)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Importo:</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(Number(selectedMovimento.importo))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Data:</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {formatDate(selectedMovimento.data)}
                    </span>
                  </div>
                  {selectedMovimento.oggetto && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Causale/Note:</span>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {selectedMovimento.oggetto}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Stato Fatturazione:</span>
                    {selectedMovimento.giaFatturato ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        Fatturato
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                        Da fatturare
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-200 p-6 dark:border-slate-800">
              <button
                onClick={() => setSelectedMovimento(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Chiudi
              </button>
            </div>
            </div>
          </div>
        </BodyPortal>
      )}
    </div>
  );
}
