import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, RefreshCcw, Trash2, X } from 'lucide-react';
import { checkupAdminApi, type CheckupLicense, type CheckupSublicense } from '../api/checkupAdmin';
import * as questionApi from '../api/checkupQuestions';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { DateField } from '../components/ui/DateField';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';

export default function AdminCheckupSublicensesPage() {
  const getSublicenseClientDisplayName = (sublicense: Pick<CheckupSublicense, 'client' | 'clienteStudio'>) =>
    sublicense.client?.nome
    || sublicense.client?.ragioneSociale
    || sublicense.clienteStudio?.nome
    || sublicense.clienteStudio?.ragioneSociale
    || '—';

  const sublicenseTypeOptions = [
    { value: 'Standard', label: 'Standard (preset)' },
    { value: 'Professional', label: 'Professional (preset)' },
    { value: 'Enterprise', label: 'Enterprise (preset)' },
  ];
  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [sublicenses, setSublicenses] = useState<CheckupSublicense[]>([]);
  const [licenses, setLicenses] = useState<CheckupLicense[]>([]);
  const [models, setModels] = useState<questionApi.QuestionModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const [filterStudioId, setFilterStudioId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    licenseId: '',
    modelId: '',
    tipo: '',
    numeroUtenze: 1,
    dataInizioValidita: '',
    dataScadenza: '',
    attiva: true,
    allowDocuments: true,
  });

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
  const [renewSublicenseId, setRenewSublicenseId] = useState<string | null>(null);
  const [renewForm, setRenewForm] = useState({ dataInizioValidita: '', dataScadenza: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sublicensesData, licensesData, modelsData] = await Promise.all([
        checkupAdminApi.getSublicenses(),
        checkupAdminApi.getLicenses(),
        questionApi.getModels(),
      ]);
      setSublicenses(sublicensesData);
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

  const licenseOptions = useMemo(
    () =>
      [
        { value: '', label: 'Tutte le licenze' },
        ...licenses
          .filter((l) => !filterStudioId || l.studio?.id === filterStudioId)
          .map((l) => ({
            value: l.id,
            label: l.studio?.nome || 'Studio',
            sublabel: `Licenza ${l.numeroLicenza || '—'} · Utenze ${l.numeroUtenze}`,
          })),
      ],
    [licenses, filterStudioId],
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      licenseId: selectedLicenseId,
      modelId: '',
      tipo: '',
      numeroUtenze: 1,
      dataInizioValidita: '',
      dataScadenza: '',
      attiva: true,
      allowDocuments: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sublicense: CheckupSublicense) => {
    setEditingId(sublicense.id);
    setFormData({
      licenseId: sublicense.licenseId,
      modelId: sublicense.modelId || '',
      tipo: sublicense.tipo || '',
      numeroUtenze: sublicense.numeroUtenze,
      dataInizioValidita: sublicense.dataInizioValidita || '',
      dataScadenza: sublicense.dataScadenza || '',
      attiva: sublicense.attiva,
      allowDocuments: sublicense.allowDocuments ?? true,
    });
    setShowModal(true);
  };

  const handleOpenRenew = (sublicense: CheckupSublicense) => {
    setRenewSublicenseId(sublicense.id);
    setRenewForm({
      dataInizioValidita: sublicense.dataInizioValidita || '',
      dataScadenza: sublicense.dataScadenza || '',
    });
  };

  const handleRenewSublicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewSublicenseId || !renewForm.dataInizioValidita || !renewForm.dataScadenza) {
      toastError('Compila tutte le date di rinnovo');
      return;
    }
    const confirmed = await confirm({
      title: 'Confermare rinnovo sublicenza?',
      message: 'Vuoi aggiornare la validita della sublicenza selezionata?',
      confirmText: 'Rinnova sublicenza',
      variant: 'info',
    });
    if (!confirmed) return;
    try {
      await checkupAdminApi.renewSublicense(renewSublicenseId, renewForm);
      success('Sublicenza rinnovata');
      setRenewSublicenseId(null);
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il rinnovo');
    }
  };

  const handleDeleteSublicense = async (sublicense: CheckupSublicense) => {
    const confirmed = await confirm({
      title: 'Confermare eliminazione sublicenza?',
      message: `Vuoi eliminare la sublicenza ${sublicense.numeroSublicenza ? `#${sublicense.numeroSublicenza}` : ''}?`,
      confirmText: 'Elimina sublicenza',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await checkupAdminApi.deleteSublicense(sublicense.id);
      success('Sublicenza eliminata');
      loadData();
    } catch (err: any) {
      toastError(err.message || "Errore durante l'eliminazione");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.licenseId || !formData.modelId || !formData.tipo || !formData.dataInizioValidita || !formData.dataScadenza) {
      toastError('Compila tutti i campi obbligatori');
      return;
    }
    const confirmed = await confirm({
      title: editingId ? 'Confermare modifica sublicenza?' : 'Confermare creazione sublicenza?',
      message: editingId
        ? `Vuoi salvare le modifiche della sublicenza "${formData.tipo.trim()}"?`
        : `Vuoi creare una nuova sublicenza "${formData.tipo.trim()}"?`,
      confirmText: editingId ? 'Salva modifiche' : 'Crea sublicenza',
      variant: 'info',
    });
    if (!confirmed) return;
    try {
      await checkupAdminApi.upsertSublicense({
        id: editingId ?? undefined,
        licenseId: formData.licenseId,
        modelId: formData.modelId,
        tipo: formData.tipo.trim(),
        numeroUtenze: Number(formData.numeroUtenze),
        dataInizioValidita: formData.dataInizioValidita,
        dataScadenza: formData.dataScadenza,
        attiva: formData.attiva,
        allowDocuments: formData.allowDocuments,
      });
      success(editingId ? 'Sublicenza aggiornata' : 'Sublicenza creata');
      setShowModal(false);
      setEditingId(null);
      setFormData({
        licenseId: '',
        modelId: '',
        tipo: '',
        numeroUtenze: 1,
        dataInizioValidita: '',
        dataScadenza: '',
        attiva: true,
        allowDocuments: true,
      });
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il salvataggio');
    }
  };

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

  const filteredSublicenses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sublicenses.filter((s) => {
      if (filterStudioId && s.license?.studio?.id !== filterStudioId) return false;
      if (selectedLicenseId && s.licenseId !== selectedLicenseId) return false;
      if (!term) return true;
      return [
        s.numeroSublicenza,
        s.tipo,
        s.license?.numeroLicenza,
        s.license?.studio?.nome,
        s.client?.nome,
        s.client?.ragioneSociale,
        s.clienteStudio?.nome,
        s.clienteStudio?.ragioneSociale,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [sublicenses, filterStudioId, selectedLicenseId, searchTerm]);

  const modelOptions = useMemo(
    () =>
      models.map((model) => ({
        value: model.id,
        label: model.label,
        sublabel: model.code,
      })),
    [models],
  );

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione Sublicenze</h1>
          <p className="text-sm text-slate-600 mt-1">
            Crea e aggiorna le sublicenze associate alle licenze principali.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-[220px]">
            <CustomSelect
              value={filterStudioId}
              onChange={(val) => {
                setFilterStudioId(val);
                setSelectedLicenseId('');
              }}
              options={studioOptions}
              placeholder="Filtra per studio"
              searchable
              searchPlaceholder="Cerca studio..."
            />
          </div>
          <div className="min-w-[260px]">
            <CustomSelect
              value={selectedLicenseId}
              onChange={setSelectedLicenseId}
              options={licenseOptions}
              placeholder="Filtra per licenza"
              searchable
              searchPlaceholder="Cerca licenza..."
            />
          </div>
          <button onClick={handleOpenCreate} className="wow-button">
            <KeyRound className="h-4 w-4" />
            Nuova sublicenza
          </button>
        </div>
      </div>

      <div className="wow-panel p-4 md:p-6">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per sublicenza, tipo, studio o cliente"
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
        />
      </div>

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <div className="wow-panel overflow-hidden">
          {filteredSublicenses.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessuna sublicenza presente</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Licenza</th>
                  <th className="px-4 py-3 text-left">Sublicenza</th>
                  <th className="px-4 py-3 text-left">Sublicenziatario</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Utenze</th>
                  <th className="px-4 py-3 text-left">Validità</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSublicenses.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {s.license?.studio?.nome || 'Licenza'}
                      <div className="text-xs text-slate-500">#{s.license?.numeroLicenza || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.numeroSublicenza || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {getSublicenseClientDisplayName(s)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.tipo || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.numeroUtenze}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {s.dataInizioValidita || '—'} → {s.dataScadenza || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          s.attiva ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.attiva ? 'Attiva' : 'Disattivata'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Modifica sublicenza"
                          aria-label="Modifica sublicenza"
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenRenew(s)}
                          title="Rinnova sublicenza"
                          aria-label="Rinnova sublicenza"
                          className="inline-flex items-center justify-center rounded-full border border-indigo-200 p-2 text-indigo-600 hover:border-indigo-300 hover:text-indigo-700"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSublicense(s)}
                          disabled={Boolean(s.clientId || s.clienteStudioId)}
                          title={s.clientId || s.clienteStudioId ? 'Puoi eliminare solo sublicenze non assegnate' : 'Elimina sublicenza'}
                          aria-label="Elimina sublicenza"
                          className="inline-flex items-center justify-center rounded-full border border-rose-200 p-2 text-rose-600 hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {renewSublicenseId && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">Rinnova sublicenza</h2>
                <button onClick={() => setRenewSublicenseId(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleRenewSublicense} className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Data inizio validità</label>
                  <DateField value={renewForm.dataInizioValidita} onChange={(v) => setRenewForm((p) => ({ ...p, dataInizioValidita: v }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Data scadenza</label>
                  <DateField value={renewForm.dataScadenza} onChange={(v) => setRenewForm((p) => ({ ...p, dataScadenza: v }))} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setRenewSublicenseId(null)} className="wow-button-ghost">Annulla</button>
                  <button type="submit" className="wow-button">Salva rinnovo</button>
                </div>
              </form>
            </div>
          </div>
        </BodyPortal>
      )}

      {showModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Modifica sublicenza' : 'Nuova sublicenza'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Licenza associata</label>
                  <div className="mt-1">
                    <CustomSelect
                      value={formData.licenseId}
                      onChange={(val) => setFormData((p) => ({ ...p, licenseId: val }))}
                      options={licenseOptions}
                      placeholder="Seleziona licenza"
                      searchable
                      searchPlaceholder="Cerca licenza..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Modello associato *</label>
                  <div className="mt-1">
                    <CustomSelect
                      value={formData.modelId}
                      onChange={(val) => setFormData((p) => ({ ...p, modelId: val }))}
                      options={modelOptions}
                      placeholder="Seleziona modello"
                      searchable
                      searchPlaceholder="Cerca modello..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Tipo sublicenza</label>
                    <CustomSelect
                      value={formData.tipo}
                      onChange={(val) => setFormData((p) => ({ ...p, tipo: val }))}
                      options={sublicenseTypeOptions}
                      placeholder="Seleziona tipo sublicenza"
                    />
                    <p className="mt-1 text-xs text-slate-500">Preset commerciale, modificabile in futuro.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Numero utenze</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.numeroUtenze}
                      onChange={(e) => setFormData((p) => ({ ...p, numeroUtenze: Number(e.target.value) }))}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Data inizio validità</label>
                    <DateField
                      value={formData.dataInizioValidita}
                      onChange={(v) => setFormData((p) => ({ ...p, dataInizioValidita: v }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Data scadenza</label>
                    <DateField
                      value={formData.dataScadenza}
                      onChange={(v) => setFormData((p) => ({ ...p, dataScadenza: v }))}
                    />
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={formData.attiva}
                    onChange={(e) => setFormData((p) => ({ ...p, attiva: e.target.checked }))}
                  />
                  Sublicenza attiva
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={formData.allowDocuments}
                    onChange={(e) => setFormData((p) => ({ ...p, allowDocuments: e.target.checked }))}
                  />
                  Consenti caricamento documenti
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="wow-button-ghost">
                    Annulla
                  </button>
                  <button type="submit" className="wow-button">
                    Salva sublicenza
                  </button>
                </div>
              </form>
            </div>
          </div>
        </BodyPortal>
      )}
      <ConfirmDialog />
    </div>
  );
}
