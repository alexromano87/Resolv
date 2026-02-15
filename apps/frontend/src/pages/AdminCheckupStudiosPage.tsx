import { useEffect, useState } from 'react';
import { Plus, X, Edit2, Power, PowerOff, Eye, EyeOff } from 'lucide-react';
import { checkupAdminApi, type CheckupStudio } from '../api/checkupAdmin';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';

export default function AdminCheckupStudiosPage() {
  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<CheckupStudio | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'licenziatario' as 'licenziatario' | 'cliente',
    ragioneSociale: '',
    partitaIva: '',
    codiceFiscale: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    paese: '',
    email: '',
    telefono: '',
    sitoWeb: '',
    note: '',
  });

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  const loadData = async () => {
    setLoading(true);
    try {
      const studiosData = await checkupAdminApi.getStudios();
      setStudios(studiosData);
      setCurrentPage(1);
    } catch (err: any) {
      toastError(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedStudio(null);
    setFormData({
      nome: '',
      tipo: 'licenziatario',
      ragioneSociale: '',
      partitaIva: '',
      codiceFiscale: '',
      indirizzo: '',
      citta: '',
      provincia: '',
      cap: '',
      paese: '',
      email: '',
      telefono: '',
      sitoWeb: '',
      note: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (studio: CheckupStudio) => {
    setIsEditing(true);
    setSelectedStudio(studio);
    setFormData({
      nome: studio.nome,
      tipo: studio.tipo,
      ragioneSociale: studio.ragioneSociale || '',
      partitaIva: studio.partitaIva || '',
      codiceFiscale: studio.codiceFiscale || '',
      indirizzo: studio.indirizzo || '',
      citta: studio.citta || '',
      provincia: studio.provincia || '',
      cap: studio.cap || '',
      paese: studio.paese || '',
      email: studio.email || '',
      telefono: studio.telefono || '',
      sitoWeb: studio.sitoWeb || '',
      note: studio.note || '',
    });

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudio(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toastError('Il nome dello studio è obbligatorio');
      return;
    }

    try {
      if (isEditing && selectedStudio) {
        await checkupAdminApi.updateStudio(selectedStudio.id, {
          nome: formData.nome.trim(),
          tipo: formData.tipo,
          ragioneSociale: formData.ragioneSociale.trim(),
          partitaIva: formData.partitaIva.trim(),
          codiceFiscale: formData.codiceFiscale.trim(),
          indirizzo: formData.indirizzo.trim(),
          citta: formData.citta.trim(),
          provincia: formData.provincia.trim(),
          cap: formData.cap.trim(),
          paese: formData.paese.trim(),
          email: formData.email.trim(),
          telefono: formData.telefono.trim(),
          sitoWeb: formData.sitoWeb.trim(),
          note: formData.note.trim(),
        });
        success('Studio aggiornato');
      } else {
        await checkupAdminApi.createStudio({
          nome: formData.nome.trim(),
          tipo: formData.tipo,
          ragioneSociale: formData.ragioneSociale.trim(),
          partitaIva: formData.partitaIva.trim(),
          codiceFiscale: formData.codiceFiscale.trim(),
          indirizzo: formData.indirizzo.trim(),
          citta: formData.citta.trim(),
          provincia: formData.provincia.trim(),
          cap: formData.cap.trim(),
          paese: formData.paese.trim(),
          email: formData.email.trim(),
          telefono: formData.telefono.trim(),
          sitoWeb: formData.sitoWeb.trim(),
          note: formData.note.trim(),
        });
        success('Studio creato');
      }

      handleCloseModal();
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il salvataggio');
    }
  };

  const handleToggleActive = async (studio: CheckupStudio) => {
    const confirmed = await confirm({
      title: studio.attivo ? 'Disattivare studio?' : 'Attivare studio?',
      message: `Sei sicuro di voler ${studio.attivo ? 'disattivare' : 'attivare'} lo studio ${studio.nome}?`,
      confirmText: studio.attivo ? 'Disattiva' : 'Attiva',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      if (studio.attivo) {
        await checkupAdminApi.deactivateStudio(studio.id);
        success('Studio disattivato');
      } else {
        await checkupAdminApi.updateStudio(studio.id, { attivo: true });
        success('Studio attivato');
      }
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante l\'operazione');
    }
  };

  const filteredStudios = hideInactive ? studios.filter((s) => s.attivo) : studios;
  const paginatedStudios = filteredStudios.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredStudios.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione Studi</h1>
          <p className="text-sm text-slate-600 mt-1">Gestisci gli studi licenziatari e clienti.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setHideInactive((prev) => !prev);
              setCurrentPage(1);
            }}
            className="wow-button-ghost"
          >
            {hideInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hideInactive ? 'Mostra disattivati' : 'Nascondi disattivati'}
          </button>
          <button onClick={handleOpenCreate} className="wow-button">
            <Plus className="h-4 w-4" />
            Nuovo studio
          </button>
        </div>
      </div>

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <div className="wow-panel overflow-hidden">
          {filteredStudios.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessuno studio presente</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Studio</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedStudios.map((studio) => (
                  <tr key={studio.id} className={`hover:bg-slate-50/70 ${studio.attivo ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {studio.nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {studio.tipo === 'licenziatario' ? 'Licenziatario' : 'Cliente'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{studio.email || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${studio.attivo ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                        {studio.attivo ? 'Attivo' : 'Disattivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs font-semibold">
                        <button
                          onClick={() => handleOpenEdit(studio)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifica"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(studio)}
                          className={studio.attivo ? 'text-amber-600 hover:text-amber-900' : 'text-emerald-600 hover:text-emerald-700'}
                          title={studio.attivo ? 'Disattiva' : 'Attiva'}
                        >
                          {studio.attivo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="p-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredStudios.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {showModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditing ? 'Modifica studio' : 'Nuovo studio'}
                </h2>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Nome studio</label>
                    <input
                      value={formData.nome}
                      onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Tipo</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={formData.tipo}
                        onChange={(val: string) =>
                          setFormData((p) => ({
                            ...p,
                            tipo: val as 'licenziatario' | 'cliente',
                          }))
                        }
                        options={[
                          { value: 'licenziatario', label: 'Licenziatario' },
                          { value: 'cliente', label: 'Cliente' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Ragione sociale</label>
                    <input
                      value={formData.ragioneSociale}
                      onChange={(e) => setFormData((p) => ({ ...p, ragioneSociale: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Partita IVA</label>
                    <input
                      value={formData.partitaIva}
                      onChange={(e) => setFormData((p) => ({ ...p, partitaIva: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Codice fiscale</label>
                    <input
                      value={formData.codiceFiscale}
                      onChange={(e) => setFormData((p) => ({ ...p, codiceFiscale: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Telefono</label>
                    <input
                      value={formData.telefono}
                      onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Sito web</label>
                    <input
                      value={formData.sitoWeb}
                      onChange={(e) => setFormData((p) => ({ ...p, sitoWeb: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Indirizzo</label>
                  <input
                    value={formData.indirizzo}
                    onChange={(e) => setFormData((p) => ({ ...p, indirizzo: e.target.value }))}
                    className={inputClassName}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Città</label>
                    <input
                      value={formData.citta}
                      onChange={(e) => setFormData((p) => ({ ...p, citta: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Provincia</label>
                    <input
                      value={formData.provincia}
                      onChange={(e) => setFormData((p) => ({ ...p, provincia: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">CAP</label>
                    <input
                      value={formData.cap}
                      onChange={(e) => setFormData((p) => ({ ...p, cap: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Paese</label>
                  <input
                    value={formData.paese}
                    onChange={(e) => setFormData((p) => ({ ...p, paese: e.target.value }))}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Note</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={handleCloseModal} className="wow-button-ghost">
                    Annulla
                  </button>
                  <button type="submit" className="wow-button">
                    {isEditing ? 'Salva' : 'Crea studio'}
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
