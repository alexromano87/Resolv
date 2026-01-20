// apps/frontend/src/pages/DebitoriPage.tsx
import { useEffect, useState } from 'react';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Building2,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Eye,
  EyeOff,
  X,
  Save,
  Edit,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useDebitoriPage } from '../features/debitori/useDebitoriPage';
import { getDebitoreDisplayName } from '../api/debitori';
import { SearchableClienteSelect } from '../components/ui/SearchableClienteSelect';
import { CustomSelect } from '../components/ui/CustomSelect';
import { DateField } from '../components/ui/DateField';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/ui/ToastProvider';
import { useAuth } from '../contexts/AuthContext';

export function DebitoriPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [initialParams] = useState(() => {
    const locationState = location.state as { clienteId?: string; debitoreId?: string } | null;
    if (locationState?.clienteId || locationState?.debitoreId) {
      return {
        clienteId: locationState.clienteId || null,
        debitoreId: locationState.debitoreId || null,
      };
    }

    return {
      clienteId: searchParams.get('clienteId'),
      debitoreId: searchParams.get('debitoreId'),
    };
  });

  const [urlCleaned, setUrlCleaned] = useState(false);
  useEffect(() => {
    if ((initialParams.clienteId || initialParams.debitoreId) && !urlCleaned) {
      setUrlCleaned(true);
      navigate('/debitori', { replace: true, state: null });
    }
  }, [initialParams.clienteId, initialParams.debitoreId, urlCleaned, navigate]);

  const {
    clienti,
    loadingClienti,
    selectedClienteId,
    selectedCliente,
    debitori,
    loadingDebitori,
    showInactive,
    setShowInactive,
    clientiPerDebitore,
    selectedDebitore,
    detailForm,
    savingDetail,
    newForm,
    newClienteId: hookNewClienteId,
    setNewClienteId,
    searchTerm: hookSearchTerm,
    setSearchTerm: setHookSearchTerm,
    loadDebitori,
    error,
    handleSelectCliente,
    handleSelectDebitore,
    handleCloseDetail,
    handleCancelEditing: cancelEditing,
    updateDetailForm,
    isDetailFormDirty,
    submitDetailForm,
    updateNewForm,
    resetNewForm,
    isNewFormDirty,
    submitNewDebitore,
    deactivateDebitore,
    reactivateDebitore,
    deleteDebitore,
  } = useDebitoriPage({
    initialClienteId: initialParams.clienteId,
    initialDebitoreId: initialParams.debitoreId,
  });

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

  const [showNewModal, setShowNewModal] = useState(false);
  const [newStep, setNewStep] = useState<'cliente' | 'form'>('cliente');
  const [newClienteId, setNewClienteIdState] = useState<string>('');
  const [newClienteName, setNewClienteName] = useState<string>('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newSubmitAttempted, setNewSubmitAttempted] = useState(false);
  const [inlineNewError, setInlineNewError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [searchTerm, setSearchTerm] = useState(hookSearchTerm || '');

  useEffect(() => {
    if (hookNewClienteId) {
      setNewClienteIdState(hookNewClienteId);
      setNewClienteId(hookNewClienteId);
      setNewClienteName(clienti.find((c) => c.id === hookNewClienteId)?.ragioneSociale || '');
    }
  }, [hookNewClienteId, clienti, setNewClienteId]);

  const tipologiaOptions = [
    { value: '', label: 'Seleziona tipologia' },
    { value: 'impresa_individuale', label: 'Impresa individuale' },
    { value: 'impresa_individuale_agricola', label: 'Impresa individuale agricola' },
    { value: 'srl', label: 'SRL' },
    { value: 'spa', label: 'SPA' },
    { value: 'scpa', label: 'SCPA' },
    { value: 'srl_agricola', label: 'SRL Agricola' },
    { value: 'snc', label: 'SNC' },
    { value: 'sas', label: 'SAS' },
  ];

  const filteredDebitori = debitori;

  const handleNewFormField =
    (field: keyof typeof newForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      updateNewForm(field, e.target.value as any);
    };

  const handleNewFormSelect =
    (field: keyof typeof newForm) =>
    (value: string) => {
      updateNewForm(field, value as any);
    };

  const handleNewFormDate =
    (field: keyof typeof newForm) =>
    (value: string) => {
      updateNewForm(field, value as any);
    };

  const handleDetailFormField =
    (field: keyof typeof detailForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      updateDetailForm(field, e.target.value as any);
    };

  const handleDetailFormSelect =
    (field: keyof typeof detailForm) =>
    (value: string) => {
      updateDetailForm(field, value as any);
    };

  const handleDetailFormDate =
    (field: keyof typeof detailForm) =>
    (value: string) => {
      updateDetailForm(field, value as any);
    };

  const handleCancelNewForm = async () => {
    if (isNewFormDirty()) {
      const conferma = await confirm({
        title: 'Annullare la creazione?',
        message: 'Hai inserito dei dati nel form. Se annulli, le informazioni inserite andranno perse.',
        confirmText: 'Sì, annulla',
        cancelText: 'Continua',
        variant: 'warning',
      });
      if (!conferma) return;
    }
    resetNewForm();
    setNewSubmitAttempted(false);
    setShowNewModal(false);
    setNewStep('cliente');
    setInlineNewError(null);
    setNewClienteIdState('');
    setNewClienteName('');
  };

  const handleSubmitNewDebitore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStep === 'cliente') {
      if (!newClienteId && !hookNewClienteId) {
        setInlineNewError('Seleziona prima un cliente a cui collegare il debitore.');
        return;
      }
      const clienteNome = newClienteName || selectedCliente?.ragioneSociale || '';
      const confermaCliente = await confirm({
        title: 'Confermi il cliente?',
        message: `Associare il nuovo debitore a ${clienteNome || 'cliente selezionato'}?`,
        confirmText: 'Conferma e continua',
        cancelText: 'Annulla',
        variant: 'info',
      });
      if (!confermaCliente) return;
      setInlineNewError(null);
      setNewStep('form');
      return;
    }

    const isPersonaFisica = newForm.tipoSoggetto === 'persona_fisica';
    if (
      (isPersonaFisica && (!newForm.nome.trim() || !newForm.cognome.trim())) ||
      (!isPersonaFisica && !newForm.ragioneSociale.trim())
    ) {
      setNewSubmitAttempted(true);
      toastError(
        isPersonaFisica
          ? 'Nome e cognome sono obbligatori per persona fisica.'
          : 'Ragione sociale obbligatoria per persona giuridica.',
        'Dati mancanti',
      );
      return;
    }
    const displayName = newForm.tipoSoggetto === 'persona_fisica'
      ? `${newForm.nome.trim()} ${newForm.cognome.trim()}`
      : newForm.ragioneSociale.trim();
    const conferma = await confirm({
      title: 'Creare il debitore?',
      message: `Stai per creare il debitore ${displayName} e collegarlo al cliente ${newClienteName || selectedCliente?.ragioneSociale}.`,
      confirmText: 'Crea debitore',
      cancelText: 'Annulla',
      variant: 'info',
    });
    if (!conferma) return;
    const created = await submitNewDebitore(newClienteId || hookNewClienteId || selectedClienteId || null);
    if (!created) {
      setNewSubmitAttempted(true);
      return;
    }
    setNewSubmitAttempted(false);
    setShowNewModal(false);
    setNewStep('cliente');
    setNewClienteIdState('');
    setNewClienteName('');
  };

  const handleRowClick = (debitore: any) => {
    handleSelectDebitore(debitore);
    setShowViewModal(true);
    setShowEditModal(false);
  };

  const handleStartEditingFromView = () => {
    setShowViewModal(false);
    setShowEditModal(true);
  };

  const handleCancelEditingToView = () => {
    cancelEditing();
    setShowEditModal(false);
    setShowViewModal(true);
  };

  const handleCloseView = () => {
    handleCloseDetail();
    setShowViewModal(false);
  };

  const handleCancelEditing = async () => {
    if (isDetailFormDirty()) {
      const conferma = await confirm({
        title: 'Annullare le modifiche?',
        message: 'Hai modificato i dati del debitore. Se annulli, le modifiche non salvate andranno perse.',
        confirmText: 'Sì, annulla modifiche',
        cancelText: 'Continua a modificare',
        variant: 'warning',
      });
      if (!conferma) return;
    }
    cancelEditing();
    setShowEditModal(false);
  };

  const handleSubmitDetailForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = getDebitoreDisplayName(selectedDebitore!);
    const conferma = await confirm({
      title: 'Salvare le modifiche?',
      message: `Stai per salvare le modifiche al debitore ${displayName}.`,
      confirmText: 'Salva modifiche',
      cancelText: 'Annulla',
      variant: 'info',
    });
    if (!conferma) return;
    await submitDetailForm();
    setShowEditModal(false);
    setShowViewModal(true);
  };

  const handleDeactivate = async (debitore: any) => {
    const displayName = getDebitoreDisplayName(debitore);
    if (await confirm({
      title: 'Disattiva debitore',
      message: `Disattivare ${displayName}?`,
      confirmText: 'Disattiva',
      variant: 'warning',
    })) {
      try {
        await deactivateDebitore(debitore.id);
        success('Debitore disattivato');
      } catch (err: any) {
        toastError(err.message || 'Errore durante la disattivazione');
      }
    }
  };

  const handleReactivate = async (debitore: any) => {
    try {
      await reactivateDebitore(debitore.id);
      success('Debitore riattivato');
    } catch (err: any) {
      toastError(err.message || 'Errore durante la riattivazione');
    }
  };

  const handleDelete = async (debitore: any) => {
    const displayName = getDebitoreDisplayName(debitore);
    if (await confirm({
      title: 'Elimina debitore',
      message: `Eliminare definitivamente ${displayName}?\nQuesta operazione è irreversibile.`,
      confirmText: 'Elimina',
      variant: 'danger',
    })) {
      try {
        await deleteDebitore(debitore.id);
        success('Debitore eliminato');
      } catch (err: any) {
        toastError(err.message || 'Impossibile eliminare');
      }
    }
  };

  return (
    <div className="space-y-6 wow-stagger">
      {/* HEADER */}
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="space-y-1.5">
          <span className="wow-chip">Anagrafiche</span>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">Debitori</h1>
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Seleziona un cliente per visualizzare e gestire i debitori collegati.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* SEZIONE SELEZIONE CLIENTE */}
      <section className="wow-panel p-5 relative z-30">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Seleziona cliente</h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="w-full min-w-[280px] md:w-80">
            <SearchableClienteSelect
              clienti={clienti}
              selectedClienteId={selectedClienteId}
              onSelect={handleSelectCliente}
              loading={loadingClienti}
              placeholder="Cerca cliente..."
            />
          </div>
          {selectedCliente && (
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-indigo-500" />
                <div className="min-w-0 flex-1 space-y-1 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{selectedCliente.ragioneSociale}</p>
                  {selectedCliente.partitaIva && <p className="text-slate-500 dark:text-slate-400">P.IVA: {selectedCliente.partitaIva}</p>}
                  {selectedCliente.citta && <p className="text-slate-500 dark:text-slate-400">{selectedCliente.citta}{selectedCliente.provincia && ` (${selectedCliente.provincia})`}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SEZIONE DEBITORI */}
      <div className="wow-panel flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
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
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca debitore (nome, CF, email...)"
              className="w-64 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              onClick={async () => {
                setCurrentPage(1);
                setInlineNewError(null);
                setHookSearchTerm(searchTerm);
                await loadDebitori(searchTerm.trim() || undefined);
              }}
              className="wow-button px-4"
            >
              Cerca
            </button>
          </div>
          <button
            onClick={() => {
              setShowNewModal(true);
              setNewSubmitAttempted(false);
              setInlineNewError(null);
              setNewStep('cliente');
              const defaultCliente = selectedClienteId || '';
              setNewClienteIdState(defaultCliente);
              setNewClienteName(selectedCliente?.ragioneSociale || '');
              setNewClienteId(defaultCliente || null);
            }}
            className="wow-button self-start"
          >
            <Plus className="h-4 w-4" />
            Nuovo Debitore
          </button>
        </div>

        <div className="wow-panel overflow-hidden">
          {loadingDebitori ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              <span className="text-xs">Caricamento...</span>
            </div>
          ) : filteredDebitori.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Nessun debitore trovato</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full wow-stagger-rows">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Debitore</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Contatti</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDebitori
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((debitore) => (
                    <tr
                      key={debitore.id}
                      onClick={() => handleRowClick(debitore)}
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${!debitore.attivo ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {debitore.tipoSoggetto === 'persona_fisica' ? (
                            <User className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Building2 className="h-4 w-4 text-slate-400" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {getDebitoreDisplayName(debitore)}
                            </p>
                            {debitore.codiceFiscale && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">CF: {debitore.codiceFiscale}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {selectedCliente?.ragioneSociale ||
                            clientiPerDebitore[debitore.id]?.join(', ') ||
                            '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {debitore.tipoSoggetto === 'persona_fisica' ? 'Persona fisica' : 'Persona giuridica'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {debitore.email && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">{debitore.email}</p>
                          )}
                          {debitore.telefono && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">{debitore.telefono}</p>
                          )}
                          {!debitore.email && !debitore.telefono && (
                            <p className="text-xs text-slate-400">-</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {debitore.attivo ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeactivate(debitore);
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
                                handleReactivate(debitore);
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
                              handleDelete(debitore);
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
                totalPages={Math.ceil(filteredDebitori.length / ITEMS_PER_PAGE)}
                totalItems={filteredDebitori.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUOVO DEBITORE */}
      {showNewModal && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancelNewForm} />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Nuovo Debitore</h2>
              <button onClick={handleCancelNewForm} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewDebitore} className="flex-1 overflow-auto p-4 space-y-4">
              {inlineNewError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{inlineNewError}</span>
                </div>
              )}

              {newStep === 'cliente' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Seleziona cliente</label>
                    <SearchableClienteSelect
                      value={newClienteId || ''}
                      onChange={(val) => {
                        setNewClienteIdState(val || '');
                        setNewClienteName(clienti.find((c) => c.id === val)?.ragioneSociale || '');
                        setNewClienteId(val || null);
                        setInlineNewError(null);
                      }}
                      clienti={clienti}
                      placeholder="Scegli il cliente da associare"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCancelNewForm}
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="wow-button"
                    >
                      Continua
                    </button>
                  </div>
                </div>
              ) : (
                <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo soggetto</label>
                <CustomSelect
                  options={[
                    { value: 'persona_fisica', label: 'Persona fisica' },
                    { value: 'persona_giuridica', label: 'Persona giuridica' },
                  ]}
                  value={newForm.tipoSoggetto}
                  onChange={handleNewFormSelect('tipoSoggetto')}
                />
              </div>

              {newForm.tipoSoggetto === 'persona_fisica' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={newForm.nome}
                    onChange={handleNewFormField('nome')}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      newSubmitAttempted && !newForm.nome.trim()
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                        : '',
                    ].join(' ')}
                  />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cognome *</label>
                  <input
                    type="text"
                    value={newForm.cognome}
                    onChange={handleNewFormField('cognome')}
                    className={[
                      'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                      newSubmitAttempted && !newForm.cognome.trim()
                        ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                        : '',
                    ].join(' ')}
                  />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data di nascita</label>
                    <DateField
                      value={newForm.dataNascita}
                      onChange={handleNewFormDate('dataNascita')}
                      placeholder="gg/mm/aaaa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Luogo di nascita</label>
                    <input
                      type="text"
                      value={newForm.luogoNascita}
                      onChange={handleNewFormField('luogoNascita')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ragione sociale *</label>
                    <input
                      type="text"
                      value={newForm.ragioneSociale}
                      onChange={handleNewFormField('ragioneSociale')}
                      className={[
                        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                        newSubmitAttempted && !newForm.ragioneSociale.trim()
                          ? '!border-rose-400 !focus:border-rose-500 !focus:ring-rose-200'
                          : '',
                      ].join(' ')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tipologia (se persona giuridica)
                    </label>
                    <CustomSelect
                      options={tipologiaOptions}
                      value={newForm.tipologia}
                      onChange={handleNewFormSelect('tipologia')}
                      placeholder="Seleziona tipologia"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Codice fiscale</label>
                  <input
                    type="text"
                    value={newForm.codiceFiscale}
                    onChange={handleNewFormField('codiceFiscale')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    maxLength={16}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Partita IVA</label>
                  <input
                    type="text"
                    value={newForm.partitaIva}
                    onChange={handleNewFormField('partitaIva')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    maxLength={11}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Indirizzo</label>
                <input
                  type="text"
                  value={newForm.indirizzo}
                  onChange={handleNewFormField('indirizzo')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CAP</label>
                  <input
                    type="text"
                    value={newForm.cap}
                    onChange={handleNewFormField('cap')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Città</label>
                  <input
                    type="text"
                    value={newForm.citta}
                    onChange={handleNewFormField('citta')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provincia</label>
                  <input
                    type="text"
                    value={newForm.provincia}
                    onChange={handleNewFormField('provincia')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nazione</label>
                <input
                  type="text"
                  value={newForm.nazione}
                  onChange={handleNewFormField('nazione')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={newForm.telefono}
                    onChange={handleNewFormField('telefono')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newForm.email}
                    onChange={handleNewFormField('email')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PEC</label>
                  <input
                    type="email"
                    value={newForm.pec}
                    onChange={handleNewFormField('pec')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referente</label>
                  <input
                    type="text"
                    value={newForm.referente}
                    onChange={handleNewFormField('referente')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setNewStep('cliente')}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Indietro
                </button>
                <button
                  type="button"
                  onClick={handleCancelNewForm}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4" />
                  Crea Debitore
                </button>
              </div>
                </>
              )}
            </form>
          </div>
        </div>
      </BodyPortal>
      )}

      {/* MODAL VISUALIZZA DEBITORE */}
      {showViewModal && selectedDebitore && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseView} />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Dettaglio Debitore
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartEditingFromView}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  title="Modifica"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button onClick={handleCloseView} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo soggetto</label>
                <CustomSelect
                  options={[
                    { value: 'persona_fisica', label: 'Persona fisica' },
                    { value: 'persona_giuridica', label: 'Persona giuridica' },
                  ]}
                  value={detailForm.tipoSoggetto}
                  onChange={handleDetailFormSelect('tipoSoggetto')}
                  disabled
                />
              </div>

              {detailForm.tipoSoggetto === 'persona_fisica' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={detailForm.nome}
                      disabled
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cognome *</label>
                    <input
                      type="text"
                      value={detailForm.cognome}
                      disabled
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data di nascita</label>
                    <DateField
                      value={detailForm.dataNascita}
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Luogo di nascita</label>
                    <input
                      type="text"
                      value={detailForm.luogoNascita}
                      disabled
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ragione sociale *</label>
                    <input
                      type="text"
                      value={detailForm.ragioneSociale}
                      disabled
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tipologia (se persona giuridica)
                    </label>
                    <CustomSelect
                      options={tipologiaOptions}
                      value={detailForm.tipologia}
                      onChange={() => {}}
                      disabled
                      placeholder="Seleziona tipologia"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Codice fiscale</label>
                  <input
                    type="text"
                    value={detailForm.codiceFiscale}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    maxLength={16}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Partita IVA</label>
                  <input
                    type="text"
                    value={detailForm.partitaIva}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    maxLength={11}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Indirizzo</label>
                <input
                  type="text"
                  value={detailForm.indirizzo}
                  disabled
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CAP</label>
                  <input
                    type="text"
                    value={detailForm.cap}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Città</label>
                  <input
                    type="text"
                    value={detailForm.citta}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provincia</label>
                  <input
                    type="text"
                    value={detailForm.provincia}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nazione</label>
                <input
                  type="text"
                  value={detailForm.nazione}
                  disabled
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={detailForm.telefono}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={detailForm.email}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PEC</label>
                  <input
                    type="email"
                    value={detailForm.pec}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referente</label>
                  <input
                    type="text"
                    value={detailForm.referente}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleCloseView}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      </BodyPortal>
      )}

      {/* MODAL MODIFICA DEBITORE */}
      {showEditModal && selectedDebitore && (
        <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancelEditing} />
          <div className="modal-content relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Modifica Debitore
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEditingToView}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Annulla
                </button>
                <button onClick={handleCancelEditing} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitDetailForm} className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo soggetto</label>
                <CustomSelect
                  options={[
                    { value: 'persona_fisica', label: 'Persona fisica' },
                    { value: 'persona_giuridica', label: 'Persona giuridica' },
                  ]}
                  value={detailForm.tipoSoggetto}
                  onChange={handleDetailFormSelect('tipoSoggetto')}
                />
              </div>

              {detailForm.tipoSoggetto === 'persona_fisica' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={detailForm.nome}
                      onChange={handleDetailFormField('nome')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cognome *</label>
                    <input
                      type="text"
                      value={detailForm.cognome}
                      onChange={handleDetailFormField('cognome')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data di nascita</label>
                    <DateField
                      value={detailForm.dataNascita}
                      onChange={handleDetailFormDate('dataNascita')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Luogo di nascita</label>
                    <input
                      type="text"
                      value={detailForm.luogoNascita}
                      onChange={handleDetailFormField('luogoNascita')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ragione sociale *</label>
                    <input
                      type="text"
                      value={detailForm.ragioneSociale}
                      onChange={handleDetailFormField('ragioneSociale')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tipologia (se persona giuridica)
                    </label>
                    <CustomSelect
                      options={tipologiaOptions}
                      value={detailForm.tipologia}
                      onChange={handleDetailFormSelect('tipologia')}
                      placeholder="Seleziona tipologia"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Codice fiscale</label>
                  <input
                    type="text"
                    value={detailForm.codiceFiscale}
                    onChange={handleDetailFormField('codiceFiscale')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    maxLength={16}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Partita IVA</label>
                  <input
                    type="text"
                    value={detailForm.partitaIva}
                    onChange={handleDetailFormField('partitaIva')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    maxLength={11}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Indirizzo</label>
                <input
                  type="text"
                  value={detailForm.indirizzo}
                  onChange={handleDetailFormField('indirizzo')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CAP</label>
                  <input
                    type="text"
                    value={detailForm.cap}
                    onChange={handleDetailFormField('cap')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Città</label>
                  <input
                    type="text"
                    value={detailForm.citta}
                    onChange={handleDetailFormField('citta')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provincia</label>
                  <input
                    type="text"
                    value={detailForm.provincia}
                    onChange={handleDetailFormField('provincia')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nazione</label>
                <input
                  type="text"
                  value={detailForm.nazione}
                  onChange={handleDetailFormField('nazione')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={detailForm.telefono}
                    onChange={handleDetailFormField('telefono')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={detailForm.email}
                    onChange={handleDetailFormField('email')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PEC</label>
                  <input
                    type="email"
                    value={detailForm.pec}
                    onChange={handleDetailFormField('pec')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Referente</label>
                  <input
                    type="text"
                    value={detailForm.referente}
                    onChange={handleDetailFormField('referente')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={savingDetail}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingDetail ? 'Salvataggio...' : 'Salva Modifiche'}
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
