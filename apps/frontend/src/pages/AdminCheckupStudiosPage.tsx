import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Edit2, Power, PowerOff, Eye, EyeOff, UserPlus, Key } from 'lucide-react';
import { checkupAdminApi, type CheckupStudio, type CheckupLicense, type CheckupAdminUser } from '../api/checkupAdmin';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';

export default function AdminCheckupStudiosPage() {
  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('it-IT') : '—';
  };

  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [licenses, setLicenses] = useState<CheckupLicense[]>([]);
  const [users, setUsers] = useState<CheckupAdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<CheckupStudio | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'licenziatario' | 'cliente'>('all');
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
    licenseId: '',
  });

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    ruolo: 'admin_studio' as 'admin_studio' | 'segreteria' | 'collaboratore',
    telefono: '',
  });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedStaffUser, setSelectedStaffUser] = useState<CheckupAdminUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  const loadData = async () => {
    setLoading(true);
    try {
      const [studiosData, licensesData, usersData] = await Promise.all([
        checkupAdminApi.getStudios(),
        checkupAdminApi.getLicenses(),
        checkupAdminApi.getAdminUsers(),
      ]);
      setStudios(studiosData);
      setLicenses(licensesData);
      setUsers(usersData);
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
      licenseId: '',
    });
    setShowStaffForm(false);
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
      licenseId: licenses.find((l) => l.studioId === studio.id)?.id || '',
    });

    setShowStaffForm(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudio(null);
    setShowStaffForm(false);
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
          licenseId: formData.tipo === 'licenziatario' ? formData.licenseId || '' : '',
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

  const handleCreateStaffUser = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedStudio) return;
    if (!staffForm.nome.trim() || !staffForm.cognome.trim() || !staffForm.email.trim() || !staffForm.password) {
      toastError('Compila tutti i campi obbligatori');
      return;
    }
    try {
      await checkupAdminApi.createAdminUser({
        nome: staffForm.nome.trim(),
        cognome: staffForm.cognome.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
        ruolo: staffForm.ruolo,
        studioId: selectedStudio.id,
        telefono: staffForm.telefono || undefined,
      });
      success('Utente studio creato');
      setStaffForm({
        nome: '',
        cognome: '',
        email: '',
        password: '',
        ruolo: 'admin_studio',
        telefono: '',
      });
      setShowStaffForm(false);
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante la creazione utente');
    }
  };

  const handleToggleStaffActive = async (user: CheckupAdminUser) => {
    const confirmed = await confirm({
      title: user.attivo ? 'Disattivare utente?' : 'Attivare utente?',
      message: `Sei sicuro di voler ${user.attivo ? 'disattivare' : 'attivare'} ${user.nome} ${user.cognome}?`,
      confirmText: user.attivo ? 'Disattiva' : 'Attiva',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      if (user.attivo) {
        await checkupAdminApi.deactivateAdminUser(user.id);
        success('Utente disattivato');
      } else {
        await checkupAdminApi.updateAdminUser(user.id, { attivo: true });
        success('Utente attivato');
      }
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante l\'operazione');
    }
  };

  const handleOpenResetPassword = (user: CheckupAdminUser) => {
    setSelectedStaffUser(user);
    setResetPasswordValue('');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUser || !resetPasswordValue) return;
    try {
      await checkupAdminApi.resetAdminPassword(selectedStaffUser.id, resetPasswordValue);
      success('Password reimpostata');
      setShowResetPasswordModal(false);
      setSelectedStaffUser(null);
      setResetPasswordValue('');
    } catch (err: any) {
      toastError(err.message || 'Errore durante il reset password');
    }
  };

  const staffRoleOptions = [
    { value: 'admin_studio', label: 'Admin studio' },
    { value: 'segreteria', label: 'Segreteria' },
    { value: 'collaboratore', label: 'Collaboratore' },
  ];
  const staffRoleLabels: Record<'admin_studio' | 'segreteria' | 'collaboratore', string> = {
    admin_studio: 'Admin studio',
    segreteria: 'Segreteria',
    collaboratore: 'Collaboratore',
  };

  const availableLicenses = licenses.filter(
    (l) => !l.studioId || (selectedStudio && l.studioId === selectedStudio.id),
  );
  const staffUsersForStudio = selectedStudio
    ? users.filter((u) => u.studioId === selectedStudio.id && u.ruolo !== 'cliente')
    : [];

  const filteredStudios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return studios.filter((studio) => {
      if (hideInactive && !studio.attivo) return false;
      if (filterTipo !== 'all' && studio.tipo !== filterTipo) return false;
      if (!term) return true;
      return [
        studio.nome,
        studio.ragioneSociale,
        studio.email,
        studio.partitaIva,
        studio.codiceFiscale,
        studio.citta,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [studios, hideInactive, filterTipo, searchTerm]);
  const paginatedStudios = filteredStudios.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredStudios.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione licenziatari</h1>
          <p className="text-sm text-slate-600 mt-1">Gestisci licenziatari e sublicenziatari.</p>
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

      <div className="wow-panel p-4 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cerca per nome, email o P.IVA"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
          />
        </div>
        <div className="min-w-[220px]">
          <CustomSelect
            value={filterTipo}
            onChange={(val) => {
              setFilterTipo(val as 'all' | 'licenziatario' | 'cliente');
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'Tutti i tipi' },
              { value: 'licenziatario', label: 'Licenziatari' },
              { value: 'cliente', label: 'Sublicenziatari' },
            ]}
            placeholder="Filtra per tipo"
          />
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
            <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditing ? 'Modifica studio' : 'Nuovo studio'}
                </h2>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
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
                            licenseId: val === 'cliente' ? '' : p.licenseId,
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

                {formData.tipo === 'licenziatario' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Licenza assegnata</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={formData.licenseId}
                        onChange={(val) => setFormData((p) => ({ ...p, licenseId: val }))}
                        options={availableLicenses.map((license) => ({
                          value: license.id,
                          label: license.numeroLicenza
                            ? `Licenza #${license.numeroLicenza} · ${license.intestatario}`
                            : `Licenza senza numero · ${license.intestatario}`,
                          sublabel: [
                            license.studio?.nome || 'Non assegnata',
                            license.tipo || 'Tipo n.d.',
                            license.model?.label ? `Modello: ${license.model.label}` : 'Modello: —',
                            `${license.numeroUtenze} utenze`,
                            `${formatDate(license.dataInizioValidita)} → ${formatDate(license.dataScadenza)}`,
                          ].join(' · '),
                        }))}
                        placeholder="Seleziona licenza disponibile"
                        searchable
                        searchPlaceholder="Cerca licenza..."
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Sono disponibili solo le licenze non assegnate o già associate a questo studio.
                    </p>
                  </div>
                )}

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

                {isEditing && selectedStudio && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Utenti dello studio</h3>
                        <p className="text-xs text-slate-500">Crea e consulta gli utenti staff collegati allo studio.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowStaffForm((prev) => !prev)}
                        className="wow-button-ghost"
                      >
                        <UserPlus className="h-4 w-4" />
                        {showStaffForm ? 'Chiudi' : 'Nuovo utente studio'}
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {staffUsersForStudio.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                          Nessun utente staff associato.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {staffUsersForStudio.map((user) => (
                            <div
                              key={user.id}
                              className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <div className="text-slate-900 font-medium">{user.nome} {user.cognome}</div>
                                <div className="text-xs text-slate-500">{user.email}</div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                                  {staffRoleLabels[user.ruolo as 'admin_studio' | 'segreteria' | 'collaboratore']}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 ${user.attivo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {user.attivo ? 'Attivo' : 'Disattivo'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenResetPassword(user)}
                                  className="rounded-full border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:border-blue-300"
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStaffActive(user)}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                    user.attivo
                                      ? 'border-amber-200 text-amber-700 hover:border-amber-300'
                                      : 'border-emerald-200 text-emerald-700 hover:border-emerald-300'
                                  }`}
                                >
                                  {user.attivo ? 'Disattiva' : 'Attiva'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {showStaffForm && (
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Nome</label>
                          <input
                            value={staffForm.nome}
                            onChange={(e) => setStaffForm((p) => ({ ...p, nome: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Cognome</label>
                          <input
                            value={staffForm.cognome}
                            onChange={(e) => setStaffForm((p) => ({ ...p, cognome: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Email</label>
                          <input
                            type="email"
                            value={staffForm.email}
                            onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Password</label>
                          <input
                            type="password"
                            value={staffForm.password}
                            onChange={(e) => setStaffForm((p) => ({ ...p, password: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Ruolo</label>
                          <div className="mt-1">
                            <CustomSelect
                              value={staffForm.ruolo}
                              onChange={(val) =>
                                setStaffForm((p) => ({
                                  ...p,
                                  ruolo: val as 'admin_studio' | 'segreteria' | 'collaboratore',
                                }))
                              }
                              options={staffRoleOptions}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Telefono (opzionale)</label>
                          <input
                            value={staffForm.telefono}
                            onChange={(e) => setStaffForm((p) => ({ ...p, telefono: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setShowStaffForm(false)}
                            className="wow-button-ghost"
                          >
                            Annulla
                          </button>
                          <button type="button" onClick={handleCreateStaffUser} className="wow-button">
                            Crea utente studio
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

      {showResetPasswordModal && selectedStaffUser && (
        <BodyPortal>
          <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">Reimposta password</h2>
                <button
                  onClick={() => setShowResetPasswordModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4 p-6">
                <p className="text-sm text-slate-600">
                  Imposta una nuova password per {selectedStaffUser.nome} {selectedStaffUser.cognome}.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nuova password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowResetPasswordModal(false)} className="wow-button-ghost">
                    Annulla
                  </button>
                  <button type="submit" className="wow-button">
                    <Key className="h-4 w-4" />
                    Reimposta
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
