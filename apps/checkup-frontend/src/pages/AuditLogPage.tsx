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
  Trash2,
  X,
} from 'lucide-react';
import { auditApi, type AuditLogEntry, type AuditLogResponse } from '../api/preassessment';
import { CustomSelect } from '../components/CustomSelect';
import { Pagination } from '../components/Pagination';
import { BodyPortal } from '../components/ui/BodyPortal';
import { DateField } from '../components/ui/DateField';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePreset, setDeletePreset] = useState<'30d' | '90d' | '180d' | '365d' | 'all'>('90d');
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

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

  const handleDeleteLogs = async () => {
    try {
      setDeleting(true);
      let beforeDate: string | undefined;
      if (deletePreset !== 'all') {
        const days = { '30d': 30, '90d': 90, '180d': 180, '365d': 365 }[deletePreset];
        const d = new Date();
        d.setDate(d.getDate() - days);
        beforeDate = d.toISOString();
      }
      const result = await auditApi.cleanupLogs(beforeDate);
      setDeleteResult(result.message);
      setShowDeleteModal(false);
      load();
    } catch (err: any) {
      setError(err?.message || 'Errore durante l\'eliminazione');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
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
    <div className="mx-auto max-w-7xl space-y-6 p-6 wow-stagger">
      {/* Header */}
      <section className="wow-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <span className="wow-chip">Sicurezza</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 dark:text-slate-50">
            Log attività
          </h1>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Storico completo delle azioni eseguite sulla piattaforma.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="wow-button-ghost"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
          <button
            onClick={() => { setDeleteResult(null); setShowDeleteModal(true); }}
            className="wow-button-ghost border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            Elimina log
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="wow-button"
          >
            {exporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Esporta CSV
          </button>
        </div>
        </div>
      </section>

      {deleteResult && (
        <div className="wow-panel flex items-center gap-3 border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-800">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {deleteResult}
          <button onClick={() => setDeleteResult(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showDeleteModal && (
        <BodyPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 flex-shrink-0">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Elimina log attività</h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Seleziona il periodo da eliminare. L'operazione è irreversibile.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-6">
              {([
                ['30d', 'Ultimi 30 giorni'],
                ['90d', 'Ultimi 90 giorni'],
                ['180d', 'Ultimi 6 mesi'],
                ['365d', 'Ultimo anno'],
                ['all', 'Tutti i log'],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 has-[:checked]:border-rose-400 has-[:checked]:bg-rose-50 dark:border-slate-700 dark:hover:bg-slate-800/60">
                  <input
                    type="radio"
                    name="deletePresetAudit"
                    value={value}
                    checked={deletePreset === value}
                    onChange={() => setDeletePreset(value)}
                    className="accent-rose-600"
                  />
                  <span className={`text-sm font-medium ${value === 'all' ? 'text-rose-700' : 'text-slate-700 dark:text-slate-200'}`}>{label}</span>
                  {value === 'all' && <span className="ml-auto text-xs font-semibold text-rose-500">ATTENZIONE</span>}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="wow-button-ghost">
                Annulla
              </button>
              <button
                onClick={handleDeleteLogs}
                disabled={deleting}
                className="wow-button inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}

      {/* Error */}
      {error && (
        <div className="wow-panel border-rose-200 bg-rose-50/80 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <section className="wow-panel p-5 space-y-4 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Filtri</span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-sm font-medium text-indigo-600 hover:underline"
            >
              Azzera filtri
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {/* Email search */}
          <div className="relative md:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Cerca per email utente..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            />
          </div>

          {/* Action */}
          <CustomSelect
            options={ACTION_OPTIONS}
            value={action}
            onChange={setAction}
            className="w-full"
            triggerClassName="rounded-xl border-slate-200 bg-white py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />

          {/* Entity type */}
          <CustomSelect
            options={ENTITY_OPTIONS}
            value={entityType}
            onChange={setEntityType}
            className="w-full"
            triggerClassName="rounded-xl border-slate-200 bg-white py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />

          {/* Date range */}
          <div className="grid grid-cols-1 gap-4 md:col-span-2 xl:col-span-2 xl:grid-cols-[1fr_auto_1fr]">
            <DateField
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Data da"
              className="min-w-0"
            />
            <div className="hidden items-center justify-center text-sm text-slate-400 xl:flex">→</div>
            <DateField
              value={dateTo}
              onChange={setDateTo}
              placeholder="Data a"
              className="min-w-0"
            />
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="wow-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Caricamento log...</span>
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ClipboardList className="mb-4 h-12 w-12 opacity-40" />
            <p className="text-sm">Nessun log trovato con i filtri selezionati</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
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
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
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
      </section>
    </div>
  );
}
