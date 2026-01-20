import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Power, PowerOff, X, Save, RotateCcw, EyeOff, Eye, Upload, XCircle } from 'lucide-react';
import { studiApi, type Studio, type CreateStudioDto } from '../api/studi';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { useSecureConfirmDialog } from '../components/ui/SecureConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

export function StudiPage() {
  const { user: currentUser } = useAuth();
  const [studi, setStudi] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [hideDeleted, setHideDeleted] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoToUpload, setLogoToUpload] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;

  const [formData, setFormData] = useState<CreateStudioDto>({
    nome: '',
    ragioneSociale: '',
    partitaIva: '',
    codiceFiscale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    pec: '',
  });

  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { confirm: secureConfirm, SecureConfirmDialog } = useSecureConfirmDialog();

  useEffect(() => {
    loadStudi();
  }, []);

  const loadStudi = async () => {
    setLoading(true);
    try {
      const data = await studiApi.getAll();
      setStudi(data);
    } catch (err: any) {
      toastError(err.message || 'Errore durante il caricamento degli studi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedStudio(null);
    setSubmitAttempted(false);
    setFormData({
      nome: '',
      ragioneSociale: '',
      partitaIva: '',
      codiceFiscale: '',
      indirizzo: '',
      citta: '',
      cap: '',
      provincia: '',
      telefono: '',
      email: '',
      pec: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (studio: Studio) => {
    setIsEditing(true);
    setSelectedStudio(studio);
    setSubmitAttempted(false);
    setLogoPreview(studio.logo || null);
    setLogoToUpload(null);
    setFormData({
      nome: studio.nome,
      ragioneSociale: studio.ragioneSociale || '',
      partitaIva: studio.partitaIva || '',
      codiceFiscale: studio.codiceFiscale || '',
      indirizzo: studio.indirizzo || '',
      citta: studio.citta || '',
      cap: studio.cap || '',
      provincia: studio.provincia || '',
      telefono: studio.telefono || '',
      email: studio.email || '',
      pec: studio.pec || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudio(null);
    setSubmitAttempted(false);
    setLogoPreview(null);
    setLogoToUpload(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validazione campi obbligatori
    if (!formData.nome.trim()) {
      setSubmitAttempted(true);
      toastError('Il nome dello studio è obbligatorio');
      return;
    }

    // Validazione aggiuntiva solo per creazione nuovo studio
    if (!isEditing) {
      if (!formData.email?.trim()) {
        setSubmitAttempted(true);
        toastError('L\'email è obbligatoria per la creazione dello studio');
        return;
      }
      if (!formData.pec?.trim()) {
        setSubmitAttempted(true);
        toastError('La PEC è obbligatoria per la creazione dello studio');
        return;
      }
      if (!formData.partitaIva?.trim()) {
        setSubmitAttempted(true);
        toastError('La Partita IVA è obbligatoria per la creazione dello studio');
        return;
      }
    }

    try {
      if (isEditing && selectedStudio) {
        await studiApi.update(selectedStudio.id, formData);

        // Gestisci upload logo se presente
        if (logoToUpload) {
          await studiApi.uploadLogo(selectedStudio.id, logoToUpload);
        }

        success('Studio aggiornato con successo');
      } else {
        const newStudio = await studiApi.create(formData);

        // Gestisci upload logo per nuovo studio
        if (logoToUpload) {
          await studiApi.uploadLogo(newStudio.id, logoToUpload);
        }

        success('Studio creato con successo');
      }
      loadStudi();
      handleCloseModal();
    } catch (err: any) {
      setSubmitAttempted(true);
      toastError(err.message || 'Errore durante il salvataggio');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica dimensione (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toastError('Il file è troppo grande. Dimensione massima: 2MB');
      return;
    }

    // Verifica tipo
    if (!file.type.startsWith('image/')) {
      toastError('Il file deve essere un\'immagine');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
      setLogoToUpload(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    if (isEditing && selectedStudio && selectedStudio.logo) {
      const confirmed = await confirm({
        title: 'Rimuovere logo?',
        message: 'Sei sicuro di voler rimuovere il logo corrente?',
      });

      if (confirmed) {
        try {
          await studiApi.deleteLogo(selectedStudio.id);
          setLogoPreview(null);
          setLogoToUpload(null);
          success('Logo rimosso con successo');
          loadStudi();
        } catch (err: any) {
          toastError(err.message || 'Errore durante la rimozione del logo');
        }
      }
    } else {
      setLogoPreview(null);
      setLogoToUpload(null);
    }
  };

  const handleToggleActive = async (studio: Studio) => {
    const confirmed = await confirm({
      title: studio.attivo ? 'Disattivare studio?' : 'Attivare studio?',
      message: `Sei sicuro di voler ${studio.attivo ? 'disattivare' : 'attivare'} ${studio.nome}?`,
      confirmText: studio.attivo ? 'Disattiva' : 'Attiva',
      variant: 'warning',
    });

    if (confirmed) {
      try {
        await studiApi.toggleActive(studio.id);
        success(studio.attivo ? 'Studio disattivato' : 'Studio attivato');
        loadStudi();
      } catch (err: any) {
        toastError(err.message || "Errore durante l'operazione");
      }
    }
  };

  const handleDelete = async (studio: Studio) => {
    const confirmed = await secureConfirm({
      title: 'Eliminare studio?',
      message: (
        <>
          <p className="mb-3">
            Stai per eliminare lo studio <strong>{studio.nome}</strong>.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
            <p className="text-blue-800 dark:text-blue-300 text-xs font-medium">
              ℹ️ Questa è un'eliminazione SOFT (reversibile)
            </p>
            <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">
              • Lo studio sarà nascosto ma i dati non verranno cancellati
              <br />
              • Verrà creato un backup automatico
              <br />
              • Potrai ripristinare lo studio in qualsiasi momento
            </p>
          </div>
          <p className="text-amber-600 dark:text-amber-400 font-semibold mb-2 text-sm">
            ⚠️ Lo studio e tutti i suoi dati saranno disattivati:
          </p>
          <ul className="text-left text-xs space-y-1 mb-3 text-slate-600 dark:text-slate-400">
            <li>• Lo studio legale e tutte le sue informazioni</li>
            <li>• Tutti i clienti associati</li>
            <li>• Tutte le pratiche collegate</li>
            <li>• Tutti i debitori</li>
            <li>• Tutti gli utenti dello studio</li>
            <li>• Documenti e comunicazioni</li>
          </ul>
        </>
      ),
      confirmationText: studio.nome,
      confirmText: 'Elimina (soft delete)',
      variant: 'warning',
    });

    if (confirmed) {
      try {
        await studiApi.remove(studio.id);
        success('Studio eliminato con successo. Un backup è stato creato automaticamente.');
        loadStudi();
      } catch (err: any) {
        toastError(err.message || "Errore durante l'eliminazione");
      }
    }
  };

  const handleRestore = async (studio: Studio) => {
    const confirmed = await confirm({
      title: 'Ripristinare studio?',
      message: `Vuoi ripristinare lo studio "${studio.nome}"? Tutti i dati associati torneranno visibili.`,
      confirmText: 'Ripristina',
      variant: 'info',
    });

    if (confirmed) {
      try {
        await studiApi.restore(studio.id);
        success('Studio ripristinato con successo');
        loadStudi();
      } catch (err: any) {
        toastError(err.message || 'Errore durante il ripristino');
      }
    }
  };

  if (currentUser?.ruolo !== 'admin') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <Building2 className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Accesso negato
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Solo gli amministratori possono accedere a questa pagina.
        </p>
      </div>
    );
  }

  // Filtra gli studi in base al toggle
  const filteredStudi = hideDeleted ? studi.filter(s => !s.deletedAt) : studi;

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <span className="wow-chip">Amministrazione</span>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100 display-font">
            Gestione Studi Legali
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Gestisci gli studi legali della piattaforma
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => {
              setHideDeleted(!hideDeleted);
              setCurrentPage(1); // Reset alla prima pagina quando si cambia filtro
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              hideDeleted
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
            title={hideDeleted ? 'Mostra studi eliminati' : 'Nascondi studi eliminati'}
          >
            {hideDeleted ? <Eye size={16} /> : <EyeOff size={16} />}
            {hideDeleted ? 'Mostra eliminati' : 'Nascondi eliminati'}
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="wow-button"
          >
            <Plus size={16} />
            Nuovo studio
          </button>
        </div>
      </div>

      {/* Studios Table */}
      <div className="wow-panel overflow-hidden">
        <table className="min-w-full wow-stagger-rows divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contatti
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                P.IVA / CF
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Stato
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                  Caricamento...
                </td>
              </tr>
            ) : filteredStudi.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                  {hideDeleted ? 'Nessuno studio attivo trovato' : 'Nessuno studio trovato'}
                </td>
              </tr>
            ) : (
              filteredStudi
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((studio) => (
                <tr key={studio.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-semibold text-white">
                        {studio.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {studio.nome}
                        </div>
                        {studio.ragioneSociale && (
                          <div className="text-xs text-slate-500">{studio.ragioneSociale}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      {studio.email || '-'}
                    </div>
                    {studio.telefono && (
                      <div className="text-xs text-slate-500">{studio.telefono}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      {studio.partitaIva || '-'}
                    </div>
                    {studio.codiceFiscale && (
                      <div className="text-xs text-slate-500">{studio.codiceFiscale}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {studio.deletedAt ? (
                      // Se eliminato, mostra solo il badge Eliminato
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        🗑️ Eliminato
                      </span>
                    ) : (
                      // Altrimenti mostra Attivo/Disattivato
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          studio.attivo
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-400'
                        }`}
                      >
                        {studio.attivo ? 'Attivo' : 'Disattivato'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {studio.deletedAt ? (
                        // Mostra solo il pulsante di ripristino per studi eliminati
                        <button
                          onClick={() => handleRestore(studio)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Ripristina studio"
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : (
                        // Mostra azioni normali per studi non eliminati
                        <>
                          <button
                            onClick={() => handleOpenEditModal(studio)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Modifica"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(studio)}
                            className={studio.attivo ? 'text-amber-600 hover:text-amber-900' : 'text-indigo-600 hover:text-indigo-900'}
                            title={studio.attivo ? 'Disattiva' : 'Attiva'}
                          >
                            {studio.attivo ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(studio)}
                            className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300"
                            title="Elimina"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredStudi.length / ITEMS_PER_PAGE)}
          totalItems={filteredStudi.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {isEditing ? 'Modifica studio' : 'Nuovo studio'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nome Studio *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={`mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${
                    submitAttempted && !formData.nome.trim()
                      ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                      : ''
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Ragione Sociale
                  </label>
                  <input
                    type="text"
                    value={formData.ragioneSociale}
                    onChange={(e) => setFormData({ ...formData, ragioneSociale: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Partita IVA {!isEditing && '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.partitaIva}
                    onChange={(e) => setFormData({ ...formData, partitaIva: e.target.value })}
                    className={`mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${
                      submitAttempted && !isEditing && !formData.partitaIva?.trim()
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                        : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Codice Fiscale
                </label>
                <input
                  type="text"
                  value={formData.codiceFiscale}
                  onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Indirizzo
                </label>
                <input
                  type="text"
                  value={formData.indirizzo}
                  onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Città
                  </label>
                  <input
                    type="text"
                    value={formData.citta}
                    onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    CAP
                  </label>
                  <input
                    type="text"
                    value={formData.cap}
                    onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email {!isEditing && '*'}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${
                      submitAttempted && !isEditing && !formData.email?.trim()
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                        : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  PEC {!isEditing && '*'}
                </label>
                <input
                  type="email"
                  value={formData.pec}
                  onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                  className={`mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${
                    submitAttempted && !isEditing && !formData.pec?.trim()
                      ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                      : ''
                  }`}
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Logo Studio
                </label>

                {logoPreview ? (
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-24 w-24 object-contain rounded border border-slate-300 dark:border-slate-600 bg-white p-2"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                        <Upload size={16} />
                        Cambia logo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-600 dark:text-rose-400 dark:hover:bg-rose-900/20"
                      >
                        <XCircle size={16} />
                        Rimuovi logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-32 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Clicca per caricare un logo
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        PNG, JPG fino a 2MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="wow-button-ghost"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="wow-button inline-flex items-center gap-2"
                >
                  <Save size={16} />
                  {isEditing ? 'Aggiorna' : 'Crea'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </BodyPortal>
      )}

      <ConfirmDialog />
      <SecureConfirmDialog />
    </div>
  );
}
