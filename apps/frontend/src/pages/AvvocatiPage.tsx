// apps/frontend/src/pages/AvvocatiPage.tsx
import { useState, useEffect } from 'react';
import {
  User, Plus, X, Save, Eye, EyeOff, Power, PowerOff, Trash2, Edit, Mail, Phone, FileText, Shield, RefreshCw
} from 'lucide-react';
import { avvocatiApi, type Avvocato, type CreateAvvocatoDto, type LivelloAccessoPratiche, type LivelloPermessi, getAvvocatoDisplayName } from '../api/avvocati';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { BodyPortal } from '../components/ui/BodyPortal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/ui/ToastProvider';
import { useAuth } from '../contexts/AuthContext';

export function AvvocatiPage() {
  const { user } = useAuth();
  const [avvocati, setAvvocati] = useState<Avvocato[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedAvvocato, setSelectedAvvocato] = useState<Avvocato | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { success, error: toastError } = useToast();

  if (!['admin', 'titolare_studio', 'segreteria'].includes(user?.ruolo ?? '')) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mt-2 text-lg font-medium text-slate-900 dark:text-slate-100">
          Accesso negato
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Non hai i permessi per accedere a questa sezione.
        </p>
      </div>
    );
  }

  // Form states
  const [formData, setFormData] = useState<CreateAvvocatoDto>({
    nome: '',
    cognome: '',
    email: '',
    codiceFiscale: '',
    telefono: '',
    livelloAccessoPratiche: 'solo_proprie',
    livelloPermessi: 'modifica',
    note: '',
  });

  const loadAvvocati = async () => {
    try {
      setLoading(true);
      console.log('📋 AvvocatiPage: Caricamento avvocati, showInactive:', showInactive);
      const data = await avvocatiApi.getAll(showInactive);
      console.log('📋 AvvocatiPage: Avvocati ricevuti:', data);
      setAvvocati(data);
      setError(null);
    } catch (err: any) {
      console.error('📋 AvvocatiPage: Errore caricamento:', err);
      setError(err.message || 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvvocati();
  }, [showInactive]);

  const resetForm = () => {
    setFormData({
      nome: '',
      cognome: '',
      email: '',
      codiceFiscale: '',
      telefono: '',
      livelloAccessoPratiche: 'solo_proprie',
      livelloPermessi: 'modifica',
      note: '',
    });
    setSubmitAttempted(false);
  };

  const handleCreate = async () => {
    if (!formData.nome || !formData.cognome || !formData.email) {
      setSubmitAttempted(true);
      toastError('Nome, cognome ed email sono obbligatori', 'Validazione');
      return;
    }

    if (await confirm({
      title: 'Conferma creazione',
      message: `Creare avvocato ${formData.nome} ${formData.cognome}?`,
      confirmText: 'Crea',
      variant: 'info',
    })) {
      try {
        setSaving(true);
        await avvocatiApi.create(formData);
        success('Avvocato creato con successo');
        await loadAvvocati();
        setShowNewForm(false);
        setSubmitAttempted(false);
        resetForm();
      } catch (err: any) {
        setSubmitAttempted(true);
        toastError(err.message || 'Errore nella creazione');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedAvvocato) return;
    if (!formData.nome || !formData.cognome || !formData.email) {
      setSubmitAttempted(true);
      toastError('Nome, cognome ed email sono obbligatori', 'Validazione');
      return;
    }

    if (await confirm({
      title: 'Conferma modifica',
      message: `Salvare le modifiche per ${getAvvocatoDisplayName(selectedAvvocato)}?`,
      confirmText: 'Salva',
      variant: 'info',
    })) {
      try {
        setSaving(true);
        await avvocatiApi.update(selectedAvvocato.id, formData);
        success('Avvocato aggiornato con successo');
        await loadAvvocati();
        setIsEditing(false);
        setIsViewing(true);
        const updatedAvvocato = await avvocatiApi.getAll(showInactive).then(data =>
          data.find(a => a.id === selectedAvvocato.id)
        );
        if (updatedAvvocato) {
          setSelectedAvvocato(updatedAvvocato);
          setFormData({
            nome: updatedAvvocato.nome,
            cognome: updatedAvvocato.cognome,
            email: updatedAvvocato.email,
            codiceFiscale: updatedAvvocato.codiceFiscale || '',
            telefono: updatedAvvocato.telefono || '',
            livelloAccessoPratiche: updatedAvvocato.livelloAccessoPratiche,
            livelloPermessi: updatedAvvocato.livelloPermessi,
            note: updatedAvvocato.note || '',
          });
        }
      } catch (err: any) {
        setSubmitAttempted(true);
        toastError(err.message || 'Errore nell\'aggiornamento');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeactivate = async (avvocato: Avvocato) => {
    if (await confirm({
      title: 'Disattiva avvocato',
      message: `Disattivare ${getAvvocatoDisplayName(avvocato)}?`,
      confirmText: 'Disattiva',
      variant: 'warning',
    })) {
      try {
        await avvocatiApi.deactivate(avvocato.id);
        success('Avvocato disattivato');
        await loadAvvocati();
      } catch (err: any) {
        toastError(err.message || 'Errore durante la disattivazione');
      }
    }
  };

  const handleReactivate = async (avvocato: Avvocato) => {
    if (await confirm({
      title: 'Riattiva avvocato',
      message: `Riattivare ${getAvvocatoDisplayName(avvocato)}?`,
      confirmText: 'Riattiva',
      variant: 'info',
    })) {
      try {
        await avvocatiApi.reactivate(avvocato.id);
        success('Avvocato riattivato');
        await loadAvvocati();
      } catch (err: any) {
        toastError(err.message || 'Errore durante la riattivazione');
      }
    }
  };

  const handleDelete = async (avvocato: Avvocato) => {
    if (await confirm({
      title: 'Elimina avvocato',
      message: `Eliminare definitivamente ${getAvvocatoDisplayName(avvocato)}?\nQuesta operazione è irreversibile e fallirà se l'avvocato è associato a pratiche.`,
      confirmText: 'Elimina',
      variant: 'danger',
    })) {
      try {
        await avvocatiApi.delete(avvocato.id);
        success('Avvocato eliminato');
        await loadAvvocati();
      } catch (err: any) {
        toastError(err.message || 'Impossibile eliminare: avvocato associato a pratiche');
      }
    }
  };

  const handleRowClick = (avvocato: Avvocato) => {
    setSelectedAvvocato(avvocato);
    setFormData({
      nome: avvocato.nome,
      cognome: avvocato.cognome,
      email: avvocato.email,
      codiceFiscale: avvocato.codiceFiscale || '',
      telefono: avvocato.telefono || '',
      livelloAccessoPratiche: avvocato.livelloAccessoPratiche,
      livelloPermessi: avvocato.livelloPermessi,
      note: avvocato.note || '',
    });
    setIsViewing(true);
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setIsViewing(false);
    setIsEditing(true);
    setSubmitAttempted(false);
  };

  const handleCancelEditing = () => {
    if (selectedAvvocato) {
      setFormData({
        nome: selectedAvvocato.nome,
        cognome: selectedAvvocato.cognome,
        email: selectedAvvocato.email,
        codiceFiscale: selectedAvvocato.codiceFiscale || '',
        telefono: selectedAvvocato.telefono || '',
        livelloAccessoPratiche: selectedAvvocato.livelloAccessoPratiche,
        livelloPermessi: selectedAvvocato.livelloPermessi,
        note: selectedAvvocato.note || '',
      });
      setIsViewing(true);
      setIsEditing(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedAvvocato(null);
    setIsViewing(false);
    setIsEditing(false);
    resetForm();
  };

  const livelloAccessoOptions = [
    { value: 'solo_proprie', label: 'Solo proprie pratiche' },
    { value: 'tutte', label: 'Tutte le pratiche' },
  ];

  const livelloPermessiOptions = [
    { value: 'visualizzazione', label: 'Solo visualizzazione' },
    { value: 'modifica', label: 'Visualizzazione e modifica' },
  ];

  return (
    <div className="space-y-6 wow-stagger">
      {/* HEADER */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="space-y-1.5">
          <span className="wow-chip">Studio</span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">Avvocati</h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Gestisci gli avvocati dello studio e i permessi sulle pratiche.
          </p>
        </div>
        <button
          onClick={() => {
            setShowNewForm(true);
            setSubmitAttempted(false);
          }}
          className="wow-button"
        >
          <Plus className="h-4 w-4" />
          Nuovo Avvocato
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* FILTRI */}
      <div className="wow-panel flex items-center gap-2 p-4">
        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="flex items-center gap-1">
            {showInactive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Mostra disattivati
          </span>
        </label>
        <button
          onClick={loadAvvocati}
          disabled={loading}
          className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* LISTA AVVOCATI */}
      <div className="wow-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Caricamento...</span>
          </div>
        ) : !avvocati || avvocati.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Nessun avvocato</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full wow-stagger-rows">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Avvocato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Contatti</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Accesso</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Permessi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Stato</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {avvocati
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((avvocato) => (
                  <tr
                    key={avvocato.id}
                    onClick={() => handleRowClick(avvocato)}
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${!avvocato.attivo ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {getAvvocatoDisplayName(avvocato)}
                        </p>
                        {avvocato.codiceFiscale && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{avvocato.codiceFiscale}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Mail className="h-3 w-3" />
                          {avvocato.email}
                        </div>
                        {avvocato.telefono && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <Phone className="h-3 w-3" />
                            {avvocato.telefono}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                        <Shield className="h-3 w-3" />
                        {avvocato.livelloAccessoPratiche === 'tutte' ? 'Tutte' : 'Solo proprie'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        avvocato.livelloPermessi === 'modifica'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                      }`}>
                        <FileText className="h-3 w-3" />
                        {avvocato.livelloPermessi === 'modifica' ? 'Modifica' : 'Solo lettura'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        avvocato.attivo
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      }`}>
                        {avvocato.attivo ? 'Attivo' : 'Disattivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {avvocato.attivo ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivate(avvocato);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                            title="Disattiva"
                          >
                            <PowerOff className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReactivate(avvocato);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Riattiva"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(avvocato);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(avvocati.length / ITEMS_PER_PAGE)}
              totalItems={avvocati.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* MODAL NUOVO/MODIFICA/VISUALIZZA */}
      {(showNewForm || isEditing || isViewing) && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (isViewing) {
                handleCloseDetail();
              } else {
                setShowNewForm(false);
                setIsEditing(false);
                resetForm();
              }
            }}
          />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {isViewing ? 'Dettaglio Avvocato' : isEditing ? 'Modifica Avvocato' : 'Nuovo Avvocato'}
              </h2>
              <div className="flex items-center gap-2">
                {isViewing && (
                  <button
                    onClick={handleStartEditing}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    title="Modifica"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                {isEditing && selectedAvvocato && (
                  <button
                    onClick={handleCancelEditing}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                  >
                    Annulla
                  </button>
                )}
                <button
                  onClick={() => {
                    if (isViewing) {
                      handleCloseDetail();
                    } else {
                      setShowNewForm(false);
                      setIsEditing(false);
                      resetForm();
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {isViewing && selectedAvvocato && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                    <span className="block text-[11px] uppercase tracking-wide text-slate-400">Stato</span>
                    {selectedAvvocato.attivo ? 'Attivo' : 'Disattivo'}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    disabled={isViewing}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed',
                      submitAttempted && !formData.nome ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                    ].join(' ')}
                    placeholder="Mario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    disabled={isViewing}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed',
                      submitAttempted && !formData.cognome ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                    ].join(' ')}
                    placeholder="Rossi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isViewing}
                  className={[
                    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed',
                    submitAttempted && !formData.email ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200' : '',
                  ].join(' ')}
                  placeholder="mario.rossi@studio.it"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    value={formData.codiceFiscale}
                    onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value })}
                    disabled={isViewing}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="RSSMRA80A01H501Z"
                    maxLength={16}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Telefono
                  </label>
                  <PhoneInput
                    value={formData.telefono}
                    onChange={(value) => setFormData({ ...formData, telefono: value })}
                    placeholder="Numero di telefono"
                    disabled={isViewing}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Livello Accesso Pratiche
                </label>
                <CustomSelect
                  options={livelloAccessoOptions}
                  value={formData.livelloAccessoPratiche || 'solo_proprie'}
                  onChange={(value) => setFormData({ ...formData, livelloAccessoPratiche: value as LivelloAccessoPratiche })}
                  placeholder="Seleziona livello accesso"
                  disabled={isViewing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Livello Permessi
                </label>
                <CustomSelect
                  options={livelloPermessiOptions}
                  value={formData.livelloPermessi || 'modifica'}
                  onChange={(value) => setFormData({ ...formData, livelloPermessi: value as LivelloPermessi })}
                  placeholder="Seleziona livello permessi"
                  disabled={isViewing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Note
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  disabled={isViewing}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>

            {!isViewing && (
              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setIsEditing(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  onClick={isEditing ? handleUpdate : handleCreate}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea Avvocato'}
                </button>
              </div>
            )}
            {isViewing && (
              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleCloseDetail}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Chiudi
                </button>
              </div>
            )}
          </div>
        </div>
      </BodyPortal>
      )}

      <ConfirmDialog />
    </div>
  );
}
