import { useState, useEffect } from 'react';
import { BookOpen, Play, FileText, UploadCloud, Percent, Download, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import { InteressiAccontiModal } from '../components/InteressiAccontiModal';
import { useToast } from '../components/ui/ToastProvider';
import { BodyPortal } from '../components/ui/BodyPortal';
import {
  fetchRisorseUtilita,
  uploadRisorsaUtilitaFile,
  createRisorsaUtilita,
  deleteRisorsaUtilita,
  downloadRisorsaUtilita,
  type RisorsaUtilita,
  type TipoRisorsaUtilita,
} from '../api/utilita';

type ModalType = 'manuale' | 'video' | 'note' | 'risorse' | null;

export function UtilitaPage() {
  const [showInteressiModal, setShowInteressiModal] = useState(false);
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [risorse, setRisorse] = useState<RisorsaUtilita[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { success, error: toastError } = useToast();

  // Form states
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [urlVideo, setUrlVideo] = useState('');
  const [contenutoNota, setContenutoNota] = useState('');
  const [versione, setVersione] = useState('');

  useEffect(() => {
    loadRisorse();
  }, []);

  const loadRisorse = async () => {
    try {
      const data = await fetchRisorseUtilita();
      setRisorse(data);
    } catch (error) {
      console.error('Errore caricamento risorse:', error);
    }
  };

  const handleOpenModal = (type: ModalType) => {
    setModalOpen(type);
    resetForm();
  };

  const handleCloseModal = () => {
    setModalOpen(null);
    resetForm();
  };

  const resetForm = () => {
    setFileToUpload(null);
    setTitolo('');
    setDescrizione('');
    setUrlVideo('');
    setContenutoNota('');
    setVersione('');
    setSubmitAttempted(false);
  };

  const handleFileUpload = async (tipo: TipoRisorsaUtilita) => {
    if (!titolo.trim() || !fileToUpload) {
      setSubmitAttempted(true);
      if (!titolo.trim()) {
        toastError('Inserisci un titolo');
      } else {
        toastError('Seleziona un file da caricare');
      }
      return;
    }

    setLoading(true);
    try {
      await uploadRisorsaUtilitaFile(fileToUpload, titolo, tipo, descrizione);
      success('File caricato con successo');
      await loadRisorse();
      handleCloseModal();
    } catch (error: any) {
      console.error('Errore upload:', error);
      setSubmitAttempted(true);
      toastError(error.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVideoTutorial = async () => {
    if (!titolo.trim() || !urlVideo.trim()) {
      setSubmitAttempted(true);
      toastError('Inserisci titolo e URL del video');
      return;
    }

    setLoading(true);
    try {
      await createRisorsaUtilita({
        titolo,
        descrizione,
        tipo: 'video_tutorial',
        urlVideo,
      });
      success('Video tutorial aggiunto');
      await loadRisorse();
      handleCloseModal();
    } catch (error: any) {
      console.error('Errore:', error);
      setSubmitAttempted(true);
      toastError(error.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNota = async () => {
    if (!titolo.trim() || !contenutoNota.trim()) {
      setSubmitAttempted(true);
      toastError('Inserisci titolo e contenuto della nota');
      return;
    }

    setLoading(true);
    try {
      await createRisorsaUtilita({
        titolo,
        descrizione,
        tipo: 'nota_aggiornamento',
        contenutoNota,
        versione,
      });
      success('Nota di aggiornamento salvata');
      await loadRisorse();
      handleCloseModal();
    } catch (error: any) {
      console.error('Errore:', error);
      setSubmitAttempted(true);
      toastError(error.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadRisorsaUtilita(id);
    } catch (error) {
      console.error('Errore download:', error);
      toastError('Errore durante il download');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Eliminare "${nome}"?`)) return;

    try {
      await deleteRisorsaUtilita(id);
      success('Risorsa eliminata');
      await loadRisorse();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      toastError("Errore durante l'eliminazione");
    }
  };

  const getRisorseByTipo = (tipo: TipoRisorsaUtilita) => {
    return risorse.filter((r) => r.tipo === tipo && r.attivo);
  };

  const cards = [
    {
      title: "Manuale d'uso",
      description: 'Guida completa per utilizzare la piattaforma. Carica o aggiorna il PDF ufficiale.',
      icon: BookOpen,
      action: { label: 'Carica/aggiorna', onClick: () => handleOpenModal('manuale') },
      tipo: 'manuale' as TipoRisorsaUtilita,
    },
    {
      title: 'Tutorial video',
      description: 'Raccolta di walkthrough e mini-clip per i nuovi utenti e per i nuovi rilasci.',
      icon: Play,
      action: { label: 'Aggiungi link', onClick: () => handleOpenModal('video') },
      tipo: 'video_tutorial' as TipoRisorsaUtilita,
    },
    {
      title: 'Note di aggiornamento',
      description: 'Changelog sintetico delle nuove funzionalità e dei fix rilasciati.',
      icon: FileText,
      action: { label: 'Inserisci note', onClick: () => handleOpenModal('note') },
      tipo: 'nota_aggiornamento' as TipoRisorsaUtilita,
    },
    {
      title: 'Altre risorse',
      description: 'Materiali utili (FAQ, checklist, modelli) da condividere con il team o i clienti.',
      icon: UploadCloud,
      action: { label: 'Aggiungi risorsa', onClick: () => handleOpenModal('risorse') },
      tipo: 'altra_risorsa' as TipoRisorsaUtilita,
    },
    {
      title: 'Interessi con acconti',
      description: 'Calcolo interessi con acconti a scalare, con gestione art. 1194 c.c.',
      icon: Percent,
      action: { label: 'Apri calcolatore', onClick: () => setShowInteressiModal(true) },
      tipo: null,
    },
  ];

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <span className="wow-chip">Risorse</span>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            Utilità
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Manuali, tutorial e note di rilascio sempre a portata di mano per il team e i clienti.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 wow-stagger">
        {cards.map((card) => {
          const risorseCard = card.tipo ? getRisorseByTipo(card.tipo) : [];
          return (
            <div key={card.title} className="wow-panel flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200">
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{card.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{card.description}</p>
                </div>
              </div>

              {/* Lista risorse esistenti */}
              {risorseCard.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                  {risorseCard.map((risorsa) => (
                    <div
                      key={risorsa.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {risorsa.titolo}
                        </p>
                        {risorsa.descrizione && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {risorsa.descrizione}
                          </p>
                        )}
                        {risorsa.versione && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400">v{risorsa.versione}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {risorsa.percorsoFile && (
                          <button
                            onClick={() => handleDownload(risorsa.id)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                            title="Scarica"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        {risorsa.urlVideo && (
                          <a
                            href={risorsa.urlVideo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                            title="Apri video"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(risorsa.id, risorsa.titolo)}
                          className="p-1.5 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button type="button" onClick={card.action.onClick} className="wow-button px-4">
                  {card.action.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Upload Manuale */}
      {modalOpen === 'manuale' && (
        <BodyPortal>
          <div
            className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="modal-content rounded-2xl shadow-2xl bg-white dark:bg-slate-900 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">Carica Manuale d'uso</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Titolo *
                  </label>
                  <input
                    type="text"
                    value={titolo}
                    onChange={(e) => setTitolo(e.target.value)}
                    className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                      submitAttempted && !titolo.trim()
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    placeholder="es. Manuale Utente v2.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={descrizione}
                    onChange={(e) => setDescrizione(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    placeholder="Descrizione opzionale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    File PDF *
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 ${
                      submitAttempted && !fileToUpload
                        ? 'border-rose-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={handleCloseModal} className="wow-button-ghost flex-1">
                  Annulla
                </button>
                <button
                  onClick={() => handleFileUpload('manuale')}
                  disabled={loading}
                  className="wow-button flex-1 flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {loading ? 'Caricamento...' : 'Carica'}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* Modal Aggiungi Video Tutorial */}
      {modalOpen === 'video' && (
        <BodyPortal>
          <div
            className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="modal-content rounded-2xl shadow-2xl bg-white dark:bg-slate-900 max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">Aggiungi Video Tutorial</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Titolo *
                  </label>
                  <input
                    type="text"
                    value={titolo}
                    onChange={(e) => setTitolo(e.target.value)}
                    className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                      submitAttempted && !titolo.trim()
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    placeholder="es. Come creare una pratica"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    URL Video *
                  </label>
                  <input
                    type="url"
                    value={urlVideo}
                    onChange={(e) => setUrlVideo(e.target.value)}
                    className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                      submitAttempted && !urlVideo.trim()
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={descrizione}
                    onChange={(e) => setDescrizione(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    placeholder="Breve descrizione del contenuto"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={handleCloseModal} className="wow-button-ghost flex-1">
                  Annulla
                </button>
                <button
                  onClick={handleCreateVideoTutorial}
                  disabled={loading}
                  className="wow-button flex-1"
                >
                  {loading ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* Modal Note di Aggiornamento */}
      {modalOpen === 'note' && (
        <BodyPortal>
          <div
            className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="modal-content rounded-2xl shadow-2xl bg-white dark:bg-slate-900 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">Inserisci Nota di Aggiornamento</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Titolo *
                    </label>
                    <input
                      type="text"
                      value={titolo}
                      onChange={(e) => setTitolo(e.target.value)}
                      className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                        submitAttempted && !titolo.trim()
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                      placeholder="es. Rilascio Gennaio 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Versione
                    </label>
                    <input
                      type="text"
                      value={versione}
                      onChange={(e) => setVersione(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="es. 2.1.0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contenuto *
                  </label>
                  <textarea
                    value={contenutoNota}
                    onChange={(e) => setContenutoNota(e.target.value)}
                    className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                      submitAttempted && !contenutoNota.trim()
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    rows={8}
                    placeholder="Descrizione delle novità e dei fix..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={handleCloseModal} className="wow-button-ghost flex-1">
                  Annulla
                </button>
                <button
                  onClick={handleCreateNota}
                  disabled={loading}
                  className="wow-button flex-1"
                >
                  {loading ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* Modal Altre Risorse */}
      {modalOpen === 'risorse' && (
        <BodyPortal>
          <div
            className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={handleCloseModal}
          >
            <div
              className="modal-content rounded-2xl shadow-2xl bg-white dark:bg-slate-900 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">Aggiungi Risorsa</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Titolo *
                  </label>
                  <input
                    type="text"
                    value={titolo}
                    onChange={(e) => setTitolo(e.target.value)}
                    className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                      submitAttempted && !titolo.trim()
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    placeholder="es. FAQ Clienti"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Descrizione
                  </label>
                  <textarea
                    value={descrizione}
                    onChange={(e) => setDescrizione(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    placeholder="Descrizione opzionale"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    File *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className={`w-full rounded-xl border bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 ${
                      submitAttempted && !fileToUpload
                        ? 'border-rose-400'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={handleCloseModal} className="wow-button-ghost flex-1">
                  Annulla
                </button>
                <button
                  onClick={() => handleFileUpload('altra_risorsa')}
                  disabled={loading}
                  className="wow-button flex-1 flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {loading ? 'Caricamento...' : 'Carica'}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      <InteressiAccontiModal open={showInteressiModal} onClose={() => setShowInteressiModal(false)} />
    </div>
  );
}

export default UtilitaPage;
