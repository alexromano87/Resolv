import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Edit2, Key, Power, PowerOff, Eye, EyeOff } from 'lucide-react';
import { usersApi, CreateCheckupUserPayload } from '../api/users';
import { CheckupUser } from '../api/auth';
import { studiosApi, CheckupClientRecord, CheckupSublicenseOption, CheckupLicenseInfo } from '../api/studios';
import { CustomSelect } from '../components/CustomSelect';
import { Pagination } from '../components/Pagination';
import { ModalPortal } from '../components/ModalPortal';

const ROLE_LABELS: Record<string, string> = {
  admin_studio: 'Admin Studio',
  segreteria: 'Segreteria',
  collaboratore: 'Collaboratore',
  cliente: 'Cliente',
};

export default function StudioUsersPage({ embedded = false }: { embedded?: boolean }) {
  const [users, setUsers] = useState<CheckupUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientStudios, setClientStudios] = useState<CheckupClientRecord[]>([]);
  const [sublicenses, setSublicenses] = useState<CheckupSublicenseOption[]>([]);
  const [licenseInfo, setLicenseInfo] = useState<CheckupLicenseInfo | null>(null);
  const [usage, setUsage] = useState<{
    license: { studioId: string; maxUsers: number | null; activeUsers: number };
    clients: Array<{ clientId: string | null; maxUsers: number; activeUsers: number }>;
  } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CheckupUser | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [confirmAction, setConfirmAction] = useState<{
    user: CheckupUser;
    action: 'deactivate' | 'activate';
  } | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [formData, setFormData] = useState<CreateCheckupUserPayload>({
    email: '',
    password: '',
    nome: '',
    cognome: '',
    telefono: '',
    ruolo: 'cliente',
    clientId: '',
    azienda: '',
  });

  const loadUsers = (nextIncludeInactive?: boolean) => {
    const include = nextIncludeInactive ?? includeInactive;
    setLoading(true);
    setError('');
    usersApi.getAll(search.trim() || undefined, include)
      .then((data) => {
        setUsers(data);
        setHasSearched(true);
        setCurrentPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadUsage = () => {
    setUsageLoading(true);
    usersApi.getUsage()
      .then(setUsage)
      .catch(() => {
        // ignore usage errors
      })
      .finally(() => setUsageLoading(false));
  };

  useEffect(() => {
    studiosApi.listClientStudios()
      .then(setClientStudios)
      .catch(() => {
        // ignore errors for studios list
      });
    studiosApi.listSublicenses()
      .then(setSublicenses)
      .catch(() => {
        // ignore errors for sublicenses list
      });
    studiosApi.getMyStudio()
      .then((data) => setLicenseInfo(data.license ?? null))
      .catch(() => {
        // ignore errors for license info
      });
    loadUsage();
  }, []);

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      nome: '',
      cognome: '',
      telefono: '',
      ruolo: 'cliente',
      clientId: '',
      azienda: '',
    });
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setError('');
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (user: CheckupUser) => {
    const safeRole = user.ruolo === 'superadmin' ? 'admin_studio' : user.ruolo;
    setIsEditing(true);
    setSelectedUser(user);
    setError('');
    setFormData({
      email: user.email,
      password: '',
      nome: user.nome,
      cognome: user.cognome,
      telefono: user.telefono || '',
      ruolo: safeRole,
      clientId: user.clientId || '',
      azienda: user.azienda || '',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setSelectedUser(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nome.trim() || !formData.cognome.trim() || !formData.email.trim()) {
      setError('Compila i campi obbligatori');
      return;
    }
    if (!isEditing && !formData.password) {
      setError('La password è obbligatoria');
      return;
    }
    if (formData.ruolo === 'cliente' && !formData.clientId) {
      setError('Seleziona il cliente per l\'utente');
      return;
    }
    if (!isEditing && usage) {
      if (formData.ruolo === 'cliente') {
        if (clientLimitReached) {
          setError('Limite utenti della sublicenza raggiunto');
          return;
        }
      } else if (licenseLimitReached) {
        setError('Limite utenti licenza raggiunto');
        return;
      }
    }

    try {
      if (isEditing && selectedUser) {
        await usersApi.update(selectedUser.id, {
          email: formData.email.trim(),
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          telefono: formData.telefono,
          azienda: formData.azienda,
          ruolo: formData.ruolo,
          clientId: formData.ruolo === 'cliente' ? formData.clientId : null,
        });
      } else {
        const payload: CreateCheckupUserPayload = {
          ...formData,
          email: formData.email.trim(),
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          clientId: formData.ruolo === 'cliente' ? formData.clientId : undefined,
        };
        await usersApi.create(payload);
      }
      handleCloseForm();
      resetForm();
      loadUsers();
      loadUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    }
  };

  const handleToggleActive = (user: CheckupUser) => {
    setConfirmAction({ user, action: user.attivo ? 'deactivate' : 'activate' });
  };

  const handleConfirmToggle = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.action === 'deactivate') {
        await usersApi.deactivate(confirmAction.user.id);
      } else {
        await usersApi.update(confirmAction.user.id, { attivo: true });
      }
      setConfirmAction(null);
      loadUsers();
      loadUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'operazione');
      setConfirmAction(null);
    }
  };

  const handleOpenResetPassword = (user: CheckupUser) => {
    setSelectedUser(user);
    setResetPasswordValue('');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPasswordValue) return;
    try {
      await usersApi.resetPassword(selectedUser.id, resetPasswordValue);
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setResetPasswordValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il reset password');
    }
  };

  const headerTitle = embedded ? 'Utenti' : 'Gestione Utenti';
  const headerSubtitle = embedded
    ? 'Gestisci gli utenti dello studio e dei clienti abilitati.'
    : 'Crea e gestisci gli utenti del modulo Checkup.';
  const filteredUsers = includeInactive ? users : users.filter((u) => u.attivo);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const clientUsageMap = useMemo(() => {
    const map = new Map<string, { maxUsers: number; activeUsers: number }>();
    usage?.clients.forEach((c) => {
      if (c.clientId) {
        map.set(c.clientId, { maxUsers: c.maxUsers, activeUsers: c.activeUsers });
      }
    });
    return map;
  }, [usage]);

  const sublicenseByClientId = useMemo(() => {
    const map = new Map<string, CheckupSublicenseOption>();
    sublicenses.forEach((s) => {
      if (s.clientId) {
        map.set(s.clientId, s);
      }
    });
    return map;
  }, [sublicenses]);

  const licenseLimitReached =
    usage?.license.maxUsers !== null &&
    usage?.license.maxUsers !== undefined &&
    usage.license.activeUsers >= usage.license.maxUsers;

  const selectedClientUsage = formData.clientId ? clientUsageMap.get(formData.clientId) : null;
  const clientLimitReached = selectedClientUsage
    ? selectedClientUsage.activeUsers >= selectedClientUsage.maxUsers
    : false;
  const limitReachedForNewUser =
    !isEditing &&
    (formData.ruolo === 'cliente'
      ? Boolean(formData.clientId && clientLimitReached)
      : Boolean(licenseLimitReached));

  return (
    <div className="space-y-6 wow-stagger">
      <div className={`${embedded ? 'wow-panel' : 'wow-card'} p-6 md:p-8 space-y-4`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
          <span className="wow-chip">Studio</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">{headerTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{headerSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const next = !includeInactive;
                setIncludeInactive(next);
                setCurrentPage(1);
                if (hasSearched) loadUsers(next);
              }}
              className="wow-button-ghost"
              title={includeInactive ? 'Nascondi utenti disattivati' : 'Mostra utenti disattivati'}
            >
              {includeInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {includeInactive ? 'Nascondi disattivati' : 'Mostra disattivati'}
            </button>
            <button
              onClick={handleOpenCreate}
              className="wow-button"
            >
              <Plus className="h-4 w-4" />
              Nuovo Utente
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">Ricerca</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome, email, ruolo o azienda..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
            />
          </div>
          <button
            onClick={() => loadUsers()}
            className="wow-button"
          >
            Cerca
          </button>
        </div>
      </div>

      {error && (
        <div className="wow-panel border-rose-200 bg-rose-50/80 p-4 text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : hasSearched ? (
        <div className="wow-panel overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              {includeInactive ? 'Nessun utente registrato' : 'Nessun utente attivo trovato'}
            </div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Utente</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Ruolo</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-left">Azienda</th>
                  <th className="px-4 py-3 text-left">Studio/Cliente</th>
                  <th className="px-4 py-3 text-left">Licenza</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50/70 ${u.attivo ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {u.nome} {u.cognome}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                        {ROLE_LABELS[u.ruolo] || u.ruolo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${u.attivo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.attivo ? 'Attivo' : 'Disattivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.azienda || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {u.ruolo === 'cliente' ? (u.client?.nome || '—') : (u.studio?.nome || '—')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {(() => {
                        if (u.ruolo === 'cliente' && u.clientId) {
                          const s = sublicenseByClientId.get(u.clientId);
                          if (!s) return '—';
                          const licenseNumber = s.license?.numeroLicenza || '—';
                          const sublicenseNumber = s.numeroSublicenza || '—';
                          return `Licenza ${licenseNumber} · Sublicenza ${sublicenseNumber}`;
                        }
                        if (licenseInfo) {
                          return `Licenza ${licenseInfo.numeroLicenza || '—'}`;
                        }
                        return '—';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs font-semibold">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifica"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenResetPassword(u)}
                          className="text-orange-600 hover:text-orange-800"
                          title="Reset password"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={u.attivo ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}
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
      ) : (
        <div className="wow-panel p-10 text-center text-slate-500">
          Inserisci un criterio di ricerca e clicca su “Cerca”.
        </div>
      )}

      {showForm && (
        <ModalPortal>
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? 'Modifica Utente' : 'Nuovo Utente'}
              </h2>
              <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Nome</label>
                  <input
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Cognome</label>
                  <input
                    required
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {!isEditing && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Password temporanea</label>
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Ruolo</label>
                  <div className="mt-1">
                    <CustomSelect
                      value={formData.ruolo}
                      onChange={(value) => {
                        const ruolo = value as CreateCheckupUserPayload['ruolo'];
                        setFormData((prev) => ({
                          ...prev,
                          ruolo,
                          clientId: ruolo === 'cliente' ? prev.clientId : '',
                        }));
                      }}
                      options={[
                        { value: 'cliente', label: 'Cliente' },
                        { value: 'segreteria', label: 'Segreteria' },
                        { value: 'collaboratore', label: 'Collaboratore' },
                        { value: 'admin_studio', label: 'Admin Studio' },
                      ]}
                      triggerClassName="rounded-xl border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  {formData.ruolo !== 'cliente' && usage && (
                    <div
                      className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                        licenseLimitReached
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      Utenti licenza: {usage.license.activeUsers}/{usage.license.maxUsers ?? '—'}
                      {licenseLimitReached && ' • Limite raggiunto'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Telefono</label>
                  <input
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              {formData.ruolo === 'cliente' && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Cliente</label>
                  <div className="mt-1">
                    <CustomSelect
                      value={formData.clientId || ''}
                      onChange={(value) => setFormData({ ...formData, clientId: value })}
                      options={clientStudios
                        .filter((c) => c.attivo !== false)
                        .map((c) => ({
                          value: c.id,
                          label: c.nome,
                          description: c.ragioneSociale || c.codiceFiscale || undefined,
                        }))}
                      placeholder="Seleziona cliente"
                      searchable
                      searchPlaceholder="Filtra clienti..."
                      noOptionsText="Nessun cliente disponibile"
                      triggerClassName="rounded-xl border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  {selectedClientUsage && (
                    <div
                      className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                        clientLimitReached
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      Utenti cliente: {selectedClientUsage.activeUsers}/{selectedClientUsage.maxUsers}
                      {clientLimitReached && ' • Limite raggiunto'}
                    </div>
                  )}
                  {clientStudios.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Nessun cliente disponibile: crea prima un cliente nella sezione Clienti.
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700">Azienda (per clienti)</label>
                <input
                  value={formData.azienda}
                  onChange={(e) => setFormData({ ...formData, azienda: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={handleCloseForm} className="wow-button-ghost">
                  Annulla
                </button>
                <button type="submit" className="wow-button" disabled={limitReachedForNewUser || usageLoading}>
                  {limitReachedForNewUser ? 'Limite raggiunto' : isEditing ? 'Salva' : 'Crea Utente'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {showResetPasswordModal && selectedUser && (
        <ModalPortal>
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Reimposta password</h2>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Imposta una nuova password per {selectedUser.nome} {selectedUser.cognome}.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Nuova password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="wow-button-ghost"
                >
                  Annulla
                </button>
                <button type="submit" className="wow-button">
                  Reimposta
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {confirmAction && (
        <ModalPortal>
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">
              {confirmAction.action === 'deactivate' ? 'Disattivare utente?' : 'Riattivare utente?'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {confirmAction.action === 'deactivate'
                ? `Sei sicuro di voler disattivare ${confirmAction.user.nome} ${confirmAction.user.cognome}?`
                : `Sei sicuro di voler riattivare ${confirmAction.user.nome} ${confirmAction.user.cognome}?`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="wow-button-ghost">
                Annulla
              </button>
              <button
                onClick={handleConfirmToggle}
                className={`wow-button ${confirmAction.action === 'deactivate' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {confirmAction.action === 'deactivate' ? 'Disattiva' : 'Attiva'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
