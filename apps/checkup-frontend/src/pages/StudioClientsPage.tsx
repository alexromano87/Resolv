import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Edit2, Power, PowerOff, Eye, EyeOff, Link2 } from 'lucide-react';
import {
  studiosApi,
  type CheckupClientRecord,
  type CheckupSublicenseOption,
} from '../api/studios';
import { CustomSelect } from '../components/CustomSelect';
import { Pagination } from '../components/Pagination';
import { ModalPortal } from '../components/ModalPortal';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';

export default function StudioClientsPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [clients, setClients] = useState<CheckupClientRecord[]>([]);
  const [sublicenses, setSublicenses] = useState<CheckupSublicenseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<CheckupClientRecord | null>(null);
  const [selectedSublicenseId, setSelectedSublicenseId] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [hideInactive, setHideInactive] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;


  const getClientDisplayName = (client: Pick<CheckupClientRecord, 'nome' | 'ragioneSociale'>) =>
    client.ragioneSociale || client.nome || 'Cliente senza nome';

  const [formData, setFormData] = useState({
    nome: '',
    ragioneSociale: '',
    partitaIva: '',
    codiceFiscale: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    paese: '',
    email: '',
    telefono: '',
    sitoWeb: '',
    note: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [clientsData, sublicensesData] = await Promise.all([
        studiosApi.listClientStudios(),
        studiosApi.listSublicenses(),
      ]);
      setClients(clientsData);
      setSublicenses(sublicensesData);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isExpired = (dateValue?: string | null) => {
    if (!dateValue) return false;
    const today = new Date().toISOString().slice(0, 10);
    return dateValue < today;
  };

  const sublicensesByClient = useMemo(() => {
    const map = new Map<string, CheckupSublicenseOption>();
    sublicenses.forEach((s) => {
      if (s.clientId) {
        map.set(s.clientId, s);
      }
    });
    return map;
  }, [sublicenses]);

  const availableSublicenses = useMemo(() => {
    return sublicenses.filter(
      (s) => !s.clientId || s.clientId === selectedClient?.id,
    );
  }, [sublicenses, selectedClient?.id]);

  const sublicenseOptions = useMemo(
    () =>
      availableSublicenses.map((s) => {
        const expired = isExpired(s.dataScadenza);
        const incomplete = !s.tipo || !s.dataInizioValidita || !s.dataScadenza;
        const disabled = s.id !== selectedSublicenseId && (!s.attiva || expired || incomplete);
        const licenseNumber = s.license?.numeroLicenza || '—';
        const licenseOwner = s.license?.intestatario || 'Licenza';
        const licenseType = s.license?.tipo ? ` · ${s.license.tipo}` : '';
        const expiry = s.dataScadenza ? ` · scade ${s.dataScadenza}` : '';
        return {
          value: s.id,
          label: licenseOwner,
          description: `Licenza ${licenseNumber}${licenseType} · Sublicenza ${s.numeroSublicenza || '—'} · Utenze ${s.numeroUtenze}${expiry}`,
          disabled,
        };
      }),
    [availableSublicenses, selectedSublicenseId],
  );

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedClient(null);
    setSelectedSublicenseId('');
    setFormErrors({});
    setFormData({
      nome: '',
      ragioneSociale: '',
      partitaIva: '',
      codiceFiscale: '',
      indirizzo: '',
      citta: '',
      provincia: '',
      cap: '',
      paese: '',
      email: '',
      telefono: '',
      sitoWeb: '',
      note: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (client: CheckupClientRecord) => {
    setIsEditing(true);
    setSelectedClient(client);
    setSelectedSublicenseId(client.sublicense?.id || '');
    setFormErrors({});
    setFormData({
      nome: client.nome || '',
      ragioneSociale: client.ragioneSociale || '',
      partitaIva: client.partitaIva || '',
      codiceFiscale: client.codiceFiscale || '',
      indirizzo: '',
      citta: '',
      provincia: '',
      cap: '',
      paese: '',
      email: client.email || '',
      telefono: client.telefono || '',
      sitoWeb: '',
      note: '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient(null);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const nome = formData.nome.trim();
    const ragioneSociale = formData.ragioneSociale.trim();
    const nextErrors: Record<string, boolean> = {};
    if (!nome && !ragioneSociale) {
      nextErrors.nome = true;
      nextErrors.ragioneSociale = true;
    }
    if (!selectedSublicenseId) {
      nextErrors.sublicenseId = true;
    }
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setError('Compila nome cliente o ragione sociale/denominazione');
      return;
    }

    const clientDisplayName = nome || ragioneSociale;
    const confirmed = await confirm({
      title: isEditing ? 'Confermare modifica cliente?' : 'Confermare creazione cliente?',
      message: isEditing
        ? `Vuoi salvare le modifiche del cliente "${clientDisplayName}"?`
        : `Vuoi creare il cliente "${clientDisplayName}"?`,
      confirmText: isEditing ? 'Salva modifiche' : 'Crea cliente',
      variant: 'info',
    });

    if (!confirmed) return;

    try {
      if (isEditing && selectedClient) {
        await studiosApi.updateClient(selectedClient.id, {
          nome,
          ragioneSociale,
          partitaIva: formData.partitaIva.trim(),
          codiceFiscale: formData.codiceFiscale.trim(),
          indirizzo: formData.indirizzo.trim(),
          citta: formData.citta.trim(),
          provincia: formData.provincia.trim(),
          cap: formData.cap.trim(),
          paese: formData.paese.trim(),
          email: formData.email.trim(),
          telefono: formData.telefono.trim(),
          sitoWeb: formData.sitoWeb.trim(),
          note: formData.note.trim(),
          sublicenseId: selectedSublicenseId,
        });
        setSuccess('Cliente aggiornato');
      } else {
        await studiosApi.createClient({
          nome,
          ragioneSociale,
          partitaIva: formData.partitaIva.trim(),
          codiceFiscale: formData.codiceFiscale.trim(),
          indirizzo: formData.indirizzo.trim(),
          citta: formData.citta.trim(),
          provincia: formData.provincia.trim(),
          cap: formData.cap.trim(),
          paese: formData.paese.trim(),
          email: formData.email.trim(),
          telefono: formData.telefono.trim(),
          sitoWeb: formData.sitoWeb.trim(),
          note: formData.note.trim(),
          sublicenseId: selectedSublicenseId,
        });
        setSuccess('Cliente creato');
      }
      handleCloseModal();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio del cliente');
    }
  };
  const inputClass = (field: string) =>
    `mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${
      formErrors[field]
        ? '!border-rose-300 !ring-2 !ring-rose-200 focus:!border-rose-400 focus:!ring-rose-200'
        : 'border-slate-200 focus:ring-primary-500'
    }`;
  const labelClass = (_field?: string) => 'text-sm font-medium text-slate-700';
  const selectTriggerClass = (field: string) =>
    `${formErrors[field] ? 'rounded-xl !border-rose-300 !ring-2 !ring-rose-200 focus:!border-rose-400 focus:!ring-rose-200' : 'rounded-xl border-slate-200'} bg-white px-3 py-2 text-sm`;

  const handleToggleActive = async (client: CheckupClientRecord) => {
    setError('');
    setSuccess('');
    try {
      if (client.attivo) {
        await studiosApi.deactivateClient(client.id);
        setSuccess('Cliente disattivato');
      } else {
        await studiosApi.updateClient(client.id, { attivo: true });
        setSuccess('Cliente riattivato');
      }
      loadData();
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'operazione');
    }
  };

  const applySearch = () => {
    setSearchTerm(searchInput.trim().toLowerCase());
    setCurrentPage(1);
  };

  const filteredClients = clients.filter((client) => {
    if (hideInactive && !client.attivo) return false;
    if (!searchTerm) return true;
    const haystack = [
      client.nome || '',
      client.ragioneSociale,
      client.partitaIva,
      client.codiceFiscale,
      client.email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchTerm);
  });

  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 wow-stagger">
      <div className={`${embedded ? 'wow-panel' : 'wow-card'} p-6 md:p-8`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="wow-chip">Checkup</span>
            <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione Clienti</h1>
            <p className="text-sm text-slate-600 mt-1">Crea i clienti e associa le sublicenze disponibili.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setHideInactive((prev) => !prev);
                setCurrentPage(1);
              }}
              className="wow-button-ghost"
            >
              {hideInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {hideInactive ? 'Mostra disattivati' : 'Nascondi disattivati'}
            </button>
            <button onClick={handleOpenCreate} className="wow-button">
              <Plus className="h-4 w-4" />
              Nuovo cliente
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">Ricerca cliente</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cerca per nome o partita IVA..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
          </div>
          <button onClick={applySearch} className="wow-button">
            Cerca
          </button>
        </div>
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

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <div className="wow-panel overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessun cliente presente</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Ragione sociale/Denominazione</th>
                  <th className="px-4 py-3 text-left">Sublicenza</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedClients.map((client) => {
                  const sublicense = client.sublicense || sublicensesByClient.get(client.id);
                  const expired = sublicense ? isExpired(sublicense.dataScadenza) : false;
                  return (
                    <tr key={client.id} className={`hover:bg-slate-50/70 ${client.attivo ? '' : 'opacity-60'}`}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{getClientDisplayName(client)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{client.ragioneSociale || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {sublicense ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700">
                              {sublicense.numeroSublicenza || 'Sublicenza'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {sublicense.numeroUtenze} utenze · {sublicense.dataScadenza || '—'}
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            !sublicense || !sublicense.attiva
                              ? 'bg-slate-100 text-slate-500'
                              : expired
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {!sublicense ? 'N/D' : !sublicense.attiva ? 'Disattiva' : expired ? 'Scaduta' : 'Attiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3 text-xs font-semibold">
                          <button
                            onClick={() => navigate(`/checkup/clienti/${client.id}`)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Apri checkup"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Modifica"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(client)}
                            className={client.attivo ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}
                            title={client.attivo ? 'Disattiva' : 'Attiva'}
                          >
                            {client.attivo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="p-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredClients.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {showModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? 'Modifica cliente' : 'Nuovo cliente'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass('nome')}>Nome cliente <span className="text-rose-600">*</span></label>
                  <input
                    value={formData.nome}
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      setFormErrors((prev) => ({ ...prev, nome: false }));
                    }}
                    className={inputClass('nome')}
                  />
                </div>
                <div>
                  <label className={labelClass('ragioneSociale')}>Ragione sociale/Denominazione <span className="text-rose-600">*</span></label>
                  <input
                    value={formData.ragioneSociale}
                    onChange={(e) => {
                      setFormData({ ...formData, ragioneSociale: e.target.value });
                      setFormErrors((prev) => ({ ...prev, ragioneSociale: false }));
                    }}
                    className={inputClass('ragioneSociale')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Partita IVA</label>
                  <input
                    value={formData.partitaIva}
                    onChange={(e) => setFormData({ ...formData, partitaIva: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Codice fiscale</label>
                  <input
                    value={formData.codiceFiscale}
                    onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className={labelClass('sublicenseId')}>Licenza associata <span className="text-rose-600">*</span></label>
                <div className="mt-1">
                  <CustomSelect
                    value={selectedSublicenseId}
                    onChange={(value) => {
                      setSelectedSublicenseId(value);
                      setFormErrors((prev) => ({ ...prev, sublicenseId: false }));
                    }}
                    options={sublicenseOptions}
                    placeholder="Seleziona sublicenza"
                    searchable
                    searchPlaceholder="Filtra sublicenze..."
                    noOptionsText="Nessuna sublicenza disponibile"
                    triggerClassName={selectTriggerClass('sublicenseId')}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Selezionabili solo sublicenze attive e non scadute.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="wow-button-ghost">
                  Annulla
                </button>
                <button type="submit" className="wow-button">
                  {isEditing ? 'Salva' : 'Crea cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
      <ConfirmDialog />
    </div>
  );
}
