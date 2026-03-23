import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Edit2, Power, PowerOff, Eye, EyeOff, UserPlus, Key } from 'lucide-react';
import { checkupAdminApi, type CheckupStudio, type CheckupLicense, type CheckupAdminUser } from '../api/checkupAdmin';
import { CustomSelect } from '../components/ui/CustomSelect';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';

export default function AdminCheckupStudiosPage() {
  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('it-IT') : '—';
  };

  const { success, error: toastError } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [studios, setStudios] = useState<CheckupStudio[]>([]);
  const [licenses, setLicenses] = useState<CheckupLicense[]>([]);
  const [users, setUsers] = useState<CheckupAdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<CheckupStudio | null>(null);
  const [hideInactive, setHideInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'licenziatario' | 'cliente'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'licenziatario' as 'licenziatario' | 'cliente',
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
    licenseId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  const [showStaffForm, setShowStaffForm] = useState(false);
  const [keepUserIds, setKeepUserIds] = useState<string[]>([]);
  const [staffForm, setStaffForm] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    ruolo: 'admin_studio' as 'admin_studio' | 'segreteria' | 'collaboratore',
    telefono: '',
  });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedStaffUser, setSelectedStaffUser] = useState<CheckupAdminUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
  const inputClass = (field: string) =>
    `${inputClassName} ${formErrors[field] ? '!border-rose-300 !ring-2 !ring-rose-200 focus:!border-rose-400 focus:!ring-rose-200' : ''}`;
  const labelClass = (_field?: string) => 'block text-sm font-medium text-slate-700';

  const loadData = async () => {
    setLoading(true);
    try {
      const [studiosData, licensesData, usersData] = await Promise.all([
        checkupAdminApi.getStudios(),
        checkupAdminApi.getLicenses(),
        checkupAdminApi.getAdminUsers(),
      ]);
      setStudios(studiosData);
      setLicenses(licensesData);
      setUsers(usersData);
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

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedStudio(null);
    setFormErrors({});
    setFormData({
      nome: '',
      tipo: 'licenziatario',
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
      licenseId: '',
    });
    setKeepUserIds([]);
    setShowStaffForm(false);
    setShowModal(true);
  };

  const handleOpenEdit = (studio: CheckupStudio) => {
    setIsEditing(true);
    setSelectedStudio(studio);
    setFormErrors({});
    setFormData({
      nome: studio.nome,
      tipo: studio.tipo,
      ragioneSociale: studio.ragioneSociale || '',
      partitaIva: studio.partitaIva || '',
      codiceFiscale: studio.codiceFiscale || '',
      indirizzo: studio.indirizzo || '',
      citta: studio.citta || '',
      provincia: studio.provincia || '',
      cap: studio.cap || '',
      paese: studio.paese || '',
      email: studio.email || '',
      telefono: studio.telefono || '',
      sitoWeb: studio.sitoWeb || '',
      logoUrl: studio.logoUrl || '',
      note: studio.note || '',
      licenseId: licenses.find((l) => l.studioId === studio.id)?.id || '',
    });
    setKeepUserIds([]);

    setShowStaffForm(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudio(null);
    setShowStaffForm(false);
    setFormErrors({});
    setKeepUserIds([]);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 400;
        const maxHeight = 150;
        const ratio = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
        const width = Math.round(img.naturalWidth * ratio);
        const height = Math.round(img.naturalHeight * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      setFormErrors({ nome: true });
      toastError('Il nome dello studio è obbligatorio');
      return;
    }
    if (isEditing && nextLicense && currentLicense?.id === nextLicense.id && activeUsersExcess > 0) {
      toastError(`La licenza consente massimo ${nextLicense.numeroUtenze} utenti attivi, ma questo licenziatario ne ha ${activeStaffUsersForStudio.length}. Devi disattivarne o eliminarne almeno ${activeUsersExcess}.`);
      return;
    }
    if (isEditing && currentLicense && !formData.licenseId && activeStaffUsersForStudio.length > 0) {
      toastError('Non puoi rimuovere la licenza finché sono presenti utenze attive. Disattiva prima le utenze da non conteggiare.');
      return;
    }
    if (isReducingLicenseCapacity && nextLicense) {
      if (keepUserIds.length === 0) {
        toastError('Seleziona le utenze attive da mantenere con la nuova licenza');
        return;
      }
      if (keepUserIds.length > nextLicense.numeroUtenze) {
        toastError('Hai selezionato più utenze di quelle consentite dalla nuova licenza');
        return;
      }
    }

    const confirmed = await confirm({
      title: isEditing ? 'Confermare modifica studio?' : 'Confermare creazione studio?',
      message: isEditing
        ? `Vuoi salvare le modifiche dello studio "${formData.nome.trim()}"?`
        : `Vuoi creare lo studio "${formData.nome.trim()}"?`,
      confirmText: isEditing ? 'Salva modifiche' : 'Crea studio',
      variant: 'info',
    });

    if (!confirmed) return;

    try {
      if (isEditing && selectedStudio) {
        await checkupAdminApi.updateStudio(selectedStudio.id, {
          nome: formData.nome.trim(),
          tipo: formData.tipo,
          ragioneSociale: formData.ragioneSociale.trim(),
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
          licenseId: formData.tipo === 'licenziatario' ? formData.licenseId || '' : '',
          keepUserIds: isReducingLicenseCapacity ? keepUserIds : undefined,
        });
        success('Studio aggiornato');
      } else {
        await checkupAdminApi.createStudio({
          nome: formData.nome.trim(),
          tipo: formData.tipo,
          ragioneSociale: formData.ragioneSociale.trim(),
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
          licenseId: formData.tipo === 'licenziatario' ? formData.licenseId || '' : undefined,
        });
        success('Studio creato');
      }

      handleCloseModal();
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante il salvataggio');
    }
  };

  const handleToggleActive = async (studio: CheckupStudio) => {
    const confirmed = await confirm({
      title: studio.attivo ? 'Disattivare studio?' : 'Attivare studio?',
      message: `Sei sicuro di voler ${studio.attivo ? 'disattivare' : 'attivare'} lo studio ${studio.nome}?`,
      confirmText: studio.attivo ? 'Disattiva' : 'Attiva',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      if (studio.attivo) {
        await checkupAdminApi.deactivateStudio(studio.id);
        success('Studio disattivato');
      } else {
        await checkupAdminApi.updateStudio(studio.id, { attivo: true });
        success('Studio attivato');
      }
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante l\'operazione');
    }
  };

  const handleCreateStaffUser = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedStudio) return;
    if (!formData.licenseId) {
      toastError('Seleziona prima una licenza per poter creare utenti dello studio');
      return;
    }
    if (!staffForm.nome.trim() || !staffForm.cognome.trim() || !staffForm.email.trim() || !staffForm.password) {
      toastError('Compila tutti i campi obbligatori');
      return;
    }
    const confirmed = await confirm({
      title: 'Confermare creazione utente?',
      message: `Vuoi creare l'utente "${staffForm.nome.trim()} ${staffForm.cognome.trim()}" per questo studio?`,
      confirmText: 'Crea utente',
      variant: 'info',
    });
    if (!confirmed) return;
    try {
      await checkupAdminApi.createAdminUser({
        nome: staffForm.nome.trim(),
        cognome: staffForm.cognome.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
        ruolo: staffForm.ruolo,
        studioId: selectedStudio.id,
        telefono: staffForm.telefono || undefined,
      });
      success('Utente studio creato');
      setStaffForm({
        nome: '',
        cognome: '',
        email: '',
        password: '',
        ruolo: 'admin_studio',
        telefono: '',
      });
      setShowStaffForm(false);
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Errore durante la creazione utente');
    }
  };

  const handleToggleStaffActive = async (user: CheckupAdminUser) => {
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

  const handleOpenResetPassword = (user: CheckupAdminUser) => {
    setSelectedStaffUser(user);
    setResetPasswordValue('');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUser || !resetPasswordValue) return;
    try {
      await checkupAdminApi.resetAdminPassword(selectedStaffUser.id, resetPasswordValue);
      success('Password reimpostata');
      setShowResetPasswordModal(false);
      setSelectedStaffUser(null);
      setResetPasswordValue('');
    } catch (err: any) {
      toastError(err.message || 'Errore durante il reset password');
    }
  };

  const staffRoleOptions = [
    { value: 'admin_studio', label: 'Admin studio' },
    { value: 'segreteria', label: 'Segreteria' },
    { value: 'collaboratore', label: 'Collaboratore' },
  ];
  const staffRoleLabels: Record<'admin_studio' | 'segreteria' | 'collaboratore', string> = {
    admin_studio: 'Admin studio',
    segreteria: 'Segreteria',
    collaboratore: 'Collaboratore',
  };

  const availableLicenses = licenses.filter(
    (l) => !l.studioId || (selectedStudio && l.studioId === selectedStudio.id),
  );
  const staffUsersForStudio = selectedStudio
    ? users.filter((u) => u.studioId === selectedStudio.id && u.ruolo !== 'cliente')
    : [];
  const activeStaffUsersForStudio = staffUsersForStudio.filter((u) => u.attivo);
  const currentLicense = selectedStudio ? licenses.find((l) => l.studioId === selectedStudio.id) || null : null;
  const nextLicense = formData.licenseId
    ? licenses.find((l) => l.id === formData.licenseId) || null
    : null;
  const isChangingLicense = isEditing && currentLicense && nextLicense && currentLicense.id !== nextLicense.id;
  const activeUsersExcess = nextLicense
    ? Math.max(0, activeStaffUsersForStudio.length - nextLicense.numeroUtenze)
    : 0;
  const isOverLicenseCapacity = Boolean(nextLicense && activeUsersExcess > 0);
  const isReducingLicenseCapacity = Boolean(
    isChangingLicense
      && nextLicense
      && activeStaffUsersForStudio.length > nextLicense.numeroUtenze,
  );
  const canCreateStaffUsers = Boolean(selectedStudio && formData.licenseId);

  const filteredStudios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return studios.filter((studio) => {
      if (hideInactive && !studio.attivo) return false;
      if (filterTipo !== 'all' && studio.tipo !== filterTipo) return false;
      if (!term) return true;
      return [
        studio.nome,
        studio.ragioneSociale,
        studio.email,
        studio.partitaIva,
        studio.codiceFiscale,
        studio.citta,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [studios, hideInactive, filterTipo, searchTerm]);
  const paginatedStudios = filteredStudios.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredStudios.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione licenziatari</h1>
          <p className="text-sm text-slate-600 mt-1">Gestisci licenziatari e sublicenziatari.</p>
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
          <button onClick={handleOpenCreate} className="wow-button">
            <Plus className="h-4 w-4" />
            Nuovo studio
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
            placeholder="Cerca per nome, email o P.IVA"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
          />
        </div>
        <div className="min-w-[220px]">
          <CustomSelect
            value={filterTipo}
            onChange={(val) => {
              setFilterTipo(val as 'all' | 'licenziatario' | 'cliente');
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'Tutti i tipi' },
              { value: 'licenziatario', label: 'Licenziatari' },
              { value: 'cliente', label: 'Sublicenziatari' },
            ]}
            placeholder="Filtra per tipo"
          />
        </div>
      </div>

      {loading ? (
        <div className="wow-panel p-10 text-center text-slate-500">Caricamento...</div>
      ) : (
        <div className="wow-panel overflow-hidden">
          {filteredStudios.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Nessuno studio presente</div>
          ) : (
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Studio</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedStudios.map((studio) => (
                  <tr key={studio.id} className={`hover:bg-slate-50/70 ${studio.attivo ? '' : 'opacity-60'}`}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {studio.nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {studio.tipo === 'licenziatario' ? 'Licenziatario' : 'Cliente'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{studio.email || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${studio.attivo ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500'}`}>
                        {studio.attivo ? 'Attivo' : 'Disattivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs font-semibold">
                        <button
                          onClick={() => handleOpenEdit(studio)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifica"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(studio)}
                          className={studio.attivo ? 'text-amber-600 hover:text-amber-900' : 'text-emerald-600 hover:text-emerald-700'}
                          title={studio.attivo ? 'Disattiva' : 'Attiva'}
                        >
                          {studio.attivo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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
              totalItems={filteredStudios.length}
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
                  {isEditing ? 'Modifica studio' : 'Nuovo studio'}
                </h2>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass('nome')}>Nome studio <span className="text-rose-600">*</span></label>
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
                    <label className="block text-sm font-medium text-slate-700">Tipo</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={formData.tipo}
                        onChange={(val: string) =>
                          setFormData((p) => ({
                            ...p,
                            tipo: val as 'licenziatario' | 'cliente',
                            licenseId: val === 'cliente' ? '' : p.licenseId,
                          }))
                        }
                        options={[
                          { value: 'licenziatario', label: 'Licenziatario' },
                          { value: 'cliente', label: 'Cliente' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {formData.tipo === 'licenziatario' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Licenza assegnata</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={formData.licenseId}
                        onChange={(val) => {
                          setFormData((p) => ({ ...p, licenseId: val }));
                          setKeepUserIds([]);
                          if (!val) {
                            setShowStaffForm(false);
                          }
                        }}
                        options={[
                          ...(isEditing ? [{ value: '', label: 'Nessuna licenza assegnata' }] : []),
                          ...availableLicenses.map((license) => ({
                            value: license.id,
                            label: license.numeroLicenza
                              ? `Licenza #${license.numeroLicenza} · ${license.intestatario}`
                              : `Licenza senza numero · ${license.intestatario}`,
                            sublabel: [
                              license.studio?.nome || 'Non assegnata',
                              license.tipo || 'Tipo n.d.',
                              `${license.numeroUtenze} utenze`,
                              `${formatDate(license.dataInizioValidita)} → ${formatDate(license.dataScadenza)}`,
                            ].join(' · '),
                          })),
                        ]}
                        placeholder="Seleziona licenza disponibile"
                        searchable
                        searchPlaceholder="Cerca licenza..."
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Sono disponibili solo le licenze non assegnate o già associate a questo studio.
                    </p>
                    {isEditing && currentLicense && !formData.licenseId && activeStaffUsersForStudio.length > 0 && (
                      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        Non puoi rimuovere la licenza finché sono presenti {activeStaffUsersForStudio.length} utenze attive. Le utenze disattivate non vengono conteggiate.
                      </div>
                    )}
                    {isOverLicenseCapacity && nextLicense && currentLicense?.id === nextLicense.id && (
                      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        La licenza consente massimo {nextLicense.numeroUtenze} utenti attivi, ma questo licenziatario ne ha {activeStaffUsersForStudio.length}. Devi disattivarne o eliminarne almeno {activeUsersExcess}. Le utenze disattivate non vengono conteggiate.
                      </div>
                    )}
                    {isReducingLicenseCapacity && nextLicense && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p className="font-semibold">
                          La nuova licenza consente {nextLicense.numeroUtenze} utenti attivi, ma lo studio ne ha {activeStaffUsersForStudio.length}.
                        </p>
                        <p className="mt-1 text-xs text-amber-800">
                          Seleziona le utenze da mantenere attive. Le altre verranno disattivate automaticamente al salvataggio.
                        </p>
                        <div className="mt-3 space-y-2">
                          {activeStaffUsersForStudio.map((user) => {
                            const checked = keepUserIds.includes(user.id);
                            const disabled = !checked && keepUserIds.length >= nextLicense.numeroUtenze;
                            return (
                              <label
                                key={user.id}
                                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${checked ? 'border-amber-300 bg-white' : 'border-amber-100 bg-white/70'} ${disabled ? 'opacity-50' : ''}`}
                              >
                                <span>
                                  <span className="font-medium text-slate-900">{user.nome} {user.cognome}</span>
                                  <span className="ml-2 text-xs text-slate-500">{user.email}</span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={(e) => {
                                    setKeepUserIds((prev) => (
                                      e.target.checked
                                        ? [...prev, user.id]
                                        : prev.filter((id) => id !== user.id)
                                    ));
                                  }}
                                />
                              </label>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-amber-800">
                          Selezionati {keepUserIds.length}/{nextLicense.numeroUtenze}.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Ragione sociale/Denominazione</label>
                    <input
                      value={formData.ragioneSociale}
                      onChange={(e) => setFormData((p) => ({ ...p, ragioneSociale: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Partita IVA</label>
                    <input
                      value={formData.partitaIva}
                      onChange={(e) => setFormData((p) => ({ ...p, partitaIva: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Codice fiscale</label>
                    <input
                      value={formData.codiceFiscale}
                      onChange={(e) => setFormData((p) => ({ ...p, codiceFiscale: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Telefono</label>
                    <input
                      value={formData.telefono}
                      onChange={(e) => setFormData((p) => ({ ...p, telefono: e.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Sito web</label>
                    <input
                      value={formData.sitoWeb}
                      onChange={(e) => setFormData((p) => ({ ...p, sitoWeb: e.target.value }))}
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

                {formData.tipo === 'licenziatario' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Logo aziendale</label>
                    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      {formData.logoUrl ? (
                        <div className="flex items-start gap-3">
                          <img
                            src={formData.logoUrl}
                            alt="Logo studio"
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
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700">Note</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    rows={3}
                  />
                </div>

                {isEditing && selectedStudio && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Utenti dello studio</h3>
                        <p className="text-xs text-slate-500">Crea e consulta gli utenti staff collegati allo studio.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!canCreateStaffUsers) {
                            toastError('Seleziona e salva prima una licenza per poter creare utenti dello studio');
                            return;
                          }
                          setShowStaffForm((prev) => !prev);
                        }}
                        className="wow-button-ghost"
                      >
                        <UserPlus className="h-4 w-4" />
                        {showStaffForm ? 'Chiudi' : 'Nuovo utente studio'}
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {!canCreateStaffUsers && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Per creare utenti dello studio devi prima selezionare una licenza e salvare il licenziatario.
                        </div>
                      )}
                      {staffUsersForStudio.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                          Nessun utente staff associato.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {staffUsersForStudio.map((user) => (
                            <div
                              key={user.id}
                              className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <div className="text-slate-900 font-medium">{user.nome} {user.cognome}</div>
                                <div className="text-xs text-slate-500">{user.email}</div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                                  {staffRoleLabels[user.ruolo as 'admin_studio' | 'segreteria' | 'collaboratore']}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 ${user.attivo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {user.attivo ? 'Attivo' : 'Disattivo'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenResetPassword(user)}
                                  className="rounded-full border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:border-blue-300"
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStaffActive(user)}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                    user.attivo
                                      ? 'border-amber-200 text-amber-700 hover:border-amber-300'
                                      : 'border-emerald-200 text-emerald-700 hover:border-emerald-300'
                                  }`}
                                >
                                  {user.attivo ? 'Disattiva' : 'Attiva'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {showStaffForm && (
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Nome</label>
                          <input
                            value={staffForm.nome}
                            onChange={(e) => setStaffForm((p) => ({ ...p, nome: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Cognome</label>
                          <input
                            value={staffForm.cognome}
                            onChange={(e) => setStaffForm((p) => ({ ...p, cognome: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Email</label>
                          <input
                            type="email"
                            value={staffForm.email}
                            onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Password</label>
                          <input
                            type="password"
                            value={staffForm.password}
                            onChange={(e) => setStaffForm((p) => ({ ...p, password: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Ruolo</label>
                          <div className="mt-1">
                            <CustomSelect
                              value={staffForm.ruolo}
                              onChange={(val) =>
                                setStaffForm((p) => ({
                                  ...p,
                                  ruolo: val as 'admin_studio' | 'segreteria' | 'collaboratore',
                                }))
                              }
                              options={staffRoleOptions}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Telefono (opzionale)</label>
                          <input
                            value={staffForm.telefono}
                            onChange={(e) => setStaffForm((p) => ({ ...p, telefono: e.target.value }))}
                            className={inputClassName}
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setShowStaffForm(false)}
                            className="wow-button-ghost"
                          >
                            Annulla
                          </button>
                          <button type="button" onClick={handleCreateStaffUser} className="wow-button">
                            Crea utente studio
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={handleCloseModal} className="wow-button-ghost">
                    Annulla
                  </button>
                  <button type="submit" className="wow-button">
                    {isEditing ? 'Salva' : 'Crea studio'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </BodyPortal>
      )}

      {showResetPasswordModal && selectedStaffUser && (
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
                  Imposta una nuova password per {selectedStaffUser.nome} {selectedStaffUser.cognome}.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nuova password</label>
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
                    <Key className="h-4 w-4" />
                    Reimposta
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
