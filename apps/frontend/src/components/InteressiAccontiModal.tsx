import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DateField } from './ui/DateField';
import { CustomSelect } from './ui/CustomSelect';
import { BodyPortal } from './ui/BodyPortal';
import { tassiInteresseApi, type TassoInteresse } from '../api/tassi-interesse';

type MovimentoTipo = 'credito' | 'acconto';

type Movimento = {
  id: string;
  tipo: MovimentoTipo;
  data: string;
  importo: string;
  descrizione: string;
};

type CalcoloResult = {
  totaleInteressi: number;
  interessiResidui: number;
  capitaleResiduo: number;
  totaleAcconti: number;
  totaleCreditiAggiuntivi: number;
  tassoUsato: number;
};

interface InteressiAccontiModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyMovimento = (): Movimento => ({
  id: crypto.randomUUID(),
  tipo: 'acconto',
  data: '',
  importo: '',
  descrizione: '',
});

const parseAmount = (value: string) => {
  if (!value) return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

const parseDate = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const diffDays = (start: Date, end: Date) => {
  const ms = end.getTime() - start.getTime();
  return Math.max(Math.floor(ms / (1000 * 60 * 60 * 24)), 0);
};

const formatDateKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const findRateForDate = (date: Date, rates: TassoInteresse[]) => {
  return rates.find((rate) => {
    const start = new Date(rate.dataInizioValidita);
    const end = rate.dataFineValidita ? new Date(rate.dataFineValidita) : null;
    return start <= date && (!end || end >= date);
  });
};

export function InteressiAccontiModal({ open, onClose }: InteressiAccontiModalProps) {
  const [capitale, setCapitale] = useState('0,00');
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [tipoInteresse, setTipoInteresse] = useState<'legale' | 'moratorio' | 'fisso'>('legale');
  const [tassoFisso, setTassoFisso] = useState('');
  const [moratorioPre2013, setMoratorioPre2013] = useState(false);
  const [moratorioMaggiorazione, setMoratorioMaggiorazione] = useState(false);
  const [moratorioPctMaggiorazione, setMoratorioPctMaggiorazione] = useState(4);
  const [applicaArt1194, setApplicaArt1194] = useState(true);
  const [movimenti, setMovimenti] = useState<Movimento[]>([emptyMovimento()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalcoloResult | null>(null);

  const hasMoreMovimenti = movimenti.length < 40;

  const filteredMovimenti = useMemo(
    () =>
      movimenti.filter((movimento) => movimento.data && parseAmount(movimento.importo) > 0),
    [movimenti],
  );

  if (!open) return null;

  const handleAddMovimento = () => {
    if (!hasMoreMovimenti) return;
    setMovimenti((prev) => [...prev, emptyMovimento()]);
  };

  const handleRemoveMovimento = (id: string) => {
    setMovimenti((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const resolveRates = async (): Promise<{ rates: TassoInteresse[]; label: number }> => {
    if (tipoInteresse === 'fisso') {
      const tasso = parseAmount(tassoFisso);
      if (!tasso || tasso <= 0) {
        throw new Error('Inserisci un tasso fisso valido.');
      }
      return { rates: [], label: tasso };
    }

    const rates = await tassiInteresseApi.getByTipo(tipoInteresse);
    const start = parseDate(dataInizio);
    if (!start) {
      throw new Error('Inserisci una data di inizio valida.');
    }
    const rate = findRateForDate(start, rates);
    if (!rate) {
      throw new Error(`Nessun tasso ${tipoInteresse} disponibile per la data selezionata.`);
    }
    let tasso = Number(rate.tassoPercentuale);
    if (tipoInteresse === 'moratorio') {
      if (moratorioPre2013) {
        tasso = Math.max(tasso - 1, 0);
      }
      if (moratorioMaggiorazione) {
        tasso += moratorioPctMaggiorazione;
      }
    }
    return { rates, label: tasso };
  };

  const handleCalcola = async () => {
    setError(null);
    setResult(null);

    const start = parseDate(dataInizio);
    const end = parseDate(dataFine);
    if (!start || !end || end <= start) {
      setError('Inserisci un intervallo date valido.');
      return;
    }

    const capitaleIniziale = parseAmount(capitale);
    if (capitaleIniziale <= 0) {
      setError('Inserisci un capitale iniziale valido.');
      return;
    }

    try {
      setLoading(true);
      const { rates, label } = await resolveRates();
      const rateForDate = (date: Date) => {
        if (tipoInteresse === 'fisso') return label;
        const rate = findRateForDate(date, rates);
        if (!rate) {
          throw new Error(`Nessun tasso ${tipoInteresse} disponibile per la data ${formatDateKey(date)}.`);
        }
        let tasso = Number(rate.tassoPercentuale);
        if (tipoInteresse === 'moratorio') {
          if (moratorioPre2013) {
            tasso = Math.max(tasso - 1, 0);
          }
          if (moratorioMaggiorazione) {
            tasso += moratorioPctMaggiorazione;
          }
        }
        return tasso;
      };

      let capitaleResiduo = capitaleIniziale;
      let interessiAccumulati = 0;
      let totaleInteressi = 0;
      let totaleAcconti = 0;
      let totaleCreditiAggiuntivi = 0;

      const eventiMap = new Map<string, typeof filteredMovimenti[number] & { dataParsed: Date; importoVal: number }>();
      filteredMovimenti.forEach((movimento) => {
        const dataParsed = parseDate(movimento.data);
        if (!dataParsed) return;
        const importoVal = parseAmount(movimento.importo);
        const descrizione = movimento.descrizione.trim();
        const key = `${formatDateKey(dataParsed)}|${movimento.tipo}|${descrizione}`;
        const existing = eventiMap.get(key);
        if (existing) {
          existing.importoVal += importoVal;
        } else {
          eventiMap.set(key, { ...movimento, dataParsed, importoVal, descrizione });
        }
      });

      const eventi = Array.from(eventiMap.values())
        .filter((movimento) => movimento.dataParsed)
        .sort((a, b) => {
          const dateCompare = a.dataParsed.getTime() - b.dataParsed.getTime();
          if (dateCompare !== 0) return dateCompare;
          if (a.tipo === b.tipo) return 0;
          return a.tipo === 'credito' ? -1 : 1;
        });

      const movimentiByDate = new Map<string, typeof eventi>();
      eventi.forEach((evento) => {
        const key = formatDateKey(evento.dataParsed);
        const list = movimentiByDate.get(key) ?? [];
        list.push(evento);
        movimentiByDate.set(key, list);
      });

      const checkpointMap = new Map<string, Date>();
      movimentiByDate.forEach((value) => {
        if (value.length > 0) {
          const date = value[0].dataParsed;
          checkpointMap.set(formatDateKey(date), date);
        }
      });

      if (tipoInteresse !== 'fisso') {
        rates.forEach((rate) => {
          const rateStart = parseDate(rate.dataInizioValidita);
          if (!rateStart) return;
          if (rateStart.getTime() > start.getTime() && rateStart.getTime() < end.getTime()) {
            checkpointMap.set(formatDateKey(rateStart), rateStart);
          }
        });
      }

      checkpointMap.set(formatDateKey(end), end);
      const checkpoints = Array.from(checkpointMap.values()).sort((a, b) => a.getTime() - b.getTime());

      let cursor = start;
      let currentRate = rateForDate(cursor);

      for (const checkpoint of checkpoints) {
        if (checkpoint > cursor) {
          const giorni = diffDays(cursor, checkpoint);
          const interessiPeriodo = (capitaleResiduo * currentRate * giorni) / 36500;
          totaleInteressi += interessiPeriodo;
          interessiAccumulati += interessiPeriodo;
          cursor = checkpoint;
        }

        const dayKey = formatDateKey(cursor);
        currentRate = rateForDate(cursor);
        const movements = movimentiByDate.get(dayKey) ?? [];
        movements
          .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'credito' ? -1 : 1))
          .forEach((evento) => {
            if (evento.tipo === 'credito') {
              capitaleResiduo += evento.importoVal;
              totaleCreditiAggiuntivi += evento.importoVal;
              return;
            }

            totaleAcconti += evento.importoVal;
            if (applicaArt1194) {
              if (interessiAccumulati >= evento.importoVal) {
                interessiAccumulati -= evento.importoVal;
              } else {
                const residuo = evento.importoVal - interessiAccumulati;
                interessiAccumulati = 0;
                capitaleResiduo = Math.max(capitaleResiduo - residuo, 0);
              }
            } else {
              capitaleResiduo = Math.max(capitaleResiduo - evento.importoVal, 0);
            }
          });
      }

      setResult({
        totaleInteressi: Number(totaleInteressi.toFixed(2)),
        interessiResidui: Number(interessiAccumulati.toFixed(2)),
        capitaleResiduo: Number(capitaleResiduo.toFixed(2)),
        totaleAcconti: Number(totaleAcconti.toFixed(2)),
        totaleCreditiAggiuntivi: Number(totaleCreditiAggiuntivi.toFixed(2)),
        tassoUsato: Number(rateForDate(start).toFixed(2)),
      });
    } catch (err: any) {
      setError(err.message || 'Errore durante il calcolo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BodyPortal>
      <div className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="modal-content max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Interessi & Acconti</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Calcolo interessi con acconti a scalare
            </h2>
          </div>
          <button onClick={onClose} className="wow-button-ghost text-sm">
            Chiudi
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Nota: non è applicato l&apos;anatocismo (interessi sugli interessi).
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Credito iniziale</label>
              <input
                value={capitale}
                onChange={(e) => setCapitale(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="0,00"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Ulteriori crediti intervenuti in tempi successivi possono essere inseriti nei movimenti come &quot;credito&quot;.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data inizio</label>
                <DateField value={dataInizio} onChange={setDataInizio} placeholder="Seleziona data" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data fine</label>
                <DateField value={dataFine} onChange={setDataFine} placeholder="Seleziona data" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Interessi</label>
              <div className="mt-1">
                <CustomSelect
                  options={[
                    { value: 'legale', label: 'Al tasso legale' },
                    { value: 'moratorio', label: 'Moratori' },
                    { value: 'fisso', label: 'A tasso fisso' },
                  ]}
                  value={tipoInteresse}
                  onChange={(value) => setTipoInteresse(value as 'legale' | 'moratorio' | 'fisso')}
                />
              </div>
            </div>

            {tipoInteresse === 'fisso' && (
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tasso fisso (%)</label>
                <input
                  value={tassoFisso}
                  onChange={(e) => setTassoFisso(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                  placeholder="5,00"
                />
              </div>
            )}

            {tipoInteresse === 'moratorio' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={moratorioPre2013}
                    onChange={(e) => setMoratorioPre2013(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>Transazione conclusa entro il 31/12/2012 (maggiorazione previgente 7%).</span>
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={moratorioMaggiorazione}
                    onChange={(e) => setMoratorioMaggiorazione(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span>Maggiorazione per prodotti agricoli e agroalimentari.</span>
                </div>
                {moratorioMaggiorazione && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="min-w-[140px]">
                      <CustomSelect
                        options={[
                          { value: '2', label: '2%' },
                          { value: '4', label: '4%' },
                        ]}
                        value={String(moratorioPctMaggiorazione)}
                        onChange={(value) => setMoratorioPctMaggiorazione(Number(value))}
                      />
                    </div>
                    <span>Dal 4 luglio 2015 è in vigore la maggiorazione al 4%.</span>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={applicaArt1194}
                onChange={(e) => setApplicaArt1194(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>
                Art. 1194 c.c.: gli acconti vengono decurtati prima dagli interessi maturati e poi dal capitale residuo.
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Acconti e ulteriori crediti</h3>
              <button
                type="button"
                onClick={handleAddMovimento}
                disabled={!hasMoreMovimenti}
                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Nuova riga
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Inserisci fino a 40 movimenti. Le date possono essere in qualsiasi ordine: vengono ordinate automaticamente.
            </p>

            {movimenti.map((movimento) => (
              <div key={movimento.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <div className="min-w-[140px]">
                    <CustomSelect
                      options={[
                        { value: 'acconto', label: 'Acconto' },
                        { value: 'credito', label: 'Credito' },
                      ]}
                      value={movimento.tipo}
                      onChange={(value) =>
                        setMovimenti((prev) =>
                          prev.map((item) => (item.id === movimento.id ? { ...item, tipo: value as MovimentoTipo } : item)),
                        )
                      }
                    />
                  </div>
                  <DateField
                    value={movimento.data}
                    onChange={(value) =>
                      setMovimenti((prev) => prev.map((item) => (item.id === movimento.id ? { ...item, data: value } : item)))
                    }
                    placeholder="Data"
                  />
                  <input
                    value={movimento.importo}
                    onChange={(e) =>
                      setMovimenti((prev) => prev.map((item) => (item.id === movimento.id ? { ...item, importo: e.target.value } : item)))
                    }
                    className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-right dark:border-slate-700 dark:bg-slate-900"
                    placeholder="€"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMovimento(movimento.id)}
                    className="ml-auto text-slate-400 hover:text-rose-500"
                    title="Rimuovi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={movimento.descrizione}
                  onChange={(e) =>
                    setMovimenti((prev) => prev.map((item) => (item.id === movimento.id ? { ...item, descrizione: e.target.value } : item)))
                  }
                  className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
                  rows={1}
                  placeholder="Descrizione (opzionale)"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-950/40">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Tasso applicato</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{result.tassoUsato.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Interessi totali</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(result.totaleInteressi)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Interessi residui</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(result.interessiResidui)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Capitale residuo</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(result.capitaleResiduo)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Totale acconti</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(result.totaleAcconti)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Crediti aggiuntivi</p>
                <p className="font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(result.totaleCreditiAggiuntivi)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3 text-[11px] text-slate-500">
          <p>
            Nota: l&apos;applicazione tiene conto dell&apos;art. 1194 c.c. che stabilisce che gli acconti siano decurtati
            in primo luogo dagli interessi maturati fino alla data dell&apos;acconto e in subordine al capitale residuo.
          </p>
          <p>
            Togliendo la spunta dal campo &quot;Art. 1194 c.c.&quot; è possibile decurtare gli acconti interamente dal capitale residuo.
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
            <strong>Avvertenza:</strong> questa applicazione è utilizzabile per un uso non professionale e le informazioni fornite
            si intendono a carattere indicativo. Nonostante l&apos;impegno profuso nell&apos;analisi e nello sviluppo del software
            non è possibile escludere la presenza di errori, per cui si consiglia di controllare sempre i risultati ottenuti.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleCalcola}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Calcolo...' : 'Calcola'}
          </button>
        </div>
        </div>
      </div>
    </BodyPortal>
  );
}
