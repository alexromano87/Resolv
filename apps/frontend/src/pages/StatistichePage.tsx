// apps/frontend/src/pages/StatistichePage.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchPratiche, type Pratica } from '../api/pratiche';
import {
  Banknote,
  BarChart3,
  Calendar,
  CheckCircle,
  FileText,
  Layers,
  Percent,
  PieChart as PieChartIcon,
  TrendingDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DateField } from '../components/ui/DateField';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-indigo-100/60 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
      {label && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</p>}
      {payload.map((item: any) => (
        <div key={item.name} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
          <span className="font-medium">{item.name}:</span>
          <span>{typeof item.value === 'number' ? item.value.toLocaleString('it-IT') : item.value}</span>
        </div>
      ))}
    </div>
  );
};

const chartGradient = (id: string, from: string, to: string) => (
  <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor={from} stopOpacity={1} />
    <stop offset="100%" stopColor={to} stopOpacity={0.8} />
  </linearGradient>
);

export function StatistichePage() {
  const { user } = useAuth();
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatoIndex, setActiveStatoIndex] = useState<number | null>(null);
  const [activeEsitoIndex, setActiveEsitoIndex] = useState<number | null>(null);

  // Filtri periodo
  const [periodoSelezionato, setPeriodoSelezionato] = useState('tutto');
  const [dataDa, setDataDa] = useState('');
  const [dataA, setDataA] = useState('');

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

  const getMovimentiTotali = (pratica: Pratica) => {
    const totals = {
      capitale: 0,
      anticipazioni: 0,
      compensi: 0,
      interessi: 0,
      recuperoCapitale: 0,
      recuperoAnticipazioni: 0,
      recuperoCompensi: 0,
      recuperoInteressi: 0,
    };

    (pratica.movimentiFinanziari || []).forEach((movimento) => {
      const importo = toNumber(movimento.importo);
      switch (movimento.tipo) {
        case 'capitale':
          totals.capitale += importo;
          break;
        case 'anticipazione':
          totals.anticipazioni += importo;
          break;
        case 'compenso':
          totals.compensi += importo;
          break;
        case 'interessi':
          totals.interessi += importo;
          break;
        case 'recupero_capitale':
          totals.recuperoCapitale += importo;
          break;
        case 'recupero_anticipazione':
          totals.recuperoAnticipazioni += importo;
          break;
        case 'recupero_compenso':
          totals.recuperoCompensi += importo;
          break;
        case 'recupero_interessi':
          totals.recuperoInteressi += importo;
          break;
      }
    });

    return totals;
  };

  const getPraticaImporti = (pratica: Pratica) => {
    const movimenti = getMovimentiTotali(pratica);
    return {
      capitale: toNumber(pratica.capitale) + movimenti.capitale,
      capitaleRecuperato: toNumber(pratica.importoRecuperatoCapitale) + movimenti.recuperoCapitale,
      anticipazioni: toNumber(pratica.anticipazioni) + movimenti.anticipazioni,
      anticipazioniRecuperate: toNumber(pratica.importoRecuperatoAnticipazioni) + movimenti.recuperoAnticipazioni,
      compensi: toNumber(pratica.compensiLegali) + movimenti.compensi,
      compensiRecuperati: toNumber(pratica.compensiLiquidati) + movimenti.recuperoCompensi,
    };
  };

  useEffect(() => {
    loadPratiche();
  }, [user]);

  const loadPratiche = async () => {
    try {
      setLoading(true);
      const data = await fetchPratiche();
      setPratiche(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento delle pratiche');
    } finally {
      setLoading(false);
    }
  };

  const filtraPratichePerPeriodo = (): Pratica[] => {
    let dataInizio: Date | null = null;
    let dataFine: Date | null = null;
    const oggi = new Date();

    switch (periodoSelezionato) {
      case 'mese':
        dataInizio = new Date(oggi.getFullYear(), oggi.getMonth() - 1, oggi.getDate());
        dataFine = oggi;
        break;
      case 'trimestre':
        dataInizio = new Date(oggi.getFullYear(), oggi.getMonth() - 3, oggi.getDate());
        dataFine = oggi;
        break;
      case 'semestre':
        dataInizio = new Date(oggi.getFullYear(), oggi.getMonth() - 6, oggi.getDate());
        dataFine = oggi;
        break;
      case 'anno':
        dataInizio = new Date(oggi.getFullYear(), 0, 1);
        dataFine = oggi;
        break;
      case 'personalizzato':
        if (dataDa && dataA) {
          dataInizio = new Date(dataDa);
          dataFine = new Date(dataA);
        } else {
          return pratiche;
        }
        break;
      default:
        return pratiche;
    }

    return pratiche.filter((p) => {
      if (!p.dataAffidamento) return false;
      const dataPratica = new Date(p.dataAffidamento);
      return dataInizio && dataFine && dataPratica >= dataInizio && dataPratica <= dataFine;
    });
  };

  const praticheFiltrate = filtraPratichePerPeriodo();

  // Dati per grafico 1: Distribuzione pratiche per stato
  const praticheAperte = praticheFiltrate.filter((p) => p.aperta).length;
  const praticheChiuse = praticheFiltrate.filter((p) => !p.aperta).length;
  const totalePraticheStato = praticheAperte + praticheChiuse;
  const datiStato = [
    {
      name: 'Aperte',
      value: praticheAperte,
      color: '#3b82f6',
      percent: totalePraticheStato > 0 ? ((praticheAperte / totalePraticheStato) * 100).toFixed(1) : '0.0'
    },
    {
      name: 'Chiuse',
      value: praticheChiuse,
      color: '#10b981',
      percent: totalePraticheStato > 0 ? ((praticheChiuse / totalePraticheStato) * 100).toFixed(1) : '0.0'
    },
  ];

  // Dati per grafico 2: Esiti pratiche chiuse
  const praticheChiusePositive = praticheFiltrate.filter((p) => !p.aperta && p.esito === 'positivo').length;
  const praticheChiuseNegative = praticheFiltrate.filter((p) => !p.aperta && p.esito === 'negativo').length;
  const datiEsiti = [
    { name: 'Esito positivo', value: praticheChiusePositive, color: '#10b981' },
    { name: 'Esito negativo', value: praticheChiuseNegative, color: '#ef4444' },
  ];

  // Dati per grafico 3: Andamento finanziario
  const totaliFinanziari = praticheFiltrate.reduce(
    (acc, pratica) => {
      const importi = getPraticaImporti(pratica);
      acc.capitale += importi.capitale;
      acc.capitaleRecuperato += importi.capitaleRecuperato;
      acc.anticipazioni += importi.anticipazioni;
      acc.anticipazioniRecuperate += importi.anticipazioniRecuperate;
      acc.compensi += importi.compensi;
      acc.compensiRecuperati += importi.compensiRecuperati;
      return acc;
    },
    {
      capitale: 0,
      capitaleRecuperato: 0,
      anticipazioni: 0,
      anticipazioniRecuperate: 0,
      compensi: 0,
      compensiRecuperati: 0,
    },
  );

  const totaleCapitale = totaliFinanziari.capitale;
  const totaleRecuperatoCapitale = totaliFinanziari.capitaleRecuperato;
  const totaleAnticipazioni = totaliFinanziari.anticipazioni;
  const totaleRecuperatoAnticipazioni = totaliFinanziari.anticipazioniRecuperate;
  const datiFinanziari = [
    { categoria: 'Capitale', Affidato: Math.round(totaleCapitale), Recuperato: Math.round(totaleRecuperatoCapitale) },
    {
      categoria: 'Anticipazioni',
      Affidato: Math.round(totaleAnticipazioni),
      Recuperato: Math.round(totaleRecuperatoAnticipazioni),
    },
  ];

  // Dati per grafico 4: Pratiche per fase
  const fasi = [
    'Analisi preliminare',
    'Sollecito bonario',
    'Messa in mora',
    'Decreto ingiuntivo',
    'Notifica decreto',
    'Opposizione',
    'Esecuzione forzata',
    'Pignoramento',
    'Vendita beni',
    'Assegnazione/distribuzione',
    'Accordo transattivo',
    'Piano di rientro',
    'Monitoraggio pagamenti',
    'Chiusura positiva',
    'Chiusura negativa',
  ];
  const datiFasi = fasi
    .map((fase) => ({
      fase: fase.length > 20 ? fase.substring(0, 17) + '...' : fase,
      count: praticheFiltrate.filter((p) => p.fase?.nome === fase).length,
    }))
    .filter((d) => d.count > 0);

  // Dati per grafico 5: Compensi maturati vs liquidati
  const totaleCompensiMaturati = totaliFinanziari.compensi;
  const totaleCompensiLiquidati = totaliFinanziari.compensiRecuperati;
  const datiCompensi = [
    { tipo: 'Maturati', importo: Math.round(totaleCompensiMaturati) },
    { tipo: 'Liquidati', importo: Math.round(totaleCompensiLiquidati) },
  ];

  // KPI sintetici
  const capitaleAffidato = totaleCapitale;
  const capitaleRecuperato = totaleRecuperatoCapitale;
  const tassoRecupero = capitaleAffidato > 0 ? (capitaleRecuperato / capitaleAffidato) * 100 : 0;
  const percentualeChiusePositive = praticheChiuse > 0 ? (praticheChiusePositive / praticheChiuse) * 100 : 0;

  const cardsKPI = [
    {
      title: 'Pratiche attive',
      value: praticheAperte,
      caption: `${praticheChiuse} chiuse`,
      gradient: 'from-slate-900 via-indigo-700 to-indigo-500',
      icon: FileText,
      accent: 'text-white',
    },
    {
      title: 'Capitale affidato',
      value: `€ ${capitaleAffidato.toLocaleString('it-IT')}`,
      caption: `Recuperato € ${capitaleRecuperato.toLocaleString('it-IT')}`,
      gradient: 'from-indigo-600 via-indigo-500 to-blue-500',
      icon: Banknote,
      accent: 'text-white',
    },
    {
      title: 'Tasso di recupero',
      value: `${tassoRecupero.toFixed(1)}%`,
      caption: `Periodo selezionato`,
      gradient: 'from-emerald-600 via-emerald-500 to-teal-400',
      icon: Percent,
      accent: 'text-white',
    },
    {
      title: 'Pratiche chiuse positivamente',
      value: `${percentualeChiusePositive.toFixed(1)}%`,
      caption: `Su ${praticheChiuse} chiuse`,
      gradient: 'from-teal-600 via-emerald-500 to-lime-400',
      icon: CheckCircle,
      accent: 'text-white',
    },
    {
      title: 'Compensi liquidati',
      value: `€ ${totaleCompensiLiquidati.toLocaleString('it-IT')}`,
      caption: `Maturati € ${totaleCompensiMaturati.toLocaleString('it-IT')}`,
      gradient: 'from-rose-600 via-rose-500 to-amber-400',
      icon: TrendingDown,
      accent: 'text-white',
    },
  ];

  const periodoOptions = [
    { value: 'tutto', label: 'Tutto il periodo', sublabel: 'Nessun filtro temporale' },
    { value: 'anno', label: "Quest'anno", sublabel: 'Dal 1 gennaio ad oggi' },
    { value: 'semestre', label: 'Ultimi 6 mesi', sublabel: 'Sei mesi più recenti' },
    { value: 'trimestre', label: 'Ultimi 3 mesi', sublabel: 'Tre mesi più recenti' },
    { value: 'mese', label: 'Ultimo mese', sublabel: '30 giorni recenti' },
    { value: 'personalizzato', label: 'Periodo personalizzato', sublabel: 'Seleziona un intervallo' },
  ];

  const periodoLabelMap: Record<string, string> = {
    tutto: 'Tutto il periodo',
    anno: "Quest'anno",
    semestre: 'Ultimi 6 mesi',
    trimestre: 'Ultimi 3 mesi',
    mese: 'Ultimo mese',
    personalizzato: 'Periodo personalizzato',
  };

  const periodoLabel = periodoLabelMap[periodoSelezionato] ?? 'Tutto il periodo';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
          <p className="text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto p-6 space-y-6 wow-stagger">
        <div className="wow-panel grid grid-cols-1 gap-4 p-5 md:grid-cols-[auto,1fr,360px] md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Periodo
              </p>
              <p className="text-sm font-semibold text-slate-800">
                Filtra le statistiche
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              {periodoLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              {praticheFiltrate.length} pratiche
            </span>
          </div>

          <div className="w-full md:justify-self-end">
            <CustomSelect
              options={periodoOptions}
              value={periodoSelezionato}
              onChange={(value) => {
                setPeriodoSelezionato(value);
                if (value !== 'personalizzato') {
                  setDataDa('');
                  setDataA('');
                }
              }}
              triggerClassName="!rounded-xl !px-3 !py-2 !text-sm !shadow-none !w-full md:!min-w-[320px]"
            />
            {periodoSelezionato === 'personalizzato' && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField
                  value={dataDa}
                  onChange={setDataDa}
                  placeholder="Inizio"
                  max={dataA || undefined}
                />
                <DateField
                  value={dataA}
                  onChange={setDataA}
                  placeholder="Fine"
                  min={dataDa || undefined}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 wow-stagger">
          {cardsKPI.map((card) => (
            <div
              key={card.title}
              className={`relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br ${card.gradient} p-4 shadow-[0_12px_36px_rgba(15,23,42,0.18)]`}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-white/15">
                    <card.icon className={`h-5 w-5 ${card.accent}`} />
                  </div>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 mb-2">
                  {card.title}
                </p>
                <p className="text-xl font-semibold text-white">{card.value}</p>
                <p className="text-[11px] text-white/70 mt-2">{card.caption}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 wow-stagger">
        {/* Grafico 1: Distribuzione pratiche per stato */}
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-2xl">
                <PieChartIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Distribuzione pratiche per stato</h3>
                <p className="text-xs text-slate-500">Aperte vs chiuse</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-slate-500">
              Totale {praticheFiltrate.length}
            </span>
          </div>
          {datiStato.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <defs>
                  {chartGradient('grad-stato-ap', '#6366F1', '#22D3EE')}
                  {chartGradient('grad-stato-ch', '#10B981', '#6EE7B7')}
                </defs>
                <Pie
                  data={datiStato}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={(_: any, idx: number) => setActiveStatoIndex(idx)}
                  onMouseLeave={() => setActiveStatoIndex(null)}
                  animationDuration={700}
                  label={(entry: any) => {
                    return `${entry.name.toUpperCase()}\n${entry.percent}%`;
                  }}
                >
                  {datiStato.map((_entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'url(#grad-stato-ap)' : 'url(#grad-stato-ch)'}
                      stroke="white"
                      strokeWidth={activeStatoIndex === index ? 4 : 2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded">
              <p className="text-slate-500 dark:text-slate-400">Nessuna pratica nel periodo selezionato</p>
            </div>
          )}
        </div>

        {/* Grafico 2: Esiti pratiche chiuse */}
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
              Chiuse {praticheChiuse}
            </span>
          </div>
          {datiEsiti.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <defs>
                  {chartGradient('grad-esito-pos', '#10B981', '#34D399')}
                  {chartGradient('grad-esito-neg', '#F43F5E', '#FB7185')}
                </defs>
                <Pie
                  data={datiEsiti}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={5}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={(_: any, idx: number) => setActiveEsitoIndex(idx)}
                  onMouseLeave={() => setActiveEsitoIndex(null)}
                  animationDuration={700}
                >
                  {datiEsiti.map((_entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'url(#grad-esito-pos)' : 'url(#grad-esito-neg)'}
                      stroke="white"
                      strokeWidth={activeEsitoIndex === index ? 4 : 2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded">
              <p className="text-slate-500 dark:text-slate-400">Nessuna pratica chiusa nel periodo selezionato</p>
            </div>
          )}
        </div>
      </div>

      <div className="wow-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Banknote className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Andamento finanziario</h3>
              <p className="text-xs text-slate-500">Affidato vs recuperato</p>
            </div>
          </div>
        </div>
        {datiFinanziari.some((d) => d.Affidato > 0 || d.Recuperato > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datiFinanziari} barCategoryGap="30%">
              <defs>
                {chartGradient('grad-affidato', '#4F46E5', '#22D3EE')}
                {chartGradient('grad-recuperato', '#10B981', '#34D399')}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200/80 dark:stroke-slate-700" />
              <XAxis dataKey="categoria" className="text-slate-600 dark:text-slate-400" />
              <YAxis
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                className="text-slate-600 dark:text-slate-400"
              />
              <Tooltip formatter={(value: any) => `€${value.toLocaleString('it-IT')}`} content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
              <Legend />
              <Bar dataKey="Affidato" fill="url(#grad-affidato)" radius={[10, 10, 6, 6]} barSize={28} />
              <Bar dataKey="Recuperato" fill="url(#grad-recuperato)" radius={[10, 10, 6, 6]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-80 bg-slate-50 dark:bg-slate-800 rounded">
            <p className="text-slate-500 dark:text-slate-400">Nessun dato finanziario nel periodo selezionato</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico 4: Pratiche per fase */}
        <div className="wow-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-violet-50 rounded-2xl">
              <Layers className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Pratiche per fase</h3>
              <p className="text-xs text-slate-500">Distribuzione per step operativo</p>
            </div>
          </div>
          {datiFasi.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={datiFasi} layout="vertical">
                <defs>{chartGradient('grad-fasi', '#8B5CF6', '#6366F1')}</defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200/80 dark:stroke-slate-700" />
                <XAxis type="number" className="text-slate-600 dark:text-slate-400" />
                <YAxis
                  dataKey="fase"
                  type="category"
                  width={120}
                  style={{ fontSize: '12px' }}
                  className="text-slate-600 dark:text-slate-400"
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar
                  dataKey="count"
                  fill="url(#grad-fasi)"
                  name="Pratiche"
                  radius={[8, 8, 8, 8]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded">
              <p className="text-slate-500 dark:text-slate-400">Nessuna pratica nel periodo selezionato</p>
            </div>
          )}
        </div>

        {/* Grafico 5: Compensi maturati vs liquidati */}
        <div className="wow-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-50 rounded-2xl">
              <CheckCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Compensi maturati vs liquidati
              </h3>
              <p className="text-xs text-slate-500">Trend economico</p>
            </div>
          </div>
          {datiCompensi.some((d) => d.importo > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={datiCompensi}>
                <defs>
                  {chartGradient('grad-comp-mat', '#F59E0B', '#F97316')}
                  {chartGradient('grad-comp-liq', '#0EA5E9', '#6366F1')}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200/80 dark:stroke-slate-700" />
                <XAxis dataKey="tipo" className="text-slate-600 dark:text-slate-400" />
                <YAxis
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  className="text-slate-600 dark:text-slate-400"
                />
                <Tooltip formatter={(value: any) => `€${value.toLocaleString('it-IT')}`} content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="importo" radius={[10, 10, 6, 6]} barSize={36}>
                  {datiCompensi.map((_entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'url(#grad-comp-mat)' : 'url(#grad-comp-liq)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded">
              <p className="text-slate-500 dark:text-slate-400">Nessun dato sui compensi nel periodo selezionato</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
