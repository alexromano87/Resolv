import { useEffect, useMemo, useState } from 'react';
import { KeyRound, X, Pencil } from 'lucide-react';
import { checkupAdminApi, type CheckupLicense } from '../api/checkupAdmin';
import * as questionApi from '../api/checkupQuestions';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { CustomSelect } from '../components/ui/CustomSelect';

export default function AdminCheckupLicensesPage() {
  const { success, error: toastError } = useToast();
  const licenseTypeOptions = [
    { value: 'Standard', label: 'Standard (preset)' },
    { value: 'Professional', label: 'Professional (preset)' },
    { value: 'Enterprise', label: 'Enterprise (preset)' },
  ];
  const [licenses, setLicenses] = useState<CheckupLicense[]>([]);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<questionApi.QuestionModel[]>([]);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStudioId, setFilterStudioId] = useState('');
  const [licenseForm, setLicenseForm] = useState({
    modelIds: [] as string[],
    tipo: '',
    numeroUtenze: 1,
    dataInizioValidita: '',
    dataScadenza: '',
  });
  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  const loadData = async () => {
    setLoading(true);
    try {
      const [licensesData, modelsData] = await Promise.all([
        checkupAdminApi.getLicenses(),
        questionApi.getModels(),
      ]);
      setLicenses(licensesData);
      setModels(modelsData);
    } catch (err: any) {
      toastError(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpsertLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseForm.modelIds.length || !licenseForm.tipo || !licenseForm.dataInizioValidita || !licenseForm.dataScadenza) {
      toastError('Compila tutti i campi obbligatori');
      return;
    }
    try {
      await checkupAdminApi.upsertLicense({
        id: editingLicenseId ?? undefined,
        modelId: licenseForm.modelIds[0],
        modelIds: licenseForm.modelIds,
        tipo: licenseForm.tipo.trim(),
        numeroUtenze: Number(licenseForm.numeroUtenze),
        dataInizioValidita: licenseForm.dataInizioValidita,
        dataScadenza: licenseForm.dataScadenza,
      });
      success('Licenza aggiornata');
      setShowLicenseModal(false);
      setEditingLicenseId(null);
      setLicenseForm({
        modelIds: [],
        tipo: '',
        numeroUtenze: 1,
        dataInizioValidita: '',
        dataScadenza: '',
      });
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante la creazione');
    }
  };

  const handleEditLicense = (license: CheckupLicense) => {
    const resolvedModelIds = (license.modelIds && license.modelIds.length)
      ? license.modelIds
      : [license.model?.id || license.modelId].filter(Boolean) as string[];
    setLicenseForm({
      modelIds: resolvedModelIds,
      tipo: license.tipo,
      numeroUtenze: license.numeroUtenze,
      dataInizioValidita: license.dataInizioValidita || '',
      dataScadenza: license.dataScadenza || '',
    });
    setEditingLicenseId(license.id);
    setShowLicenseModal(true);
  };

  const editingLicense = editingLicenseId ? licenses.find((license) => license.id === editingLicenseId) : null;

  const studioOptions = useMemo(() => {
    const map = new Map<string, string>();
    licenses.forEach((license) => {
      if (license.studio?.id) {
        map.set(license.studio.id, license.studio.nome);
      }
    });
    return [
      { value: '', label: 'Tutti gli studi' },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [licenses]);

  const filteredLicenses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return licenses.filter((license) => {
      if (filterStudioId && license.studio?.id !== filterStudioId) return false;
      if (!term) return true;
      return [
        license.numeroLicenza,
        license.studio?.nome,
        license.intestatario,
        license.tipo,
        license.model?.label,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [licenses, filterStudioId, searchTerm]);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione Licenze</h1>
          <p className="text-sm text-slate-600 mt-1">Configura le licenze per gli studi licenziatari.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLicenseForm({
                modelIds: [],
                tipo: '',
                numeroUtenze: 1,
                dataInizioValidita: '',
                dataScadenza: '',
              });
              setEditingLicenseId(null);
              setShowLicenseModal(true);
            }}
            className="wow-button"
          >
            <KeyRound className="h-4 w-4" />
            Nuova licenza
          </button>
        </div>
      </div>

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <>
          <div className="wow-panel p-4 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per studio, numero, intestatario o modello"
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
              />
            </div>
            <div className="min-w-[240px]">
              <CustomSelect
                value={filterStudioId}
                onChange={setFilterStudioId}
                options={studioOptions}
                placeholder="Filtra per studio"
                searchable
                searchPlaceholder="Cerca studio..."
              />
            </div>
          </div>
        <div className="wow-panel overflow-hidden">
          {filteredLicenses.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessuna licenza registrata</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Studio</th>
                  <th className="px-4 py-3 text-left">Numero licenza</th>
                  <th className="px-4 py-3 text-left">Modello</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Utenze</th>
                  <th className="px-4 py-3 text-left">Sublicenze</th>
                  <th className="px-4 py-3 text-left">Validità</th>
                  <th className="px-4 py-3 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLicenses.map((license) => (
                  <tr key={license.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {license.studio?.nome || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {license.numeroLicenza || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {license.model?.label || '—'}
                      {license.modelIds && license.modelIds.length > 1 ? (
                        <div className="text-[10px] text-slate-400">+{license.modelIds.length - 1} modelli</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{license.tipo}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{license.numeroUtenze}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{license.numeroSottolicenze ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {license.dataInizioValidita || '—'} → {license.dataScadenza || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleEditLicense(license)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifica
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </>
      )}

      {showLicenseModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingLicense ? 'Modifica licenza checkup' : 'Nuova licenza checkup'}
                </h2>
                <button
                  onClick={() => {
                    setShowLicenseModal(false);
                    setEditingLicenseId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpsertLicense} className="space-y-4 p-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold">Studio:</span> {editingLicense?.studio?.nome || 'Non assegnata'}
                  {editingLicense?.numeroLicenza ? (
                    <span className="ml-3 text-xs text-slate-500">Licenza #{editingLicense.numeroLicenza}</span>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Modelli abilitati</label>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    {models.length === 0 ? (
                      <div className="py-2 text-xs text-slate-500">Nessun modello disponibile.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {models.map((model) => {
                          const checked = licenseForm.modelIds.includes(model.id);
                          return (
                            <label key={model.id} className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? Array.from(new Set([...licenseForm.modelIds, model.id]))
                                    : licenseForm.modelIds.filter((id) => id !== model.id);
                                  setLicenseForm((p) => ({ ...p, modelIds: next }));
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                              />
                              <span>{model.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Seleziona uno o piu modelli. Il primo selezionato sara considerato come modello principale.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo licenza</label>
                    <CustomSelect
                      value={licenseForm.tipo}
                      onChange={(val) => setLicenseForm((p) => ({ ...p, tipo: val }))}
                      options={licenseTypeOptions}
                      placeholder="Seleziona tipo licenza"
                    />
                    <p className="mt-1 text-xs text-slate-500">Preset commerciale, modificabile in futuro.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Numero utenze</label>
                    <input
                      type="number"
                      min={1}
                      value={licenseForm.numeroUtenze}
                      onChange={(e) => setLicenseForm((p) => ({ ...p, numeroUtenze: Number(e.target.value) }))}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data inizio validità</label>
                    <input
                      type="date"
                      value={licenseForm.dataInizioValidita}
                      onChange={(e) => setLicenseForm((p) => ({ ...p, dataInizioValidita: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data scadenza</label>
                    <input
                      type="date"
                      value={licenseForm.dataScadenza}
                      onChange={(e) => setLicenseForm((p) => ({ ...p, dataScadenza: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Se la licenza esiste, verrà aggiornata con i nuovi dati.</p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLicenseModal(false);
                      setEditingLicenseId(null);
                    }}
                    className="wow-button-ghost"
                  >
                    Annulla
                  </button>
                  <button type="submit" className="wow-button">
                    Salva licenza
                  </button>
                </div>
              </form>
            </div>
          </div>
        </BodyPortal>
      )}

    </div>
  );
}
