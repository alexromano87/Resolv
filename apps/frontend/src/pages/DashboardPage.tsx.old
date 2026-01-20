// apps/frontend/src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, FileText, CheckCircle, XCircle,
  DollarSign, Percent, BarChart3, PieChart, RefreshCw, Filter,
} from 'lucide-react';
import { fetchDashboardStats, fetchDashboardKPI, type DashboardStats, type KPI } from '../api/dashboard';
import { fetchClienti, type Cliente } from '../api/clienti';
import { fetchPratiche, type Pratica } from '../api/pratiche';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useAuth } from '../contexts/AuthContext';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kpi, setKPI] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [loadingPratiche, setLoadingPratiche] = useState(false);
  const [praticheError, setPraticheError] = useState<string | null>(null);

  // Filtri
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');

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
    if (!user || !['cliente', 'avvocato', 'collaboratore'].includes(user.ruolo)) return;
    loadPratiche();
  }, [user]);

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
      const clienteId = selectedClienteId || undefined;
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
      setPraticheError(null);
      const data = await fetchPratiche();
      setPratiche(data);
    } catch (err) {
      console.error('Errore caricamento pratiche:', err);
      setPraticheError('Impossibile caricare le pratiche');
    } finally {
      setLoadingPratiche(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (user?.ruolo === 'cliente') {
    if (loadingPratiche) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      );
    }

    if (praticheError) {
      return (
        <div className="text-center py-12">
          <p className="text-rose-600">{praticheError}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 wow-stagger">
        <div className="wow-card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <span className="wow-chip">Area cliente</span>
            <h1 className="mt-4 text-4xl font-semibold text-slate-900 dark:text-slate-50 display-font">
              Le tue pratiche
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Visualizza lo stato e le informazioni principali delle tue pratiche.
            </p>
          </div>
        </div>

        <div className="wow-panel p-6">
          {pratiche.length === 0 ? (
            <p className="text-sm text-slate-500">Nessuna pratica disponibile.</p>
          ) : (
            <div className="space-y-4">
              {pratiche.map((pratica) => (
                <div
                  key={pratica.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {pratica.cliente?.ragioneSociale || 'Pratica'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Pratica #{pratica.id.slice(0, 8)} • {pratica.fase?.nome || 'Fase non disponibile'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/pratiche/${pratica.id}/cliente`)}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Visualizza pratica
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="wow-card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <span className="wow-chip">Panoramica</span>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Visione completa e aggiornata delle attività di recupero crediti.
          </p>
        </div>
        <button
          onClick={loadData}
          className="wow-button"
        >
          <RefreshCw className="h-4 w-4" />
          Aggiorna dati
        </button>
      </div>

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
                { value: '', label: 'Tutti i clienti' },
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
      </div>

      {/* KPI Cards - Prima Riga */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 wow-stagger">
        {/* Pratiche Totali */}
        <div
          onClick={() => navigate('/pratiche')}
          className="group relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-slate-900 via-indigo-700 to-indigo-500 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] cursor-pointer transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.3)]"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/15 rounded-2xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <TrendingUp className="h-5 w-5 text-white/70" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
            Pratiche Totali
          </h3>
          <p className="text-3xl font-semibold text-white">{stats.numeroPratiche}</p>
          <p className="text-xs text-white/70 mt-3">
            {stats.praticheAperte} aperte • {stats.praticheChiuse} chiuse
          </p>
        </div>

        {/* Percentuale Chiusura */}
        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/15 rounded-2xl">
              <Percent className="h-6 w-6 text-white" />
            </div>
            <BarChart3 className="h-5 w-5 text-white/70" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
            Tasso di Chiusura
          </h3>
          <p className="text-3xl font-semibold text-white">{formatPercent(kpi.percentualeChiusura)}</p>
          <p className="text-xs text-white/70 mt-3">
            {kpi.totalePraticheChiuse} / {kpi.totalePraticheAffidate} pratiche
          </p>
        </div>

        {/* Esiti Positivi */}
        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-blue-600 via-indigo-500 to-indigo-400 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
          <div className="pointer-events-none absolute -right-10 -bottom-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/15 rounded-2xl">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <TrendingUp className="h-5 w-5 text-white/70" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
            Esiti Positivi
          </h3>
          <p className="text-3xl font-semibold text-white">{kpi.esitoPositivo}</p>
          <p className="text-xs text-white/70 mt-3">
            {kpi.esitoPositivoTotale} totali • {kpi.esitoPositivoParziale} parziali
          </p>
        </div>

        {/* Esiti Negativi */}
        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-rose-600 via-rose-500 to-amber-400 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/15 rounded-2xl">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <TrendingDown className="h-5 w-5 text-white/70" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
            Esiti Negativi
          </h3>
          <p className="text-3xl font-semibold text-white">{kpi.esitoNegativo}</p>
          <p className="text-xs text-white/70 mt-3">Nessun recupero</p>
        </div>
      </div>

      {/* Recupero Crediti - Seconda Riga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 wow-stagger">
        {/* Capitale */}
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-2xl">
                <DollarSign className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Capitale</h3>
                <p className="text-xs text-slate-500">Recupero capitale</p>
              </div>
            </div>
            <span className="text-2xl font-semibold text-indigo-600">
              {formatPercent(stats.percentualeRecuperoCapitale)}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Affidato</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {formatCurrency(stats.capitaleAffidato)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Recuperato</span>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(stats.capitaleRecuperato)}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Pratiche recupero completo</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpi.recuperoCapitale.completo}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-500">Pratiche recupero parziale</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpi.recuperoCapitale.parziale}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interessi */}
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-2xl">
                <PieChart className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Interessi</h3>
                <p className="text-xs text-slate-500">Recupero interessi</p>
              </div>
            </div>
            <span className="text-2xl font-semibold text-amber-600">
              {formatPercent(stats.percentualeRecuperoInteressi)}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Affidati</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {formatCurrency(stats.interessiAffidati)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Recuperati</span>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(stats.interessiRecuperati)}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Pratiche recupero completo</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpi.recuperoInteressi.completo}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-500">Pratiche recupero parziale</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpi.recuperoInteressi.parziale}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compensi e Anticipazioni - Terza Riga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 wow-stagger">
        {/* Compensi Legali */}
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
                <DollarSign className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Compensi Legali</h3>
                <p className="text-xs text-slate-500">Recupero compensi</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatPercent(stats.percentualeRecuperoCompensi)}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Affidati</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {formatCurrency(stats.compensiAffidati)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Liquidati</span>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(stats.compensiRecuperati)}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Pratiche recupero completo</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpi.recuperoCompensi.completo}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-500">Pratiche recupero parziale</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {kpi.recuperoCompensi.parziale}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Anticipazioni */}
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Anticipazioni</h3>
                <p className="text-xs text-slate-500">Recupero anticipazioni</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatPercent(stats.percentualeRecuperoAnticipazioni)}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Affidate</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {formatCurrency(stats.anticipazioniAffidate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Recuperate</span>
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(stats.anticipazioniRecuperate)}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 italic">
                Le anticipazioni sono spese sostenute dallo studio per conto del cliente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
