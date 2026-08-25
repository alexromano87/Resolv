import { useEffect, useState } from 'react';
import { Plus, X, Edit2, Key, Power, PowerOff, Eye, EyeOff, Trash2, RotateCcw } from 'lucide-react';
import { checkupAdminApi, createAdminUserOrAssociate, buildAssociateMessage, type CheckupAdminUser, type CheckupStudio, type CheckupClient, type CheckupSublicense } from '../api/checkupAdmin';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { useSecureConfirmDialog } from '../components/ui/SecureConfirmDialog';
import { Pagination } from '../components/Pagination';

export default function AdminCheckupUsersPage() {
  const { success, error: toastError } = useToast();
  const formatUserDisplayName = (user: Pick<CheckupAdminUser, 'titolo' | 'nome' | 'cognome'>) =>
    [user.titolo?.trim(), user.nome, user.cognome].filter(Boolean).join(' ');
  const [users, setUsers] = useState<CheckupAdminUser[]>([]);
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [clients, setClients] = useState<CheckupClient[]>([]);
  const [sublicenses, setSublicenses] = useState<CheckupSublicense[]>([]);
  const [macroAreas, setMacroAreas] = useState<{ code: string; label: string; sortOrder: number }[]>([]);
  const [macroLoading, setMacroLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CheckupAdminUser | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [hideDeleted, setHideDeleted] = useState(true);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStudioId, setFilterStudioId] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    titolo: '',
    email: '',
    password: '',
    studioId: '',
    clientId: '',
    sublicenseId: '',
    azienda: '',
    telefono: '',
    macroAreaAssignments: [] as string[],
    macroAreaOwner: [] as string[],
    superOwner: false,
  });
  const [assignAllMacroAreas, setAssignAllMacroAreas] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  const inputClass = (field: string) =>
    `${inputClassName} ${formErrors[field] ? '!border-rose-300 !ring-2 !ring-rose-200 focus:!border-rose-400 focus:!ring-rose-200' : ''}`;
  const selectTriggerClass = (field: string) =>
    formErrors[field] ? '!border-rose-300 !ring-2 !ring-rose-200 focus:!border-rose-400 focus:!ring-rose-200' : '';
  const labelClass = (_field?: string) => 'block text-sm font-medium text-slate-700 dark:text-slate-300';
  const roleBadges: Record<CheckupAdminUser['ruolo'], { label: string; className: string }> = {
    admin_studio: { label: 'Admin studio', className: 'bg-indigo-100 text-indigo-700' },
    segreteria: { label: 'Segreteria', className: 'bg-cyan-100 text-cyan-700' },
    collaboratore: { label: 'Collaboratore', className: 'bg-blue-100 text-blue-700' },
    cliente: { label: 'Cliente', className: 'bg-orange-100 text-orange-700' },
  };

  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { confirm: secureConfirm, SecureConfirmDialog } = useSecureConfirmDialog();

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, studiosData, clientsData, sublicensesData] = await Promise.all([
        checkupAdminApi.getAdminUsers(true),
        checkupAdminApi.getStudios(),
        checkupAdminApi.getClients(),
        checkupAdminApi.getSublicenses(),
      ]);
      setUsers(usersData);
      setCurrentPage(1);
      setStudios(studiosData);
      setClients(clientsData);
      setSublicenses(sublicensesData);
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
    setFormData({
      nome: '',
      cognome: '',
      titolo: '',
      email: '',
      password: '',
      studioId: '',
      clientId: '',
      sublicenseId: '',
      azienda: '',
      telefono: '',
      macroAreaAssignments: [] as string[],
      macroAreaOwner: [] as string[],
      superOwner: false,
    });
  };

  const handleOpenCreateUser = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormErrors({});
    resetUserForm();
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: CheckupAdminUser) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormErrors({});
    const userSublicense =
      sublicenses.find((s) => s.id === user.sublicenseId) ||
      (user.clientId ? sublicenses.find((s) => s.clientId === user.clientId) : undefined);
    const studioId = userSublicense?.license?.studioId || '';
    setFormData({
      nome: user.nome,
      cognome: user.cognome,
      titolo: user.titolo || '',
      email: user.email,
      password: '',
      studioId,
      clientId: user.clientId || '',
      sublicenseId: userSublicense?.id || '',
      azienda: user.azienda || '',
      telefono: user.telefono || '',
      macroAreaAssignments: Array.isArray(user.macroAreaAssignments)
        ? user.macroAreaAssignments
        : user.macroAreaAssignments
        ? [user.macroAreaAssignments as unknown as string]
        : [],
      macroAreaOwner: Array.isArray(user.macroAreaOwner)
        ? user.macroAreaOwner
        : user.macroAreaOwner
        ? [user.macroAreaOwner as unknown as string]
        : [],
      superOwner: Boolean(user.superOwner),
    });
    setAssignAllMacroAreas(!user.macroAreaAssignments || user.macroAreaAssignments.length === 0);
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setIsEditing(false);
    setSelectedUser(null);
    setFormErrors({});
    setAssignAllMacroAreas(true);
    resetUserForm();
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, boolean> = {};
    if (!formData.nome) nextErrors.nome = true;
    if (!formData.cognome) nextErrors.cognome = true;
    if (!formData.email) nextErrors.email = true;
    if (!formData.studioId) nextErrors.studioId = true;
    if (!formData.clientId) nextErrors.clientId = true;
    if (!formData.sublicenseId) nextErrors.sublicenseId = true;
    if (!isEditing && !formData.password) nextErrors.password = true;
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      toastError('Compila tutti i campi obbligatori');
      return;
    }
    if (!isEditing && selectedClientLimitReached) {
      toastError('Limite utenti sublicenza raggiunto');
      return;
    }
    const userName = [formData.titolo.trim(), formData.nome.trim(), formData.cognome.trim()].filter(Boolean).join(' ');
    const confirmed = await confirm({
      title: isEditing ? 'Confermare modifica utente?' : 'Confermare creazione utente?',
      message: isEditing
        ? `Vuoi salvare le modifiche dell'utente "${userName}"?`
        : `Vuoi creare l'utente "${userName}"?`,
      confirmText: isEditing ? 'Salva modifiche' : 'Crea utente',
      variant: 'info',
    });
    if (!confirmed) return;
    try {
      if (isEditing && selectedUser) {
        await checkupAdminApi.updateAdminUser(selectedUser.id, {
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          titolo: formData.titolo.trim() || undefined,
          email: formData.email.trim(),
          studioId: undefined,
          clientId: formData.clientId,
          sublicenseId: formData.sublicenseId,
          ruolo: 'cliente',
          azienda: formData.azienda || undefined,
          telefono: formData.telefono || undefined,
          macroAreaAssignments: assignAllMacroAreas ? [] : formData.macroAreaAssignments,
          macroAreaOwner: formData.macroAreaOwner,
          superOwner: Boolean(formData.superOwner),
        });
        success('Utente aggiornato');
      } else {
        const created = await createAdminUserOrAssociate({
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          titolo: formData.titolo.trim() || undefined,
          email: formData.email.trim(),
          password: formData.password,
          studioId: undefined,
          clientId: formData.clientId,
          sublicenseId: formData.sublicenseId,
          ruolo: 'cliente',
          azienda: formData.azienda || undefined,
          telefono: formData.telefono || undefined,
          macroAreaAssignments: assignAllMacroAreas ? [] : formData.macroAreaAssignments,
          macroAreaOwner: formData.macroAreaOwner,
          superOwner: Boolean(formData.superOwner),
        }, (conflict) => confirm({
          title: 'Utenza già esistente',
          message: buildAssociateMessage(conflict),
          confirmText: 'Riusa utenza esistente',
          variant: conflict.sameCompany ? 'info' : 'warning',
        }));
        if (!created) return;
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

  const handleDeleteUser = async (user: CheckupAdminUser) => {
    const nome = `${user.nome} ${user.cognome}`.trim();
    const confirmed = await secureConfirm({
      title: 'Eliminare utenza?',
      message: (
        <>
          <p className="mb-3">Stai per eliminare l'utenza <strong>{nome}</strong> ({user.email}).</p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            ℹ️ Eliminazione <strong>SOFT (reversibile)</strong>: l'intera identità (tutti i contesti) viene nascosta e il login bloccato; potrai ripristinarla in qualsiasi momento.
          </div>
        </>
      ),
      confirmationText: nome,
      confirmText: 'Elimina (soft delete)',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await checkupAdminApi.deleteAdminUser(user.id);
      success('Utenza eliminata');
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante l\'eliminazione');
    }
  };

  const handleRestoreUser = async (user: CheckupAdminUser) => {
    try {
      await checkupAdminApi.restoreAdminUser(user.id);
      success('Utenza ripristinata');
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il ripristino');
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
  const clientUsers = users.filter((u) => u.ruolo === 'cliente');
  const activeUsersBySublicense = clientUsers.reduce<Record<string, number>>((acc, user) => {
    if (user.attivo && user.sublicenseId) {
      acc[user.sublicenseId] = (acc[user.sublicenseId] || 0) + 1;
    }
    return acc;
  }, {});
  const sublicensesById = new Map(sublicenses.map((s) => [s.id, s]));
  const sublicensesByStudio = sublicenses.filter(
    (s) => s.license?.studioId && s.license?.studioId === formData.studioId,
  );
  const clientIdsForStudio = new Set(
    sublicensesByStudio.filter((s) => s.clientId).map((s) => s.clientId as string),
  );
  const clientsForStudio = clients.filter((c) => clientIdsForStudio.has(c.id));
  const sublicensesForClient = sublicensesByStudio.filter((s) => s.clientId === formData.clientId);
  const selectedSublicense = formData.sublicenseId
    ? sublicensesForClient.find((s) => s.id === formData.sublicenseId) || null
    : null;

  useEffect(() => {
    const modelId = selectedSublicense?.modelId || null;
    if (!modelId) {
      setMacroAreas([]);
      return;
    }
    setMacroLoading(true);
    checkupAdminApi
      .getMacroAreasByModel(modelId)
      .then((data) => {
        const filtered = data
          .filter((m) => m.code !== 'k' && !m.label.toLowerCase().includes('owner'))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setMacroAreas(filtered);
      })
      .catch(() => setMacroAreas([]))
      .finally(() => setMacroLoading(false));
  }, [selectedSublicense?.modelId]);

  useEffect(() => {
    if (macroAreas.length === 0) return;
    const allowed = new Set(macroAreas.map((m) => m.code));
    const filteredAssignments = formData.macroAreaAssignments.filter((macro) => allowed.has(macro));
    const assignmentSet = new Set(assignAllMacroAreas ? macroAreas.map((m) => m.code) : filteredAssignments);
    const filtered = formData.macroAreaOwner.filter((macro) => allowed.has(macro));
    const filteredOwners = filtered.filter((macro) => assignmentSet.has(macro));
    if (
      filteredAssignments.length !== formData.macroAreaAssignments.length
      || filteredOwners.length !== formData.macroAreaOwner.length
    ) {
      setFormData((prev) => ({
        ...prev,
        macroAreaAssignments: filteredAssignments,
        macroAreaOwner: filteredOwners,
      }));
    }
  }, [assignAllMacroAreas, macroAreas, formData.macroAreaAssignments, formData.macroAreaOwner]);

  useEffect(() => {
    if (!formData.clientId) return;
    if (sublicensesForClient.length === 1 && !formData.sublicenseId) {
      setFormData((p) => ({ ...p, sublicenseId: sublicensesForClient[0].id }));
    }
  }, [formData.clientId, formData.sublicenseId, sublicensesForClient]);
  const selectedClientActiveCount = formData.sublicenseId
    ? activeUsersBySublicense[formData.sublicenseId] || 0
    : 0;
  const selectedClientLimitReached =
    !isEditing && Boolean(selectedSublicense && selectedClientActiveCount >= selectedSublicense.numeroUtenze);
  const limitReachedBySublicense = new Map<string, boolean>();
  sublicenses.forEach((s) => {
    const activeCount = activeUsersBySublicense[s.id] || 0;
    if (activeCount >= s.numeroUtenze) {
      limitReachedBySublicense.set(s.id, true);
    }
  });
  const submitLimitReached = selectedClientLimitReached;
  const filteredUsers = clientUsers.filter((u) => {
    if (hideDeleted && u.deletedAt) return false;
    if (hideInactive && !u.attivo) return false;
    if (filterStudioId) {
      const studioId = u.sublicenseId ? sublicensesById.get(u.sublicenseId)?.license?.studio?.id : undefined;
      if (studioId !== filterStudioId) return false;
    }
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [
      u.nome,
      u.cognome,
      u.titolo,
      u.email,
      u.client?.nome,
      u.azienda,
      u.sublicense?.numeroSublicenza,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Amministrazione</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione utenti</h1>
          <p className="text-sm text-slate-600 mt-1">Gestisci gli utenti cliente collegati agli studi checkup.</p>
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
          <button
            onClick={() => {
              setHideDeleted((prev) => !prev);
              setCurrentPage(1);
            }}
            className="wow-button-ghost"
          >
            {hideDeleted ? <Trash2 className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hideDeleted ? 'Mostra eliminati' : 'Nascondi eliminati'}
          </button>
          <button onClick={handleOpenCreateUser} className="wow-button">
            <Plus className="h-4 w-4" />
            Nuovo utente
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
            placeholder="Cerca per nome, email, cliente o sublicenza"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
          />
        </div>
        <div className="min-w-[240px]">
          <CustomSelect
            value={filterStudioId}
            onChange={(val) => {
              setFilterStudioId(val);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'Tutti gli studi' },
              ...licenziatariStudios.map((s) => ({ value: s.id, label: s.nome })),
            ]}
            placeholder="Filtra per studio"
            searchable
            searchPlaceholder="Cerca studio..."
          />
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
                  <th className="px-4 py-3 text-left">Ruolo</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Sublicenza</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50/70 ${u.attivo ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatUserDisplayName(u)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadges[u.ruolo].className}`}>
                        {roleBadges[u.ruolo].label}
                      </span>
                      {u.ruolo === 'cliente' && u.superOwner && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                          Super-owner
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {u.client?.ragioneSociale || u.client?.nome || u.azienda || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>{u.sublicense?.numeroSublicenza || '—'}</span>
                        {u.sublicense?.id && limitReachedBySublicense.get(u.sublicense.id) && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                            Limite utenti
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {u.deletedAt ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">Eliminato</span>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${u.attivo ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.attivo ? 'Attivo' : 'Disattivo'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs font-semibold">
                        {u.deletedAt ? (
                          <button
                            onClick={() => handleRestoreUser(u)}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Ripristina"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
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
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="text-rose-600 hover:text-rose-800"
                              title="Elimina"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
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
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditing ? 'Modifica utente checkup' : 'Nuovo utente checkup'}
                </h2>
                <button onClick={handleCloseUserModal} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitUser} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Titolo</label>
                    <input
                      value={formData.titolo}
                      onChange={(e) => setFormData((p) => ({ ...p, titolo: e.target.value }))}
                      className={inputClassName}
                      placeholder="Es. Dr., Dr.ssa, Avv."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className={labelClass('nome')}>Nome <span className="text-rose-600">*</span></label>
                    <input
                      value={formData.nome}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, nome: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, nome: false }));
                      }}
                      className={inputClass('nome')}
                    />
                  </div>
                  <div>
                    <label className={labelClass('cognome')}>Cognome <span className="text-rose-600">*</span></label>
                    <input
                      value={formData.cognome}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, cognome: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, cognome: false }));
                      }}
                      className={inputClass('cognome')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className={labelClass('studioId')}>Studio <span className="text-rose-600">*</span></label>
                    <div className="mt-1">
                      <CustomSelect
                        value={formData.studioId}
                        onChange={(val) => {
                          setFormData((p) => ({
                            ...p,
                            studioId: val,
                            clientId: '',
                            sublicenseId: '',
                          }));
                          setFormErrors((prev) => ({ ...prev, studioId: false }));
                        }}
                        options={licenziatariStudios.map((s) => ({ value: s.id, label: s.nome }))}
                        placeholder="Seleziona studio"
                        triggerClassName={selectTriggerClass('studioId')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass('email')}>Email <span className="text-rose-600">*</span></label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, email: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, email: false }));
                      }}
                      className={inputClass('email')}
                    />
                  </div>
                  {!isEditing && (
                    <div>
                      <label className={labelClass('password')}>Password <span className="text-rose-600">*</span></label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, password: e.target.value }));
                          setFormErrors((prev) => ({ ...prev, password: false }));
                        }}
                        className={inputClass('password')}
                      />
                    </div>
                  )}
                  <div>
                    <label className={labelClass('clientId')}>Cliente <span className="text-rose-600">*</span></label>
                    <div className="mt-1">
                      <CustomSelect
                        value={formData.clientId}
                        onChange={(val) => {
                          setFormData((p) => ({
                            ...p,
                            clientId: val,
                            sublicenseId: '',
                            macroAreaAssignments: [],
                            macroAreaOwner: [],
                          }));
                          setFormErrors((prev) => ({ ...prev, clientId: false }));
                        }}
                        options={clientsForStudio.map((c) => ({ value: c.id, label: c.ragioneSociale || c.nome || 'Cliente senza nome' }))}
                        placeholder="Seleziona cliente"
                        triggerClassName={selectTriggerClass('clientId')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass('sublicenseId')}>Sublicenza <span className="text-rose-600">*</span></label>
                    <div className="mt-1">
                      <CustomSelect
                        value={formData.sublicenseId}
                        onChange={(val) => {
                          setFormData((p) => ({ ...p, sublicenseId: val }));
                          setFormErrors((prev) => ({ ...prev, sublicenseId: false }));
                        }}
                        options={sublicensesForClient.map((s) => ({
                          value: s.id,
                          label: s.numeroSublicenza ? `#${s.numeroSublicenza}` : 'Senza numero',
                          sublabel: `Utenze ${s.numeroUtenze} · ${s.dataInizioValidita || '—'} → ${s.dataScadenza || '—'}`,
                        }))}
                        placeholder="Seleziona sublicenza"
                        triggerClassName={selectTriggerClass('sublicenseId')}
                      />
                    </div>
                    {formData.sublicenseId && selectedSublicense ? (
                      <div
                        className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                          selectedClientLimitReached
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        Utenti attivi: {selectedClientActiveCount}/{selectedSublicense.numeroUtenze}
                        {selectedClientLimitReached && ' • Limite raggiunto'}
                      </div>
                    ) : formData.clientId ? (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Nessuna sublicenza disponibile per il cliente selezionato.
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Azienda (opzionale)</label>
                    <input
                      value={formData.azienda}
                      onChange={(e) => setFormData((p) => ({ ...p, azienda: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Telefono (opzionale)</label>
                    <input
                      value={formData.telefono}
                      onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
                  <label className="flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.superOwner)}
                      onChange={(e) => setFormData((p) => ({ ...p, superOwner: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"
                    />
                    <span>
                      <span className="font-medium text-slate-900">Super-owner</span>
                      <span className="mt-1 block text-xs text-slate-600">
                        Può visualizzare tutte le macro aree e validare il checkup finale quando tutte le sezioni e le macro aree risultano validate.
                      </span>
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Macro aree assegnate</label>
                  <div className="mt-1 space-y-2">
                    <p className="text-xs text-slate-500">Seleziona le macro aree visibili/modificabili da questo utente. Se lasci “tutte”, l’utente potrà lavorare su tutte le macro aree.</p>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={assignAllMacroAreas}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAssignAllMacroAreas(checked);
                          if (checked) {
                            setFormData((p) => ({ ...p, macroAreaAssignments: [] }));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        disabled={!selectedSublicense}
                      />
                      <span>Tutte le macro aree</span>
                    </label>
                    {!assignAllMacroAreas && (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                        {macroLoading && (
                          <div className="py-2 text-xs text-slate-500">Caricamento macro aree...</div>
                        )}
                        {!macroLoading && macroAreas.length === 0 && (
                          <div className="py-2 text-xs text-slate-500">Nessuna macro area disponibile.</div>
                        )}
                        {!macroLoading && macroAreas.length > 0 && (
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {macroAreas.map((macro) => {
                              const checked = formData.macroAreaAssignments.includes(macro.code);
                              return (
                                <label key={macro.code} className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? Array.from(new Set([...formData.macroAreaAssignments, macro.code]))
                                        : formData.macroAreaAssignments.filter((m) => m !== macro.code);
                                      setFormData((p) => ({
                                        ...p,
                                        macroAreaAssignments: next,
                                        macroAreaOwner: p.macroAreaOwner.filter((m) => next.includes(m)),
                                      }));
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                    disabled={!selectedSublicense}
                                  />
                                  <span>{macro.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Macro aree owner</label>
                  <div className="mt-1 space-y-2">
                    <p className="text-xs text-slate-500">Opzionale: seleziona solo le macro aree assegnate di cui questo utente è owner. Le validazioni saranno consentite solo su queste aree.</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.macroAreaOwner.length === 0 ? (
                        <span className="text-xs text-slate-500">Nessuna macro area selezionata.</span>
                      ) : (
                        formData.macroAreaOwner.map((macro) => {
                          const label = macroAreas.find((m) => m.code === macro)?.label || macro;
                          return (
                            <span
                              key={macro}
                              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                            >
                              {label}
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((p) => ({
                                    ...p,
                                    macroAreaOwner: p.macroAreaOwner.filter((m) => m !== macro),
                                  }))
                                }
                                className="text-indigo-500 hover:text-indigo-700"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      {macroLoading && (
                        <div className="py-2 text-xs text-slate-500">Caricamento macro aree...</div>
                      )}
                      {!macroLoading && macroAreas.length === 0 && (
                        <div className="py-2 text-xs text-slate-500">Nessuna macro area disponibile.</div>
                      )}
                      {!macroLoading && macroAreas.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {macroAreas
                            .filter((macro) => assignAllMacroAreas || formData.macroAreaAssignments.includes(macro.code))
                            .map((macro) => {
                            const checked = formData.macroAreaOwner.includes(macro.code);
                            return (
                              <label key={macro.code} className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? Array.from(new Set([...formData.macroAreaOwner, macro.code]))
                                      : formData.macroAreaOwner.filter((m) => m !== macro.code);
                                    setFormData((p) => ({ ...p, macroAreaOwner: next }));
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                  disabled={!selectedSublicense}
                                />
                                <span>{macro.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedSublicense && !macroLoading && macroAreas.length === 0 && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Nessuna macro area disponibile per il modello selezionato.
                    </div>
                  )}
                </div>
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
                  <button type="button" onClick={handleCloseUserModal} className="wow-button-ghost">
                    Annulla
                  </button>
                  <button type="submit" className="wow-button" disabled={submitLimitReached}>
                    {submitLimitReached ? 'Limite raggiunto' : isEditing ? 'Salva' : 'Crea utente'}
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
      <SecureConfirmDialog />
    </div>
  );
}
