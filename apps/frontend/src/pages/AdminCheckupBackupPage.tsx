import { useEffect, useState } from 'react';
import { checkupBackupApi, type CheckupBackupInfo, type CheckupBackupStats } from '../api/checkup-backup';
import { Database, Download, Trash2, RefreshCw, Upload, AlertCircle, CheckCircle, HardDrive } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

export default function AdminCheckupBackupPage() {
  const { user } = useAuth();
  const [backups, setBackups] = useState<CheckupBackupInfo[]>([]);
  const [stats, setStats] = useState<CheckupBackupStats | null>(null);
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

  if (user?.ruolo !== 'superadmin') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Accesso negato
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Solo i superadmin possono accedere a questa pagina.
        </p>
      </div>
    );
  }

  useEffect(() => {
    if (user?.ruolo !== 'superadmin') return;
    loadBackups();
  }, [user?.ruolo]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const [backupsData, statsData] = await Promise.all([
        checkupBackupApi.listBackups(),
        checkupBackupApi.getStats(),
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
      await checkupBackupApi.createBackup();
      setSuccess('Backup checkup creato con successo');
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
      await checkupBackupApi.deleteBackup(filename);
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
      await checkupBackupApi.restoreBackup(filename);
      setSuccess('Database checkup ripristinato con successo');
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
      await checkupBackupApi.restoreFromUpload(uploadFile);
      setSuccess('Database checkup ripristinato con successo dal file caricato');
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

  const totalPages = Math.ceil(backups.length / ITEMS_PER_PAGE) || 1;
  const paginatedBackups = backups.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-4 md:p-5">
        <span className="wow-chip">Amministrazione</span>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
          Gestione Backup Checkup
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Crea, scarica e ripristina backup delle tabelle checkup.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wow-panel p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Crea Nuovo Backup
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Crea un backup manuale delle tabelle checkup.
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
            Carica un file .sql per ripristinare le tabelle checkup. Attenzione: questa operazione sovrascrive i dati checkup.
          </p>
          <input
            type="file"
            accept=".sql"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <button
            onClick={handleRestoreFromUpload}
            disabled={!uploadFile || restoring}
            className="wow-button w-full disabled:opacity-50"
          >
            {restoring ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Ripristino in corso...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Ripristina da file
              </>
            )}
          </button>
        </div>
      </div>

      <div className="wow-panel p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
          Backup Disponibili
        </h2>

        <div className="space-y-3">
          {paginatedBackups.map((backup) => (
            <div key={backup.filename} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{backup.filename}</div>
                <div className="text-xs text-slate-500">
                  {formatDate(backup.createdAt)} • {formatBytes(backup.size)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => checkupBackupApi.downloadBackup(backup.filename)}
                  className="wow-button-ghost"
                >
                  <Download className="h-4 w-4" />
                  Scarica
                </button>
                <button
                  onClick={() => setConfirmRestore(backup.filename)}
                  className="wow-button-ghost"
                >
                  <RefreshCw className="h-4 w-4" />
                  Ripristina
                </button>
                <button
                  onClick={() => setConfirmDelete(backup.filename)}
                  className="wow-button-ghost text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </button>
              </div>
            </div>
          ))}

          {backups.length === 0 && (
            <div className="text-center text-sm text-slate-500">
              Nessun backup disponibile.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={backups.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmCreate}
        title="Crea nuovo backup"
        message="Vuoi creare un nuovo backup delle tabelle checkup?"
        confirmText="Crea"
        onConfirm={handleCreateBackup}
        onClose={() => setConfirmCreate(false)}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Elimina backup"
        message="Sei sicuro di voler eliminare questo backup?"
        confirmText="Elimina"
        onConfirm={() => confirmDelete && handleDeleteBackup(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(confirmRestore)}
        title="Ripristina backup"
        message="Questa operazione sovrascriverà le tabelle checkup. Vuoi continuare?"
        confirmText="Ripristina"
        onConfirm={() => confirmRestore && handleRestoreBackup(confirmRestore)}
        onClose={() => setConfirmRestore(null)}
        variant="warning"
      />
    </div>
  );
}
