import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { studiosApi, type CheckupStudioProfile, type UpdateCheckupStudioPayload, type CheckupSublicenseOption } from '../api/studios';
import { usersApi } from '../api/users';
import type { CheckupUser } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import StudioUsersPage from './StudioUsersPage';
import StudioClientsPage from './StudioClientsPage';
import { ModalPortal } from '../components/ModalPortal';

type AdminTab = 'studio' | 'licenza' | 'sottolicenze' | 'clienti' | 'utenti';

export default function AdminWorkspacePage({ initialTab = 'studio' }: { initialTab?: AdminTab }) {
  const { refreshProfile } = useAuth();
  const [profile, setProfile] = useState<CheckupStudioProfile | null>(null);
  const [formData, setFormData] = useState<UpdateCheckupStudioPayload>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snapshot, setSnapshot] = useState<UpdateCheckupStudioPayload | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [sublicenses, setSublicenses] = useState<CheckupSublicenseOption[]>([]);
  const [sublicensesLoading, setSublicensesLoading] = useState(false);
  const [usage, setUsage] = useState<{
    license: { studioId: string; maxUsers: number | null; activeUsers: number };
    clients: Array<{ clientId: string | null; maxUsers: number; activeUsers: number }>;
  } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [users, setUsers] = useState<CheckupUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedSublicense, setSelectedSublicense] = useState<CheckupSublicenseOption | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingClickRef = useRef<HTMLElement | null>(null);
  const allowNextClickRef = useRef(false);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await studiosApi.getMyStudio();
      setProfile(data);
      setFormData({
        nome: data.studio.nome || '',
        ragioneSociale: data.studio.ragioneSociale || '',
        partitaIva: data.studio.partitaIva || '',
        codiceFiscale: data.studio.codiceFiscale || '',
        indirizzo: data.studio.indirizzo || '',
        citta: data.studio.citta || '',
        provincia: data.studio.provincia || '',
        cap: data.studio.cap || '',
        paese: data.studio.paese || '',
        email: data.studio.email || '',
        telefono: data.studio.telefono || '',
        sitoWeb: data.studio.sitoWeb || '',
        logoUrl: data.studio.logoUrl || '',
        note: data.studio.note || '',
      });
      setSnapshot({
        nome: data.studio.nome || '',
        ragioneSociale: data.studio.ragioneSociale || '',
        partitaIva: data.studio.partitaIva || '',
        codiceFiscale: data.studio.codiceFiscale || '',
        indirizzo: data.studio.indirizzo || '',
        citta: data.studio.citta || '',
        provincia: data.studio.provincia || '',
        cap: data.studio.cap || '',
        paese: data.studio.paese || '',
        email: data.studio.email || '',
        telefono: data.studio.telefono || '',
        sitoWeb: data.studio.sitoWeb || '',
        logoUrl: data.studio.logoUrl || '',
        note: data.studio.note || '',
      });
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dell’amministrazione');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab !== 'sottolicenze') return;
    setSublicensesLoading(true);
    setUsageLoading(true);
    setUsersLoading(true);
    Promise.all([
      studiosApi.listSublicenses(),
      usersApi.getUsage(),
      usersApi.getAll(undefined, true),
    ])
      .then(([sublicensesData, usageData, usersData]) => {
        setSublicenses(sublicensesData);
        setUsage(usageData);
        setUsers(usersData);
      })
      .catch((err: any) => {
        setError(err.message || 'Errore durante il caricamento delle sottolicenze');
      })
      .finally(() => {
        setSublicensesLoading(false);
        setUsageLoading(false);
        setUsersLoading(false);
      });
  }, [activeTab]);

  const isDirty = useMemo(() => {
    if (!snapshot) return false;
    return JSON.stringify(formData) !== JSON.stringify(snapshot);
  }, [formData, snapshot]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    profile?.sublicenses?.forEach((s) => {
      if (s.clientId && s.cliente?.nome) {
        map.set(s.clientId, s.cliente.nome);
      }
    });
    return map;
  }, [profile?.sublicenses]);

  const usageByClientId = useMemo(() => {
    const map = new Map<string, { maxUsers: number; activeUsers: number }>();
    usage?.clients.forEach((c) => {
      if (c.clientId) {
        map.set(c.clientId, { maxUsers: c.maxUsers, activeUsers: c.activeUsers });
      }
    });
    return map;
  }, [usage]);

  useEffect(() => {
    const handleClickCapture = (event: MouseEvent) => {
      if (allowNextClickRef.current) {
        allowNextClickRef.current = false;
        return;
      }
      if (!editMode || !isDirty) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const ignore = target.closest('[data-unsaved-ignore="true"]');
      if (ignore) return;
      const clickable = target.closest('button, a, [role="button"]');
      if (!clickable) return;
      event.preventDefault();
      event.stopPropagation();
      pendingClickRef.current = clickable as HTMLElement;
      setShowUnsavedModal(true);
    };
    document.addEventListener('click', handleClickCapture, true);
    return () => document.removeEventListener('click', handleClickCapture, true);
  }, [editMode, isDirty, snapshot]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await studiosApi.updateMyStudio(formData);
      await loadProfile();
      await refreshProfile();
      setEditMode(false);
      setSuccess('Dati studio aggiornati');
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (snapshot) {
      setFormData(snapshot);
    }
    setEditMode(false);
    setSuccess('');
  };

  const handleConfirmUnsaved = () => {
    setShowUnsavedModal(false);
    if (snapshot) {
      setFormData(snapshot);
    }
    setEditMode(false);
    const target = pendingClickRef.current;
    pendingClickRef.current = null;
    if (target && document.contains(target)) {
      allowNextClickRef.current = true;
      target.click();
    }
  };

  const handleCancelUnsaved = () => {
    setShowUnsavedModal(false);
    pendingClickRef.current = null;
  };

  const handleTabChange = (tab: AdminTab) => {
    if (editMode && isDirty) {
      if (snapshot) {
        setFormData(snapshot);
      }
      setEditMode(false);
    } else if (editMode) {
      setEditMode(false);
    }
    setActiveTab(tab);
  };

  if (loading) {
    return <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>;
  }

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8">
        <span className="wow-chip">Amministrazione</span>
        <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Amministrazione</h1>
        <p className="text-sm text-slate-600 mt-1">
          Gestisci studio, licenze, sottolicenze, clienti e utenti del tuo ambiente.
        </p>
      </div>

      {error && (
        <div className="wow-panel border-rose-200 bg-rose-50/80 p-4 text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="wow-panel border-emerald-200 bg-emerald-50/80 p-4 text-emerald-700">
          {success}
        </div>
      )}

      <div className="wow-panel p-3 flex flex-wrap items-center gap-2">
        {(['studio', 'licenza', 'sottolicenze', 'clienti', 'utenti'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              activeTab === tab ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {tab === 'studio'
              ? 'Studio'
              : tab === 'licenza'
                ? 'Licenza'
                : tab === 'sottolicenze'
                  ? 'Sottolicenze'
                  : tab === 'clienti'
                    ? 'Clienti'
                    : 'Utenti'}
          </button>
        ))}
      </div>

      {activeTab === 'studio' && (
        <form ref={formRef} onSubmit={handleSave} className="space-y-6">
            <div className="wow-panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Dettaglio Studio</h2>
                  <p className="text-sm text-slate-500 mt-1">Informazioni principali e identificative.</p>
                </div>
                {!editMode ? (
                  <button type="button" onClick={() => setEditMode(true)} className="wow-button-ghost">
                    Modifica
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleCancel} className="wow-button-ghost" data-unsaved-ignore="true">
                      Annulla
                    </button>
                    <button type="submit" className="wow-button" disabled={saving} data-unsaved-ignore="true">
                      {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Nome studio</label>
                  <input
                    value={formData.nome ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Ragione sociale</label>
                  <input
                    value={formData.ragioneSociale ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, ragioneSociale: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Partita IVA</label>
                  <input
                    value={formData.partitaIva ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, partitaIva: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Codice fiscale</label>
                  <input
                    value={formData.codiceFiscale ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, codiceFiscale: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="wow-panel p-6">
              <h2 className="text-lg font-semibold text-slate-900">Contatti</h2>
              <p className="text-sm text-slate-500 mt-1">Canali di comunicazione dello studio.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    value={formData.email ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Telefono</label>
                  <input
                    value={formData.telefono ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Sito web</label>
                  <input
                    value={formData.sitoWeb ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, sitoWeb: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="wow-panel p-6">
              <h2 className="text-lg font-semibold text-slate-900">Sede</h2>
              <p className="text-sm text-slate-500 mt-1">Indirizzo e localizzazione.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Indirizzo</label>
                  <input
                    value={formData.indirizzo ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, indirizzo: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Città</label>
                  <input
                    value={formData.citta ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, citta: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Provincia</label>
                  <input
                    value={formData.provincia ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, provincia: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">CAP</label>
                  <input
                    value={formData.cap ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, cap: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Paese</label>
                  <input
                    value={formData.paese ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, paese: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="wow-panel p-6">
              <h2 className="text-lg font-semibold text-slate-900">Branding & Note</h2>
              <p className="text-sm text-slate-500 mt-1">Logo e informazioni interne.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Logo URL</label>
                  <input
                    value={formData.logoUrl ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, logoUrl: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Note</label>
                  <textarea
                    value={formData.note ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                    disabled={!editMode}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                  />
                </div>
              </div>
            </div>
        </form>
      )}

      {activeTab === 'licenza' && (
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Dettaglio Licenza</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
              Solo lettura
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Dati della licenza associata (sola lettura).</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">Intestatario</div>
              <div className="text-sm font-semibold text-slate-900">
                {profile?.license?.intestatario || '—'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">Tipo licenza</div>
              <div className="text-sm font-semibold text-slate-900">
                {profile?.license?.tipo || '—'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">Utenze disponibili</div>
              <div className="text-sm font-semibold text-slate-900">
                {profile?.license?.numeroUtenze ?? '—'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">Sottolicenze</div>
              <div className="text-sm font-semibold text-slate-900">
                {profile?.license?.numeroSottolicenze ?? '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sottolicenze' && (
        <div className="wow-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Dettaglio Sottolicenze</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
              Solo lettura
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Informazioni sulle sottolicenze (sola lettura).</p>
          <div className="mt-4">
            {sublicensesLoading || usageLoading ? (
              <div className="text-sm text-slate-500">Caricamento...</div>
            ) : sublicenses.length === 0 ? (
              <div className="text-sm text-slate-500">Nessuna sottolicenza associata.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Sottolicenza</th>
                    <th className="px-4 py-3 text-left">Licenza</th>
                    <th className="px-4 py-3 text-left">Utenze</th>
                    <th className="px-4 py-3 text-left">Utilizzati</th>
                    <th className="px-4 py-3 text-left">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sublicenses.map((s) => {
                    const usageInfo = s.clientId ? usageByClientId.get(s.clientId) : null;
                    const used = usageInfo?.activeUsers ?? 0;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSublicense(s)}
                        className="cursor-pointer hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {s.numeroSublicenza || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {s.license?.intestatario || 'Licenza'} · {s.license?.numeroLicenza || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.numeroUtenze}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {used}/{s.numeroUtenze}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${s.attiva ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                            {s.attiva ? 'Attiva' : 'Disattivata'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'utenti' && (
        <div className="space-y-6">
          <StudioUsersPage embedded />
        </div>
      )}

      {activeTab === 'clienti' && (
        <div className="space-y-6">
          <StudioClientsPage embedded />
        </div>
      )}

      {showUnsavedModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={handleCancelUnsaved}
          data-unsaved-ignore="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-indigo-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]"
            onClick={(event) => event.stopPropagation()}
            data-unsaved-ignore="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Modifiche non salvate</h2>
              <button
                type="button"
                onClick={handleCancelUnsaved}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                data-unsaved-ignore="true"
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Sono presenti modifiche non salvate. Se continui verranno perse.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelUnsaved}
                className="wow-button-ghost"
                data-unsaved-ignore="true"
              >
                Rimani qui
              </button>
              <button
                type="button"
                onClick={handleConfirmUnsaved}
                className="wow-button"
                data-unsaved-ignore="true"
              >
                Prosegui
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {selectedSublicense && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-3xl rounded-2xl border border-indigo-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="wow-chip">Sottolicenza</span>
                  <h2 className="text-xl font-semibold text-slate-900 mt-2">
                    {selectedSublicense.numeroSublicenza || 'Dettaglio sottolicenza'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedSublicense.license?.intestatario || 'Licenza'} · {selectedSublicense.license?.numeroLicenza || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSublicense(null)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs text-slate-500">Cliente</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {selectedSublicense.clientId ? (clientNameById.get(selectedSublicense.clientId) || '—') : 'Non assegnata'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs text-slate-500">Utenze</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {(selectedSublicense.clientId ? (usageByClientId.get(selectedSublicense.clientId)?.activeUsers ?? 0) : 0)}
                    /{selectedSublicense.numeroUtenze}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs text-slate-500">Stato</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {selectedSublicense.attiva ? 'Attiva' : 'Disattivata'}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Utenti associati</h3>
                <p className="text-xs text-slate-500 mt-1">Elenco utenti collegati a questa sottolicenza.</p>
                <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
                  {usersLoading ? (
                    <div className="p-6 text-sm text-slate-500">Caricamento utenti...</div>
                  ) : selectedSublicense.clientId ? (
                    (() => {
                      const associated = users.filter((u) => u.clientId === selectedSublicense.clientId);
                      if (associated.length === 0) {
                        return <div className="p-6 text-sm text-slate-500">Nessun utente associato.</div>;
                      }
                      return (
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                            <tr>
                              <th className="px-4 py-3 text-left">Utente</th>
                              <th className="px-4 py-3 text-left">Email</th>
                              <th className="px-4 py-3 text-left">Ruolo</th>
                              <th className="px-4 py-3 text-left">Stato</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {associated.map((u) => (
                              <tr key={u.id}>
                                <td className="px-4 py-3 text-slate-900">{u.nome} {u.cognome}</td>
                                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                                <td className="px-4 py-3 text-slate-500">{u.ruolo}</td>
                                <td className="px-4 py-3 text-slate-500">{u.attivo ? 'Attivo' : 'Disattivo'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()
                  ) : (
                    <div className="p-6 text-sm text-slate-500">Sottolicenza non assegnata ad alcun cliente.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
