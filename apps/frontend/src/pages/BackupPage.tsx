import { useEffect, useState } from 'react';
import { backupApi, type BackupInfo, type BackupStats } from '../api/backup';
import { Database, Download, Trash2, RefreshCw, Upload, AlertCircle, CheckCircle, HardDrive } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const [backupsData, statsData] = await Promise.all([
        backupApi.listBackups(),
        backupApi.getStats(),
      ]);
      setBackups(backupsData);
      setStats(statsData);
      setError(null);
    } catch (err: any) {
      setError('Errore nel caricamento dei backup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);
      setConfirmCreate(false);
      await backupApi.createBackup();
      setSuccess('Backup creato con successo');
      await loadBackups();
    } catch (err: any) {
      setError(err.message || 'Errore nella creazione del backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      setError(null);
      setSuccess(null);
      await backupApi.deleteBackup(filename);
      setSuccess('Backup eliminato con successo');
      await loadBackups();
    } catch (err: any) {
      setError(err.message || 'Errore nell\'eliminazione del backup');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    try {
      setRestoring(true);
      setError(null);
      setSuccess(null);
      await backupApi.restoreBackup(filename);
      setSuccess('Database ripristinato con successo');
    } catch (err: any) {
      setError(err.message || 'Errore nel ripristino del backup');
    } finally {
      setRestoring(false);
      setConfirmRestore(null);
    }
  };

  const handleRestoreFromUpload = async () => {
    if (!uploadFile) return;

    try {
      setRestoring(true);
      setError(null);
      setSuccess(null);
      await backupApi.restoreFromUpload(uploadFile);
      setSuccess('Database ripristinato con successo dal file caricato');
      setUploadFile(null);
      await loadBackups();
    } catch (err: any) {
      setError(err.message || 'Errore nel ripristino del backup');
    } finally {
      setRestoring(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Caricamento backup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-4 md:p-5">
        <span className="wow-chip">Amministrazione</span>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
          Gestione Backup Database
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Crea, scarica e ripristina backup del database MySQL
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center gap-2 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-2xl flex items-center gap-2 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400">
          <CheckCircle className="h-5 w-5" />
          <p>{success}</p>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="wow-panel p-6">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Totale Backup</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stats.totalBackups}</p>
              </div>
            </div>
          </div>
          <div className="wow-panel p-6">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Spazio Occupato</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{formatBytes(stats.totalSize)}</p>
              </div>
            </div>
          </div>
          <div className="wow-panel p-6">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Backup Più Recente</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50 mt-1">
                {stats.newestBackup ? formatDate(stats.newestBackup) : 'N/D'}
              </p>
            </div>
          </div>
          <div className="wow-panel p-6">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Backup Più Vecchio</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50 mt-1">
                {stats.oldestBackup ? formatDate(stats.oldestBackup) : 'N/D'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wow-panel p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Crea Nuovo Backup
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Crea un backup manuale del database. I backup vengono creati automaticamente ogni 24 ore.
          </p>
          <button
            onClick={() => setConfirmCreate(true)}
            disabled={creating}
            className="wow-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Creazione in corso...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Crea Backup
              </>
            )}
          </button>
        </div>

        <div className="wow-panel p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Ripristina da File
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Carica un file .sql per ripristinare il database. Attenzione: questa operazione sovrascrive tutti i dati.
          </p>
          <input
            type="file"
            accept=".sql"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300 dark:file:bg-indigo-900/30 dark:file:text-indigo-200"
          />
          <button
            onClick={handleRestoreFromUpload}
            disabled={!uploadFile || restoring}
            className="wow-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {restoring ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Ripristino in corso...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Ripristina da File
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="wow-panel">
        <div className="p-6 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Lista Backup Disponibili
          </h2>
          <button
            onClick={loadBackups}
            className="text-sm px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          {backups.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun backup disponibile</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {backups
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((backup) => (
                    <div
                      key={backup.filename}
                      className="flex items-center justify-between p-4 border border-slate-200/70 rounded-lg hover:bg-slate-50/50 dark:border-slate-700/70 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-50">{backup.filename}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(backup.createdAt)} • {formatBytes(backup.size)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => backupApi.downloadBackup(backup.filename)}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800"
                          title="Scarica"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmRestore(backup.filename)}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800"
                          title="Ripristina"
                          disabled={restoring}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(backup.filename)}
                          className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              {backups.length > ITEMS_PER_PAGE && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(backups.length / ITEMS_PER_PAGE)}
                    totalItems={backups.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Conferma Eliminazione"
        message={`Sei sicuro di voler eliminare il backup "${confirmDelete}"? Questa operazione è irreversibile.`}
        onConfirm={() => confirmDelete && handleDeleteBackup(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        confirmText="Elimina"
        cancelText="Annulla"
        variant="danger"
      />

      {/* Confirm Restore Dialog */}
      <ConfirmDialog
        isOpen={confirmRestore !== null}
        title="Conferma Ripristino"
        message={`Sei sicuro di voler ripristinare il database da "${confirmRestore}"? Tutti i dati attuali saranno sovrascritti. Questa operazione è irreversibile.`}
        onConfirm={() => confirmRestore && handleRestoreBackup(confirmRestore)}
        onClose={() => setConfirmRestore(null)}
        confirmText="Ripristina"
        cancelText="Annulla"
        variant="danger"
      />

      {/* Confirm Create Backup Dialog */}
      <ConfirmDialog
        isOpen={confirmCreate}
        title="Conferma Creazione Backup"
        message="Sei sicuro di voler creare un nuovo backup del database? L'operazione potrebbe richiedere alcuni minuti."
        onConfirm={handleCreateBackup}
        onClose={() => setConfirmCreate(false)}
        confirmText="Crea Backup"
        cancelText="Annulla"
        variant="info"
      />
    </div>
  );
}
