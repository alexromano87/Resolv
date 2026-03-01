import { useEffect, useState } from 'react';
import { Upload, FileUp, AlertCircle, Download } from 'lucide-react';
import { CustomSelect } from '../components/ui/CustomSelect';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  importCheckupBackup,
  importCheckupCsv,
  type CheckupImportEntity,
  type BackupImportResult,
  type ImportResult,
  CHECKUP_IMPORT_LABELS,
} from '../api/checkup-import';
import { checkupAdminApi, type CheckupStudio } from '../api/checkupAdmin';
import { useAuth } from '../contexts/AuthContext';

type ResultState =
  | { type: 'backup'; payload: BackupImportResult }
  | { type: 'csv'; payload: ImportResult };

export default function AdminCheckupImportPage() {
  const { user } = useAuth();
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvEntity, setCsvEntity] = useState<CheckupImportEntity>('licenziatari');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [confirmBackupImport, setConfirmBackupImport] = useState(false);
  const [confirmCsvImport, setConfirmCsvImport] = useState(false);
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [selectedStudioId, setSelectedStudioId] = useState<string>('');
  const [loadingStudios, setLoadingStudios] = useState(false);

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

  const csvColumns: Record<CheckupImportEntity, string[]> = {
    licenziatari: [
      'id',
      'nome',
      'tipo',
      'ragioneSociale',
      'partitaIva',
      'codiceFiscale',
      'indirizzo',
      'citta',
      'provincia',
      'cap',
      'paese',
      'email',
      'telefono',
      'sitoWeb',
      'logoUrl',
      'note',
      'attivo',
    ],
    sublicenziatari: [
      'id',
      'nome',
      'ragioneSociale',
      'partitaIva',
      'codiceFiscale',
      'indirizzo',
      'citta',
      'provincia',
      'cap',
      'paese',
      'email',
      'telefono',
      'sitoWeb',
      'logoUrl',
      'note',
      'attivo',
    ],
    utenti: [
      'id',
      'email',
      'password',
      'nome',
      'cognome',
      'ruolo',
      'studioId',
      'clientId',
      'sublicenseId',
      'azienda',
      'macroAreaOwner',
      'attivo',
    ],
    licenze: [
      'id',
      'studioId',
      'modelId',
      'modelIds',
      'intestatario',
      'tipo',
      'numeroUtenze',
      'numeroSottolicenze',
      'numeroLicenza',
      'dataInizioValidita',
      'dataScadenza',
    ],
    sublicenze: [
      'id',
      'licenseId',
      'modelId',
      'clienteStudioId',
      'clientId',
      'numeroSublicenza',
      'tipo',
      'numeroUtenze',
      'dataInizioValidita',
      'dataScadenza',
      'attiva',
      'allowDocuments',
    ],
    risposte: [
      'id',
      'userId',
      'clientId',
      'data',
      'notes',
      'fieldNotes',
      'userFieldNotes',
      'naFields',
      'macroValidations',
      'sectionValidations',
      'fieldMeta',
      'status',
      'completedAt',
      'completedById',
      'studioCanEdit',
      'version',
      'parentId',
      'isLatest',
    ],
    domande: [
      'modelId',
      'modelCode',
      'modelLabel',
      'macroCode',
      'macroLabel',
      'macroColor',
      'macroSortOrder',
      'sectionCode',
      'sectionTitle',
      'sectionDescription',
      'sectionSortOrder',
      'fieldId',
      'label',
      'type',
      'options',
      'required',
      'help',
      'allowDocuments',
      'weight',
      'sortOrder',
    ],
  };

  const downloadCsvTemplate = (entity: CheckupImportEntity) => {
    const headers = csvColumns[entity].join(',');
    const blob = new Blob([`${headers}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_checkup_${entity}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleBackupImport = async () => {
    if (!backupFile) {
      setError('Seleziona un file JSON di backup');
      return;
    }
    setIsImporting(true);
    setError(null);
    setConfirmBackupImport(false);
    try {
      const payload = await importCheckupBackup(backupFile, selectedStudioId || undefined);
      setResult({ type: 'backup', payload });
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'import del backup');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      setError('Seleziona un file CSV');
      return;
    }
    setIsImporting(true);
    setError(null);
    setConfirmCsvImport(false);
    try {
      const payload = await importCheckupCsv(csvEntity, csvFile, selectedStudioId || undefined);
      setResult({ type: 'csv', payload });
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'import CSV');
    } finally {
      setIsImporting(false);
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

  const csvOptions = Object.entries(CHECKUP_IMPORT_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card space-y-2 p-5 md:p-6">
        <span className="wow-chip">Amministrazione</span>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
          Importazione Dati Checkup
        </h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Carica un backup JSON completo oppure importa singole entità da CSV.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="wow-panel p-6">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">Licenziatario</label>
          <CustomSelect
            value={selectedStudioId}
            onChange={setSelectedStudioId}
            options={studioOptions}
            disabled={loadingStudios}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wow-panel p-6 space-y-5">
          <div className="flex items-center gap-3">
            <FileUp className="h-6 w-6 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Import Backup JSON
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ripristina tutte le tabelle checkup dal file di backup.
              </p>
            </div>
          </div>

          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />

          <button
            onClick={() => setConfirmBackupImport(true)}
            disabled={!backupFile || isImporting}
            className="wow-button w-full disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? 'Importazione...' : 'Importa Backup'}
          </button>
        </div>

        <div className="wow-panel p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Import CSV
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Importa una singola entità da CSV.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Entità</label>
            <CustomSelect
              value={csvEntity}
              onChange={(value) => setCsvEntity(value as CheckupImportEntity)}
              options={csvOptions}
            />
          </div>

          <button
            onClick={() => downloadCsvTemplate(csvEntity)}
            className="wow-button-ghost"
          >
            <Download className="h-4 w-4" />
            Scarica template CSV
          </button>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />

          <button
            onClick={() => setConfirmCsvImport(true)}
            disabled={!csvFile || isImporting}
            className="wow-button w-full disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? 'Importazione...' : 'Importa CSV'}
          </button>
        </div>
      </div>

      {result && (
        <div className="wow-panel p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Risultato Importazione</h3>
          {result.type === 'backup' && (
            <div className="space-y-3">
              {Object.entries(result.payload.results).map(([entity, summary]) => (
                <div key={entity} className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-700">{entity}</div>
                  <div className="text-sm text-slate-500">
                    Totali: {summary.total} | Importati: {summary.imported} | Scartati: {summary.skipped}
                  </div>
                </div>
              ))}
            </div>
          )}
          {result.type === 'csv' && (
            <div className="text-sm text-slate-500">
              Totali: {result.payload.total} | Importati: {result.payload.imported} | Scartati: {result.payload.skipped}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmBackupImport}
        title="Conferma import backup"
        message="Questa operazione può sovrascrivere dati esistenti. Vuoi continuare?"
        confirmText="Importa"
        onConfirm={handleBackupImport}
        onClose={() => setConfirmBackupImport(false)}
        variant="warning"
      />
      <ConfirmDialog
        isOpen={confirmCsvImport}
        title="Conferma import CSV"
        message="Vuoi importare i dati dal file CSV selezionato?"
        confirmText="Importa"
        onConfirm={handleCsvImport}
        onClose={() => setConfirmCsvImport(false)}
        variant="warning"
      />
    </div>
  );
}
