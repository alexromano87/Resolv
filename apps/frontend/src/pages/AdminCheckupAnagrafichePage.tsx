import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import {
  checkupAdminApi,
  type CheckupAnagraficaLicenziatario,
  type CheckupStudio,
} from '../api/checkupAdmin';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';

const emptyForm = {
  studioId: '',
  titolo: '',
  nome: '',
  cognome: '',
  email: '',
  pec: '',
  partitaIva: '',
  codiceFiscale: '',
  telefono: '',
  indirizzo: '',
  citta: '',
  provincia: '',
};

export default function AdminCheckupAnagrafichePage() {
  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [anagrafiche, setAnagrafiche] = useState<CheckupAnagraficaLicenziatario[]>([]);
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [studioFilter, setStudioFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CheckupAnagraficaLicenziatario | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  const loadData = async () => {
    setLoading(true);
    try {
      const [anagraficheData, studiosData] = await Promise.all([
        checkupAdminApi.getAnagraficheLicenziatario({ search: searchTerm, studioId: studioFilter }),
        checkupAdminApi.getStudios(),
      ]);
      setAnagrafiche(anagraficheData);
      setStudios(studiosData.filter((studio) => studio.tipo === 'licenziatario'));
    } catch (err: any) {
      toastError(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const studioOptions = useMemo(
    () => [
      { value: '', label: 'Tutti i licenziatari' },
      ...studios.map((studio) => ({ value: studio.id, label: studio.nome, sublabel: studio.ragioneSociale || undefined })),
    ],
    [studios],
  );

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...emptyForm, studioId: studioFilter });
    setShowModal(true);
  };

  const openEdit = (item: CheckupAnagraficaLicenziatario) => {
    setEditing(item);
    setFormData({
      studioId: item.studioId,
      titolo: item.titolo || '',
      nome: item.nome || '',
      cognome: item.cognome || '',
      email: item.email || '',
      pec: item.pec || '',
      partitaIva: item.partitaIva || '',
      codiceFiscale: item.codiceFiscale || '',
      telefono: item.telefono || '',
      indirizzo: item.indirizzo || '',
      citta: item.citta || '',
      provincia: item.provincia || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setFormData(emptyForm);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studioId || !formData.nome.trim() || !formData.cognome.trim()) {
      toastError('Seleziona il licenziatario e compila nome e cognome');
      return;
    }
    const confirmed = await confirm({
      title: editing ? 'Salvare anagrafica?' : 'Creare anagrafica?',
      message: `Vuoi salvare l'anagrafica "${formData.nome.trim()} ${formData.cognome.trim()}"?`,
      confirmText: editing ? 'Salva' : 'Crea',
      variant: 'info',
    });
    if (!confirmed) return;
    try {
      const payload = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
      );
      if (editing) {
        await checkupAdminApi.updateAnagraficaLicenziatario(editing.id, payload);
        success('Anagrafica aggiornata');
      } else {
        await checkupAdminApi.createAnagraficaLicenziatario(payload);
        success('Anagrafica creata');
      }
      closeModal();
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il salvataggio');
    }
  };

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Anagrafiche licenziatario</h1>
          <p className="text-sm text-slate-600 mt-1">Cerca, crea e aggiorna le anagrafiche associate ai licenziatari.</p>
        </div>
        <button onClick={openCreate} className="wow-button">
          <Plus className="h-4 w-4" />
          Nuova anagrafica
        </button>
      </div>

      <form onSubmit={handleSearch} className="wow-panel p-4 md:p-6 grid grid-cols-1 gap-3 md:grid-cols-[1fr_280px_auto] md:items-center">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per cognome, P.IVA, codice fiscale, email, PEC o studio"
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
        />
        <CustomSelect
          value={studioFilter}
          onChange={setStudioFilter}
          options={studioOptions}
          placeholder="Studio associato"
          searchable
          searchPlaceholder="Cerca studio..."
        />
        <button type="submit" className="wow-button-ghost">Cerca</button>
      </form>

      <div className="wow-panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Caricamento...</div>
        ) : anagrafiche.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Nessuna anagrafica trovata</div>
        ) : (
          <table className="w-full wow-stagger-rows">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Nominativo</th>
                <th className="px-4 py-3 text-left">Licenziatario</th>
                <th className="px-4 py-3 text-left">Contatti</th>
                <th className="px-4 py-3 text-left">Dati fiscali</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {anagrafiche.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {[item.titolo, item.nome, item.cognome].filter(Boolean).join(' ')}
                    <div className="text-xs text-slate-500">{[item.indirizzo, item.citta, item.provincia].filter(Boolean).join(' · ') || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.studio?.nome || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{item.email || '—'}</div>
                    <div className="text-xs text-slate-500">{item.pec || item.telefono || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{item.partitaIva || '—'}</div>
                    <div className="text-xs text-slate-500">{item.codiceFiscale || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(item)} className="inline-flex rounded-full border border-slate-200 p-2 text-slate-600 hover:border-slate-300">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Modifica anagrafica' : 'Nuova anagrafica'}</h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Licenziatario *</label>
                  <div className="mt-1">
                    <CustomSelect
                      value={formData.studioId}
                      onChange={(value) => setFormData((prev) => ({ ...prev, studioId: value }))}
                      options={studioOptions.filter((option) => option.value)}
                      placeholder="Seleziona licenziatario"
                      searchable
                      searchPlaceholder="Cerca licenziatario..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div><label className="block text-sm font-medium text-slate-700">Titolo</label><input value={formData.titolo} onChange={(e) => setFormData((p) => ({ ...p, titolo: e.target.value }))} className={inputClassName} /></div>
                  <div><label className="block text-sm font-medium text-slate-700">Nome *</label><input value={formData.nome} onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))} className={inputClassName} /></div>
                  <div><label className="block text-sm font-medium text-slate-700">Cognome *</label><input value={formData.cognome} onChange={(e) => setFormData((p) => ({ ...p, cognome: e.target.value }))} className={inputClassName} /></div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><label className="block text-sm font-medium text-slate-700">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className={inputClassName} /></div>
                  <div><label className="block text-sm font-medium text-slate-700">PEC</label><input value={formData.pec} onChange={(e) => setFormData((p) => ({ ...p, pec: e.target.value }))} className={inputClassName} /></div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div><label className="block text-sm font-medium text-slate-700">P.IVA</label><input value={formData.partitaIva} onChange={(e) => setFormData((p) => ({ ...p, partitaIva: e.target.value }))} className={inputClassName} /></div>
                  <div><label className="block text-sm font-medium text-slate-700">Codice fiscale</label><input value={formData.codiceFiscale} onChange={(e) => setFormData((p) => ({ ...p, codiceFiscale: e.target.value }))} className={inputClassName} /></div>
                  <div><label className="block text-sm font-medium text-slate-700">Telefono</label><input value={formData.telefono} onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))} className={inputClassName} /></div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700">Indirizzo</label><input value={formData.indirizzo} onChange={(e) => setFormData((p) => ({ ...p, indirizzo: e.target.value }))} className={inputClassName} /></div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><label className="block text-sm font-medium text-slate-700">Città</label><input value={formData.citta} onChange={(e) => setFormData((p) => ({ ...p, citta: e.target.value }))} className={inputClassName} /></div>
                  <div><label className="block text-sm font-medium text-slate-700">Provincia</label><input value={formData.provincia} onChange={(e) => setFormData((p) => ({ ...p, provincia: e.target.value }))} className={inputClassName} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="wow-button-ghost">Annulla</button>
                  <button type="submit" className="wow-button">Salva anagrafica</button>
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
