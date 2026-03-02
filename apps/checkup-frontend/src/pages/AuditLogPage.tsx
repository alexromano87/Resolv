// apps/checkup-frontend/src/pages/AuditLogPage.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Filter,
  ClipboardList,
} from 'lucide-react';
import { auditApi, type AuditLogEntry, type AuditLogResponse } from '../api/preassessment';
import { Pagination } from '../components/Pagination';

const ITEMS_PER_PAGE = 50;

const ACTION_OPTIONS = [
  { value: '', label: 'Tutte le azioni' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'LOGIN_FAILED', label: 'Login fallito' },
  { value: 'PREASSESSMENT_UPDATE', label: 'Aggiornamento preassessment' },
  { value: 'PREASSESSMENT_COMPLETE', label: 'Completamento preassessment' },
  { value: 'TICKET_CREATE', label: 'Creazione ticket' },
  { value: 'TICKET_REPLY', label: 'Risposta ticket' },
  { value: 'ALERT_CREATE', label: 'Creazione alert' },
  { value: 'DOCUMENT_UPLOAD', label: 'Caricamento documento' },
  { value: 'DOCUMENT_DELETE', label: 'Eliminazione documento' },
  { value: 'USER_CREATE', label: 'Creazione utente' },
  { value: 'USER_UPDATE', label: 'Aggiornamento utente' },
  { value: 'BACKUP_CREATE', label: 'Creazione backup' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'Tutte le entità' },
  { value: 'preassessment', label: 'Preassessment' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'alert', label: 'Alert' },
  { value: 'document', label: 'Documento' },
  { value: 'user', label: 'Utente' },
  { value: 'backup', label: 'Backup' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-slate-400 text-xs italic">—</span>;
  const map: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700',
    admin_studio: 'bg-indigo-100 text-indigo-700',
    consulente: 'bg-blue-100 text-blue-700',
    cliente: 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[role] ?? 'bg-slate-100 text-slate-600'}`}>
      {role}
    </span>
  );
}

export function AuditLogPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchEmail, setSearchEmail] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Debounced email search
  const [emailDebounced, setEmailDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setEmailDebounced(searchEmail), 400);
    return () => clearTimeout(t);
  }, [searchEmail]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof auditApi.getLogs>[0] = {
        page,
        limit: ITEMS_PER_PAGE,
      };
      if (emailDebounced) params.userId = emailDebounced; // backend can accept email too
      if (action) params.action = action;
      if (entityType) params.entityType = entityType;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const result = await auditApi.getLogs(params);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Errore nel caricamento dei log');
    } finally {
      setLoading(false);
    }
  }, [page, emailDebounced, action, entityType, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [emailDebounced, action, entityType, dateFrom, dateTo]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await auditApi.exportCsv({
        userId: emailDebounced || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Errore durante l\'esportazione CSV');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearchEmail('');
    setAction('');
    setEntityType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = !!(searchEmail || action || entityType || dateFrom || dateTo);

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="flex flex-col gap-4 p-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <span className="wow-chip">Sicurezza</span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            Log attività
          </h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Storico completo delle azioni eseguite sulla piattaforma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white/80 rounded-full border border-slate-200 hover:bg-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {exporting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Esporta CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="wow-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filtri</span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-[11px] text-indigo-600 hover:underline"
            >
              Azzera filtri
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          {/* Email search */}
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Cerca per email utente..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Action */}
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Entity type */}
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              title="Data da"
            />
            <span className="text-slate-400 text-xs">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              title="Data a"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="wow-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Caricamento log...</span>
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-xs">Nessun log trovato con i filtri selezionati</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Data / Ora</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Utente</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Ruolo</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Azione</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Entità</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Descrizione</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-500 dark:text-slate-400">Esito</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log: AuditLogEntry, idx) => (
                    <tr
                      key={log.id}
                      className={`border-b border-slate-50 dark:border-slate-800 transition-colors hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 ${
                        idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/20'
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {log.userEmail || <span className="text-slate-400 italic">Sistema</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RoleBadge role={log.userRole} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded px-1.5 py-0.5">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {log.entityType}
                        {log.entityName && (
                          <span className="ml-1 text-slate-400 dark:text-slate-500">· {log.entityName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[220px]">
                        <p className="truncate" title={log.description ?? undefined}>
                          {log.success
                            ? (log.description || '—')
                            : <span className="text-rose-600 dark:text-rose-400">{log.errorMessage || log.description || '—'}</span>
                          }
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-400">
                {data.total} record totali
              </span>
              <Pagination
                currentPage={page}
                totalPages={data.totalPages}
                totalItems={data.total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
