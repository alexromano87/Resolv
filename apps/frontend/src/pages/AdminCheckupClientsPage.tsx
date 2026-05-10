import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Edit2, Power, PowerOff, Eye, EyeOff, Link2 } from 'lucide-react';
import {
  checkupAdminApi,
  type CheckupAnagraficaLicenziatario,
  type CheckupClient,
  type CheckupSublicense,
  type CheckupStudio,
} from '../api/checkupAdmin';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';

export default function AdminCheckupClientsPage() {
  const UNASSIGNED_SUBLICENSE_VALUE = '__unassigned_sublicense__';
  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [clients, setClients] = useState<CheckupClient[]>([]);
  const [sublicenses, setSublicenses] = useState<CheckupSublicense[]>([]);
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [anagrafiche, setAnagrafiche] = useState<CheckupAnagraficaLicenziatario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<CheckupClient | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStudioId, setFilterStudioId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSublicenseId, setSelectedSublicenseId] = useState('');
  const [selectedStudioId, setSelectedStudioId] = useState('');
  const [selectedConsultantAnagraficaId, setSelectedConsultantAnagraficaId] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
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
    logoUrl: '',
    note: '',
  });

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
  const inputClass = (field: string) =>
    `${inputClassName} ${formErrors[field] ? '!border-rose-300 !ring-2 !ring-rose-200 focus:!border-rose-400 focus:!ring-rose-200' : ''}`;
  const selectTriggerClass = (field: string) =>
    formErrors[field] ? '!border-rose-300 !ring-2 !ring-rose-200 focus:!border-rose-400 focus:!ring-rose-200' : '';
  const labelClass = (_field?: string) => 'block text-sm font-medium text-slate-700';

  const getClientDisplayName = (client: Pick<CheckupClient, 'nome' | 'ragioneSociale'>) =>
    client.ragioneSociale || client.nome || 'Cliente senza nome';

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, sublicensesData, studiosData, anagraficheData] = await Promise.all([
        checkupAdminApi.getClients(),
        checkupAdminApi.getSublicenses(),
        checkupAdminApi.getStudios(),
        checkupAdminApi.getAnagraficheLicenziatario(),
      ]);
      setClients(clientsData);
      setSublicenses(sublicensesData);
      setStudios(studiosData);
      setAnagrafiche(anagraficheData);
      setCurrentPage(1);
    } catch (err: any) {
      toastError(err.message || 'Errore durante il caricamento');
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

  const licenziatariStudios = studios.filter((s) => s.tipo === 'licenziatario');

  const sublicensesByClient = useMemo(() => {
    const map = new Map<string, CheckupSublicense>();
    sublicenses.forEach((s) => {
      if (s.clientId) {
        map.set(s.clientId, s);
      }
    });
    return map;
  }, [sublicenses]);

  const sublicensesForStudio = useMemo(() => {
    if (!selectedStudioId) return [];
    return sublicenses.filter((s) => s.license?.studioId === selectedStudioId);
  }, [sublicenses, selectedStudioId]);

  const availableSublicenses = useMemo(() => {
    return sublicensesForStudio.filter((s) => !s.clientId || s.clientId === selectedClient?.id);
  }, [sublicensesForStudio, selectedClient?.id]);

  const sublicenseOptions = useMemo(
    () =>
      [
        ...(isEditing ? [{ value: UNASSIGNED_SUBLICENSE_VALUE, label: 'Nessuna sublicenza assegnata' }] : []),
        ...availableSublicenses.map((s) => ({
        value: s.id,
        label: `${s.license?.studio?.nome || 'Licenza'} · ${s.numeroSublicenza || '—'}`,
        sublabel: `Utenze ${s.numeroUtenze} · ${s.dataInizioValidita || '—'} → ${s.dataScadenza || '—'}`,
        })),
      ],
    [availableSublicenses, isEditing, UNASSIGNED_SUBLICENSE_VALUE],
  );

  const consultantOptions = useMemo(() => {
    if (!selectedStudioId) return [];
    return anagrafiche
      .filter((item) => item.studioId === selectedStudioId)
      .filter((item) => (item.users || []).some((user) => user.attivo && ['admin_studio', 'collaboratore'].includes(user.ruolo)))
      .map((item) => ({
        value: item.id,
        label: [item.titolo, item.nome, item.cognome].filter(Boolean).join(' '),
        sublabel: item.email || item.pec || undefined,
      }));
  }, [anagrafiche, selectedStudioId]);

  useEffect(() => {
    if (!selectedStudioId) return;
    if (availableSublicenses.length === 1) {
      const only = availableSublicenses[0];
      if (only && only.id !== selectedSublicenseId) {
        setSelectedSublicenseId(only.id);
      }
    }
  }, [availableSublicenses, selectedStudioId, selectedSublicenseId]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedClient(null);
    setSelectedStudioId('');
    setSelectedSublicenseId('');
    setSelectedConsultantAnagraficaId('');
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
      logoUrl: '',
      note: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (client: CheckupClient) => {
    setIsEditing(true);
    setSelectedClient(client);
    setFormErrors({});
    const currentSublicense = sublicensesByClient.get(client.id);
    setSelectedSublicenseId(currentSublicense?.id || '');
    setSelectedStudioId(currentSublicense?.license?.studioId || '');
    setSelectedConsultantAnagraficaId(currentSublicense?.consultantAnagraficaId || '');
    setFormData({
      nome: client.nome || '',
      ragioneSociale: client.ragioneSociale || '',
      partitaIva: client.partitaIva || '',
      codiceFiscale: client.codiceFiscale || '',
      indirizzo: client.indirizzo || '',
      citta: client.citta || '',
      provincia: client.provincia || '',
      cap: client.cap || '',
      paese: client.paese || '',
      email: client.email || '',
      telefono: client.telefono || '',
      sitoWeb: client.sitoWeb || '',
      logoUrl: client.logoUrl || '',
      note: client.note || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient(null);
    setSelectedStudioId('');
    setSelectedConsultantAnagraficaId('');
    setFormErrors({});
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = img.naturalWidth;
        sourceCanvas.height = img.naturalHeight;
        const sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) return;
        sourceCtx.drawImage(img, 0, 0);
        if (file.type === 'image/png') {
          const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
          for (let index = 3; index < sourceData.length; index += 4) {
            if (sourceData[index] < 255) {
              setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
              return;
            }
          }
        }

        const maxWidth = 1200;
        const maxHeight = 450;
        const ratio = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
        const width = Math.round(img.naturalWidth * ratio);
        const height = Math.round(img.naturalHeight * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const threshold = 30;
        const corners: [number, number][] = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
        const visited = new Uint8Array(width * height);

        for (const [cx, cy] of corners) {
          const startIndex = (cy * width + cx) * 4;
          if (data[startIndex + 3] < 128) continue;
          const refR = data[startIndex];
          const refG = data[startIndex + 1];
          const refB = data[startIndex + 2];
          const queue: [number, number][] = [[cx, cy]];
          visited[cy * width + cx] = 1;
          let queueIndex = 0;

          while (queueIndex < queue.length) {
            const [qx, qy] = queue[queueIndex++];
            const pixelIndex = (qy * width + qx) * 4;
            data[pixelIndex + 3] = 0;

            for (const [nx, ny] of [[qx - 1, qy], [qx + 1, qy], [qx, qy - 1], [qx, qy + 1]] as [number, number][]) {
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              const nextIndex = ny * width + nx;
              if (visited[nextIndex]) continue;
              visited[nextIndex] = 1;
              const nextPixelIndex = nextIndex * 4;
              if (data[nextPixelIndex + 3] < 128) continue;
              const deltaR = Math.abs(data[nextPixelIndex] - refR);
              const deltaG = Math.abs(data[nextPixelIndex + 1] - refG);
              const deltaB = Math.abs(data[nextPixelIndex + 2] - refB);
              if (deltaR <= threshold && deltaG <= threshold && deltaB <= threshold) {
                queue.push([nx, ny]);
              }
            }
          }

          break;
        }

        ctx.putImageData(imageData, 0, 0);

        const trimmedSource = ctx.getImageData(0, 0, width, height).data;
        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if (trimmedSource[(y * width + x) * 4 + 3] > 0) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (minX > maxX || minY > maxY) {
          setFormData((prev) => ({ ...prev, logoUrl: canvas.toDataURL('image/png') }));
          return;
        }

        const padding = 6;
        const trimmedCanvas = document.createElement('canvas');
        trimmedCanvas.width = maxX - minX + 1 + padding * 2;
        trimmedCanvas.height = maxY - minY + 1 + padding * 2;
        const trimmedCtx = trimmedCanvas.getContext('2d');
        if (!trimmedCtx) return;
        trimmedCtx.clearRect(0, 0, trimmedCanvas.width, trimmedCanvas.height);
        trimmedCtx.drawImage(
          canvas,
          minX,
          minY,
          maxX - minX + 1,
          maxY - minY + 1,
          padding,
          padding,
          maxX - minX + 1,
          maxY - minY + 1,
        );
        setFormData((prev) => ({ ...prev, logoUrl: trimmedCanvas.toDataURL('image/png') }));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const ensureSublicenseAssignable = (sublicense: CheckupSublicense) => {
    if (!sublicense.tipo || !sublicense.dataInizioValidita || !sublicense.dataScadenza) {
      toastError('Completa la sublicenza prima di assegnarla');
      return false;
    }
    if (!sublicense.attiva) {
      toastError('La sublicenza selezionata è disattivata');
      return false;
    }
    if (isExpired(sublicense.dataScadenza)) {
      toastError('La sublicenza selezionata è scaduta');
      return false;
    }
    return true;
  };

  const updateSublicenseAssignment = async (clientId: string, newSublicenseId: string, consultantAnagraficaId: string) => {
    const current = sublicensesByClient.get(clientId);
    if (current && current.id !== newSublicenseId) {
      await checkupAdminApi.upsertSublicense({
        id: current.id,
        licenseId: current.licenseId,
        modelId: current.modelId || '',
        tipo: current.tipo || '',
        numeroUtenze: current.numeroUtenze,
        dataInizioValidita: current.dataInizioValidita || '',
        dataScadenza: current.dataScadenza || '',
        clientId: '',
        attiva: current.attiva,
        allowDocuments: current.allowDocuments ?? true,
        consultantAnagraficaId: '',
      });
    }

    if (!newSublicenseId) {
      return;
    }

    const next = sublicenses.find((s) => s.id === newSublicenseId);
    if (!next) {
      toastError('Sublicenza non trovata');
      return;
    }
    if (!ensureSublicenseAssignable(next)) return;

    await checkupAdminApi.upsertSublicense({
      id: next.id,
      licenseId: next.licenseId,
      modelId: next.modelId || '',
      tipo: next.tipo || '',
      numeroUtenze: next.numeroUtenze,
      dataInizioValidita: next.dataInizioValidita || '',
      dataScadenza: next.dataScadenza || '',
      clientId,
      attiva: next.attiva,
      allowDocuments: next.allowDocuments ?? true,
      consultantAnagraficaId,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = formData.nome.trim();
    const ragioneSociale = formData.ragioneSociale.trim();
    const nextErrors: Record<string, boolean> = {};
    if (!nome && !ragioneSociale) {
      nextErrors.nome = true;
      nextErrors.ragioneSociale = true;
    }
    if (!selectedStudioId) {
      nextErrors.studioId = true;
    }
    if (!isEditing && !selectedSublicenseId) {
      nextErrors.sublicenseId = true;
    }
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      toastError('Compila i campi obbligatori');
      return;
    }

    const normalizedSublicenseId =
      selectedSublicenseId === UNASSIGNED_SUBLICENSE_VALUE ? '' : selectedSublicenseId;
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
      let client: CheckupClient;
      if (isEditing && selectedClient) {
        client = await checkupAdminApi.updateClient(selectedClient.id, {
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
          logoUrl: formData.logoUrl.trim(),
          note: formData.note.trim(),
        });
        success('Cliente aggiornato');
      } else {
        client = await checkupAdminApi.createClient({
          nome,
          sublicenseId: normalizedSublicenseId,
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
          logoUrl: formData.logoUrl.trim(),
          note: formData.note.trim(),
        });
        success('Cliente creato');
      }

      await updateSublicenseAssignment(client.id, normalizedSublicenseId, selectedConsultantAnagraficaId);

      handleCloseModal();
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il salvataggio del cliente');
    }
  };

  const handleToggleActive = async (client: CheckupClient) => {
    const confirmed = await confirm({
      title: client.attivo ? 'Disattivare cliente?' : 'Attivare cliente?',
      message: `Sei sicuro di voler ${client.attivo ? 'disattivare' : 'attivare'} ${getClientDisplayName(client)}?`,
      confirmText: client.attivo ? 'Disattiva' : 'Attiva',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      if (client.attivo) {
        await checkupAdminApi.deactivateClient(client.id);
        success('Cliente disattivato');
      } else {
        await checkupAdminApi.updateClient(client.id, { attivo: true });
        success('Cliente attivato');
      }
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante l\'operazione');
    }
  };

  const filteredClients = (hideInactive ? clients.filter((c) => c.attivo) : clients).filter((client) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      (client.nome || '').toLowerCase().includes(term) ||
      (client.ragioneSociale || '').toLowerCase().includes(term) ||
      (client.email || '').toLowerCase().includes(term) ||
      (client.codiceFiscale || '').toLowerCase().includes(term) ||
      (client.partitaIva || '').toLowerCase().includes(term)
    );
  }).filter((client) => {
    if (!filterStudioId) return true;
    const sublicense = sublicensesByClient.get(client.id);
    return sublicense?.license?.studioId === filterStudioId;
  });
  const paginatedClients = filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione sublicenziatari</h1>
          <p className="text-sm text-slate-600 mt-1">
            Crea i clienti e associa le sublicenze disponibili.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-[220px]">
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
          <div className="min-w-[240px]">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cerca cliente..."
              className={inputClassName}
            />
          </div>
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
          <button onClick={handleOpenCreate} className="wow-button">
            <Plus className="h-4 w-4" />
            Nuovo cliente
          </button>
        </div>
      </div>

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
                  <th className="px-4 py-3 text-left">Studio</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Sublicenza</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedClients.map((client) => {
                  const sublicense = sublicensesByClient.get(client.id);
                  const expired = sublicense ? isExpired(sublicense.dataScadenza) : false;
                  const studioName = sublicense?.license?.studio?.nome || '—';
                  return (
                    <tr key={client.id} className={`hover:bg-slate-50/70 ${client.attivo ? '' : 'opacity-60'}`}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{getClientDisplayName(client)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{studioName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{client.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {sublicense ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                            <Link2 className="h-3.5 w-3.5" />
                            {sublicense.numeroSublicenza || '—'} · {sublicense.numeroUtenze} utenze
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                                !sublicense.attiva || expired
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {!sublicense.attiva ? 'Disattiva' : expired ? 'Scaduta' : 'Attiva'}
                            </span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${client.attivo ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                          {client.attivo ? 'Attivo' : 'Disattivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3 text-xs font-semibold">
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifica"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(client)}
                            className={client.attivo ? 'text-amber-600 hover:text-amber-900' : 'text-emerald-600 hover:text-emerald-700'}
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
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditing ? 'Modifica cliente' : 'Nuovo cliente'}
                </h2>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Studio associato <span className="text-rose-600">*</span></h3>
                  <div className="mt-3">
                    <CustomSelect
                      value={selectedStudioId}
                      onChange={(val) => {
                        setSelectedStudioId(val);
                        setSelectedSublicenseId('');
                        setSelectedConsultantAnagraficaId('');
                        setFormErrors((prev) => ({ ...prev, studioId: false }));
                      }}
                      options={licenziatariStudios.map((s) => ({ value: s.id, label: s.nome }))}
                      placeholder="Seleziona studio"
                      searchable
                      searchPlaceholder="Cerca studio..."
                      triggerClassName={selectTriggerClass('studioId')}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Seleziona lo studio licenziatario a cui collegare il cliente.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Sublicenza associata {!isEditing && <span className="text-rose-600">*</span>}
                  </h3>
                  <div className="mt-3">
                    <CustomSelect
                      value={selectedSublicenseId}
                      onChange={(val) => {
                        setSelectedSublicenseId(val);
                        const selectedSublicense = sublicenses.find((item) => item.id === val);
                        setSelectedConsultantAnagraficaId(selectedSublicense?.consultantAnagraficaId || '');
                        setFormErrors((prev) => ({ ...prev, sublicenseId: false }));
                      }}
                      options={sublicenseOptions}
                      placeholder="Seleziona sublicenza"
                      searchable
                      searchPlaceholder="Cerca sublicenza..."
                      triggerClassName={selectTriggerClass('sublicenseId')}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      {isEditing
                        ? 'Puoi anche rimuovere l’assegnazione per liberare la sublicenza e riassegnarla in seguito.'
                        : 'Sono selezionabili solo sublicenze attive e non scadute.'}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Consulente di riferimento</h3>
                  <div className="mt-3">
                    <CustomSelect
                      value={selectedConsultantAnagraficaId}
                      onChange={setSelectedConsultantAnagraficaId}
                      options={[
                        { value: '', label: 'Nessun consulente selezionato' },
                        ...consultantOptions,
                      ]}
                      placeholder="Seleziona consulente"
                      searchable
                      searchPlaceholder="Cerca consulente..."
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Sono disponibili solo anagrafiche del licenziatario collegate a utenti Admin studio o Collaboratore.
                    </p>
                    {selectedStudioId && consultantOptions.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        Nessun consulente disponibile: crea una anagrafica e associala a un utente Admin studio o Collaboratore.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass('nome')}>Nome cliente <span className="text-rose-600">*</span></label>
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
                    <label className={labelClass('ragioneSociale')}>Ragione sociale/Denominazione <span className="text-rose-600">*</span></label>
                    <input
                      value={formData.ragioneSociale}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, ragioneSociale: e.target.value }));
                        setFormErrors((prev) => ({ ...prev, ragioneSociale: false }));
                      }}
                      className={inputClass('ragioneSociale')}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Compila almeno uno tra `Nome cliente` e `Ragione sociale/Denominazione`.</p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Partita IVA</label>
                    <input
                      value={formData.partitaIva}
                      onChange={(e) => setFormData((p) => ({ ...p, partitaIva: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Codice fiscale</label>
                    <input
                      value={formData.codiceFiscale}
                      onChange={(e) => setFormData((p) => ({ ...p, codiceFiscale: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Telefono</label>
                    <input
                      value={formData.telefono}
                      onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Indirizzo</label>
                  <input
                    value={formData.indirizzo}
                    onChange={(e) => setFormData((p) => ({ ...p, indirizzo: e.target.value }))}
                    className={inputClassName}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Città</label>
                    <input
                      value={formData.citta}
                      onChange={(e) => setFormData((p) => ({ ...p, citta: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Provincia</label>
                    <input
                      value={formData.provincia}
                      onChange={(e) => setFormData((p) => ({ ...p, provincia: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">CAP</label>
                    <input
                      value={formData.cap}
                      onChange={(e) => setFormData((p) => ({ ...p, cap: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Paese</label>
                  <input
                    value={formData.paese}
                    onChange={(e) => setFormData((p) => ({ ...p, paese: e.target.value }))}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Logo aziendale</label>
                  <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    {formData.logoUrl ? (
                      <div className="flex items-start gap-3">
                        <img
                          src={formData.logoUrl}
                          alt="Logo cliente"
                          className="h-14 w-auto max-w-[220px] rounded-lg border border-slate-200 bg-white object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, logoUrl: '' }))}
                          className="text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          Rimuovi logo
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Nessun logo caricato</p>
                    )}
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="mt-3 wow-button-ghost text-xs"
                    >
                      {formData.logoUrl ? 'Sostituisci logo' : 'Carica logo'}
                    </button>
                    <p className="mt-2 text-[11px] text-slate-400">PNG, JPEG o WebP · max 400×150 px</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Note</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
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
        </BodyPortal>
      )}

      <ConfirmDialog />
    </div>
  );
}
