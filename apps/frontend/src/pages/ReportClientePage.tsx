import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ChevronLeft,
  Settings,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Clock,
  BellRing,
  FileBarChart2,
  Check,
  FileSpreadsheet,
  RefreshCw,
  X,
} from 'lucide-react';
import { fetchCliente, type Cliente } from '../api/clienti';
import { fetchPratiche, type Pratica } from '../api/pratiche';
import { movimentiFinanziariApi, type MovimentoFinanziario } from '../api/movimenti-finanziari';
import { alertsApi, type Alert } from '../api/alerts';
import { ticketsApi, type Ticket } from '../api/tickets';
import { generaReportPDF, generaReportCsv, downloadBlob, salvaReportPDF } from '../api/report';
import { studiApi, type Studio } from '../api/studi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/ToastProvider';
import { DateField } from '../components/ui/DateField';
import { BodyPortal } from '../components/ui/BodyPortal';

interface ReportFilters {
  dataInizio: string;
  dataFine: string;
  includiRiepilogo: boolean;
  includiPratiche: boolean;
  includiAnticipazioni: boolean;
  includiCompensi: boolean;
  includiAlert: boolean;
  includiTickets: boolean;
  note: string;
}

export function ReportClientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [movimenti, setMovimenti] = useState<MovimentoFinanziario[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingCsv, setGeneratingCsv] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [selectedPratiche, setSelectedPratiche] = useState<Set<string>>(new Set());
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [selectedAnticipazioni, setSelectedAnticipazioni] = useState<Set<string>>(new Set());
  const [selectedCompensi, setSelectedCompensi] = useState<Set<string>>(new Set());
  const [selectedAlertDetail, setSelectedAlertDetail] = useState<Alert | null>(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<Ticket | null>(null);
  const [selectedPraticaDetail, setSelectedPraticaDetail] = useState<Pratica | null>(null);

  const [filters, setFilters] = useState<ReportFilters>({
    dataInizio: '',
    dataFine: '',
    includiRiepilogo: true,
    includiPratiche: true,
    includiAnticipazioni: true,
    includiCompensi: true,
    includiAlert: true,
    includiTickets: true,
    note: '',
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const isAllClients = id === 'all';
      if (isAllClients) {
        setCliente({
          id: 'all',
          ragioneSociale: 'Tutti i clienti',
          attivo: true,
        } as Cliente);
      } else {
        // Carica cliente
        const clienteData = await fetchCliente(id);
        setCliente(clienteData);
      }

      // Carica studio
      if (user?.studioId) {
        const studioData = await studiApi.getOne(user.studioId);
        setStudio(studioData);
      }

      // Carica pratiche
      const praticheData = isAllClients ? await fetchPratiche() : await fetchPratiche({ clienteId: id });
      setPratiche(praticheData);

      // Carica movimenti
      const praticheIds = praticheData.map(p => p.id);
      if (praticheIds.length > 0) {
        const movimentiPromises = praticheIds.map(praticaId =>
          movimentiFinanziariApi.getAllByPratica(praticaId)
        );
        const movimentiArrays = await Promise.all(movimentiPromises);
        const allMovimenti = movimentiArrays.flat();
        setMovimenti(allMovimenti);

        const alertPromises = praticheIds.map(praticaId =>
          alertsApi.getAllByPratica(praticaId)
        );
        const alertsArrays = await Promise.all(alertPromises);
        const allAlerts = alertsArrays.flat();
        setAlerts(allAlerts);
        setSelectedAlerts(new Set(allAlerts.map(a => a.id)));

        // Carica ticket per le pratiche del cliente
        const ticketsPromises = praticheIds.map(praticaId =>
          ticketsApi.getAllByPratica(praticaId)
        );
        const ticketsArrays = await Promise.all(ticketsPromises);
        const allTickets = ticketsArrays.flat();
        setTickets(allTickets);
        setSelectedTickets(new Set(allTickets.map(t => t.id)));
      }
      const praticheIdsSet = new Set(praticheData.map(p => p.id));
      setSelectedPratiche(praticheIdsSet);
      setSelectedAnticipazioni(praticheIdsSet);
      setSelectedCompensi(praticheIdsSet);

    } catch (err: any) {
      console.error('Errore caricamento dati:', err);
      toastError(err.message || 'Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!id) return;

    try {
      setGeneratingPdf(true);

      const blob = await generaReportPDF(id, {
        dataInizio: filters.dataInizio || undefined,
        dataFine: filters.dataFine || undefined,
        includiDettaglio: filters.includiPratiche,
        includiAnticipazioni: filters.includiAnticipazioni,
        includiCompensi: filters.includiCompensi,
        includiRiepilogo: filters.includiRiepilogo,
        includiAlert: filters.includiAlert,
        includiTickets: filters.includiTickets,
        includePraticheIds: filters.includiPratiche ? Array.from(includedPraticheForReport) : [],
        includeAlertIds: filters.includiAlert ? Array.from(selectedAlerts) : [],
        includeTicketIds: filters.includiTickets ? Array.from(selectedTickets) : [],
        note: filters.note || undefined,
      });

      const filename = `report-${cliente?.ragioneSociale?.replace(/\s+/g, '-') || id}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);

      success('Report PDF generato con successo');
    } catch (err: any) {
      console.error('Errore generazione PDF:', err);
      toastError(err.message || 'Errore nella generazione del report PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleGenerateCSV = async () => {
    try {
      if (!id) return;
      setGeneratingCsv(true);

      const blob = await generaReportCsv(id, {
        dataInizio: filters.dataInizio || undefined,
        dataFine: filters.dataFine || undefined,
      });
      const filename = `report-${cliente?.ragioneSociale?.replace(/\s+/g, '-') || id}-${new Date().toISOString().split('T')[0]}.csv`;
      downloadBlob(blob, filename);
      success('Report CSV generato con successo');
    } catch (err: any) {
      console.error('Errore generazione CSV:', err);
      toastError(err.message || 'Errore nella generazione del report CSV');
    } finally {
      setGeneratingCsv(false);
    }
  };

  const handleSaveReport = async () => {
    if (!id) return;
    if (id === 'all') {
      toastError('Seleziona un cliente specifico per salvare il report.');
      return;
    }
    try {
      setSavingReport(true);
      const saved = await salvaReportPDF(id, {
        dataInizio: filters.dataInizio || undefined,
        dataFine: filters.dataFine || undefined,
        includiDettaglio: filters.includiPratiche,
        includiAnticipazioni: filters.includiAnticipazioni,
        includiCompensi: filters.includiCompensi,
        includiRiepilogo: filters.includiRiepilogo,
        includiAlert: filters.includiAlert,
        includiTickets: filters.includiTickets,
        includePraticheIds: filters.includiPratiche ? Array.from(includedPraticheForReport) : [],
        includeAlertIds: filters.includiAlert ? Array.from(selectedAlerts) : [],
        includeTicketIds: filters.includiTickets ? Array.from(selectedTickets) : [],
        note: filters.note || undefined,
      });
      success(`Report salvato (${saved.filename})`);
    } catch (err: any) {
      console.error('Errore salvataggio report:', err);
      toastError(err.message || 'Errore nel salvataggio del report');
    } finally {
      setSavingReport(false);
    }
  };

  const openInNewTab = (path: string) => {
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  const toNumber = (value: unknown) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return 0;
      const hasComma = trimmed.includes(',');
      const dotCount = (trimmed.match(/\./g) || []).length;
      let normalized = trimmed;

      if (hasComma) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
      } else if (dotCount > 1) {
        normalized = normalized.replace(/\./g, '');
      } else if (dotCount === 1) {
        const [intPart, fracPart] = normalized.split('.');
        if (fracPart.length === 3) {
          normalized = `${intPart}${fracPart}`;
        }
      }

      normalized = normalized.replace(/[^0-9.-]/g, '');
      const parsed = Number.parseFloat(normalized);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (value?: string | Date | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('it-IT');
  };

  const isOutsideRange = (value?: string | Date | null) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return false;

    if (filters.dataInizio) {
      const start = new Date(filters.dataInizio).getTime();
      if (time < start) return true;
    }
    if (filters.dataFine) {
      const end = new Date(filters.dataFine).getTime();
      if (time > end) return true;
    }
    return false;
  };

  const filteredMovimenti = movimenti.filter(m => !isOutsideRange(m.data));
  const filteredPratiche = pratiche.filter(p => !isOutsideRange(p.createdAt));
  const filteredAlerts = alerts.filter(a => !isOutsideRange(a.dataScadenza));
  const filteredTickets = tickets.filter(t => !isOutsideRange(t.dataCreazione));

  const displayedPratiche = filteredPratiche;
  const displayedAlerts = filters.includiAlert ? filteredAlerts : [];
  const displayedTickets = filters.includiTickets ? filteredTickets : [];

  const includedPratiche = displayedPratiche.filter(p => selectedPratiche.has(p.id));
  const includedAnticipazioniPratiche = displayedPratiche.filter(p => selectedAnticipazioni.has(p.id));
  const includedCompensiPratiche = displayedPratiche.filter(p => selectedCompensi.has(p.id));
  const includedAlerts = displayedAlerts.filter(a => selectedAlerts.has(a.id));
  const includedTickets = displayedTickets.filter(t => selectedTickets.has(t.id));
  const includedPraticheForReport = new Set([
    ...selectedPratiche,
    ...selectedAnticipazioni,
    ...selectedCompensi,
  ]);

  const movimentiCapitaleByPratica = useMemo(() => {
    const map: Record<string, number> = {};
    filteredMovimenti.forEach((movimento) => {
      if (!movimento.praticaId) return;
      if (String(movimento.tipo) !== 'capitale') return;
      map[movimento.praticaId] = (map[movimento.praticaId] || 0) + toNumber(movimento.importo);
    });
    return map;
  }, [filteredMovimenti]);

  const getCapitalePratica = (pratica: Pratica) => {
    const extra = movimentiCapitaleByPratica[pratica.id] || 0;
    return toNumber(pratica.capitale) + extra;
  };

  const movimentiFinanzaByPratica = useMemo(() => {
    const map: Record<string, {
      anticipazioni: number;
      anticipazioniRecuperate: number;
      compensi: number;
      compensiRecuperati: number;
    }> = {};

    filteredMovimenti.forEach((movimento) => {
      if (!movimento.praticaId) return;
      const tipo = String(movimento.tipo || '').toLowerCase();
      const entry = map[movimento.praticaId] || {
        anticipazioni: 0,
        anticipazioniRecuperate: 0,
        compensi: 0,
        compensiRecuperati: 0,
      };

      if (tipo === 'anticipazione' || tipo === 'anticipazioni') {
        entry.anticipazioni += toNumber(movimento.importo);
      }
      if (tipo === 'recupero_anticipazione') {
        entry.anticipazioniRecuperate += toNumber(movimento.importo);
      }
      if (tipo === 'compenso' || tipo === 'compensi') {
        entry.compensi += toNumber(movimento.importo);
      }
      if (tipo === 'recupero_compenso' || tipo === 'recupero_compensi') {
        entry.compensiRecuperati += toNumber(movimento.importo);
      }

      map[movimento.praticaId] = entry;
    });

    return map;
  }, [filteredMovimenti]);

  const compensiOggettiByPratica = useMemo(() => {
    const map: Record<string, string[]> = {};

    filteredMovimenti.forEach((movimento) => {
      if (!movimento.praticaId) return;
      const tipo = String(movimento.tipo || '').toLowerCase();
      if (tipo !== 'compenso' && tipo !== 'compensi') return;
      const oggetto = (movimento.oggetto || '').trim();
      if (!oggetto) return;
      const lista = map[movimento.praticaId] || [];
      if (!lista.includes(oggetto)) lista.push(oggetto);
      map[movimento.praticaId] = lista;
    });

    return map;
  }, [filteredMovimenti]);

  const getFinanzaPratica = (pratica: Pratica) => {
    const extra = movimentiFinanzaByPratica[pratica.id] || {
      anticipazioni: 0,
      anticipazioniRecuperate: 0,
      compensi: 0,
      compensiRecuperati: 0,
    };

    const anticipazioni = toNumber(pratica.anticipazioni) + extra.anticipazioni;
    const anticipazioniRecuperate = toNumber(pratica.importoRecuperatoAnticipazioni)
      + extra.anticipazioniRecuperate;
    const compensi = toNumber(pratica.compensiLegali) + extra.compensi;
    const compensiRecuperati = toNumber(pratica.compensiLiquidati) + extra.compensiRecuperati;

    return {
      anticipazioni,
      anticipazioniRecuperate,
      anticipazioniDaRecuperare: Math.max(anticipazioni - anticipazioniRecuperate, 0),
      compensi,
      compensiRecuperati,
      compensiLiquidabili: Math.max(compensi - compensiRecuperati, 0),
    };
  };

  const capitaleTotal = includedPratiche.reduce((sum, p) => sum + getCapitalePratica(p), 0);
  const totaleRecuperato = filteredMovimenti
    .filter(m => (m.tipo || '').toString().startsWith('recupero'))
    .reduce((sum, m) => sum + toNumber(m.importo), 0);
  const alertAttivi = includedAlerts.filter(a => a.stato === 'in_gestione').length;

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAlert = toggleSelection(setSelectedAlerts);
  const togglePratica = toggleSelection(setSelectedPratiche);
  const toggleTicket = toggleSelection(setSelectedTickets);
  const toggleAnticipazioni = toggleSelection(setSelectedAnticipazioni);
  const toggleCompensi = toggleSelection(setSelectedCompensi);

  const periodoLabel = filters.dataInizio || filters.dataFine
    ? `${filters.dataInizio ? formatDate(filters.dataInizio) : 'Inizio'} → ${filters.dataFine ? formatDate(filters.dataFine) : 'Oggi'}`
    : 'Intero storico';
  const periodoDisplay = periodoLabel === 'Intero storico'
    ? periodoLabel
    : `Periodo ${periodoLabel}`;

  const quickStats = [
    {
      label: 'Pratiche attive',
      value: includedPratiche.filter(p => p.aperta).length,
      sub: `${includedPratiche.length}/${displayedPratiche.length} selezionate`,
      color: 'from-emerald-500 to-teal-400',
    },
    {
      label: 'Capitale affidato',
      value: formatCurrency(capitaleTotal),
      sub: 'Valore complessivo',
      color: 'from-indigo-500 to-sky-500',
    },
    {
      label: 'Recuperato',
      value: formatCurrency(totaleRecuperato),
      sub: 'Somma movimenti di recupero',
      color: 'from-violet-500 to-fuchsia-500',
    },
    {
      label: 'Alert attivi',
      value: alertAttivi,
      sub: `${includedAlerts.length}/${displayedAlerts.length} alert selezionati`,
      color: 'from-amber-500 to-orange-400',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Caricamento report...</p>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600">Cliente non trovato</p>
          <button
            onClick={() => navigate('/clienti')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Torna ai clienti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6 wow-stagger">
        <div className="wow-card p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate(-1)}
                className="wow-button-ghost h-10 w-10 p-0"
                aria-label="Torna indietro"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <span className="wow-chip">Report cliente</span>
                <h1 className="display-font text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  Report cliente
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{cliente.ragioneSociale}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                  <Clock size={14} />
                  <span>{periodoLabel}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={handleSaveReport}
                disabled={generatingPdf || generatingCsv || savingReport || id === 'all'}
                className="wow-button-ghost inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingReport ? (
                  <>
                    <FileText size={16} />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Salva report
                  </>
                )}
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={generatingPdf || generatingCsv || savingReport}
                className="wow-button inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPdf ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Generazione...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Esporta PDF
                  </>
                )}
              </button>
              <button
                onClick={handleGenerateCSV}
                disabled={generatingCsv || generatingPdf || savingReport}
                className="wow-button-ghost inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingCsv ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Generazione...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={16} />
                    Esporta CSV
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {quickStats.map((card) => (
              <div key={card.label} className="wow-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50 mt-1">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="wow-panel sticky top-6 p-6 space-y-5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Settings size={18} className="text-indigo-600" />
                <span>Configura report</span>
              </div>

              <div className="wow-panel p-4">
                <div className="flex items-center justify-between text-sm font-medium text-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>Periodo</span>
                  </div>
                  {(filters.dataInizio || filters.dataFine) && (
                    <button
                      type="button"
                      onClick={() => setFilters({ ...filters, dataInizio: '', dataFine: '' })}
                      className="wow-button-ghost inline-flex items-center gap-1 text-xs"
                    >
                      <X size={12} />
                      Resetta
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DateField
                    value={filters.dataInizio}
                    onChange={(value) => setFilters({ ...filters, dataInizio: value })}
                    placeholder="Inizio"
                  />
                  <DateField
                    value={filters.dataFine}
                    onChange={(value) => setFilters({ ...filters, dataFine: value })}
                    placeholder="Fine"
                  />
                </div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <Clock size={14} />
                  <span>{periodoLabel}</span>
                </div>
              </div>

              <div className="wow-panel p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <Filter size={16} />
                  <span>Sezioni incluse</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, includiRiepilogo: !filters.includiRiepilogo })}
                    className={`group rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      filters.includiRiepilogo
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {filters.includiRiepilogo ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span>Riepilogo</span>
                    </div>
                    <p className="text-xs font-normal text-slate-500 group-hover:text-slate-600 mt-1">
                      Dati cliente e overview
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, includiPratiche: !filters.includiPratiche })}
                    className={`group rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      filters.includiPratiche
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {filters.includiPratiche ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span>Pratiche</span>
                    </div>
                    <p className="text-xs font-normal text-slate-500 group-hover:text-slate-600 mt-1">
                      Dettagli pratiche attive
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, includiAnticipazioni: !filters.includiAnticipazioni })}
                    className={`group rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      filters.includiAnticipazioni
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {filters.includiAnticipazioni ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span>Anticipazioni</span>
                    </div>
                    <p className="text-xs font-normal text-slate-500 group-hover:text-slate-600 mt-1">
                      Spese anticipate
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, includiCompensi: !filters.includiCompensi })}
                    className={`group rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      filters.includiCompensi
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {filters.includiCompensi ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span>Compensi</span>
                    </div>
                    <p className="text-xs font-normal text-slate-500 group-hover:text-slate-600 mt-1">
                      Maturati e liquidabili
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, includiAlert: !filters.includiAlert })}
                    className={`group rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      filters.includiAlert
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {filters.includiAlert ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span>Alert</span>
                    </div>
                    <p className="text-xs font-normal text-slate-500 group-hover:text-slate-600 mt-1">
                      Scadenze e reminder
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, includiTickets: !filters.includiTickets })}
                    className={`group rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      filters.includiTickets
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {filters.includiTickets ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span>Ticket</span>
                    </div>
                    <p className="text-xs font-normal text-slate-500 group-hover:text-slate-600 mt-1">
                      Ticket e richieste cliente
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <FileBarChart2 size={16} />
                  <span>Note personalizzate</span>
                </div>
                <textarea
                  value={filters.note}
                  onChange={(e) => setFilters({ ...filters, note: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Aggiungi note da includere nel report..."
                />
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-800 px-4 py-3 text-xs flex items-start gap-2">
                  <span>Le note vengono inserite sia nell’anteprima sia nel PDF finale per allineare ciò che vedi e ciò che condividi.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Anteprima Report */}
          <div className="lg:col-span-2 space-y-4">
            <div className="wow-card overflow-hidden">
              <div className="wow-panel flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  {studio?.logo && (
                    <img
                      src={studio.logo}
                      alt="Logo Studio"
                      className="h-12 w-auto rounded-xl bg-slate-100 p-2"
                    />
                  )}
                  <div>
                    <span className="wow-chip">Anteprima report</span>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {studio?.nome || 'Studio legale'}
                    </h2>
                    <p className="text-sm text-slate-500">
                      Generato il {new Date().toLocaleDateString('it-IT')} · {periodoDisplay}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="wow-chip inline-flex items-center gap-2">
                    <FileBarChart2 size={16} />
                    {includedPratiche.length} pratiche
                  </span>
                  <span className="wow-chip inline-flex items-center gap-2">
                    <BellRing size={16} />
                    {alertAttivi} alert attivi
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Informazioni Cliente */}
                {filters.includiRiepilogo && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-lg font-semibold text-slate-900">Informazioni cliente</h3>
                      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                        Riepilogo
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="wow-panel p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Ragione sociale</p>
                        <p className="text-base font-semibold text-slate-900 mt-1">{cliente.ragioneSociale}</p>
                        <p className="text-sm text-slate-600 mt-1">{cliente.email || 'Email non disponibile'}</p>
                      </div>
                      <div className="wow-panel p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Studio associato</p>
                        <p className="text-base font-semibold text-slate-900 mt-1">{studio?.nome || 'Dati studio non disponibili'}</p>
                        <div className="text-sm text-slate-600 mt-1 space-y-1">
                          <p>{studio?.email || 'Email non disponibile'}</p>
                          <p>{studio?.telefono || 'Telefono non disponibile'}</p>
                          <p>{studio?.indirizzo || 'Indirizzo non disponibile'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="wow-panel p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">P.IVA</p>
                        <p className="text-base font-semibold text-slate-900 mt-1">{cliente.partitaIva || 'N/D'}</p>
                      </div>
                      <div className="wow-panel p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Codice Fiscale</p>
                        <p className="text-base font-semibold text-slate-900 mt-1">{cliente.codiceFiscale || 'N/D'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="wow-panel p-4">
                        <p className="text-sm text-slate-600">Pratiche totali</p>
                        <p className="text-3xl font-bold text-indigo-700 mt-1">{includedPratiche.length}</p>
                        <p className="text-xs text-indigo-700/80 mt-1">Storico del cliente</p>
                      </div>
                      <div className="wow-panel p-4">
                        <p className="text-sm text-slate-600">Pratiche aperte</p>
                        <p className="text-3xl font-bold text-emerald-700 mt-1">{includedPratiche.filter(p => p.aperta).length}</p>
                        <p className="text-xs text-emerald-700/80 mt-1">In lavorazione</p>
                      </div>
                      <div className="wow-panel p-4">
                        <p className="text-sm text-slate-600">Capitale totale</p>
                        <p className="text-3xl font-bold text-amber-700 mt-1">{formatCurrency(capitaleTotal)}</p>
                        <p className="text-xs text-amber-700/80 mt-1">Affidato complessivo</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Alert e scadenze */}
                {filters.includiAlert && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <BellRing size={18} className="text-indigo-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Alert e scadenze</h3>
                      </div>
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                        {alertAttivi} attivi
                      </span>
                    </div>

                    {displayedAlerts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                        Nessun alert nel periodo selezionato.
                      </div>
                    ) : (
                      <div className="wow-panel overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-slate-700">
                            <tr>
                              <th className="px-3 py-3 text-left font-semibold">Includi</th>
                              <th className="px-4 py-3 text-left font-semibold">Scadenza</th>
                              <th className="px-4 py-3 text-left font-semibold">Titolo</th>
                              <th className="px-4 py-3 text-left font-semibold">Pratica</th>
                              <th className="px-4 py-3 text-left font-semibold">Stato</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {displayedAlerts.slice(0, 8).map((alert) => {
                              const included = selectedAlerts.has(alert.id);
                              return (
                              <tr
                                key={alert.id}
                                className={`cursor-pointer hover:bg-slate-50/70 ${included ? '' : 'opacity-70'}`}
                                onClick={() => setSelectedAlertDetail(alert)}
                              >
                                <td className="px-3 py-3">
                                  <input
                                    type="checkbox"
                                    checked={included}
                                    onChange={() => toggleAlert(alert.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4 accent-indigo-600"
                                  />
                                </td>
                                <td className="px-4 py-3 text-slate-900">{formatDate(alert.dataScadenza)}</td>
                                <td className="px-4 py-3 text-slate-700">{alert.titolo}</td>
                                <td className="px-4 py-3 text-slate-600">
                                  {alert.pratica?.id ? `#${alert.pratica.id.slice(0, 6)}` : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    alert.stato === 'in_gestione'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    <Check size={12} />
                                    {alert.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'}
                                  </span>
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                        {displayedAlerts.length > 8 && (
                          <div className="bg-slate-50 text-center text-xs text-slate-600 py-2">
                            ...e altri {displayedAlerts.length - 8} alert
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* Ticket */}
                {filters.includiTickets && displayedTickets.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-indigo-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Ticket</h3>
                      </div>
                      <div className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold">
                        {includedTickets.length} ticket selezionati
                      </div>
                    </div>
                    <div className="wow-panel overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-3 py-3 text-left font-semibold">Includi</th>
                            <th className="px-4 py-3 text-left font-semibold">Numero</th>
                            <th className="px-4 py-3 text-left font-semibold">Oggetto</th>
                            <th className="px-4 py-3 text-left font-semibold">Pratica</th>
                            <th className="px-4 py-3 text-left font-semibold">Stato</th>
                            <th className="px-4 py-3 text-left font-semibold">Priorità</th>
                            <th className="px-4 py-3 text-left font-semibold">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedTickets.slice(0, 10).map((ticket) => {
                            const included = selectedTickets.has(ticket.id);
                            return (
                            <tr
                              key={ticket.id}
                              className={`cursor-pointer hover:bg-slate-50/70 ${included ? '' : 'opacity-70'}`}
                              onClick={() => setSelectedTicketDetail(ticket)}
                            >
                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={included}
                                  onChange={() => toggleTicket(ticket.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 accent-indigo-600"
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-900">{ticket.numeroTicket}</td>
                              <td className="px-4 py-3 text-slate-700">{ticket.oggetto}</td>
                              <td className="px-4 py-3 text-slate-600">
                                {ticket.pratica?.id ? `#${ticket.pratica.id.slice(0, 6)}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{ticket.stato}</td>
                              <td className="px-4 py-3 text-slate-600">{ticket.priorita}</td>
                              <td className="px-4 py-3 text-slate-600">{formatDate(ticket.dataCreazione)}</td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                      {displayedTickets.length > 10 && (
                        <div className="bg-slate-50 text-center text-xs text-slate-600 py-2">
                          ...e altri {displayedTickets.length - 10} ticket
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Anticipazioni */}
                {filters.includiAnticipazioni && displayedPratiche.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <FileBarChart2 size={18} className="text-indigo-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Anticipazioni</h3>
                      </div>
                      <div className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-semibold">
                        Totale: {formatCurrency(
                          includedAnticipazioniPratiche.reduce((sum, pratica) => sum + getFinanzaPratica(pratica).anticipazioni, 0)
                        )}
                      </div>
                    </div>
                    <div className="wow-panel overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-3 py-3 text-left font-semibold">Includi</th>
                            <th className="px-4 py-3 text-left font-semibold">Numero pratica</th>
                            <th className="px-4 py-3 text-left font-semibold">Debitore</th>
                            <th className="px-4 py-3 text-right font-semibold">Affidate</th>
                            <th className="px-4 py-3 text-right font-semibold">Recuperate</th>
                            <th className="px-4 py-3 text-right font-semibold">Da recuperare</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedPratiche.map((pratica) => {
                            const debitoreNome = pratica.debitore?.ragioneSociale ||
                              (pratica.debitore ? `${pratica.debitore.nome || ''} ${pratica.debitore.cognome || ''}`.trim() : 'N/D');
                            const finanza = getFinanzaPratica(pratica);
                            const included = selectedAnticipazioni.has(pratica.id);
                            return (
                              <tr
                                key={pratica.id}
                                className={`cursor-pointer hover:bg-slate-50/70 ${included ? '' : 'opacity-70'}`}
                                onClick={() => setSelectedPraticaDetail(pratica)}
                              >
                                <td className="px-3 py-3">
                                  <input
                                    type="checkbox"
                                    checked={included}
                                    onChange={() => toggleAnticipazioni(pratica.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4 accent-indigo-600"
                                  />
                                </td>
                                <td className="px-4 py-3 text-slate-900 font-semibold">
                                  {pratica.numeroPratica ? pratica.numeroPratica : `#${pratica.id.slice(0, 8)}`}
                                </td>
                                <td className="px-4 py-3 text-slate-700">{debitoreNome || 'N/D'}</td>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  {formatCurrency(finanza.anticipazioni)}
                                </td>
                                <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                                  {formatCurrency(finanza.anticipazioniRecuperate)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900 font-semibold">
                                  {formatCurrency(finanza.anticipazioniDaRecuperare)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Compensi */}
                {filters.includiCompensi && displayedPratiche.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <FileBarChart2 size={18} className="text-indigo-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Compensi</h3>
                      </div>
                      <div className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-semibold">
                        Totale: {formatCurrency(
                          includedCompensiPratiche.reduce((sum, pratica) => sum + getFinanzaPratica(pratica).compensi, 0)
                        )}
                      </div>
                    </div>
                    <div className="wow-panel overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-3 py-3 text-left font-semibold">Includi</th>
                            <th className="px-4 py-3 text-left font-semibold">Numero pratica</th>
                            <th className="px-4 py-3 text-left font-semibold">Debitore</th>
                            <th className="px-4 py-3 text-left font-semibold">Oggetto</th>
                            <th className="px-4 py-3 text-right font-semibold">Maturati</th>
                            <th className="px-4 py-3 text-right font-semibold">Recuperati</th>
                            <th className="px-4 py-3 text-right font-semibold">Liquidabili</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedPratiche.map((pratica) => {
                            const debitoreNome = pratica.debitore?.ragioneSociale ||
                              (pratica.debitore ? `${pratica.debitore.nome || ''} ${pratica.debitore.cognome || ''}`.trim() : 'N/D');
                            const finanza = getFinanzaPratica(pratica);
                            const included = selectedCompensi.has(pratica.id);
                            const oggetti = compensiOggettiByPratica[pratica.id] || [];
                            const oggettoLabel = oggetti.length > 0 ? oggetti.join(', ') : '-';
                            return (
                              <tr
                                key={pratica.id}
                                className={`cursor-pointer hover:bg-slate-50/70 ${included ? '' : 'opacity-70'}`}
                                onClick={() => setSelectedPraticaDetail(pratica)}
                              >
                                <td className="px-3 py-3">
                                  <input
                                    type="checkbox"
                                    checked={included}
                                    onChange={() => toggleCompensi(pratica.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4 accent-indigo-600"
                                  />
                                </td>
                                <td className="px-4 py-3 text-slate-900 font-semibold">
                                  {pratica.numeroPratica ? pratica.numeroPratica : `#${pratica.id.slice(0, 8)}`}
                                </td>
                                <td className="px-4 py-3 text-slate-700">{debitoreNome || 'N/D'}</td>
                                <td className="px-4 py-3 text-slate-600">{oggettoLabel}</td>
                                <td className="px-4 py-3 text-right text-slate-900">
                                  {formatCurrency(finanza.compensi)}
                                </td>
                                <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                                  {formatCurrency(finanza.compensiRecuperati)}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900 font-semibold">
                                  {formatCurrency(finanza.compensiLiquidabili)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Dettaglio Pratiche */}
                {filters.includiPratiche && displayedPratiche.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-indigo-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Dettaglio pratiche</h3>
                      </div>
                      <div className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold">
                        Mostrati {Math.min(displayedPratiche.length, 10)} elementi
                      </div>
                    </div>
                  <div className="grid grid-cols-1 gap-3">
                      {displayedPratiche.slice(0, 10).map((pratica) => {
                        const debitoreNome = pratica.debitore?.ragioneSociale ||
                          (pratica.debitore ? `${pratica.debitore.nome || ''} ${pratica.debitore.cognome || ''}`.trim() : 'N/D');
                        const included = selectedPratiche.has(pratica.id);
                        return (
                          <div
                            key={pratica.id}
                            className={`cursor-pointer rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition p-4 ${included ? '' : 'opacity-75'}`}
                            onClick={() => setSelectedPraticaDetail(pratica)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">Pratica</p>
                                <p className="text-base font-semibold text-slate-900">
                                  {pratica.numeroPratica ? pratica.numeroPratica : `#${pratica.id.slice(0, 8)}`}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                pratica.aperta
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {pratica.aperta ? 'Aperta' : 'Chiusa'}
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedPratiche.has(pratica.id)}
                                onChange={() => togglePratica(pratica.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 accent-indigo-600"
                                title="Includi nel report"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-slate-500">Debitore</p>
                                <p className="font-semibold text-slate-900 mt-0.5">{debitoreNome}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Capitale</p>
                                <p className="font-semibold text-slate-900 mt-0.5">{formatCurrency(getCapitalePratica(pratica))}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Apertura</p>
                                <p className="font-semibold text-slate-900 mt-0.5">
                                  {formatDate(pratica.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filteredPratiche.length > 10 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-600 py-3">
                        ...e altre {filteredPratiche.length - 10} pratiche
                      </div>
                    )}
                  </section>
                )}

                {/* Note personalizzate */}
                {filters.note && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">Note</h3>
                      </div>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                        Contenuto personalizzato
                      </span>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-900 whitespace-pre-wrap shadow-inner">
                      {filters.note}
                    </div>
                  </section>
                )}
              </div>

              <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 text-center text-sm text-slate-500">
                Report generato automaticamente da Resolv
              </div>
            </div>
          </div>
        </div>
      </div>
      {selectedAlertDetail && (
        <BodyPortal>
          <div className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="modal-content w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Dettaglio alert</p>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedAlertDetail.titolo}</h2>
                </div>
                <button
                  onClick={() => setSelectedAlertDetail(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 p-6 text-sm text-slate-700">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Scadenza</p>
                    <p className="font-semibold text-slate-900">{formatDate(selectedAlertDetail.dataScadenza)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Stato</p>
                    <p className="font-semibold text-slate-900">
                      {selectedAlertDetail.stato === 'in_gestione' ? 'In gestione' : 'Chiuso'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Destinatario</p>
                    <p className="font-semibold text-slate-900">
                      {selectedAlertDetail.destinatario === 'studio' ? 'Studio' : 'Cliente'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Giorni anticipo</p>
                    <p className="font-semibold text-slate-900">{selectedAlertDetail.giorniAnticipo}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">Descrizione</p>
                  <p className="mt-1 text-slate-900">{selectedAlertDetail.descrizione || 'N/D'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Pratica</p>
                  <p className="font-semibold text-slate-900">
                    {selectedAlertDetail.pratica?.id ? `#${selectedAlertDetail.pratica.id.slice(0, 8)}` : 'N/D'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end border-t border-slate-100 p-4">
                <button
                  onClick={() => setSelectedAlertDetail(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {selectedTicketDetail && (
        <BodyPortal>
          <div className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="modal-content w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Dettaglio ticket</p>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedTicketDetail.oggetto}</h2>
                </div>
                <button
                  onClick={() => setSelectedTicketDetail(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 p-6 text-sm text-slate-700">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Numero ticket</p>
                    <p className="font-semibold text-slate-900">{selectedTicketDetail.numeroTicket}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Stato</p>
                    <p className="font-semibold text-slate-900">{selectedTicketDetail.stato}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Priorità</p>
                    <p className="font-semibold text-slate-900">{selectedTicketDetail.priorita}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Data</p>
                    <p className="font-semibold text-slate-900">{formatDate(selectedTicketDetail.dataCreazione)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">Descrizione</p>
                  <p className="mt-1 text-slate-900">{selectedTicketDetail.descrizione || 'N/D'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Pratica</p>
                  <p className="font-semibold text-slate-900">
                    {selectedTicketDetail.pratica?.id ? `#${selectedTicketDetail.pratica.id.slice(0, 8)}` : 'N/D'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end border-t border-slate-100 p-4">
                <button
                  onClick={() => setSelectedTicketDetail(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {selectedPraticaDetail && (
        <BodyPortal>
          <div className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="modal-content w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Panoramica pratica</p>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedPraticaDetail.numeroPratica ? selectedPraticaDetail.numeroPratica : `#${selectedPraticaDetail.id.slice(0, 8)}`}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedPraticaDetail(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 p-6 text-sm text-slate-700">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-slate-500">Stato</p>
                    <p className="font-semibold text-slate-900">{selectedPraticaDetail.aperta ? 'Aperta' : 'Chiusa'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Apertura</p>
                    <p className="font-semibold text-slate-900">{formatDate(selectedPraticaDetail.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Capitale</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(getCapitalePratica(selectedPraticaDetail))}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Debitore</p>
                    <p className="font-semibold text-slate-900">
                      {selectedPraticaDetail.debitore?.ragioneSociale
                        || `${selectedPraticaDetail.debitore?.nome || ''} ${selectedPraticaDetail.debitore?.cognome || ''}`.trim()
                        || 'N/D'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Fase</p>
                    <p className="font-semibold text-slate-900">{selectedPraticaDetail.fase?.nome || 'N/D'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-slate-500">Anticipazioni</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(getFinanzaPratica(selectedPraticaDetail).anticipazioni)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Compensi</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(getFinanzaPratica(selectedPraticaDetail).compensi)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-4">
                <button
                  onClick={() => setSelectedPraticaDetail(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Chiudi
                </button>
                <button
                  onClick={() => openInNewTab(`/pratiche/${selectedPraticaDetail.id}`)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Vai a pratica
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}
    </div>
  );
}
