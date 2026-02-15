import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { preassessmentApi, PreassessmentClientEntry } from '../api/preassessment';
import { SECTIONS } from '../data/preassessment';
import { useAuth } from '../contexts/AuthContext';

const requiredFields = SECTIONS.flatMap((s) => s.fields.filter((f) => f.required).map((f) => f.id));

export default function StudioDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<PreassessmentClientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    preassessmentApi.listClients()
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : 'Errore nel caricamento'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const t = search.toLowerCase();
    return clients.filter((c) => {
      const name = `${c.client.nome} ${c.client.cognome}`.toLowerCase();
      const azienda = (c.client.azienda || '').toLowerCase();
      return name.includes(t) || azienda.includes(t) || c.client.email.toLowerCase().includes(t);
    });
  }, [clients, search]);

  const getCompletion = (entry: PreassessmentClientEntry) => {
    const data = entry.preassessment?.data || {};
    const total = requiredFields.length;
    const filled = requiredFields.filter((id) => data[id]?.trim()).length;
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  };

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Studio</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Dashboard Checkup</h1>
          <p className="text-sm text-slate-600 mt-1">
            Panoramica dei checkup per lo studio e stato di compilazione clienti.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user?.ruolo === 'admin_studio' && (
            <button
              onClick={() => navigate('/checkup/utenti')}
              className="wow-button-ghost"
            >
              Gestione utenti
            </button>
          )}
          <div className="text-sm text-slate-500">
            {user?.nome} {user?.cognome}
          </div>
        </div>
      </div>

      <div className="wow-panel p-4 flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca cliente o azienda..."
          className="w-full text-sm text-slate-700 outline-none"
        />
      </div>

      {error && (
        <div className="wow-panel border-rose-200 bg-rose-50/80 p-4 text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <div className="wow-panel overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessun cliente trovato</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Azienda</th>
                  <th className="px-4 py-3 text-center">Completamento</th>
                  <th className="px-4 py-3 text-center">Modifiche studio</th>
                  <th className="px-4 py-3 text-center">Ultimo aggiornamento</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((entry) => {
                  const pct = getCompletion(entry);
                  return (
                    <tr key={entry.client.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {entry.client.nome} {entry.client.cognome}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{entry.client.azienda || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-primary-600" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {entry.preassessment?.studioCanEdit ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Abilitate</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">Disattivate</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">
                        {entry.preassessment?.updatedAt ? new Date(entry.preassessment.updatedAt).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/checkup/clienti/${entry.client.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Apri
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
