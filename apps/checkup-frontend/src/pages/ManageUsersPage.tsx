import { useState, useEffect, FormEvent } from 'react';
import { usersApi, CreateCheckupUserPayload } from '../api/users';
import { CheckupUser } from '../api/auth';
import { ModalPortal } from '../components/ModalPortal';
import {
  UserPlus,
  X,
  AlertCircle,
  Users,
  Building2,
  Pencil,
  UserX,
  UserCheck,
} from 'lucide-react';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<CheckupUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<CheckupUser | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateCheckupUserPayload>({
    email: '',
    password: '',
    nome: '',
    cognome: '',
    telefono: '',
    ruolo: 'cliente',
    azienda: '',
  });

  const loadUsers = () => {
    usersApi.getAll()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await usersApi.create(formData);
      setShowForm(false);
      setFormData({ email: '', password: '', nome: '', cognome: '', telefono: '', ruolo: 'cliente', azienda: '' });
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await usersApi.deactivate(id);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella disattivazione');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await usersApi.update(id, { attivo: true });
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella riattivazione');
    }
  };

  const handleOpenEdit = (user: CheckupUser) => {
    setEditingUser(user);
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');

    try {
      await usersApi.update(editingUser.id, {
        nome: editingUser.nome,
        cognome: editingUser.cognome,
        telefono: editingUser.telefono || undefined,
        azienda: editingUser.azienda || undefined,
      });
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella modifica');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
          <p className="text-gray-500 mt-1">Crea e gestisci gli utenti del modulo Checkup</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800"
        >
          <UserPlus className="h-4 w-4" />
          Nuovo Utente
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <ModalPortal>
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nuovo Utente</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                  <input
                    type="text"
                    required
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password temporanea</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Min. 8 caratteri"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                  <select
                    value={formData.ruolo}
                    onChange={(e) => setFormData({ ...formData, ruolo: e.target.value as CreateCheckupUserPayload['ruolo'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="segreteria">Segreteria</option>
                    <option value="collaboratore">Collaboratore</option>
                    <option value="admin_studio">Admin Studio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Azienda</label>
                <input
                  type="text"
                  value={formData.azienda}
                  onChange={(e) => setFormData({ ...formData, azienda: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Nome azienda (per clienti)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800"
                >
                  Crea Utente
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Edit form modal */}
      {editingUser && (
        <ModalPortal>
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Modifica Utente</h2>
              <button onClick={() => setEditingUser(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={editingUser.nome}
                    onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                  <input
                    type="text"
                    required
                    value={editingUser.cognome}
                    onChange={(e) => setEditingUser({ ...editingUser, cognome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={editingUser.telefono || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Azienda</label>
                <input
                  type="text"
                  value={editingUser.azienda || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, azienda: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800"
                >
                  Salva modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Users list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nessun utente registrato</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Utente</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Ruolo</th>
                <th className="px-6 py-3">Stato</th>
                <th className="px-6 py-3">Azienda</th>
                <th className="px-6 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${u.attivo === false ? 'opacity-70' : ''}`}>
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {u.nome} {u.cognome}
                  </td>
                  <td className="px-6 py-3 text-gray-500">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      u.ruolo === 'admin_studio'
                        ? 'bg-primary-100 text-primary-700'
                        : u.ruolo === 'segreteria'
                          ? 'bg-cyan-100 text-cyan-700'
                          : u.ruolo === 'collaboratore'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.ruolo}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.attivo === false ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {u.attivo === false ? 'Disattivo' : 'Attivo'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {u.azienda ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {u.azienda}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-medium"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifica
                      </button>
                      {u.attivo === false ? (
                        <button
                          onClick={() => handleReactivate(u.id)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Riattiva
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivate(u.id)}
                          className="inline-flex items-center gap-1 text-xs text-danger-600 hover:text-danger-700 font-medium"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Disattiva
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
