import { useEffect, useMemo, useState } from 'react';
import { Building2, KeyRound, Users, ShieldCheck, AlertTriangle } from 'lucide-react';
import { checkupAdminApi, type CheckupAdminUser, type CheckupClient, type CheckupLicense, type CheckupStudio, type CheckupSublicense } from '../api/checkupAdmin';
import { useToast } from '../components/ui/ToastProvider';

function isExpired(date?: string | null) {
  if (!date) return false;
  const now = new Date();
  const value = new Date(date);
  return Number.isFinite(value.getTime()) && value < now;
}

function isExpiringSoon(date?: string | null, days = 30) {
  if (!date) return false;
  const now = new Date();
  const value = new Date(date);
  if (!Number.isFinite(value.getTime())) return false;
  const diffDays = (value.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export default function AdminCheckupDashboardPage() {
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [clients, setClients] = useState<CheckupClient[]>([]);
  const [licenses, setLicenses] = useState<CheckupLicense[]>([]);
  const [sublicenses, setSublicenses] = useState<CheckupSublicense[]>([]);
  const [users, setUsers] = useState<CheckupAdminUser[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studiosRes, clientsRes, licensesRes, sublicensesRes, usersRes] = await Promise.all([
          checkupAdminApi.getStudios(),
          checkupAdminApi.getClients(),
          checkupAdminApi.getLicenses(),
          checkupAdminApi.getSublicenses(),
          checkupAdminApi.getAdminUsers(),
        ]);
        setStudios(studiosRes);
        setClients(clientsRes);
        setLicenses(licensesRes);
        setSublicenses(sublicensesRes);
        setUsers(usersRes);
      } catch (err: any) {
        error(err?.message || 'Errore durante il caricamento del riepilogo');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [error]);

  const studioStats = useMemo(() => {
    const licenziatari = studios.filter((s) => s.tipo === 'licenziatario');
    const clientiStudio = studios.filter((s) => s.tipo === 'cliente');
    return {
      total: studios.length,
      active: studios.filter((s) => s.attivo).length,
      licenziatari: licenziatari.length,
      clientiStudio: clientiStudio.length,
    };
  }, [studios]);

  const clientStats = useMemo(() => {
    return {
      total: clients.length,
      active: clients.filter((c) => c.attivo).length,
    };
  }, [clients]);

  const licenseStats = useMemo(() => {
    const assigned = licenses.filter((l) => l.studioId);
    return {
      total: licenses.length,
      assigned: assigned.length,
      available: licenses.length - assigned.length,
    };
  }, [licenses]);

  const sublicenseStats = useMemo(() => {
    const assigned = sublicenses.filter((s) => s.clientId);
    const expired = sublicenses.filter((s) => isExpired(s.dataScadenza));
    const expiringSoon = sublicenses.filter((s) => isExpiringSoon(s.dataScadenza, 30));
    return {
      total: sublicenses.length,
      assigned: assigned.length,
      available: sublicenses.length - assigned.length,
      expired: expired.length,
      expiringSoon: expiringSoon.length,
    };
  }, [sublicenses]);

  const userStats = useMemo(() => {
    const active = users.filter((u) => u.attivo);
    const byRole = active.reduce(
      (acc, user) => {
        acc[user.ruolo] = (acc[user.ruolo] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return {
      total: users.length,
      active: active.length,
      byRole,
    };
  }, [users]);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Dashboard pre-assessment</h1>
          <p className="text-sm text-slate-600 mt-1">Panoramica globale di licenze, sublicenze e utenze.</p>
        </div>
      </div>

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="wow-panel p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Studi</p>
                <p className="text-2xl font-semibold text-slate-900">{studioStats.total}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Attivi</p>
                <p className="text-lg font-semibold text-slate-900">{studioStats.active}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Licenziatari</p>
                <p className="text-lg font-semibold text-slate-900">{studioStats.licenziatari}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Sublicenziatari</p>
                <p className="text-lg font-semibold text-slate-900">{studioStats.clientiStudio}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Clienti totali</p>
                <p className="text-lg font-semibold text-slate-900">{clientStats.total}</p>
              </div>
            </div>
          </div>

          <div className="wow-panel p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Licenze</p>
                <p className="text-2xl font-semibold text-slate-900">{licenseStats.total}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Assegnate</p>
                <p className="text-lg font-semibold text-slate-900">{licenseStats.assigned}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Disponibili</p>
                <p className="text-lg font-semibold text-slate-900">{licenseStats.available}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Sublicenze</p>
                <p className="text-lg font-semibold text-slate-900">{sublicenseStats.total}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Sublicenze libere</p>
                <p className="text-lg font-semibold text-slate-900">{sublicenseStats.available}</p>
              </div>
            </div>
          </div>

          <div className="wow-panel p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Utenze</p>
                <p className="text-2xl font-semibold text-slate-900">{userStats.total}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Attivi</p>
                <p className="text-lg font-semibold text-slate-900">{userStats.active}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Ruoli attivi</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {Object.entries(userStats.byRole).length === 0 ? (
                    <span className="text-slate-400">Nessun utente attivo</span>
                  ) : (
                    Object.entries(userStats.byRole).map(([role, count]) => (
                      <span key={role} className="rounded-full bg-white px-2 py-1 text-slate-600 border border-slate-200">
                        {role} · {count}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="wow-panel p-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Sublicenze critiche</p>
                <p className="text-2xl font-semibold text-slate-900">{sublicenseStats.expiringSoon}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-slate-600">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">In scadenza 30gg</p>
                <p className="text-lg font-semibold text-slate-900">{sublicenseStats.expiringSoon}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Scadute</p>
                <p className="text-lg font-semibold text-slate-900">{sublicenseStats.expired}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Assegnate</p>
                <p className="text-lg font-semibold text-slate-900">{sublicenseStats.assigned}</p>
              </div>
            </div>
          </div>

          <div className="wow-panel p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Clienti attivi</p>
                <p className="text-2xl font-semibold text-slate-900">{clientStats.active}</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-600">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-400">Totale clienti</p>
                <p className="text-lg font-semibold text-slate-900">{clientStats.total}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
