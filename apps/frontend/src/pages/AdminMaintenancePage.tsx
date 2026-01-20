import { useEffect, useState } from 'react';
import { adminApi, type OrphanDataReport } from '../api/admin';
import { studiApi, type Studio, type OrphanedRecords } from '../api/studi';
import { CustomSelect } from '../components/ui/CustomSelect';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { AlertTriangle, CheckCircle, Database, Users, UserCheck } from 'lucide-react';

export default function AdminMaintenancePage() {
  const [orphanData, setOrphanData] = useState<OrphanDataReport | null>(null);
  const [orphanedRecords, setOrphanedRecords] = useState<OrphanedRecords | null>(null);
  const [studi, setStudi] = useState<Studio[]>([]);
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [selectedRecords, setSelectedRecords] = useState<{
    clienti: string[];
    debitori: string[];
    users: string[];
    avvocati: string[];
    pratiche: string[];
  }>({ clienti: [], debitori: [], users: [], avvocati: [], pratiche: [] });
  const [assignStudio, setAssignStudio] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Confirmation dialogs
  const [confirmAssignAll, setConfirmAssignAll] = useState(false);
  const [confirmAssignSelected, setConfirmAssignSelected] = useState<keyof typeof selectedRecords | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orphanDataRes, studiRes, orphanedRecordsRes] = await Promise.all([
        adminApi.getOrphanData(),
        studiApi.getAll(),
        studiApi.getOrphanedRecords(),
      ]);
      setOrphanData(orphanDataRes);
      setStudi(studiRes);
      setOrphanedRecords(orphanedRecordsRes);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOrphanData = async () => {
    if (!selectedStudio) {
      setError('Seleziona uno studio');
      return;
    }

    try {
      setAssigning(true);
      setError(null);
      setSuccess(null);
      setConfirmAssignAll(false);

      const result = await adminApi.assignOrphanData(selectedStudio);
      setSuccess(`Dati assegnati con successo: ${JSON.stringify(result.updated)}`);

      // Ricarica i dati
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nell\'assegnazione dei dati');
    } finally {
      setAssigning(false);
    }
  };

  const getTotalOrphans = () => {
    if (!orphanData) return 0;
    return (
      orphanData.praticheSenzaStudio +
      orphanData.clientiSenzaStudio +
      orphanData.debitoriSenzaStudio +
      orphanData.avvocatiSenzaStudio +
      orphanData.movimentiFinanziariSenzaStudio +
      orphanData.alertsSenzaStudio +
      orphanData.ticketsSenzaStudio +
      orphanData.documentiSenzaStudio +
      orphanData.cartelleSenzaStudio +
      orphanData.utentiSenzaStudio
    );
  };

  const handleSelectAll = (entityType: keyof typeof selectedRecords) => {
    if (!orphanedRecords) return;
    const allIds = orphanedRecords[entityType].map((record: any) => record.id);
    setSelectedRecords(prev => ({
      ...prev,
      [entityType]: allIds,
    }));
  };

  const handleDeselectAll = (entityType: keyof typeof selectedRecords) => {
    setSelectedRecords(prev => ({
      ...prev,
      [entityType]: [],
    }));
  };

  const handleToggleRecord = (entityType: keyof typeof selectedRecords, recordId: string) => {
    setSelectedRecords(prev => {
      const current = prev[entityType];
      const newSelection = current.includes(recordId)
        ? current.filter(id => id !== recordId)
        : [...current, recordId];
      return {
        ...prev,
        [entityType]: newSelection,
      };
    });
  };

  const handleAssignSelectedRecords = async (entityType: keyof typeof selectedRecords) => {
    if (!assignStudio) {
      setError('Seleziona uno studio per l\'assegnazione');
      return;
    }

    const recordIds = selectedRecords[entityType];
    if (recordIds.length === 0) {
      setError('Seleziona almeno un record');
      return;
    }

    try {
      setAssigning(true);
      setError(null);
      setSuccess(null);
      setConfirmAssignSelected(null);

      await studiApi.assignOrphanedRecords(entityType, recordIds, assignStudio);
      setSuccess(`${recordIds.length} record(s) ${entityType} assegnati con successo`);

      // Reset selections and reload data
      setSelectedRecords(prev => ({ ...prev, [entityType]: [] }));
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nell\'assegnazione dei record');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  const totalOrphans = getTotalOrphans();

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-4 md:p-5">
        <span className="wow-chip">Amministrazione</span>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 display-font">Manutenzione Dati</h1>
        <p className="mt-2 text-sm text-slate-600">Gestione dati orfani e integrità del sistema</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-2xl flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <p>{success}</p>
        </div>
      )}

      <div className="wow-panel">
        <div className="p-6 border-b border-slate-200/70">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Dati Orfani (senza studio assegnato)
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 border border-slate-200/70 rounded-2xl bg-white/80">
            <span className="text-lg font-semibold">Totale Record Orfani</span>
            <span className={`text-2xl font-bold ${totalOrphans > 0 ? 'text-amber-600' : 'text-indigo-600'}`}>
              {totalOrphans}
            </span>
          </div>

          {orphanData && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Pratiche', value: orphanData.praticheSenzaStudio },
                { label: 'Clienti', value: orphanData.clientiSenzaStudio },
                { label: 'Debitori', value: orphanData.debitoriSenzaStudio },
                { label: 'Avvocati', value: orphanData.avvocatiSenzaStudio },
                { label: 'Movimenti Finanziari', value: orphanData.movimentiFinanziariSenzaStudio },
                { label: 'Alerts', value: orphanData.alertsSenzaStudio },
                { label: 'Tickets', value: orphanData.ticketsSenzaStudio },
                { label: 'Documenti', value: orphanData.documentiSenzaStudio },
                { label: 'Cartelle', value: orphanData.cartelleSenzaStudio },
                { label: 'Utenti', value: orphanData.utentiSenzaStudio },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center p-3 border border-slate-200/70 rounded-2xl bg-white/80">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className={`font-bold ${item.value > 0 ? 'text-amber-600' : 'text-indigo-600'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {totalOrphans > 0 && (
        <div className="wow-panel">
          <div className="p-6 border-b border-slate-200/70">
            <h2 className="text-xl font-semibold">Assegna Dati Orfani a uno Studio</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Seleziona Studio</label>
              <CustomSelect
                options={[
                  { value: '', label: 'Seleziona uno studio' },
                  ...studi.map((studio) => ({
                    value: studio.id,
                    label: studio.nome,
                    sublabel: studio.attivo ? undefined : 'Inattivo',
                  })),
                ]}
                value={selectedStudio}
                onChange={setSelectedStudio}
              />
            </div>

            <button onClick={() => setConfirmAssignAll(true)} disabled={!selectedStudio || assigning} className="wow-button w-full disabled:opacity-50 disabled:cursor-not-allowed">
              {assigning ? 'Assegnazione in corso...' : 'Assegna Tutti i Dati Orfani'}
            </button>

            <p className="text-sm text-slate-600">
              Attenzione: questa operazione assegnerà TUTTI i record senza studio allo studio selezionato. L'operazione è irreversibile.
            </p>
          </div>
        </div>
      )}

      {orphanedRecords && orphanedRecords.totale > 0 && (
        <div className="wow-panel">
          <div className="p-6 border-b border-slate-200/70">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestione Record Orfani (Dettaglio)
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Seleziona singolarmente i record da assegnare a uno studio.
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Seleziona Studio di Destinazione</label>
              <CustomSelect
                options={[
                  { value: '', label: 'Seleziona uno studio' },
                  ...studi.map((studio) => ({
                    value: studio.id,
                    label: studio.nome,
                    sublabel: studio.attivo ? undefined : 'Inattivo',
                  })),
                ]}
                value={assignStudio}
                onChange={setAssignStudio}
              />
            </div>

            {(['clienti', 'debitori', 'users', 'avvocati', 'pratiche'] as const).map((entityType) => {
              const records = orphanedRecords[entityType] || [];
              if (records.length === 0) return null;

              const selected = selectedRecords[entityType];
              const allSelected = selected.length === records.length;

              return (
                <div key={entityType} className="border border-slate-200/70 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50/80 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-semibold text-slate-900 capitalize">{entityType}</h3>
                      <span className="text-sm text-slate-600">({records.length} record{records.length > 1 ? 's' : ''})</span>
                      <span className="text-sm text-indigo-600 font-medium">
                        {selected.length > 0 && `${selected.length} selezionati`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => allSelected ? handleDeselectAll(entityType) : handleSelectAll(entityType)}
                        className="text-xs px-3 py-1 rounded-lg border border-slate-200 hover:bg-white"
                      >
                        {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                      </button>
                      <button
                        onClick={() => setConfirmAssignSelected(entityType)}
                        disabled={selected.length === 0 || !assignStudio || assigning}
                        className="text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Assegna selezionati
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2 max-h-64 overflow-auto">
                    {records.map((record: any) => (
                      <label
                        key={record.id}
                        className="flex items-center gap-3 p-3 border border-slate-200/70 rounded-lg hover:bg-slate-50/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(record.id)}
                          onChange={() => handleToggleRecord(entityType, record.id)}
                          className="rounded border-slate-300"
                        />
                        <div className="flex-1 text-sm">
                          {entityType === 'clienti' && (
                            <span>{record.ragioneSociale || 'N/D'} - {record.email}</span>
                          )}
                          {entityType === 'debitori' && (
                            <span>{record.nome} {record.cognome} {record.ragioneSociale && `(${record.ragioneSociale})`}</span>
                          )}
                          {entityType === 'users' && (
                            <span>{record.nome} {record.cognome} - {record.email}</span>
                          )}
                          {entityType === 'avvocati' && (
                            <span>{record.nome} {record.cognome} - {record.email}</span>
                          )}
                          {entityType === 'pratiche' && (
                            <span>Pratica #{record.numeroPratica || record.id.slice(0, 8)}</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">ID: {record.id.slice(0, 8)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirm Assign All Dialog */}
      <ConfirmDialog
        isOpen={confirmAssignAll}
        title="Conferma Assegnazione Globale"
        message={`Sei sicuro di voler assegnare TUTTI i dati orfani allo studio "${studi.find(s => s.id === selectedStudio)?.nome}"? Questa operazione è irreversibile e assegnerà tutti i record senza studio.`}
        onConfirm={handleAssignOrphanData}
        onClose={() => setConfirmAssignAll(false)}
        confirmText="Assegna Tutti"
        cancelText="Annulla"
        variant="danger"
      />

      {/* Confirm Assign Selected Dialog */}
      {confirmAssignSelected && (
        <ConfirmDialog
          isOpen={true}
          title="Conferma Assegnazione Selezionati"
          message={`Sei sicuro di voler assegnare ${selectedRecords[confirmAssignSelected].length} record(s) di tipo "${confirmAssignSelected}" allo studio "${studi.find(s => s.id === assignStudio)?.nome}"?`}
          onConfirm={() => handleAssignSelectedRecords(confirmAssignSelected)}
          onClose={() => setConfirmAssignSelected(null)}
          confirmText="Assegna"
          cancelText="Annulla"
          variant="warning"
        />
      )}
    </div>
  );
}
