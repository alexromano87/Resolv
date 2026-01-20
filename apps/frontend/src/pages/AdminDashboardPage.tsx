import { useEffect, useState } from 'react';
import { adminApi, type AdminDashboardStats } from '../api/admin';
import { Users, Building2, FolderOpen, UserCheck } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento della dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-4 md:p-5">
        <span className="wow-chip">Amministrazione</span>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 display-font">Dashboard Amministrativa</h1>
        <p className="mt-2 text-sm text-slate-600">Panoramica completa del sistema</p>
      </div>

      {/* Statistiche Totali */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Studi Totali</h3>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold">{stats.totali.studi}</div>
          <p className="text-xs text-slate-500">{stats.totali.studiAttivi} attivi</p>
        </div>

        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Utenti Totali</h3>
            <Users className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold">{stats.totali.utenti}</div>
          <p className="text-xs text-slate-500">{stats.totali.utentiAttivi} attivi</p>
        </div>

        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Pratiche Totali</h3>
            <FolderOpen className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold">{stats.totali.pratiche}</div>
          <p className="text-xs text-slate-500">{stats.totali.praticheAperte} aperte</p>
        </div>

        <div className="wow-panel p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Clienti/Debitori</h3>
            <UserCheck className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold">{stats.totali.clienti}</div>
          <p className="text-xs text-slate-500">{stats.totali.debitori} debitori</p>
        </div>
      </div>

      {/* Statistiche per Studio */}
      <div className="wow-panel overflow-hidden">
        <div className="p-6 border-b border-slate-200/70">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Statistiche per Studio
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full wow-stagger-rows">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 font-medium text-slate-700">Studio</th>
                <th className="text-center p-4 font-medium text-slate-700">Stato</th>
                <th className="text-center p-4 font-medium text-slate-700">Utenti</th>
                <th className="text-center p-4 font-medium text-slate-700">Pratiche</th>
                <th className="text-center p-4 font-medium text-slate-700">Clienti</th>
                <th className="text-center p-4 font-medium text-slate-700">Debitori</th>
                <th className="text-center p-4 font-medium text-slate-700">Avvocati</th>
              </tr>
            </thead>
            <tbody>
              {stats.perStudio.map((studio) => (
                <tr key={studio.studioId} className="border-t hover:bg-white/80">
                  <td className="p-4 font-medium">{studio.studioNome}</td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        studio.studioAttivo
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {studio.studioAttivo ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td className="p-4 text-center">{studio.numeroUtenti}</td>
                  <td className="p-4 text-center">{studio.numeroPratiche}</td>
                  <td className="p-4 text-center">{studio.numeroClienti}</td>
                  <td className="p-4 text-center">{studio.numeroDebitori}</td>
                  <td className="p-4 text-center">{studio.numeroAvvocati}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attività Recente */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="wow-panel">
          <div className="p-6 border-b border-slate-200/70">
            <h2 className="text-xl font-semibold">Ultimi Utenti Creati</h2>
          </div>
          <div className="p-6 space-y-3">
            {stats.attivitaRecente.ultimiUtentiCreati.map((user) => (
              <div key={user.id} className="flex justify-between items-start p-3 border rounded-2xl">
                <div>
                  <p className="font-medium">
                    {user.nome} {user.cognome}
                  </p>
                  <p className="text-sm text-slate-600">{user.email}</p>
                  <p className="text-xs text-slate-500">
                    {user.studioNome || 'Nessuno studio'} • {user.ruolo}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString('it-IT')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="wow-panel">
          <div className="p-6 border-b border-slate-200/70">
            <h2 className="text-xl font-semibold">Ultime Pratiche Create</h2>
          </div>
          <div className="p-6 space-y-3">
            {stats.attivitaRecente.ultimePraticheCreate.map((pratica) => (
              <div key={pratica.id} className="flex justify-between items-start p-3 border rounded-2xl">
                <div>
                  <p className="font-medium text-sm">{pratica.numeroProtocollo}</p>
                  <p className="text-sm text-slate-600">
                    {pratica.cliente} vs {pratica.debitore}
                  </p>
                  <p className="text-xs text-slate-500">{pratica.studioNome || 'Nessuno studio'}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(pratica.createdAt).toLocaleDateString('it-IT')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
