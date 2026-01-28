// apps/frontend/src/pages/AdminUsersPage.tsx
import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Power, PowerOff, Key, X, Save, EyeOff, Eye, Building2 } from 'lucide-react';
import { usersApi, type CreateUserDto, type UpdateUserDto } from '../api/users';
import type { User, UserRole } from '../api/auth';
import { studiApi, type Studio } from '../api/studi';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { ManageStudiModal } from '../components/ManageStudiModal';

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [studi, setStudi] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showManageStudiModal, setShowManageStudiModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [hideInactive, setHideInactive] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const [formData, setFormData] = useState<CreateUserDto>({
    email: '',
    password: '',
    nome: '',
    cognome: '',
    ruolo: 'collaboratore',
    clienteId: null,
    studioId: null,
  });
  const isStudioRequired = formData.ruolo === 'titolare_studio';

  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    loadUsers();
    loadStudi();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err: any) {
      toastError(err.message || 'Errore durante il caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const loadStudi = async () => {
    try {
      const data = await studiApi.getAllActive();
      setStudi(data);
    } catch (err: any) {
      toastError(err.message || 'Errore durante il caricamento degli studi');
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setSubmitAttempted(false);
    setFormData({
      email: '',
      password: '',
      nome: '',
      cognome: '',
      ruolo: 'collaboratore',
      clienteId: null,
      studioId: null,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setIsEditing(true);
    setSelectedUser(user);
    setSubmitAttempted(false);
    setFormData({
      email: user.email,
      password: '',
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo,
      clienteId: user.clienteId || null,
      studioId: user.studioId || user.studio?.id || null,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setSubmitAttempted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setSubmitAttempted(true);
      toastError('Il nome è obbligatorio');
      return;
    }
    if (!formData.cognome.trim()) {
      setSubmitAttempted(true);
      toastError('Il cognome è obbligatorio');
      return;
    }
    if (!formData.email.trim()) {
      setSubmitAttempted(true);
      toastError('L\'email è obbligatoria');
      return;
    }
    if (!isEditing && !formData.password) {
      setSubmitAttempted(true);
      toastError('La password è obbligatoria');
      return;
    }
    if (isStudioRequired && !formData.studioId) {
      setSubmitAttempted(true);
      toastError('Lo studio è obbligatorio per il titolare');
      return;
    }

    try {
      if (isEditing && selectedUser) {
        const updateDto: UpdateUserDto = {
          email: formData.email,
          nome: formData.nome,
          cognome: formData.cognome,
          ruolo: formData.ruolo,
          clienteId: formData.clienteId,
          studioId: formData.studioId || selectedUser?.studioId || selectedUser?.studio?.id || null,
        };

        // Solo se è stata inserita una nuova password
        if (formData.password) {
          updateDto.password = formData.password;
        }

        await usersApi.update(selectedUser.id, updateDto);
        success('Utente aggiornato con successo');
      } else {
        await usersApi.create(formData);
        success('Utente creato con successo');
      }
      loadUsers();
      handleCloseModal();
    } catch (err: any) {
      setSubmitAttempted(true);
      toastError(err.message || 'Errore durante il salvataggio');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      toastError('Non puoi disattivare il tuo account');
      return;
    }

    const confirmed = await confirm({
      title: user.attivo ? 'Disattivare utente?' : 'Attivare utente?',
      message: `Sei sicuro di voler ${user.attivo ? 'disattivare' : 'attivare'} ${user.nome} ${user.cognome}?`,
      confirmText: user.attivo ? 'Disattiva' : 'Attiva',
      variant: 'warning',
    });

    if (confirmed) {
      try {
        await usersApi.toggleActive(user.id);
        success(user.attivo ? 'Utente disattivato' : 'Utente attivato');
        loadUsers();
      } catch (err: any) {
        toastError(err.message || 'Errore durante l\'operazione');
      }
    }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      toastError('Non puoi eliminare il tuo account');
      return;
    }

    const confirmed = await confirm({
      title: 'Eliminare utente?',
      message: `Sei sicuro di voler eliminare ${user.nome} ${user.cognome}? Questa azione è irreversibile.`,
      confirmText: 'Elimina',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await usersApi.remove(user.id);
        success('Utente eliminato');
        loadUsers();
      } catch (err: any) {
        toastError(err.message || 'Errore durante l\'eliminazione');
      }
    }
  };

  const handleOpenResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const handleOpenManageStudi = (user: User) => {
    setSelectedUser(user);
    setShowManageStudiModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      await usersApi.resetPassword(selectedUser.id, newPassword);
      success('Password reimpostata con successo');
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (err: any) {
      toastError(err.message || 'Errore durante il reset della password');
    }
  };

  const getRuoloBadge = (ruolo: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
      titolare_studio: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400',
      avvocato: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
      collaboratore: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400',
      segreteria: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400',
      cliente: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
    };

    const labels: Record<UserRole, string> = {
      admin: 'Admin',
      titolare_studio: 'Titolare Studio',
      avvocato: 'Avvocato',
      collaboratore: 'Collaboratore',
      segreteria: 'Segreteria',
      cliente: 'Cliente',
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[ruolo]}`}>
        {labels[ruolo]}
      </span>
    );
  };

  if (currentUser?.ruolo !== 'admin') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <Shield className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
          Accesso negato
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Solo gli amministratori possono accedere a questa pagina.
        </p>
      </div>
    );
  }

  // Filtra gli utenti in base al toggle
  const filteredUsers = hideInactive ? users.filter(u => u.attivo) : users;

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <span className="wow-chip">Amministrazione</span>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100 display-font">
            Gestione Utenti
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Gestisci gli utenti del sistema
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => {
              setHideInactive(!hideInactive);
              setCurrentPage(1); // Reset alla prima pagina quando si cambia filtro
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              hideInactive
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
            title={hideInactive ? 'Mostra utenti disattivati' : 'Nascondi utenti disattivati'}
          >
            {hideInactive ? <Eye size={16} /> : <EyeOff size={16} />}
            {hideInactive ? 'Mostra disattivati' : 'Nascondi disattivati'}
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="wow-button"
          >
            <Plus size={16} />
            Nuovo utente
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="wow-panel overflow-hidden">
        <table className="min-w-full wow-stagger-rows divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Utente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Ruolo
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
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                  {hideInactive ? 'Nessun utente attivo trovato' : 'Nessun utente trovato'}
                </td>
              </tr>
            ) : (
              filteredUsers
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-900 to-indigo-500 text-sm font-semibold text-white">
                        {user.nome.charAt(0)}{user.cognome.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {user.nome} {user.cognome}
                        </div>
                        {user.id === currentUser?.id && (
                          <div className="text-xs text-slate-500">(Tu)</div>
                        )}
                        {/* Non mostrare studio per avvocati/collaboratori (possono averne molti) */}
                        {user.ruolo !== 'avvocato' && user.ruolo !== 'collaboratore' && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {user.studio ? user.studio.nome : 'Nessuno studio associato'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-slate-100">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRuoloBadge(user.ruolo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.attivo
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-400'
                      }`}
                    >
                      {user.attivo ? 'Attivo' : 'Disattivato'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Modifica"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenResetPassword(user)}
                        className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                        title="Reset password"
                      >
                        <Key size={16} />
                      </button>
                      {/* Pulsante gestione studi per avvocati/collaboratori */}
                      {(user.ruolo === 'avvocato' || user.ruolo === 'collaboratore') && (
                        <button
                          onClick={() => handleOpenManageStudi(user)}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          title="Gestisci studi"
                        >
                          <Building2 size={16} />
                        </button>
                      )}
                      {/* Nascondi pulsanti Disattiva ed Elimina per admin@resolv.it */}
                      {user.email !== 'admin@resolv.it' && (
                        <>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={user.attivo ? 'text-amber-600 hover:text-amber-900' : 'text-indigo-600 hover:text-indigo-900'}
                            title={user.attivo ? 'Disattiva' : 'Attiva'}
                            disabled={user.id === currentUser?.id}
                          >
                            {user.attivo ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-rose-600 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300"
                            title="Elimina"
                            disabled={user.id === currentUser?.id}
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
          totalPages={Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}
          totalItems={filteredUsers.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {isEditing ? 'Modifica utente' : 'Nuovo utente'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nome
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cognome
                  </label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className={`mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${
                      submitAttempted && !formData.cognome.trim()
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                        : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${
                      submitAttempted && !formData.email.trim()
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                      : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password {isEditing && '(lascia vuoto per non modificare)'}
                </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${
                      submitAttempted && !isEditing && !formData.password
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                      : ''
                  }`}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Ruolo
                </label>
                <div className="mt-1">
                  <CustomSelect
                    options={[
                      { value: 'admin', label: 'Admin' },
                      { value: 'titolare_studio', label: 'Titolare Studio' },
                      { value: 'avvocato', label: 'Avvocato' },
                      { value: 'collaboratore', label: 'Collaboratore' },
                      { value: 'segreteria', label: 'Segreteria' },
                      { value: 'cliente', label: 'Cliente' },
                    ]}
                    value={formData.ruolo}
                    onChange={(value) => setFormData({ ...formData, ruolo: value as UserRole })}
                  />
                </div>
              </div>

              {/* Mostra il campo Studio solo se il ruolo richiede uno studio singolo */}
              {formData.ruolo !== 'admin' &&
                formData.ruolo !== 'cliente' &&
                formData.ruolo !== 'avvocato' &&
                formData.ruolo !== 'collaboratore' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Studio legale {isStudioRequired && '*'}
                  </label>
                  <div className="mt-1">
                    <CustomSelect
                      options={[
                        { value: '', label: 'Nessuno studio' },
                        ...studi.map((studio) => ({
                          value: studio.id,
                          label: studio.nome,
                        })),
                      ]}
                      value={formData.studioId || ''}
                      onChange={(value) => setFormData({ ...formData, studioId: value || null })}
                      triggerClassName={
                        submitAttempted && isStudioRequired && !formData.studioId
                          ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                          : ''
                      }
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
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

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Reimposta password
              </h3>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Imposta una nuova password per {selectedUser.nome} {selectedUser.cognome}
            </p>

            <form onSubmit={handleResetPassword} className="flex-1 overflow-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nuova password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
                  minLength={6}
                  placeholder="Minimo 6 caratteri"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  <Key size={16} />
                  Reimposta
                </button>
              </div>
            </form>
            </div>
          </div>
        </BodyPortal>
      )}

      {showManageStudiModal && selectedUser && (
        <ManageStudiModal
          user={selectedUser}
          onClose={() => {
            setShowManageStudiModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            loadUsers();
          }}
        />
      )}

      <ConfirmDialog />
    </div>
  );
}
