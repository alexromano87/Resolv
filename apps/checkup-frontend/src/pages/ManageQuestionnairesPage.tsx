import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionnairesApi, CheckupQuestionnaire, CheckupTemplate } from '../api/questionnaires';
import { usersApi } from '../api/users';
import { CheckupUser } from '../api/auth';
import { ModalPortal } from '../components/ModalPortal';
import {
  Plus,
  X,
  AlertCircle,
  ClipboardList,
  Eye,
} from 'lucide-react';

const statoLabels: Record<string, string> = {
  bozza: 'Bozza',
  in_compilazione: 'In compilazione',
  completato: 'Completato',
  revisionato: 'Revisionato',
};

const statoColors: Record<string, string> = {
  bozza: 'bg-gray-100 text-gray-700',
  in_compilazione: 'bg-cyan-100 text-cyan-700',
  completato: 'bg-success-100 text-success-700',
  revisionato: 'bg-primary-100 text-primary-700',
};

export default function ManageQuestionnairesPage() {
  const navigate = useNavigate();
  const [questionnaires, setQuestionnaires] = useState<CheckupQuestionnaire[]>([]);
  const [templates, setTemplates] = useState<CheckupTemplate[]>([]);
  const [clientUsers, setClientUsers] = useState<CheckupUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [note, setNote] = useState('');

  const loadData = () => {
    Promise.all([
      questionnairesApi.getAll(),
      questionnairesApi.getTemplates(),
      usersApi.getAll(),
    ])
      .then(([q, t, u]) => {
        setQuestionnaires(q);
        setTemplates(t);
        setClientUsers(u.filter((usr) => usr.ruolo === 'cliente'));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTemplate || !selectedClient) {
      setError('Seleziona template e cliente');
      return;
    }

    try {
      await questionnairesApi.create(selectedTemplate, selectedClient, note || undefined);
      setShowForm(false);
      setSelectedTemplate('');
      setSelectedClient('');
      setNote('');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione');
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
          <h1 className="text-2xl font-bold text-gray-900">Gestione Questionari</h1>
          <p className="text-gray-500 mt-1">Assegna e monitora i questionari</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800"
        >
          <Plus className="h-4 w-4" />
          Assegna Questionario
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
              <h2 className="text-lg font-bold text-gray-900">Assegna Questionario</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  <option value="">Seleziona template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} (v{t.versione})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  <option value="">Seleziona cliente...</option>
                  {clientUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} {u.cognome} {u.azienda ? `(${u.azienda})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionali)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-y"
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
                  Assegna
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Questionnaires table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {questionnaires.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nessun questionario assegnato</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Template</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Stato</th>
                <th className="px-6 py-3">Completamento</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionnaires.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {q.template?.nome || '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {q.cliente ? `${q.cliente.nome} ${q.cliente.cognome}` : '—'}
                    {q.cliente?.azienda && (
                      <span className="text-gray-400 ml-1 text-xs">({q.cliente.azienda})</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statoColors[q.stato]}`}>
                      {statoLabels[q.stato]}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-600 rounded-full"
                          style={{ width: `${q.percentualeCompletamento}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{q.percentualeCompletamento}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">
                    {q.dataAssegnazione
                      ? new Date(q.dataAssegnazione).toLocaleDateString('it-IT')
                      : '—'}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => navigate(`/checkup/questionario/${q.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Visualizza
                    </button>
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
