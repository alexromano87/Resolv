// apps/frontend/src/components/ui/DebitoreDetailModal.tsx
import { useEffect, useState } from 'react';
import {
  X,
  User,
  Building2,
  Link as LinkIcon,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import type { Debitore } from '../../api/debitori';
import type { Cliente } from '../../api/clienti';
import {
  getDebitoreDisplayName,
  fetchClientiForDebitore,
  linkDebitoreToCliente,
} from '../../api/debitori';
import { fetchClienti } from '../../api/clienti';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from './CustomSelect';

export interface DebitoreDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  debitore: Debitore | null;
  onLinked?: () => void; // Callback quando il debitore viene collegato
}

export function DebitoreDetailModal({
  isOpen,
  onClose,
  debitore,
  onLinked,
}: DebitoreDetailModalProps) {
  const navigate = useNavigate();

  // Stato clienti collegati
  const [clientiCollegati, setClientiCollegati] = useState<Cliente[]>([]);
  const [loadingClienti, setLoadingClienti] = useState(false);

  // Stato per collegamento (debitore orfano)
  const [tuttiClienti, setTuttiClienti] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica clienti collegati quando si apre la modale
  useEffect(() => {
    if (!isOpen || !debitore) {
      setClientiCollegati([]);
      setSelectedClienteId('');
      setError(null);
      return;
    }

    const loadClientiCollegati = async () => {
      try {
        setLoadingClienti(true);
        setError(null);

        // Carica gli ID dei clienti collegati
        const { clientiIds } = await fetchClientiForDebitore(debitore.id);

        if (clientiIds.length > 0) {
          // Carica i dettagli dei clienti
          const allClienti = await fetchClienti(true);
          const collegati = allClienti.filter((c) =>
            clientiIds.includes(c.id)
          );
          setClientiCollegati(collegati);
          setTuttiClienti([]); // Non serve se ha già clienti
        } else {
          // Debitore orfano: carica tutti i clienti per il select
          setClientiCollegati([]);
          const allClienti = await fetchClienti(false); // Solo attivi
          setTuttiClienti(allClienti);
        }
      } catch (err: any) {
        console.error('Errore nel caricamento clienti:', err);
        setError(err.message || 'Errore nel caricamento');
      } finally {
        setLoadingClienti(false);
      }
    };

    loadClientiCollegati();
  }, [isOpen, debitore]);

  // Chiusura con ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !linking) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, linking]);

  // Handler per collegare debitore orfano a un cliente
  const handleLink = async () => {
    if (!selectedClienteId || !debitore) return;

    try {
      setLinking(true);
      setError(null);
      await linkDebitoreToCliente(selectedClienteId, debitore.id);

      // Aggiorna la lista clienti collegati
      const cliente = tuttiClienti.find((c) => c.id === selectedClienteId);
      if (cliente) {
        setClientiCollegati([cliente]);
      }

      setSelectedClienteId('');
      onLinked?.();
    } catch (err: any) {
      console.error('Errore nel collegamento:', err);
      setError(err.message || 'Errore nel collegamento');
    } finally {
      setLinking(false);
    }
  };

  // Handler per navigare alla pagina debitori con cliente selezionato
  const handleGoToDebitori = (clienteId: string) => {
    onClose();
    // Naviga usando state invece di query params per evitare problemi
    navigate('/debitori', {
      state: { clienteId, debitoreId: debitore?.id },
    });
  };

  if (!isOpen || !debitore) return null;

  const displayName = getDebitoreDisplayName(debitore);
  const isPersonaFisica = debitore.tipoSoggetto === 'persona_fisica';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={linking ? undefined : onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 mx-4 w-full max-w-lg transform rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                isPersonaFisica
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
              }`}
            >
              {isPersonaFisica ? (
                <User className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {displayName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isPersonaFisica ? 'Persona fisica' : 'Persona giuridica'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={linking}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Badge disattivato */}
          {!debitore.attivo && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Questo debitore è disattivato
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Dati anagrafici */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Dati anagrafici
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {isPersonaFisica ? (
                <>
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Nome:
                    </span>{' '}
                    <span className="text-slate-900 dark:text-slate-50">
                      {debitore.nome || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Cognome:
                    </span>{' '}
                    <span className="text-slate-900 dark:text-slate-50">
                      {debitore.cognome || '-'}
                    </span>
                  </div>
                  {debitore.dataNascita && (
                    <div>
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Data nascita:
                      </span>{' '}
                      <span className="text-slate-900 dark:text-slate-50">
                        {new Date(debitore.dataNascita).toLocaleDateString(
                          'it-IT'
                        )}
                      </span>
                    </div>
                  )}
                  {debitore.luogoNascita && (
                    <div>
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Luogo nascita:
                      </span>{' '}
                      <span className="text-slate-900 dark:text-slate-50">
                        {debitore.luogoNascita}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-2">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Ragione sociale:
                  </span>{' '}
                  <span className="text-slate-900 dark:text-slate-50">
                    {debitore.ragioneSociale || '-'}
                  </span>
                </div>
              )}

              {debitore.codiceFiscale && (
                <div>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Codice fiscale:
                  </span>{' '}
                  <span className="font-mono text-slate-900 dark:text-slate-50">
                    {debitore.codiceFiscale}
                  </span>
                </div>
              )}
              {debitore.partitaIva && (
                <div>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Partita IVA:
                  </span>{' '}
                  <span className="font-mono text-slate-900 dark:text-slate-50">
                    {debitore.partitaIva}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Indirizzo */}
          {(debitore.indirizzo || debitore.citta) && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Indirizzo
              </h3>
              <p className="text-xs text-slate-900 dark:text-slate-50">
                {debitore.indirizzo && <span>{debitore.indirizzo}</span>}
                {debitore.cap && <span>, {debitore.cap}</span>}
                {debitore.citta && <span> {debitore.citta}</span>}
                {debitore.provincia && <span> ({debitore.provincia})</span>}
                {debitore.nazione && debitore.nazione !== 'Italia' && (
                  <span>, {debitore.nazione}</span>
                )}
              </p>
            </div>
          )}

          {/* Contatti */}
          {(debitore.telefono ||
            debitore.email ||
            debitore.pec ||
            debitore.referente) && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Contatti
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {debitore.telefono && (
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Tel:
                    </span>{' '}
                    <span className="text-slate-900 dark:text-slate-50">
                      {debitore.telefono}
                    </span>
                  </div>
                )}
                {debitore.referente && (
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Referente:
                    </span>{' '}
                    <span className="text-slate-900 dark:text-slate-50">
                      {debitore.referente}
                    </span>
                  </div>
                )}
                {debitore.email && (
                  <div className="col-span-2">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Email:
                    </span>{' '}
                    <span className="text-slate-900 dark:text-slate-50">
                      {debitore.email}
                    </span>
                  </div>
                )}
                {debitore.pec && (
                  <div className="col-span-2">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      PEC:
                    </span>{' '}
                    <span className="text-slate-900 dark:text-slate-50">
                      {debitore.pec}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clienti collegati */}
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Clienti collegati
            </h3>

            {loadingClienti ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Caricamento...
              </p>
            ) : clientiCollegati.length > 0 ? (
              <div className="space-y-2">
                {clientiCollegati.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-50">
                        {cliente.ragioneSociale}
                      </span>
                      {!cliente.attivo && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                          Disattivato
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGoToDebitori(cliente.id)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                    >
                      Gestisci
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-4 dark:border-amber-700 dark:bg-amber-900/20">
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Debitore orfano</span>
                </div>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                  Questo debitore non è collegato a nessun cliente. Collegalo
                  per poterlo gestire.
                </p>

                {/* Select per collegamento */}
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      Seleziona cliente
                    </label>
                    <CustomSelect
                      options={[
                        { value: '', label: 'Seleziona cliente' },
                        ...tuttiClienti.map((c) => ({
                          value: c.id,
                          label: c.ragioneSociale,
                        })),
                      ]}
                      value={selectedClienteId}
                      onChange={setSelectedClienteId}
                      disabled={linking}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLink}
                    disabled={!selectedClienteId || linking}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    <LinkIcon className="h-3 w-3" />
                    {linking ? 'Collego...' : 'Collega'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={linking}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
