// apps/frontend/src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, FileText, CheckCircle, XCircle,
  Percent, BarChart3, PieChart, RefreshCw, Filter, Bell, Ticket, Download,
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  fetchDashboardStats,
  fetchDashboardKPI,
  fetchDashboardCondivisa,
  type DashboardStats,
  type KPI,
  type DashboardCondivisa,
} from '../api/dashboard';
import { fetchClienti, type Cliente } from '../api/clienti';
import { fetchPratiche, type Pratica } from '../api/pratiche';
import { movimentiFinanziariApi, type TotaliMovimenti } from '../api/movimenti-finanziari';
import { documentiApi } from '../api/documenti';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useAuth } from '../contexts/AuthContext';

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
      {payload.map((item: any) => (
        <div key={item.name} className="flex items-center gap-2 text-slate-700">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
          <span className="font-medium">{item.name}:</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kpi, setKPI] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [movimentiPerPratica, setMovimentiPerPratica] = useState<Record<string, TotaliMovimenti>>({});
  const [loadingPratiche, setLoadingPratiche] = useState(false);
  const [dashboardCondivisa, setDashboardCondivisa] = useState<DashboardCondivisa | null>(null);
  const [loadingCondivisa, setLoadingCondivisa] = useState(false);
  const [condivisaError, setCondivisaError] = useState<string | null>(null);
  const [selectedPraticaId, setSelectedPraticaId] = useState<string>('');

  // Filtri
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('all');

  useEffect(() => {
    if (!user || user.ruolo === 'cliente') return;
    loadClienti();
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user || user.ruolo === 'cliente') return;
    loadData();
  }, [selectedClienteId, user]);

  useEffect(() => {
    if (!user || user.ruolo === 'cliente') return;
    loadPratiche();
  }, [user]);

  useEffect(() => {
    if (!user || user.ruolo !== 'cliente') return;
    loadDashboardCondivisa();
  }, [user]);

  useEffect(() => {
    if (!dashboardCondivisa) {
      setSelectedPraticaId('');
      return;
    }

    const praticheAperte = (dashboardCondivisa.pratiche ?? []).filter((p) => p.aperta);
    if (!praticheAperte.find((p) => p.id === selectedPraticaId)) {
      setSelectedPraticaId('');
    }
  }, [dashboardCondivisa, selectedPraticaId]);

  const loadClienti = async () => {
    try {
      const data = await fetchClienti();
      setClienti(data);
    } catch (err) {
      console.error('Errore caricamento clienti:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const clienteId = selectedClienteId && selectedClienteId !== 'all' ? selectedClienteId : undefined;
      const [statsData, kpiData] = await Promise.all([
        fetchDashboardStats(clienteId),
        fetchDashboardKPI(clienteId),
      ]);
      setStats(statsData);
      setKPI(kpiData);
    } catch (err) {
      console.error('Errore caricamento dashboard:', err);
      setError('Impossibile caricare i dati della dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadPratiche = async () => {
    try {
      setLoadingPratiche(true);
      const data = await fetchPratiche();
      setPratiche(data);

      // Carica totali movimenti per ogni pratica per avere anticipazioni/compensi/recuperi aggiornati
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
    } finally {
      setLoadingPratiche(false);
    }
  };

  const loadDashboardCondivisa = async () => {
    if (!user?.clienteId) {
      setCondivisaError('Cliente non associato. Contatta lo studio.');
      return;
    }
    try {
      setLoadingCondivisa(true);
      setCondivisaError(null);
      const data = await fetchDashboardCondivisa(user.clienteId);
      setDashboardCondivisa(data);
    } catch (err) {
      console.error('Errore caricamento dashboard condivisa:', err);
      setCondivisaError('Impossibile caricare la dashboard cliente');
    } finally {
      setLoadingCondivisa(false);
    }
  };


  const toNumber = (value: number | string | null | undefined) => {
    const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const round2 = (value: number) => Math.round(value * 100) / 100;

  const formatCurrency = (amount: number | string) => {
    const value = toNumber(amount);
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercent = (value: number | string) => {
    const numeric = toNumber(value);
    return `${numeric.toFixed(1)}%`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('it-IT');
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

  const getPraticaImporti = (p: Pratica) => {
    const t = movimentiPerPratica[p.id] || defaultTotals;
    return {
      capitale: toNumber(p.capitale) + toNumber(t.capitale),
      capitaleRecuperato: toNumber(p.importoRecuperatoCapitale) + toNumber(t.recuperoCapitale),
      anticipazioni: toNumber(p.anticipazioni) + toNumber(t.anticipazioni),
      anticipazioniRecuperate: toNumber(p.importoRecuperatoAnticipazioni) + toNumber(t.recuperoAnticipazioni),
      compensi: toNumber(p.compensiLegali) + toNumber(t.compensi),
      compensiRecuperati: toNumber(p.compensiLiquidati) + toNumber(t.recuperoCompensi),
      interessi: toNumber(p.interessi) + toNumber(t.interessi),
      interessiRecuperati: toNumber(p.interessiRecuperati) + toNumber(t.recuperoInteressi),
    };
  };

  if (user?.ruolo === 'cliente') {
    if (loadingCondivisa) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      );
    }

    if (condivisaError) {
      return (
        <div className="text-center py-12">
          <p className="text-rose-600">{condivisaError}</p>
        </div>
      );
    }

    if (!dashboardCondivisa) {
      return (
        <div className="text-center py-12">
          <p className="text-slate-600">Nessun dato disponibile per la dashboard cliente.</p>
        </div>
      );
    }

    const { cliente, configurazione, stats: sharedStats, kpi: sharedKpi } = dashboardCondivisa;
    const praticheCondivise = dashboardCondivisa.pratiche ?? [];
    const documentiCondivisi = dashboardCondivisa.documenti ?? [];
    const movimentiCondivisi = dashboardCondivisa.movimentiFinanziari ?? [];
    const timelineCondivisa = dashboardCondivisa.timeline ?? [];

    const dashboardAbilitata = configurazione?.abilitata ?? false;
    const showStats = Boolean(configurazione?.dashboard?.stats && sharedStats);
    const showKpi = Boolean(configurazione?.dashboard?.kpi && sharedKpi);
    const showPratiche = Boolean(configurazione?.pratiche?.elenco);
    const showDettagliPratica = Boolean(configurazione?.pratiche?.dettagli);
    const showDocumenti = Boolean(configurazione?.pratiche?.documenti);
    const showMovimenti = Boolean(configurazione?.pratiche?.movimentiFinanziari);
    const showTimeline = Boolean(configurazione?.pratiche?.timeline);
    const praticheAperteCondivise = praticheCondivise.filter((p) => p.aperta);
    const praticheAperteOptions = praticheAperteCondivise.map((pratica) => ({
      value: pratica.id,
      label: pratica.titolo
        ? `${pratica.titolo} - ${pratica.debitore}`
        : `Pratica ${pratica.id.slice(0, 8)} - ${pratica.debitore}`,
    }));

    const praticheTotali = sharedStats?.numeroPratiche ?? praticheCondivise.length;
    const praticheAperte = sharedStats?.praticheAperte ?? praticheCondivise.filter((p) => p.aperta).length;
    const praticheChiuse = sharedStats?.praticheChiuse ?? praticheCondivise.filter((p) => !p.aperta).length;

    const pratichePie = [
      { name: 'Aperte', value: praticheAperte },
      { name: 'Chiuse', value: praticheChiuse },
    ];

    const esitiPie = showKpi ? [
      { name: 'Positivo totale', value: sharedKpi!.esitoPositivoTotale },
      { name: 'Positivo parziale', value: sharedKpi!.esitoPositivoParziale },
      { name: 'Negativo', value: sharedKpi!.esitoNegativo },
    ] : [];

    const capitaleAffidato = sharedStats?.capitaleAffidato ?? 0;
    const capitaleRecuperato = sharedStats?.capitaleRecuperato ?? 0;
    const capitaleDaRecuperare = sharedStats?.capitaleDaRecuperare ?? 0;

    if (!dashboardAbilitata) {
      return (
        <div className="wow-panel p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Dashboard non attiva</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Lo studio non ha ancora attivato la condivisione della dashboard.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 wow-stagger">
        <div className="wow-card flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <span className="wow-chip">Dashboard cliente</span>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
              Benvenuto, {cliente?.ragioneSociale || 'cliente'}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Riepilogo delle informazioni condivise dallo studio.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              Pratiche totali {praticheTotali}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Aperte {praticheAperte}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Chiuse {praticheChiuse}
            </span>
          </div>
        </div>

        {(showStats || showKpi) && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="wow-panel p-5">
              <p className="text-xs font-semibold uppercase text-slate-500">Capitale affidato</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(capitaleAffidato)}</p>
              <p className="mt-2 text-xs text-slate-500">Recuperato {formatCurrency(capitaleRecuperato)}</p>
            </div>
            <div className="wow-panel p-5">
              <p className="text-xs font-semibold uppercase text-slate-500">Da recuperare</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(capitaleDaRecuperare)}</p>
              {showStats && (
                <p className="mt-2 text-xs text-slate-500">
                  Recupero {formatPercent(sharedStats!.percentualeRecuperoCapitale)}
                </p>
              )}
            </div>
            <div className="wow-panel p-5">
              <p className="text-xs font-semibold uppercase text-slate-500">Alert & Ticket</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {(sharedStats?.alertAttivi ?? 0) + (sharedStats?.ticketsAperti ?? 0)}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Bell className="h-3.5 w-3.5" /> {sharedStats?.alertAttivi ?? 0} alert</span>
                <span className="inline-flex items-center gap-1"><Ticket className="h-3.5 w-3.5" /> {sharedStats?.ticketsAperti ?? 0} ticket</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="wow-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Pratiche aperte vs chiuse</p>
                <p className="mt-1 text-sm text-slate-600">Distribuzione pratiche condivise</p>
              </div>
              <PieChart className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={pratichePie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2}>
                    {pratichePie.map((entry, index) => (
                      <Cell key={entry.name} fill={index === 0 ? '#1f3c88' : '#93c5fd'} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {showKpi && (
            <div className="wow-panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Esiti pratiche</p>
                  <p className="mt-1 text-sm text-slate-600">Risultati delle pratiche chiuse</p>
                </div>
                <BarChart3 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={esitiPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2}>
                      {esitiPie.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={['#10b981', '#f59e0b', '#ef4444'][index] || '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {showPratiche && (
          <div className="wow-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="wow-chip">Pratiche condivise</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">Riepilogo pratiche</h2>
              </div>
            </div>
            {praticheCondivise.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Nessuna pratica condivisa al momento.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {praticheCondivise.slice(0, 6).map((pratica) => (
                  <div
                    key={pratica.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{pratica.titolo || pratica.cliente}</p>
                      <p className="text-xs text-slate-500">
                        {pratica.debitore} • {pratica.aperta ? 'In gestione' : 'Chiusa'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Affidata il {formatDate(pratica.dataAffidamento)} • Rif. {pratica.riferimentoCredito || '-'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pratica.aperta ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {pratica.aperta ? 'Aperta' : 'Chiusa'}
                      </span>
                      {showDettagliPratica && (
                        <button
                          onClick={() => navigate(`/pratiche/${pratica.id}/cliente`)}
                          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          Visualizza pratica
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(showDocumenti || showMovimenti || showTimeline) && (
          <div className="grid gap-4 lg:grid-cols-3">
            {showDocumenti && (
              <div className="wow-panel p-5">
                <h3 className="text-sm font-semibold text-slate-900">Documenti condivisi</h3>
                <p className="mt-1 text-xs text-slate-500">Ultimi documenti disponibili</p>
                <div className="mt-4 space-y-3 text-sm">
                  {documentiCondivisi.length === 0 ? (
                    <p className="text-xs text-slate-500">Nessun documento condiviso.</p>
                  ) : (
                    documentiCondivisi.slice(0, 5).map((doc) => (
                      <div key={doc.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 truncate" title={doc.nome}>
                            {doc.nome}
                          </p>
                          <p
                            className="text-[11px] text-slate-500 truncate"
                            title={`${doc.praticaLabel} • ${formatDate(doc.dataCreazione)}`}
                          >
                            {doc.praticaLabel} • {formatDate(doc.dataCreazione)}
                          </p>
                        </div>
                        <button
                          onClick={() => documentiApi.download(doc.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Download className="h-3 w-3" />
                          Scarica
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {showDettagliPratica && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Seleziona pratica
                    </p>
                    {praticheAperteCondivise.length === 0 ? (
                      <p className="text-xs text-slate-500">Nessuna pratica aperta disponibile.</p>
                    ) : (
                      <CustomSelect
                        options={[
                          { value: '', label: 'Scegli una pratica' },
                          ...praticheAperteOptions,
                        ]}
                        value={selectedPraticaId}
                        onChange={setSelectedPraticaId}
                      />
                    )}
                    <button
                      onClick={() => navigate(`/pratiche/${selectedPraticaId}/cliente`)}
                      disabled={!selectedPraticaId}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Carica documento
                    </button>
                  </div>
                )}
              </div>
            )}

            {showMovimenti && (
              <div className="wow-panel p-5">
                <h3 className="text-sm font-semibold text-slate-900">Movimenti finanziari</h3>
                <p className="mt-1 text-xs text-slate-500">Ultimi movimenti condivisi</p>
                <div className="mt-4 space-y-3 text-sm">
                  {movimentiCondivisi.length === 0 ? (
                    <p className="text-xs text-slate-500">Nessun movimento condiviso.</p>
                  ) : (
                    movimentiCondivisi.slice(0, 5).map((mov) => (
                      <div key={mov.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs font-semibold text-slate-900">{mov.praticaLabel}</p>
                        <p className="text-[11px] text-slate-500">
                          {mov.tipo.replace(/_/g, ' ')} • {formatCurrency(mov.importo)} • {formatDate(mov.data)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {showTimeline && (
              <div className="wow-panel p-5">
                <h3 className="text-sm font-semibold text-slate-900">Timeline pratiche</h3>
                <p className="mt-1 text-xs text-slate-500">Eventi principali condivisi</p>
                <div className="mt-4 space-y-3 text-sm">
                  {timelineCondivisa.length === 0 ? (
                    <p className="text-xs text-slate-500">Nessun evento disponibile.</p>
                  ) : (
                    timelineCondivisa.slice(0, 5).map((event, idx) => (
                      <div key={`${event.praticaId}-${idx}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs font-semibold text-slate-900">{event.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {event.praticaLabel} • {formatDate(event.date)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !stats || !kpi) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600">{error || 'Errore nel caricamento dei dati'}</p>
      </div>
    );
  }

  const s = {
    numeroPratiche: toNumber(stats.numeroPratiche),
    praticheAperte: toNumber(stats.praticheAperte),
    praticheChiuse: toNumber(stats.praticheChiuse),
    praticheChiusePositive: toNumber(stats.praticheChiusePositive),
    praticheChiuseNegative: toNumber(stats.praticheChiuseNegative),
    alertAttivi: toNumber(stats.alertAttivi),
    ticketsAperti: toNumber(stats.ticketsAperti),
    capitaleAffidato: toNumber(stats.capitaleAffidato),
    interessiAffidati: toNumber(stats.interessiAffidati),
    anticipazioniAffidate: toNumber(stats.anticipazioniAffidate),
    compensiAffidati: toNumber(stats.compensiAffidati),
    capitaleRecuperato: toNumber(stats.capitaleRecuperato),
    interessiRecuperati: toNumber(stats.interessiRecuperati),
    anticipazioniRecuperate: toNumber(stats.anticipazioniRecuperate),
    compensiRecuperati: toNumber(stats.compensiRecuperati),
    capitaleDaRecuperare: toNumber(stats.capitaleDaRecuperare),
    percentualeRecuperoCapitale: toNumber(stats.percentualeRecuperoCapitale),
    percentualeRecuperoInteressi: toNumber(stats.percentualeRecuperoInteressi),
    percentualeRecuperoAnticipazioni: toNumber(stats.percentualeRecuperoAnticipazioni),
    percentualeRecuperoCompensi: toNumber(stats.percentualeRecuperoCompensi),
    percentualeCapitaleDaRecuperare: toNumber(stats.percentualeCapitaleDaRecuperare),
  };

  const k = {
    totalePraticheAffidate: toNumber(kpi.totalePraticheAffidate),
    totalePraticheChiuse: toNumber(kpi.totalePraticheChiuse),
    percentualeChiusura: toNumber(kpi.percentualeChiusura),
    esitoNegativo: toNumber(kpi.esitoNegativo),
    esitoPositivo: toNumber(kpi.esitoPositivo),
    esitoPositivoParziale: toNumber(kpi.esitoPositivoParziale),
    esitoPositivoTotale: toNumber(kpi.esitoPositivoTotale),
    recuperoCapitale: {
      totale: toNumber(kpi.recuperoCapitale.totale),
      parziale: toNumber(kpi.recuperoCapitale.parziale),
      completo: toNumber(kpi.recuperoCapitale.completo),
    },
    recuperoInteressi: {
      totale: toNumber(kpi.recuperoInteressi.totale),
      parziale: toNumber(kpi.recuperoInteressi.parziale),
      completo: toNumber(kpi.recuperoInteressi.completo),
    },
    recuperoCompensi: {
      totale: toNumber(kpi.recuperoCompensi.totale),
      parziale: toNumber(kpi.recuperoCompensi.parziale),
      completo: toNumber(kpi.recuperoCompensi.completo),
    },
  };

  const totalePratiche = s.numeroPratiche || k.totalePraticheAffidate || (s.praticheAperte + s.praticheChiuse);
  const praticheAperte = s.praticheAperte;
  const praticheChiuse = s.praticheChiuse || Math.max(totalePratiche - praticheAperte, 0);
  const esitiPositivi = s.praticheChiusePositive || k.esitoPositivo;
  const esitiNegativi = s.praticheChiuseNegative || k.esitoNegativo;
  const percentChiusura = k.percentualeChiusura || (totalePratiche > 0 ? (praticheChiuse / totalePratiche) * 100 : 0);
  const capitaleDaRecuperareCalc = s.capitaleDaRecuperare || Math.max(s.capitaleAffidato - s.capitaleRecuperato, 0);

  const hasPratiche = pratiche.length > 0;
  const praticheAperteCalc = pratiche.filter((p) => p.aperta).length;
  const praticheChiuseCalc = pratiche.filter((p) => !p.aperta).length;
  const praticheChiusePositiveCalc = pratiche.filter((p) => !p.aperta && p.esito === 'positivo').length;
  const praticheChiuseNegativeCalc = pratiche.filter((p) => !p.aperta && p.esito === 'negativo').length;

  const capitaleAffidatoCalc = round2(pratiche.reduce((acc, p) => acc + getPraticaImporti(p).capitale, 0));
  const capitaleRecuperatoCalc = round2(pratiche.reduce((acc, p) => acc + getPraticaImporti(p).capitaleRecuperato, 0));
  const interessiAffidatiCalc = round2(pratiche.reduce((acc, p) => acc + getPraticaImporti(p).interessi, 0));
  const interessiRecuperatiCalc = round2(pratiche.reduce((acc, p) => acc + getPraticaImporti(p).interessiRecuperati, 0));
  const anticipazioniAffidateCalc = round2(pratiche.reduce((acc, p) => acc + getPraticaImporti(p).anticipazioni, 0));
  const anticipazioniRecuperateCalc = round2(pratiche.reduce((acc, p) => acc + getPraticaImporti(p).anticipazioniRecuperate, 0));
  const compensiAffidatiCalc = round2(pratiche.reduce((acc, p) => acc + getPraticaImporti(p).compensi, 0));
  const compensiRecuperatiCalc = round2(pratiche.reduce((acc, p) => acc + getPraticaImporti(p).compensiRecuperati, 0));

  const numeroPraticheDisplay = hasPratiche ? pratiche.length : totalePratiche;
  const praticheAperteDisplay = hasPratiche ? praticheAperteCalc : praticheAperte;
  const praticheChiuseDisplay = hasPratiche ? praticheChiuseCalc : praticheChiuse;
  const esitiPositiviDisplay = hasPratiche ? praticheChiusePositiveCalc : esitiPositivi;
  const esitiNegativiDisplay = hasPratiche ? praticheChiuseNegativeCalc : esitiNegativi;

  const capitaleAffidatoDisplay = hasPratiche ? capitaleAffidatoCalc : s.capitaleAffidato;
  const capitaleRecuperatoDisplay = hasPratiche ? capitaleRecuperatoCalc : s.capitaleRecuperato;
  const interessiAffidatiDisplay = hasPratiche ? interessiAffidatiCalc : s.interessiAffidati;
  const interessiRecuperatiDisplay = hasPratiche ? interessiRecuperatiCalc : s.interessiRecuperati;

  const capitaleDaRecuperareDisplay = hasPratiche
    ? round2(Math.max(capitaleAffidatoCalc - capitaleRecuperatoCalc, 0))
    : capitaleDaRecuperareCalc;

  const percentChiusuraDisplay = hasPratiche
    ? (numeroPraticheDisplay > 0 ? (praticheChiuseDisplay / numeroPraticheDisplay) * 100 : 0)
    : percentChiusura;
  const percAperteDisplay = numeroPraticheDisplay > 0 ? (praticheAperteDisplay / numeroPraticheDisplay) * 100 : 0;
  const percChiusePositiveDisplay = numeroPraticheDisplay > 0 ? (esitiPositiviDisplay / numeroPraticheDisplay) * 100 : 0;
  const percChiuseNegativeDisplay = numeroPraticheDisplay > 0 ? (esitiNegativiDisplay / numeroPraticheDisplay) * 100 : 0;

  const percentualeRecuperoCapitaleDisplay = capitaleAffidatoDisplay > 0
    ? (capitaleRecuperatoDisplay / capitaleAffidatoDisplay) * 100
    : s.percentualeRecuperoCapitale;
  const anticipazioniAffidateDisplay = hasPratiche ? anticipazioniAffidateCalc : s.anticipazioniAffidate;
  const anticipazioniRecuperateDisplay = hasPratiche ? anticipazioniRecuperateCalc : s.anticipazioniRecuperate;
  const compensiAffidatiDisplay = hasPratiche ? compensiAffidatiCalc : s.compensiAffidati;
  const compensiRecuperatiDisplay = hasPratiche ? compensiRecuperatiCalc : s.compensiRecuperati;

  const percentualeRecuperoAnticipazioniDisplay = anticipazioniAffidateDisplay > 0
    ? (anticipazioniRecuperateDisplay / anticipazioniAffidateDisplay) * 100
    : s.percentualeRecuperoAnticipazioni;
  const percentualeRecuperoCompensiDisplay = compensiAffidatiDisplay > 0
    ? (compensiRecuperatiDisplay / compensiAffidatiDisplay) * 100
    : s.percentualeRecuperoCompensi;
  const percentualeRecuperoInteressiDisplay = interessiAffidatiDisplay > 0
    ? (interessiRecuperatiDisplay / interessiAffidatiDisplay) * 100
    : s.percentualeRecuperoInteressi;

  const distribuzioneStato = [
    { label: 'Aperte', value: praticheAperteDisplay, percent: percAperteDisplay, color: 'bg-indigo-500' },
    { label: 'Chiuse positive', value: esitiPositiviDisplay, percent: percChiusePositiveDisplay, color: 'bg-emerald-500' },
    { label: 'Chiuse negative', value: esitiNegativiDisplay, percent: percChiuseNegativeDisplay, color: 'bg-rose-500' },
  ];
  const distribuzioneStatoChart = [
    { name: 'Aperte', value: praticheAperteDisplay, color: '#6366F1' },
    { name: 'Chiuse positive', value: esitiPositiviDisplay, color: '#10B981' },
    { name: 'Chiuse negative', value: esitiNegativiDisplay, color: '#F43F5E' },
  ];

  const fasiCounts = pratiche.reduce<Record<string, number>>((acc, pratica) => {
    const nomeFase = pratica.fase?.nome || 'Fase non disponibile';
    acc[nomeFase] = (acc[nomeFase] || 0) + 1;
    return acc;
  }, {});
  const fasiList = Object.entries(fasiCounts)
    .map(([fase, count]) => ({ fase, count, percent: numeroPraticheDisplay > 0 ? (count / numeroPraticheDisplay) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  const andamentoFinanziario = [
    {
      label: 'Capitale affidato',
      labelRecuperato: 'Capitale recuperato',
      affidato: capitaleAffidatoDisplay,
      recuperato: capitaleRecuperatoDisplay,
      toRecover: capitaleDaRecuperareDisplay,
      percent: percentualeRecuperoCapitaleDisplay,
    },
    {
      label: 'Anticipazioni affidate',
      labelRecuperato: 'Anticipazioni recuperate',
      affidato: anticipazioniAffidateDisplay,
      recuperato: anticipazioniRecuperateDisplay,
      percent: percentualeRecuperoAnticipazioniDisplay,
    },
    {
      label: 'Compensi affidati',
      labelRecuperato: 'Compensi recuperati',
      affidato: compensiAffidatiDisplay,
      recuperato: compensiRecuperatiDisplay,
      percent: percentualeRecuperoCompensiDisplay,
    },
    {
      label: 'Interessi affidati',
      labelRecuperato: 'Interessi recuperati',
      affidato: interessiAffidatiDisplay,
      recuperato: interessiRecuperatiDisplay,
      percent: percentualeRecuperoInteressiDisplay,
    },
  ];

  return (
    <div className="space-y-6 wow-stagger">
      {(user?.ruolo === 'avvocato' || user?.ruolo === 'collaboratore') && (
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Le tue pratiche
              </p>
              <p className="text-sm font-semibold text-slate-800">Pratiche assegnate</p>
            </div>
            <button onClick={loadPratiche} className="text-xs text-indigo-600 hover:text-indigo-700">
              Aggiorna elenco
            </button>
          </div>
          {loadingPratiche ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : pratiche.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna pratica assegnata.</p>
          ) : (
            <div className="space-y-3">
              {pratiche.map((pratica) => (
                <button
                  key={pratica.id}
                  onClick={() => navigate(`/pratiche/${pratica.id}`)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {pratica.cliente?.ragioneSociale || 'Pratica'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Pratica #{pratica.id.slice(0, 8)} • {pratica.fase?.nome || 'Fase non disponibile'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">Apri</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtri */}
      <div className="wow-panel flex flex-col gap-4 p-5 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Filtri dinamici
            </p>
            <p className="text-sm font-semibold text-slate-800">Seleziona il cliente</p>
          </div>
        </div>
        <div className="flex-1">
          <div className="max-w-md">
            <CustomSelect
              options={[
                { value: 'all', label: 'Tutti i clienti' },
                ...clienti.map((cliente) => ({
                  value: cliente.id,
                  label: cliente.ragioneSociale,
                })),
              ]}
              value={selectedClienteId}
              onChange={setSelectedClienteId}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={loadData}
            className="wow-button"
          >
            <RefreshCw className="h-4 w-4" />
            Aggiorna dati
          </button>
        </div>
      </div>

      {/* Visualizza Report */}
      {selectedClienteId && (
        <div className="wow-card p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Report Cliente
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedClienteId === 'all'
                    ? 'Tutti i clienti'
                    : (clienti.find(c => c.id === selectedClienteId)?.ragioneSociale || 'Cliente selezionato')}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/report/cliente/${selectedClienteId}`)}
              className="wow-button inline-flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              Visualizza Report
            </button>
          </div>
        </div>
      )}

      {/* KPI principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 wow-stagger">
        <div className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-slate-900 via-indigo-700 to-indigo-500 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/15 rounded-2xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <TrendingUp className="h-5 w-5 text-white/70" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
            Pratiche totali
          </h3>
          <p className="text-2xl font-semibold text-white">{numeroPraticheDisplay}</p>
          <p className="text-xs text-white/70 mt-3">
            {praticheAperteDisplay} aperte • {praticheChiuseDisplay} chiuse
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/15 rounded-2xl">
              <Percent className="h-6 w-6 text-white" />
            </div>
            <BarChart3 className="h-5 w-5 text-white/70" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
            Tasso di chiusura
          </h3>
          <p className="text-2xl font-semibold text-white">{formatPercent(percentChiusuraDisplay)}</p>
          <p className="text-xs text-white/70 mt-3">
            {praticheChiuseDisplay} / {numeroPraticheDisplay} pratiche
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-600 via-indigo-500 to-indigo-400 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
          <div className="pointer-events-none absolute -right-10 -bottom-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/15 rounded-2xl">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <TrendingUp className="h-5 w-5 text-white/70" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
            Esiti positivi
          </h3>
          <p className="text-2xl font-semibold text-white">{esitiPositiviDisplay}</p>
          <p className="text-xs text-white/70 mt-3">
            {k.esitoPositivoTotale} totali • {k.esitoPositivoParziale} parziali
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-rose-600 via-rose-500 to-amber-400 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/15 rounded-2xl">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <TrendingDown className="h-5 w-5 text-white/70" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
            Esiti negativi
          </h3>
          <p className="text-2xl font-semibold text-white">{esitiNegativiDisplay}</p>
          <p className="text-xs text-white/70 mt-3">Nessun recupero</p>
        </div>
      </div>

      {/* Distribuzione / Esiti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 wow-stagger">
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-2xl">
                <PieChart className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Distribuzione pratiche per stato</h3>
                <p className="text-xs text-slate-500">Aperte vs chiuse</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-500">
              Totale {numeroPraticheDisplay}
            </span>
          </div>
          <div className="space-y-3">
            {distribuzioneStatoChart.some((d) => d.value > 0) ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={distribuzioneStatoChart}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {distribuzioneStatoChart.map((entry, index) => (
                        <Cell key={`stato-cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
                    <Tooltip content={<ChartTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            ) : null}
            {distribuzioneStato.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                  <span className="text-slate-600 dark:text-slate-300">{item.value} • {formatPercent(item.percent)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(Math.max(item.percent, 0), 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-2xl">
                <BarChart3 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Esiti pratiche chiuse</h3>
                <p className="text-xs text-slate-500">Positivo vs negativo</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-500">
              Chiuse {praticheChiuseDisplay}
            </span>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-100">Esiti positivi</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-200">{formatPercent(percChiusePositiveDisplay)} del totale</p>
                </div>
              </div>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-200">{esitiPositiviDisplay}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-900/20">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-rose-600" />
                <div>
                  <p className="text-sm font-semibold text-rose-800 dark:text-rose-100">Esiti negativi</p>
                  <p className="text-xs text-rose-700 dark:text-rose-200">{formatPercent(percChiuseNegativeDisplay)} del totale</p>
                </div>
              </div>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-200">{esitiNegativiDisplay}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Alert attivi</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Promemoria e scadenze</p>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-200">{s.alertAttivi}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-fuchsia-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ticket aperti</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Richieste clienti</p>
                </div>
              </div>
              <span className="text-lg font-bold text-fuchsia-700 dark:text-fuchsia-200">{s.ticketsAperti}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Finanza e andamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 wow-stagger">
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-2xl">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Andamento finanziario</h3>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-500">Capitale da recuperare: {formatCurrency(capitaleDaRecuperareDisplay)}</span>
          </div>
          <div className="space-y-4">
            {andamentoFinanziario.map((item) => {
              const progress = item.percent ?? (item.affidato > 0 ? (item.recuperato / item.affidato) * 100 : 0);
              return (
                <div key={item.label} className="rounded-xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.labelRecuperato} {formatCurrency(item.recuperato)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                        {formatCurrency(item.affidato)}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-3 h-3 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400"
                      style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                      {formatPercent(progress)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 rounded-2xl dark:bg-slate-800/70">
                <FileText className="h-6 w-6 text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Pratiche per fase</h3>
                <p className="text-xs text-slate-500">Dettaglio per fasi del procedimento</p>
              </div>
            </div>
          </div>
          {fasiList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
              Dato non disponibile dall&apos;API attuale. Aggiungi il conteggio per fase per vedere il dettaglio qui.
            </div>
          ) : (
            <div className="space-y-3">
              {fasiList.map((fase) => (
                <div key={fase.fase} className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{fase.fase}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatPercent(fase.percent)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-600 dark:text-slate-400">
                    <span>Pratiche</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{fase.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400"
                      style={{ width: `${Math.min(Math.max(fase.percent, 0), 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
