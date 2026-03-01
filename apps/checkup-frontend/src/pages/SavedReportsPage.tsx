import { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
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
      <div className="max-w-5xl mx-auto p-6">
        <div className="wow-panel p-6 text-sm text-slate-600">
          Questa sezione è disponibile solo per lo studio.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8">
        <div className="space-y-2">
          <div className="wow-chip">Report salvati</div>
          <h1 className="display-font text-3xl font-semibold text-slate-900">Archivio report</h1>
          <p className="text-sm text-slate-600">
            Cerca e scarica i report PDF salvati per i clienti del tuo studio.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-600">Cliente</label>
            <CustomSelect
              value={selectedClientId || ''}
              onChange={(val) => setSelectedClientId(val || '')}
              options={clientOptions}
              placeholder={clientsLoading ? 'Caricamento clienti...' : 'Seleziona cliente'}
              triggerClassName="rounded-xl border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="wow-button"
              disabled={reportsLoading || !selectedClientId}
            >
              {reportsLoading ? 'Carico...' : 'Cerca report'}
            </button>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Search className="h-4 w-4" />
          <input
            type="text"
            value={reportQuery}
            onChange={(e) => setReportQuery(e.target.value)}
            placeholder="Filtra per nome file o data..."
            className="flex-1 bg-transparent outline-none"
          />
        </div>
      </div>

      {notice && (
        <div className="wow-panel border-amber-200 bg-amber-50/80 p-4 text-amber-700 flex items-center gap-2">
          {notice}
        </div>
      )}

      <div className="wow-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Elenco report</h2>
          <span className="text-xs font-semibold text-slate-400">{filteredReports.length} report</span>
        </div>
        <div className="mt-4 space-y-3">
          {filteredReports.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Nessun report da mostrare.
            </div>
          )}
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
            >
              <div className="min-w-[220px]">
                <div className="font-semibold text-slate-800">{report.filename}</div>
                <div className="text-xs text-slate-400">
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
      </div>
    </div>
  );
}
