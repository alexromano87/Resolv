import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';
import { CustomSelect } from '../components/CustomSelect';
import { preassessmentApi, type PreassessmentClientEntry } from '../api/preassessment';
import { preassessmentReportApi, type SavedPreassessmentReport } from '../api/reports';
import { useAuth } from '../contexts/AuthContext';

export default function SavedReportsPage() {
  const { user } = useAuth();
  const isStaff = user?.ruolo !== 'cliente';

  const [clients, setClients] = useState<PreassessmentClientEntry[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [reportQuery, setReportQuery] = useState('');
  const [reports, setReports] = useState<SavedPreassessmentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    let active = true;
    setClientsLoading(true);
    preassessmentApi.listClients()
      .then((res) => {
        if (!active) return;
        setClients(res);
      })
      .catch(() => {
        if (!active) return;
        setClients([]);
      })
      .finally(() => {
        if (active) setClientsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isStaff]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({
      value: c.client.id,
      label: c.client.ragioneSociale || c.client.azienda || c.client.nome,
    })),
    [clients],
  );

  const filteredReports = useMemo(() => {
    if (!reportQuery.trim()) return reports;
    const term = reportQuery.toLowerCase();
    return reports.filter((r) =>
      r.filename.toLowerCase().includes(term)
      || new Date(r.createdAt).toLocaleString('it-IT').toLowerCase().includes(term),
    );
  }, [reports, reportQuery]);

  const fetchReports = async () => {
    if (!selectedClientId) {
      setNotice('Seleziona un cliente per cercare i report.');
      return;
    }
    setNotice(null);
    setReportsLoading(true);
    setHasFetched(true);
    try {
      const res = await preassessmentReportApi.listByClient(selectedClientId);
      setReports(res);
      if (res.length === 0) {
        setNotice('Nessun report salvato per questo cliente.');
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Errore nel recupero dei report');
    } finally {
      setReportsLoading(false);
    }
  };

  const handleDownload = async (report: SavedPreassessmentReport) => {
    setNotice(null);
    try {
      const blob = await preassessmentReportApi.download(report.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Errore nel download del report');
    }
  };

  if (!isStaff) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="wow-panel p-6 text-sm text-slate-600">
          Questa sezione è disponibile solo per lo studio.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 wow-stagger">
      <section className="wow-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="wow-chip">Operativita'</span>
            <h1 className="display-font text-3xl font-semibold text-slate-900 dark:text-slate-50">Report salvati</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Cerca, filtra e scarica i report PDF salvati per i clienti del tuo studio.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchReports}
            className="wow-button inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={reportsLoading || !selectedClientId}
          >
            <RefreshCw className={`h-4 w-4 ${reportsLoading ? 'animate-spin' : ''}`} />
            {reportsLoading ? 'Carico...' : 'Aggiorna elenco'}
          </button>
        </div>
      </section>

      <section className="wow-panel p-5 space-y-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cliente</label>
            <CustomSelect
              value={selectedClientId || ''}
              onChange={(val) => setSelectedClientId(val || '')}
              options={clientOptions}
              placeholder={clientsLoading ? 'Caricamento clienti...' : 'Seleziona cliente'}
              triggerClassName="rounded-xl border-slate-200 bg-white py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="wow-button disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={reportsLoading || !selectedClientId}
            >
              {reportsLoading ? 'Carico...' : 'Cerca report'}
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={reportQuery}
            onChange={(e) => setReportQuery(e.target.value)}
            placeholder="Filtra per nome file o data..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          />
        </div>
      </section>

      {notice && (
        <div className="wow-panel flex items-center gap-2 border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700">
          {notice}
        </div>
      )}

      <section className="wow-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Elenco report</h2>
          <span className="text-xs font-semibold text-slate-400">{filteredReports.length} report</span>
        </div>
        <div className="p-6">
          {reportsLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm">Caricamento report...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
              <FileText className="mb-4 h-12 w-12 opacity-40" />
              <p className="text-sm">
                {hasFetched ? 'Nessun report da mostrare con i filtri selezionati.' : 'Seleziona un cliente per visualizzare i report salvati.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <div className="min-w-[220px] space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-50">{report.filename}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Salvato il {new Date(report.createdAt).toLocaleString('it-IT')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(report)}
                    className="wow-button-ghost"
                  >
                    <Download className="h-4 w-4" />
                    Scarica PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
