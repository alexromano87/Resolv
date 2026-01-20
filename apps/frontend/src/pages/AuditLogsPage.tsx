import { useEffect, useState } from 'react';
import {
  auditLogsApi,
  type AuditLog,
  type AuditLogFilters,
  type AuditLogStats,
  type AuditAction,
  type AuditEntity,
} from '../api/audit-logs';
import { Download, FileText, AlertCircle, CheckCircle, XCircle, Filter, X } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DateField } from '../components/ui/DateField';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters | null>(null);

  // Filtri
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 10,
  });

  useEffect(() => {
    if (!appliedFilters) return;
    loadLogs(appliedFilters);
    loadStats(appliedFilters);
  }, [appliedFilters]);

  const loadLogs = async (activeFilters: AuditLogFilters) => {
    try {
      setLoading(true);
      setError(null);
      const response = await auditLogsApi.getLogs(activeFilters);
      setLogs(response.logs);
      setTotal(response.total);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dei log');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (activeFilters: AuditLogFilters) => {
    try {
      const { userId, studioId, startDate, endDate } = activeFilters;
      const response = await auditLogsApi.getStats({ userId, studioId, startDate, endDate });
      setStats(response);
    } catch (err: any) {
      console.error('Errore nel caricamento delle statistiche:', err);
    }
  };

  const handleExport = async () => {
    if (!appliedFilters) {
      setError('Applica i filtri e carica i log prima di esportare.');
      return;
    }
    try {
      setExporting(true);
      const blob = await auditLogsApi.exportLogs(appliedFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'esportazione');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handleLoadLogs = () => {
    setAppliedFilters({
      ...filters,
      page: 1,
      limit: 10,
    });
  };

  const clearFilters = () => {
    setFilters({
      limit: 10,
    });
    setAppliedFilters(null);
    setLogs([]);
    setTotal(0);
    setPage(1);
    setTotalPages(0);
    setStats(null);
  };

  const getActionBadgeColor = (action: AuditAction) => {
    const colors: Record<string, string> = {
      LOGIN: 'bg-blue-100 text-blue-800',
      LOGOUT: 'bg-slate-100 text-slate-800',
      LOGIN_FAILED: 'bg-rose-100 text-rose-800',
      CREATE: 'bg-indigo-100 text-indigo-800',
      UPDATE: 'bg-amber-100 text-amber-800',
      DELETE: 'bg-rose-100 text-rose-800',
      TOGGLE_ACTIVE: 'bg-blue-100 text-blue-800',
      EXPORT: 'bg-indigo-100 text-indigo-800',
      DOWNLOAD: 'bg-indigo-100 text-indigo-800',
      UPLOAD: 'bg-indigo-100 text-indigo-800',
    };
    return colors[action] || 'bg-slate-100 text-slate-800';
  };

  const getActionLabel = (action: AuditAction) => {
    const labels: Record<AuditAction, string> = {
      LOGIN: 'Login',
      LOGOUT: 'Logout',
      LOGIN_FAILED: 'Login Fallito',
      CREATE: 'Creazione',
      UPDATE: 'Modifica',
      DELETE: 'Eliminazione',
      TOGGLE_ACTIVE: 'Attivazione/Disattivazione',
      RESET_PASSWORD: 'Reset Password',
      CHANGE_PASSWORD: 'Cambio Password',
      ASSIGN_STUDIO: 'Assegnazione Studio',
      EXPORT: 'Esportazione',
      IMPORT: 'Importazione',
      DOWNLOAD: 'Download',
      UPLOAD: 'Upload',
    };
    return labels[action] || action;
  };

  const getEntityLabel = (entity: AuditEntity) => {
    const labels: Record<AuditEntity, string> = {
      USER: 'Utente',
      STUDIO: 'Studio',
      CLIENTE: 'Cliente',
      DEBITORE: 'Debitore',
      PRATICA: 'Pratica',
      AVVOCATO: 'Avvocato',
      MOVIMENTO_FINANZIARIO: 'Movimento Finanziario',
      ALERT: 'Alert',
      TICKET: 'Ticket',
      DOCUMENTO: 'Documento',
      CARTELLA: 'Cartella',
      FASE: 'Fase',
    };
    return labels[entity] || entity;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Caricamento log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <span className="wow-chip">Audit</span>
          <h1 className="mt-3 text-2xl font-semibold display-font text-slate-900">Log di Audit</h1>
          <p className="mt-2 text-sm text-slate-600">Registro completo delle attività della piattaforma</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="wow-button-ghost"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Nascondi Filtri' : 'Mostra Filtri'}
          </button>
          <button
            onClick={handleLoadLogs}
            className="wow-button-ghost"
          >
            Carica log
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !appliedFilters}
            className="wow-button disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Esportazione...' : 'Esporta CSV'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Statistiche */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="wow-panel p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Totale Log</h3>
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>

          <div className="wow-panel p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Operazioni Riuscite</h3>
              <CheckCircle className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-600">{stats.successCount}</div>
            <p className="text-xs text-slate-500">
              {stats.total > 0 ? ((stats.successCount / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>

          <div className="wow-panel p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Operazioni Fallite</h3>
              <XCircle className="h-5 w-5 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600">{stats.failureCount}</div>
            <p className="text-xs text-slate-500">
              {stats.total > 0 ? ((stats.failureCount / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Filtri */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Filtri</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Pulisci Filtri
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-1">Azione</label>
              <CustomSelect
                options={[
                  { value: '', label: 'Tutte' },
                  { value: 'LOGIN', label: 'Login' },
                  { value: 'LOGOUT', label: 'Logout' },
                  { value: 'LOGIN_FAILED', label: 'Login Fallito' },
                  { value: 'CREATE', label: 'Creazione' },
                  { value: 'UPDATE', label: 'Modifica' },
                  { value: 'DELETE', label: 'Eliminazione' },
                  { value: 'TOGGLE_ACTIVE', label: 'Attivazione/Disattivazione' },
                  { value: 'EXPORT', label: 'Esportazione' },
                  { value: 'DOWNLOAD', label: 'Download' },
                  { value: 'UPLOAD', label: 'Upload' },
                ]}
                value={filters.action || ''}
                onChange={(value) => handleFilterChange('action', value as AuditAction)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Entità</label>
              <CustomSelect
                options={[
                  { value: '', label: 'Tutte' },
                  { value: 'USER', label: 'Utente' },
                  { value: 'STUDIO', label: 'Studio' },
                  { value: 'CLIENTE', label: 'Cliente' },
                  { value: 'DEBITORE', label: 'Debitore' },
                  { value: 'PRATICA', label: 'Pratica' },
                  { value: 'AVVOCATO', label: 'Avvocato' },
                  { value: 'MOVIMENTO_FINANZIARIO', label: 'Movimento Finanziario' },
                  { value: 'ALERT', label: 'Alert' },
                  { value: 'TICKET', label: 'Ticket' },
                  { value: 'DOCUMENTO', label: 'Documento' },
                ]}
                value={filters.entityType || ''}
                onChange={(value) => handleFilterChange('entityType', value as AuditEntity)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data Inizio</label>
              <DateField
                value={filters.startDate || ''}
                onChange={(value) => handleFilterChange('startDate', value)}
                placeholder="Seleziona data inizio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data Fine</label>
              <DateField
                value={filters.endDate || ''}
                onChange={(value) => handleFilterChange('endDate', value)}
                placeholder="Seleziona data fine"
                min={filters.startDate}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Esito</label>
              <CustomSelect
                options={[
                  { value: '', label: 'Tutti' },
                  { value: 'true', label: 'Riuscito' },
                  { value: 'false', label: 'Fallito' },
                ]}
                value={filters.success === undefined ? '' : filters.success ? 'true' : 'false'}
                onChange={(value) => handleFilterChange('success', value === '' ? undefined : value === 'true')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ricerca</label>
              <input
                type="text"
                placeholder="Cerca in descrizione, entità, email..."
                className="w-full p-2 border rounded"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleLoadLogs}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
            >
              Carica log
            </button>
          </div>
        </div>
      )}

      {/* Tabella Log */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            Log di Audit ({total} totali)
          </h2>
        </div>

        {!appliedFilters ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Imposta i filtri e clicca su “Carica log” per visualizzare i risultati.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full wow-stagger-rows">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-slate-700">Data/Ora</th>
                    <th className="text-left p-4 font-medium text-slate-700">Utente</th>
                    <th className="text-left p-4 font-medium text-slate-700">Azione</th>
                    <th className="text-left p-4 font-medium text-slate-700">Entità</th>
                    <th className="text-left p-4 font-medium text-slate-700">Descrizione</th>
                    <th className="text-center p-4 font-medium text-slate-700">Esito</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-slate-50">
                      <td className="p-4 text-sm">
                        {new Date(log.createdAt).toLocaleString('it-IT')}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {log.user ? (
                            <>
                              <p className="font-medium">
                                {log.user.nome} {log.user.cognome}
                              </p>
                              <p className="text-slate-500 text-xs">{log.user.email}</p>
                            </>
                          ) : (
                            <p className="text-slate-500">{log.userEmail || 'Sistema'}</p>
                          )}
                          {log.userRole && (
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">{log.userRole}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="font-medium">{getEntityLabel(log.entityType)}</p>
                          {log.entityName && (
                            <p className="text-slate-500 text-xs">{log.entityName}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm max-w-md">
                        <p className="truncate">{log.description || '-'}</p>
                        {log.errorMessage && (
                          <p className="text-rose-600 text-xs mt-1">{log.errorMessage}</p>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {log.success ? (
                          <CheckCircle className="h-5 w-5 text-indigo-500 inline" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-500 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={10}
              onPageChange={(nextPage) =>
                setAppliedFilters((prev) => (prev ? { ...prev, page: nextPage, limit: 10 } : prev))
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
