import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, X } from 'lucide-react';
import { checkupAdminApi, type CheckupLicense, type CheckupSublicense } from '../api/checkupAdmin';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';

export default function AdminCheckupSublicensesPage() {
  const { success, error: toastError } = useToast();
  const [sublicenses, setSublicenses] = useState<CheckupSublicense[]>([]);
  const [licenses, setLicenses] = useState<CheckupLicense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    licenseId: '',
    tipo: '',
    numeroUtenze: 1,
    dataInizioValidita: '',
    dataScadenza: '',
    attiva: true,
  });

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  const loadData = async () => {
    setLoading(true);
    try {
      const [sublicensesData, licensesData] = await Promise.all([
        checkupAdminApi.getSublicenses(),
        checkupAdminApi.getLicenses(),
      ]);
      setSublicenses(sublicensesData);
      setLicenses(licensesData);
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
      licenses.map((l) => ({
        value: l.id,
        label: l.studio?.nome || 'Studio',
        sublabel: `Licenza ${l.numeroLicenza || '—'} · Utenze ${l.numeroUtenze}`,
      })),
    [licenses],
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      licenseId: selectedLicenseId,
      tipo: '',
      numeroUtenze: 1,
      dataInizioValidita: '',
      dataScadenza: '',
      attiva: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (sublicense: CheckupSublicense) => {
    setEditingId(sublicense.id);
    setFormData({
      licenseId: sublicense.licenseId,
      tipo: sublicense.tipo || '',
      numeroUtenze: sublicense.numeroUtenze,
      dataInizioValidita: sublicense.dataInizioValidita || '',
      dataScadenza: sublicense.dataScadenza || '',
      attiva: sublicense.attiva,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.licenseId || !formData.tipo || !formData.dataInizioValidita || !formData.dataScadenza) {
      toastError('Compila tutti i campi obbligatori');
      return;
    }
    try {
      await checkupAdminApi.upsertSublicense({
        id: editingId ?? undefined,
        licenseId: formData.licenseId,
        tipo: formData.tipo.trim(),
        numeroUtenze: Number(formData.numeroUtenze),
        dataInizioValidita: formData.dataInizioValidita,
        dataScadenza: formData.dataScadenza,
        attiva: formData.attiva,
      });
      success(editingId ? 'Sottolicenza aggiornata' : 'Sottolicenza creata');
      setShowModal(false);
      setEditingId(null);
      setFormData({
        licenseId: '',
        tipo: '',
        numeroUtenze: 1,
        dataInizioValidita: '',
        dataScadenza: '',
        attiva: true,
      });
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il salvataggio');
    }
  };

  const filteredSublicenses = selectedLicenseId
    ? sublicenses.filter((s) => s.licenseId === selectedLicenseId)
    : sublicenses;

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione Sottolicenze</h1>
          <p className="text-sm text-slate-600 mt-1">
            Crea e aggiorna le sottolicenze associate alle licenze principali.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            Nuova sottolicenza
          </button>
        </div>
      </div>

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <div className="wow-panel overflow-hidden">
          {filteredSublicenses.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessuna sottolicenza presente</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Licenza</th>
                  <th className="px-4 py-3 text-left">Numero</th>
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
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifica
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Modifica sottolicenza' : 'Nuova sottolicenza'}
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Tipo sottolicenza</label>
                    <input
                      value={formData.tipo}
                      onChange={(e) => setFormData((p) => ({ ...p, tipo: e.target.value }))}
                      className={inputClassName}
                      placeholder="(da definire)"
                    />
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
                    <input
                      type="date"
                      value={formData.dataInizioValidita}
                      onChange={(e) => setFormData((p) => ({ ...p, dataInizioValidita: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Data scadenza</label>
                    <input
                      type="date"
                      value={formData.dataScadenza}
                      onChange={(e) => setFormData((p) => ({ ...p, dataScadenza: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={formData.attiva}
                    onChange={(e) => setFormData((p) => ({ ...p, attiva: e.target.checked }))}
                  />
                  Sottolicenza attiva
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="wow-button-ghost">
                    Annulla
                  </button>
                  <button type="submit" className="wow-button">
                    Salva sottolicenza
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
