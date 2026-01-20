// apps/frontend/src/pages/ImportDatiPage.tsx
import { useState } from 'react';
import { Upload, FileUp, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { importBackup, importCsv, type ImportCsvEntity, type BackupImportResult, type ImportResult } from '../api/import';

type ResultState =
  | { type: 'backup'; payload: BackupImportResult }
  | { type: 'csv'; payload: ImportResult };

export function ImportDatiPage() {
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvEntity, setCsvEntity] = useState<ImportCsvEntity>('clienti');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  // Confirmation dialogs
  const [confirmBackupImport, setConfirmBackupImport] = useState(false);
  const [confirmCsvImport, setConfirmCsvImport] = useState(false);

  const csvColumns: Record<ImportCsvEntity, string[]> = {
    clienti: [
      'id',
      'studioId',
      'ragioneSociale',
      'email',
      'partitaIva',
      'codiceFiscale',
      'telefono',
      'pec',
      'sedeLegale',
      'sedeOperativa',
      'indirizzo',
      'cap',
      'citta',
      'provincia',
      'nazione',
      'tipologia',
      'referente',
      'attivo',
    ],
    debitori: [
      'id',
      'studioId',
      'tipoSoggetto',
      'nome',
      'cognome',
      'ragioneSociale',
      'email',
      'partitaIva',
      'codiceFiscale',
      'telefono',
      'pec',
      'dataNascita',
      'luogoNascita',
      'sedeLegale',
      'sedeOperativa',
      'indirizzo',
      'cap',
      'citta',
      'provincia',
      'nazione',
      'tipologia',
      'referente',
      'attivo',
    ],
    users: [
      'id',
      'email',
      'password',
      'nome',
      'cognome',
      'ruolo',
      'clienteId',
      'studioId',
      'attivo',
    ],
    avvocati: [
      'id',
      'attivo',
      'studioId',
      'nome',
      'cognome',
      'codiceFiscale',
      'email',
      'telefono',
      'livelloAccessoPratiche',
      'livelloPermessi',
      'note',
    ],
    pratiche: [
      'id',
      'attivo',
      'clienteId',
      'studioId',
      'debitoreId',
      'numeroPratica',
      'faseId',
      'aperta',
      'esito',
      'capitale',
      'importoRecuperatoCapitale',
      'anticipazioni',
      'importoRecuperatoAnticipazioni',
      'compensiLegali',
      'compensiLiquidati',
      'interessi',
      'interessiRecuperati',
      'note',
      'riferimentoCredito',
      'dataAffidamento',
      'dataChiusura',
      'dataScadenza',
    ],
  };

  const downloadCsvTemplate = (entity: ImportCsvEntity) => {
    const headers = csvColumns[entity].join(',');
    const blob = new Blob([`${headers}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${entity}.csv`;
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
      const payload = await importBackup(backupFile);
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
      const payload = await importCsv(csvEntity, csvFile);
      setResult({ type: 'csv', payload });
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'import CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const csvOptions = [
    { value: 'clienti', label: 'Clienti' },
    { value: 'debitori', label: 'Debitori' },
    { value: 'users', label: 'Utenti' },
    { value: 'avvocati', label: 'Avvocati' },
    { value: 'pratiche', label: 'Pratiche' },
  ];

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card space-y-2 p-5 md:p-6">
        <span className="wow-chip">Amministrazione</span>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
          Importazione Dati
        </h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Carica un backup JSON completo oppure importa clienti, debitori, utenti, avvocati e pratiche da CSV.
          I record duplicati vengono ignorati automaticamente.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="wow-panel p-6 space-y-5">
          <div className="flex items-center gap-3">
            <FileUp className="h-6 w-6 text-indigo-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Import Backup JSON
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ripristina tutte le tabelle dal file di backup.
              </p>
            </div>
          </div>

          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300 dark:file:bg-indigo-900/30 dark:file:text-indigo-200"
          />

          <button
            onClick={() => setConfirmBackupImport(true)}
            disabled={isImporting}
            className="wow-button disabled:opacity-50 disabled:cursor-not-allowed"
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
                Importa clienti, debitori, utenti, avvocati o pratiche da file CSV.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <CustomSelect
              options={csvOptions}
              value={csvEntity}
              onChange={(value) => setCsvEntity(value as ImportCsvEntity)}
              placeholder="Seleziona tabella..."
            />
            <input
              type="file"
              accept=".csv,.xml,text/csv,application/xml"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300 dark:file:bg-indigo-900/30 dark:file:text-indigo-200"
            />
          </div>

          <button
            onClick={() => setConfirmCsvImport(true)}
            disabled={isImporting}
            className="wow-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? 'Importazione...' : 'Importa CSV'}
          </button>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Guida CSV
            </p>
            <p className="mt-1">
              Colonne supportate (ordine libero). I record duplicati vengono automaticamente ignorati.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {csvColumns[csvEntity].map((col) => (
                <span
                  key={col}
                  className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200"
                >
                  {col}
                </span>
              ))}
            </div>
            <button
              onClick={() => downloadCsvTemplate(csvEntity)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <Download className="h-4 w-4" />
              Scarica template CSV ({csvEntity})
            </button>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              `tipoSoggetto` deve essere `persona_fisica` o `persona_giuridica`. `attivo` accetta true/false o 1/0.
            </p>
          </div>
        </div>
      </div>

      {result && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 text-indigo-600">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Import completato
              </h3>
            </div>

            <div className="mt-4 flex-1 overflow-auto space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {result.type === 'csv' ? (
                <>
                  <p>Totale righe: {result.payload.total}</p>
                  <p>Importate: {result.payload.imported}</p>
                  <p>Saltate: {result.payload.skipped}</p>
                </>
              ) : (
                Object.entries(result.payload.results).map(([entity, stats]) => (
                  <div key={entity} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{entity}</p>
                    <p>Totale: {stats.total} · Importate: {stats.imported} · Saltate: {stats.skipped}</p>
                  </div>
                ))
              )}
            </div>

            {result.type === 'csv' && result.payload.errors.length > 0 && (
              <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                <p className="mb-2 font-semibold">Errori rilevati:</p>
                {result.payload.errors.slice(0, 20).map((err, idx) => (
                  <p key={`${err.row}-${idx}`}>Riga {err.row}: {err.reason}</p>
                ))}
                {result.payload.errors.length > 20 && (
                  <p>+ altri {result.payload.errors.length - 20} errori...</p>
                )}
              </div>
            )}

            {result.type === 'backup' && result.payload.errors.length > 0 && (
              <div className="mt-4 max-h-48 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                <p className="mb-2 font-semibold">Errori rilevati:</p>
                {result.payload.errors.slice(0, 20).map((err, idx) => (
                  <p key={`${err.entity}-${err.row}-${idx}`}>
                    {err.entity} riga {err.row}: {err.reason}
                  </p>
                ))}
                {result.payload.errors.length > 20 && (
                  <p>+ altri {result.payload.errors.length - 20} errori...</p>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setResult(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
      )}

      {/* Confirm Backup Import Dialog */}
      <ConfirmDialog
        isOpen={confirmBackupImport}
        title="Conferma Importazione Backup"
        message="Sei sicuro di voler importare questo backup? I record duplicati verranno ignorati automaticamente. L'operazione potrebbe richiedere alcuni minuti."
        onConfirm={handleBackupImport}
        onClose={() => setConfirmBackupImport(false)}
        confirmText="Importa"
        cancelText="Annulla"
        variant="warning"
      />

      {/* Confirm CSV Import Dialog */}
      <ConfirmDialog
        isOpen={confirmCsvImport}
        title="Conferma Importazione CSV"
        message={`Sei sicuro di voler importare i dati da CSV? Verranno importati record di tipo "${csvEntity}". I record duplicati verranno ignorati automaticamente.`}
        onConfirm={handleCsvImport}
        onClose={() => setConfirmCsvImport(false)}
        confirmText="Importa"
        cancelText="Annulla"
        variant="warning"
      />
    </div>
  );
}
