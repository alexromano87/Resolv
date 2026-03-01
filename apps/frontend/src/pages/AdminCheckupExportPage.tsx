import { useEffect, useState } from 'react';
import { Download, FileDown, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { checkupAdminApi, type CheckupStudio } from '../api/checkupAdmin';
import {
  exportCheckupData,
  exportCheckupBackup,
  CheckupExportFormat,
  CheckupExportEntity,
  CHECKUP_ENTITY_LABELS,
  CHECKUP_FORMAT_LABELS,
} from '../api/checkup-export';

export default function AdminCheckupExportPage() {
  const { user } = useAuth();
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [loadingStudios, setLoadingStudios] = useState(true);

  const [exportType, setExportType] = useState<'selective' | 'backup'>('selective');
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<CheckupExportEntity>(CheckupExportEntity.LICENZIATARI);
  const [selectedFormat, setSelectedFormat] = useState<CheckupExportFormat>(CheckupExportFormat.CSV);

  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperadmin = user?.ruolo === 'superadmin';

  useEffect(() => {
    if (!isSuperadmin) return;
    loadStudios();
  }, [isSuperadmin]);

  const loadStudios = async () => {
    try {
      setLoadingStudios(true);
      const data = await checkupAdminApi.getStudios();
      setStudios(data.filter((studio) => studio.tipo === 'licenziatario'));
    } catch (err) {
      console.error('Errore caricamento studi checkup:', err);
    } finally {
      setLoadingStudios(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    setError(null);
    setSuccess(false);

    try {
      await exportCheckupData({
        entity: selectedEntity,
        format: selectedFormat,
        licenziatarioId: selectedStudioId || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Errore export checkup:', err);
      setError(err.message || 'Errore durante l\'esportazione');
    } finally {
      setExporting(false);
    }
  };

  const handleBackup = async () => {
    setExporting(true);
    setError(null);
    setSuccess(false);

    try {
      await exportCheckupBackup({
        licenziatarioId: selectedStudioId || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Errore backup checkup:', err);
      setError(err.message || 'Errore durante il backup');
    } finally {
      setExporting(false);
    }
  };

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

  const studioOptions = [
    { value: '', label: 'Tutti i licenziatari' },
    ...studios.map((s) => ({
      value: s.id,
      label: s.nome,
      sublabel: s.partitaIva || undefined,
    })),
  ];

  const entityOptions = Object.entries(CHECKUP_ENTITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const formatOptions = Object.entries(CHECKUP_FORMAT_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card space-y-2 p-5 md:p-6">
        <span className="wow-chip">Amministrazione</span>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
          Esportazione Dati Checkup
        </h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Esporta dati checkup in formato CSV, Excel o JSON, oppure crea un backup completo.
        </p>
      </div>

      {success && (
        <div className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Export completato con successo! Il file è stato scaricato.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="wow-panel p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">
          Tipo di Esportazione
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setExportType('selective')}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              exportType === 'selective'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            <FileDown className={`h-8 w-8 mb-3 ${exportType === 'selective' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <h3 className="text-lg font-semibold">Esportazione Selettiva</h3>
            <p className="text-sm text-slate-500">Seleziona entità e formato da esportare</p>
          </button>

          <button
            onClick={() => setExportType('backup')}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              exportType === 'backup'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            <Database className={`h-8 w-8 mb-3 ${exportType === 'backup' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <h3 className="text-lg font-semibold">Backup Completo</h3>
            <p className="text-sm text-slate-500">Esporta tutte le tabelle checkup in JSON</p>
          </button>
        </div>
      </div>

      <div className="wow-panel p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Licenziatario</label>
            <CustomSelect
              value={selectedStudioId}
              onChange={setSelectedStudioId}
              options={studioOptions}
              disabled={loadingStudios}
            />
          </div>
          {exportType === 'selective' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Entità</label>
                <CustomSelect
                  value={selectedEntity}
                  onChange={(value) => setSelectedEntity(value as CheckupExportEntity)}
                  options={entityOptions}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Formato</label>
                <CustomSelect
                  value={selectedFormat}
                  onChange={(value) => setSelectedFormat(value as CheckupExportFormat)}
                  options={formatOptions}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={exportType === 'backup' ? handleBackup : handleExportData}
            disabled={exporting}
            className="wow-button disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Elaborazione...' : exportType === 'backup' ? 'Scarica backup' : 'Esporta dati'}
          </button>
        </div>
      </div>
    </div>
  );
}
