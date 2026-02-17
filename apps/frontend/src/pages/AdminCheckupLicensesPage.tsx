import { useEffect, useState } from 'react';
import { KeyRound, X, Pencil } from 'lucide-react';
import { checkupAdminApi, type CheckupLicense } from '../api/checkupAdmin';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';

export default function AdminCheckupLicensesPage() {
  const { success, error: toastError } = useToast();
  const [licenses, setLicenses] = useState<CheckupLicense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [licenseForm, setLicenseForm] = useState({
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
      const licensesData = await checkupAdminApi.getLicenses();
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

  const handleUpsertLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseForm.tipo || !licenseForm.dataInizioValidita || !licenseForm.dataScadenza) {
      toastError('Compila tutti i campi obbligatori');
      return;
    }
    try {
      await checkupAdminApi.upsertLicense({
        id: editingLicenseId ?? undefined,
        tipo: licenseForm.tipo.trim(),
        numeroUtenze: Number(licenseForm.numeroUtenze),
        dataInizioValidita: licenseForm.dataInizioValidita,
        dataScadenza: licenseForm.dataScadenza,
      });
      success('Licenza aggiornata');
      setShowLicenseModal(false);
      setEditingLicenseId(null);
      setLicenseForm({
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
    setLicenseForm({
      tipo: license.tipo,
      numeroUtenze: license.numeroUtenze,
      dataInizioValidita: license.dataInizioValidita || '',
      dataScadenza: license.dataScadenza || '',
    });
    setEditingLicenseId(license.id);
    setShowLicenseModal(true);
  };

  const editingLicense = editingLicenseId ? licenses.find((license) => license.id === editingLicenseId) : null;

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
        <div className="wow-panel overflow-hidden">
          {licenses.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessuna licenza registrata</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Studio</th>
                  <th className="px-4 py-3 text-left">Numero licenza</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Utenze</th>
                  <th className="px-4 py-3 text-left">Validità</th>
                  <th className="px-4 py-3 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {licenses.map((license) => (
                  <tr key={license.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {license.studio?.nome || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {license.numeroLicenza || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{license.tipo}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{license.numeroUtenze}</td>
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo licenza</label>
                    <input
                      value={licenseForm.tipo}
                      onChange={(e) => setLicenseForm((p) => ({ ...p, tipo: e.target.value }))}
                      className={inputClassName}
                      placeholder="(da definire)"
                    />
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
