import { useEffect, useState } from 'react';
import { Plus, X, Edit2, Key, Power, PowerOff, Eye, EyeOff } from 'lucide-react';
import { checkupAdminApi, type CheckupAdminUser, type CheckupLicense, type CheckupStudio } from '../api/checkupAdmin';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';

export default function AdminCheckupUsersPage() {
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<CheckupAdminUser[]>([]);
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [licenses, setLicenses] = useState<CheckupLicense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CheckupAdminUser | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    studioId: '',
    telefono: '',
  });
  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  const { confirm, ConfirmDialog } = useConfirmDialog();

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, studiosData, licensesData] = await Promise.all([
        checkupAdminApi.getAdminUsers(),
        checkupAdminApi.getStudios(),
        checkupAdminApi.getLicenses(),
      ]);
      setUsers(usersData);
      setCurrentPage(1);
      setStudios(studiosData);
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

  const resetUserForm = () => {
    setFormData({ nome: '', cognome: '', email: '', password: '', studioId: '', telefono: '' });
  };

  const handleOpenCreateUser = () => {
    setIsEditing(false);
    setSelectedUser(null);
    resetUserForm();
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: CheckupAdminUser) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormData({
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      password: '',
      studioId: user.studioId || '',
      telefono: user.telefono || '',
    });
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setIsEditing(false);
    setSelectedUser(null);
    resetUserForm();
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.cognome || !formData.email || !formData.studioId) {
      toastError('Compila tutti i campi obbligatori');
      return;
    }
    if (!isEditing && !formData.password) {
      toastError('La password è obbligatoria');
      return;
    }
    if (!isEditing && selectedLicense && selectedActiveCount >= selectedLicense.numeroUtenze) {
      toastError('Limite utenti licenza raggiunto');
      return;
    }
    try {
      if (isEditing && selectedUser) {
        await checkupAdminApi.updateAdminUser(selectedUser.id, {
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          email: formData.email.trim(),
          studioId: formData.studioId,
          telefono: formData.telefono || undefined,
        });
        success('Utente aggiornato');
      } else {
        await checkupAdminApi.createAdminUser({
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          email: formData.email.trim(),
          password: formData.password,
          studioId: formData.studioId,
          telefono: formData.telefono || undefined,
        });
        success('Utente creato');
      }
      setShowUserModal(false);
      resetUserForm();
      setIsEditing(false);
      setSelectedUser(null);
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il salvataggio');
    }
  };

  const handleToggleActive = async (user: CheckupAdminUser) => {
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
    setSelectedUser(user);
    setResetPasswordValue('');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPasswordValue) return;
    try {
      await checkupAdminApi.resetAdminPassword(selectedUser.id, resetPasswordValue);
      success('Password reimpostata');
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setResetPasswordValue('');
    } catch (err: any) {
      toastError(err.message || 'Errore durante il reset password');
    }
  };

  const licenziatariStudios = studios.filter((s) => s.tipo === 'licenziatario');
  const licensesByStudio = new Map(licenses.map((license) => [license.studioId, license]));
  const activeUsersByStudio = users.reduce<Record<string, number>>((acc, user) => {
    if (user.attivo && user.studioId) {
      acc[user.studioId] = (acc[user.studioId] || 0) + 1;
    }
    return acc;
  }, {});
  const limitReachedByStudio = new Map<string, boolean>();
  licenses.forEach((license) => {
    const activeCount = activeUsersByStudio[license.studioId] || 0;
    if (activeCount >= license.numeroUtenze) {
      limitReachedByStudio.set(license.studioId, true);
    }
  });
  const selectedLicense = formData.studioId ? licensesByStudio.get(formData.studioId) || null : null;
  const selectedActiveCount = formData.studioId ? activeUsersByStudio[formData.studioId] || 0 : 0;
  const limitReached =
    !isEditing && Boolean(selectedLicense && selectedActiveCount >= selectedLicense.numeroUtenze);
  const filteredUsers = hideInactive ? users.filter((u) => u.attivo) : users;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Amministrazione</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione utenti</h1>
          <p className="text-sm text-slate-600 mt-1">Gestisci gli utenti admin delle aziende licenziatarie.</p>
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
          <button onClick={handleOpenCreateUser} className="wow-button">
            <Plus className="h-4 w-4" />
            Nuovo utente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <div className="wow-panel overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessun utente presente</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Utente</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Studio</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50/70 ${u.attivo ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.nome} {u.cognome}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>{u.studio?.nome || '—'}</span>
                        {u.studio?.id && limitReachedByStudio.get(u.studio.id) && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                            Limite utenti
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${u.attivo ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.attivo ? 'Attivo' : 'Disattivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs font-semibold">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifica"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenResetPassword(u)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Reset password"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={u.attivo ? 'text-amber-600 hover:text-amber-900' : 'text-emerald-600 hover:text-emerald-700'}
                          title={u.attivo ? 'Disattiva' : 'Attiva'}
                        >
                          {u.attivo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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
              totalItems={filteredUsers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}


      {showUserModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditing ? 'Modifica admin licenziatario' : 'Nuovo admin licenziatario'}
                </h2>
                <button onClick={handleCloseUserModal} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitUser} className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
                    <input
                      value={formData.nome}
                      onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cognome</label>
                    <input
                      value={formData.cognome}
                      onChange={(e) => setFormData((p) => ({ ...p, cognome: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className={inputClassName}
                  />
                </div>
                {!isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Studio</label>
                  <div className="mt-1">
                    <CustomSelect
                      value={formData.studioId}
                      onChange={(val) => setFormData((p) => ({ ...p, studioId: val }))}
                      options={licenziatariStudios.map((s) => ({ value: s.id, label: s.nome }))}
                      placeholder="Seleziona studio"
                    />
                  </div>
                  {selectedLicense && (
                    <div
                      className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                        limitReached
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      Utenti attivi: {selectedActiveCount}/{selectedLicense.numeroUtenze}
                      {limitReached && ' • Limite raggiunto'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Telefono (opzionale)</label>
                  <input
                    value={formData.telefono}
                    onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))}
                    className={inputClassName}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={handleCloseUserModal} className="wow-button-ghost">
                    Annulla
                  </button>
                  <button type="submit" className="wow-button" disabled={limitReached}>
                    {limitReached ? 'Limite raggiunto' : isEditing ? 'Salva' : 'Crea admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </BodyPortal>
      )}

      {showResetPasswordModal && selectedUser && (
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
                  Imposta una nuova password per {selectedUser.nome} {selectedUser.cognome}.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nuova password</label>
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
