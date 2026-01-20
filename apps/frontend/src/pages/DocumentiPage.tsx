// apps/frontend/src/pages/DocumentiPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  File,
  Folder,
  FolderOpen,
  Download,
  Trash2,
  Edit2,
  X,
  FileText,
  Image,
  FileSpreadsheet,
  Search,
  ChevronRight,
  Filter,
  Move,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { documentiApi } from '../api/documenti';
import { cartelleApi } from '../api/cartelle';
import type { Documento, UploadDocumentoDto } from '../api/documenti';
import type { Cartella, CreateCartellaDto, UpdateCartellaDto } from '../api/cartelle';
import { fetchPratiche, type Pratica, getDebitoreDisplayName } from '../api/pratiche';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useToast } from '../components/ui/ToastProvider';
import { BodyPortal } from '../components/ui/BodyPortal';

export function DocumentiPage() {
  const { success, error: toastError } = useToast();
  const uploadLimitMb = Number(import.meta.env.VITE_UPLOAD_DOCUMENT_MAX_MB ?? '50');
  const uploadLimitBytes = uploadLimitMb * 1024 * 1024;
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [cartelle, setCartelle] = useState<Cartella[]>([]);
  const [allCartelle, setAllCartelle] = useState<Cartella[]>([]);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentCartellaId, setCurrentCartellaId] = useState<string | null>(null);
  const [selectedPraticaId, setSelectedPraticaId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [breadcrumb, setBreadcrumb] = useState<Cartella[]>([]);

  // Move document state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [documentToMove, setDocumentToMove] = useState<Documento | null>(null);
  const [targetCartellaId, setTargetCartellaId] = useState<string>('');

  // View document state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Documento | null>(null);
  const legacyCategories = ['Tutti', 'Cliente', 'Stragiudiziale', 'Ingiunzione', 'Esecuzione', 'Pagamenti', 'Altro'];
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNome, setUploadNome] = useState('');
  const [uploadDescrizione, setUploadDescrizione] = useState('');
  const [uploadPraticaId, setUploadPraticaId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderNome, setFolderNome] = useState('');
  const [folderDescrizione, setFolderDescrizione] = useState('');
  const [folderColore, setFolderColore] = useState('#3b82f6');
  const [folderPraticaId, setFolderPraticaId] = useState<string>('');
  const [editingFolder, setEditingFolder] = useState<Cartella | null>(null);

  // Folder view modal state
  const [showFolderViewModal, setShowFolderViewModal] = useState(false);
  const [viewingFolder, setViewingFolder] = useState<Cartella | null>(null);
  const [folderDocuments, setFolderDocuments] = useState<Documento[]>([]);

  useEffect(() => {
    loadPratiche();
  }, []);

  useEffect(() => {
    loadData();
  }, [currentCartellaId, selectedPraticaId]);

  const loadPratiche = async () => {
    try {
      const data = await fetchPratiche();
      setPratiche(data);
    } catch (error) {
      console.error('Errore caricamento pratiche:', error);
    }
  };

  const loadData = async (overrideCartellaId?: string | null) => {
    setLoading(true);
    try {
      const effectiveCartellaId =
        overrideCartellaId !== undefined ? overrideCartellaId : currentCartellaId;

      if (effectiveCartellaId) {
        const [docs, folders] = await Promise.all([
          documentiApi.getAllByCartella(effectiveCartellaId),
          cartelleApi.getAll(),
        ]);
        setDocumenti(docs);
        setAllCartelle(folders);
        setCartelle(folders.filter((c) => c.cartellaParent?.id === effectiveCartellaId));

        // Build breadcrumb
        const ancestors = await cartelleApi.getAncestors(effectiveCartellaId);
        setBreadcrumb(ancestors.reverse());
      } else {
        const [docs, folders] = await Promise.all([
          documentiApi.getAll(),
          cartelleApi.getAll(),
        ]);
        setAllCartelle(folders);

        // Filter by pratica if selected
        const filteredDocs = selectedPraticaId
          ? docs.filter((d) => !d.cartellaId && d.praticaId === selectedPraticaId)
          : docs.filter((d) => !d.cartellaId);

        const filteredFolders = selectedPraticaId
          ? folders.filter((c) => !c.cartellaParent && c.praticaId === selectedPraticaId)
          : folders.filter((c) => !c.cartellaParent);

        setDocumenti(filteredDocs);
        setCartelle(filteredFolders);
        setBreadcrumb([]);
      }
    } catch (error) {
      console.error('Errore nel caricamento documenti/cartelle:', error);
    } finally {
      setLoading(false);
    }
  };

  // Move document handlers
  const handleOpenMoveModal = (documento: Documento) => {
    setDocumentToMove(documento);
    setTargetCartellaId(documento.cartellaId || '');
    setShowMoveModal(true);
  };

  const handleMoveDocument = async () => {
    if (!documentToMove) return;

    try {
      await documentiApi.update(documentToMove.id, {
        cartellaId: targetCartellaId ? targetCartellaId : null,
      });
      success('Documento spostato');
      setShowMoveModal(false);
      setDocumentToMove(null);
      setTargetCartellaId('');
      loadData();
      // Reload folder view if open
      if (showFolderViewModal && viewingFolder) {
        const docs = await documentiApi.getAllByCartella(viewingFolder.id);
        setFolderDocuments(docs);
      }
    } catch (error) {
      console.error('Errore spostamento documento:', error);
      toastError('Errore durante lo spostamento del documento');
    }
  };

  // View document handler
  const handleViewDocument = (documento: Documento) => {
    setViewingDocument(documento);
    setShowViewModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > uploadLimitBytes) {
        toastError(`Il file supera il limite massimo di ${uploadLimitMb} MB`);
        setUploadFile(null);
        setUploadNome('');
        e.target.value = '';
        return;
      }

      setUploadFile(file);
      setUploadNome(file.name);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      const uploadDto: UploadDocumentoDto = {
        file: uploadFile,
        nome: uploadNome,
        descrizione: uploadDescrizione,
        caricatoDa: 'Studio',
        cartellaId: currentCartellaId || undefined,
        praticaId: uploadPraticaId || selectedPraticaId || undefined,
      };

      await documentiApi.upload(uploadDto);
      success('Documento caricato');
      setShowUploadModal(false);
      resetUploadForm();
      loadData();
    } catch (error) {
      console.error('Errore upload:', error);
      toastError('Errore durante l\'upload del file');
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadNome('');
    setUploadDescrizione('');
    setUploadPraticaId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateFolder = async () => {
    if (!folderNome) return;

    try {
      const createDto: CreateCartellaDto = {
        nome: folderNome,
        descrizione: folderDescrizione,
        colore: folderColore,
        cartellaParentId: currentCartellaId || undefined,
        praticaId: folderPraticaId || selectedPraticaId || undefined,
      };

      if (editingFolder) {
        const updateDto: UpdateCartellaDto = {
          nome: folderNome,
          descrizione: folderDescrizione,
          colore: folderColore,
        };
        await cartelleApi.update(editingFolder.id, updateDto);
        success('Cartella aggiornata');
      } else {
        await cartelleApi.create(createDto);
        success('Cartella creata');
      }

      setShowFolderModal(false);
      resetFolderForm();
      loadData();
    } catch (error) {
      console.error('Errore creazione/modifica cartella:', error);
      toastError('Errore durante l\'operazione sulla cartella');
    }
  };

  const resetFolderForm = () => {
    setFolderNome('');
    setFolderDescrizione('');
    setFolderColore('#3b82f6');
    setFolderPraticaId('');
    setEditingFolder(null);
  };

  const handleDownload = async (doc: Documento) => {
    try {
      await documentiApi.download(doc.id);
      success('Download avviato');
    } catch (error) {
      console.error('Errore download:', error);
      toastError('Errore durante il download del file');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;

    try {
      await documentiApi.delete(id);
      success('Documento eliminato');
      loadData();
    } catch (error) {
      console.error('Errore eliminazione documento:', error);
      toastError('Errore durante l\'eliminazione del documento');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa cartella? Tutti i documenti al suo interno saranno eliminati.')) return;

    const finalizeFolderDeletion = (deletedId: string) => {
      const isCurrent = currentCartellaId === deletedId || viewingFolder?.id === deletedId;
      if (isCurrent) {
        setCurrentCartellaId(null);
        setViewingFolder(null);
        setShowFolderViewModal(false);
        setFolderDocuments([]);
        setBreadcrumb([]);
      }
      loadData(isCurrent ? null : undefined);
    };

    try {
      await cartelleApi.delete(id);
      success('Cartella eliminata');
      finalizeFolderDeletion(id);
    } catch (error) {
      console.error('Errore eliminazione cartella:', error);
      try {
        const folders = await cartelleApi.getAll();
        const stillExists = folders.some((cartella) => cartella.id === id);
        if (!stillExists) {
          success('Cartella eliminata');
          setAllCartelle(folders);
          finalizeFolderDeletion(id);
          return;
        }
      } catch (verificationError) {
        console.error('Errore verifica eliminazione cartella:', verificationError);
      }
      toastError('Errore durante l\'eliminazione della cartella');
    }
  };

  const openFolder = async (folder: Cartella) => {
    try {
      const docs = await documentiApi.getAllByCartella(folder.id);
      setViewingFolder(folder);
      setFolderDocuments(docs);
      setShowFolderViewModal(true);
    } catch (error) {
      console.error('Errore caricamento documenti cartella:', error);
    }
  };

  const navigateToBreadcrumb = (folder: Cartella | null) => {
    setCurrentCartellaId(folder?.id || null);
  };

  const getFileIcon = (tipo: string) => {
    switch (tipo) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-rose-500" />;
      case 'word':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'excel':
        return <FileSpreadsheet className="h-8 w-8 text-indigo-600" />;
      case 'immagine':
        return <Image className="h-8 w-8 text-blue-500" />;
      default:
        return <File className="h-8 w-8 text-slate-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const praticaOptions = pratiche.map((pratica) => ({
    value: pratica.id,
    label: pratica.cliente?.ragioneSociale || 'Cliente',
    sublabel: getDebitoreDisplayName(pratica.debitore),
  }));

  const praticaFilterOptions = [
    { value: '', label: 'Tutte le pratiche' },
    ...praticaOptions,
  ];

  const praticaOptionalOptions = [
    { value: '', label: 'Nessuna pratica' },
    ...praticaOptions,
  ];

  const getDocCategory = (doc: Documento): string => {
    const catFromDoc = doc.cartella?.nome;
    if (catFromDoc) return catFromDoc;
    if (doc.cartellaId) {
      const found = allCartelle.find((c) => c.id === doc.cartellaId);
      if (found?.nome) return found.nome;
    }
    return 'Altro';
  };

  const categoryFilters = Array.from(
    new Set([
      ...legacyCategories,
      ...cartelle.map((c) => c.nome).filter((c) => !!c && !legacyCategories.includes(c)),
    ]),
  );

  const filteredDocumenti = documenti
    .filter((doc) => {
      const cat = getDocCategory(doc);
      return selectedCategory === 'Tutti' || cat === selectedCategory;
    })
    .filter(
      (doc) =>
        doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.nomeOriginale.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  const filteredCartelle = cartelle.filter((cartella) =>
    cartella.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 wow-stagger">
      {/* Header */}
      <div className="wow-card p-4 md:p-5 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="wow-chip">Archivio</span>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100 display-font">
              Documenti
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Tutti i documenti, cartelle e pratiche in un unico archivio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFolderModal(true)}
              className="wow-button-ghost"
            >
              <Folder className="h-4 w-4" />
              Nuova Cartella
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="wow-button"
            >
              <Upload className="h-4 w-4" />
              Carica Documento
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="wow-panel p-4 relative z-30">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca documenti o cartelle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-white/70 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <div className="min-w-[220px]">
                <CustomSelect
                  options={praticaFilterOptions}
                  value={selectedPraticaId || ''}
                  onChange={(value) => setSelectedPraticaId(value || null)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Legacy categories */}
        <div className="wow-panel p-3 relative z-20">
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((cat) => {
              const count =
                cat === 'Tutti'
                  ? documenti.length
                  : documenti.filter((d) => getDocCategory(d) === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat} <span className="ml-1 text-[10px] font-bold opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <button
            onClick={() => navigateToBreadcrumb(null)}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            Home
          </button>
          {breadcrumb.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="h-4 w-4" />
              <button
                onClick={() => navigateToBreadcrumb(folder)}
                className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition ${
                  index === breadcrumb.length - 1 ? 'font-semibold text-slate-900 dark:text-slate-100' : ''
                }`}
              >
                {folder.nome}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Storico caricamenti */}
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
            Storico caricamenti
          </h2>
          {documenti.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              Nessun caricamento registrato
            </div>
          ) : (
            <div className="space-y-3">
              {[...documenti]
                .sort((a, b) => new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime())
                .slice(0, 15)
                .map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center dark:bg-indigo-900/40">
                        <Folder className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.nome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {getDocCategory(doc)} • {doc.caricatoDa || 'N/D'} •{' '}
                          {doc.dataCreazione
                            ? new Date(doc.dataCreazione).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })
                            : 'N/D'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewDocument(doc)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      Apri
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">

        {/* Folders */}
        {filteredCartelle.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
              Cartelle
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 wow-stagger">
              {filteredCartelle.map((cartella) => (
                <div
                  key={cartella.id}
                  className="group relative bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition"
                >
                  <div className="flex items-start gap-3">
                    <FolderOpen
                      className="h-10 w-10 flex-shrink-0"
                      style={{ color: cartella.colore || '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {cartella.nome}
                      </h3>
                      {cartella.pratica && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                          Associato a: {cartella.pratica.cliente?.ragioneSociale}
                        </p>
                      )}
                      {cartella.descrizione && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {cartella.descrizione}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {cartella.documenti?.length || 0} documenti
                        </p>
                      </div>

                      {/* Folder Actions */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => openFolder(cartella)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          Apri
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(cartella);
                            setFolderNome(cartella.nome);
                            setFolderDescrizione(cartella.descrizione || '');
                            setFolderColore(cartella.colore || '#3b82f6');
                            setShowFolderModal(true);
                          }}
                          className="px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                          title="Modifica cartella"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(cartella.id);
                          }}
                          className="px-2 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                          title="Elimina cartella"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {filteredDocumenti.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
              Documenti
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 wow-stagger">
              {filteredDocumenti
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((doc) => (
                <div
                  key={doc.id}
                  className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition"
                >
                  <div className="flex items-start gap-3">
                    {getFileIcon(doc.tipo)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {doc.nome}
                      </h3>
                      {doc.pratica && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                          Associato a: {doc.pratica.cliente?.ragioneSociale}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {doc.nomeOriginale}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {formatFileSize(doc.dimensione)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleViewDocument(doc)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                      title="Apri documento"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Apri
                    </button>
                    <button
                      onClick={() => handleOpenMoveModal(doc)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      title="Sposta documento"
                    >
                      <Move className="h-3.5 w-3.5" />
                      Sposta
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                      title="Scarica"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                      title="Elimina"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredDocumenti.length / ITEMS_PER_PAGE)}
              totalItems={filteredDocumenti.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Empty state */}
        {filteredCartelle.length === 0 && filteredDocumenti.length === 0 && (
          <div className="text-center py-12">
            <Folder className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm ? 'Nessun risultato trovato' : 'Nessun documento o cartella'}
            </p>
            {selectedPraticaId && (
              <button
                onClick={() => setSelectedPraticaId(null)}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Rimuovi filtro pratica
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Carica Documento
                </h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition"
                >
                  <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 pt-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      File *
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-400"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Limite massimo: {uploadLimitMb} MB
                    </p>
                  </div>

                  <div>
                <label htmlFor="upload-nome" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome *
                </label>
                <input
                  id="upload-nome"
                  type="text"
                  value={uploadNome}
                  onChange={(e) => setUploadNome(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Descrizione
                    </label>
                    <textarea
                      value={uploadDescrizione}
                      onChange={(e) => setUploadDescrizione(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Pratica associata
                    </label>
                    <CustomSelect
                      options={praticaOptionalOptions}
                      value={uploadPraticaId || selectedPraticaId || ''}
                      onChange={setUploadPraticaId}
                      placeholder="Seleziona pratica..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || !uploadNome}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Carica
                </button>
              </div>
            </div>
        </div>
      </BodyPortal>
    )}

      {/* Folder Modal */}
      {showFolderModal && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {editingFolder ? 'Modifica Cartella' : 'Nuova Cartella'}
              </h2>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  resetFolderForm();
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 pt-4">
              <div className="space-y-4">
                <div>
                <label htmlFor="folder-nome" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome *
                </label>
                <input
                  id="folder-nome"
                  type="text"
                  value={folderNome}
                  onChange={(e) => setFolderNome(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Descrizione
                  </label>
                  <textarea
                    value={folderDescrizione}
                    onChange={(e) => setFolderDescrizione(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Colore
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={folderColore}
                      onChange={(e) => setFolderColore(e.target.value)}
                      className="h-10 w-20 rounded-2xl cursor-pointer"
                    />
                    <input
                      type="text"
                      value={folderColore}
                      onChange={(e) => setFolderColore(e.target.value)}
                      className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {!editingFolder && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Pratica associata
                    </label>
                    <CustomSelect
                      options={praticaOptionalOptions}
                      value={folderPraticaId || selectedPraticaId || ''}
                      onChange={setFolderPraticaId}
                      placeholder="Seleziona pratica..."
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  onClick={() => {
                    setShowFolderModal(false);
                    resetFolderForm();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!folderNome}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {editingFolder ? 'Salva' : 'Crea'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}

      {/* Folder View Modal */}
      {showFolderViewModal && viewingFolder && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <FolderOpen
                  className="h-8 w-8"
                  style={{ color: viewingFolder.colore || '#3b82f6' }}
                />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {viewingFolder.nome}
                  </h2>
                  {viewingFolder.pratica && (
                    <p className="text-sm text-indigo-600 dark:text-indigo-400">
                      Associato a: {viewingFolder.pratica.cliente?.ragioneSociale}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowFolderViewModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {viewingFolder.descrizione && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {viewingFolder.descrizione}
                </p>
              )}

              {folderDocuments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 wow-stagger">
                  {folderDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-3">
                        {getFileIcon(doc.tipo)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">
                            {doc.nome}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                            {doc.nomeOriginale}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                            {formatFileSize(doc.dimensione)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            setShowFolderViewModal(false);
                            handleViewDocument(doc);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                        >
                          <Eye className="h-3 w-3" />
                          Apri
                        </button>
                        <button
                          onClick={() => {
                            setShowFolderViewModal(false);
                            handleOpenMoveModal(doc);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                        >
                          <Move className="h-3 w-3" />
                          Sposta
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Eliminare questo documento?')) {
                              handleDeleteDocument(doc.id);
                              setFolderDocuments(folderDocuments.filter(d => d.id !== doc.id));
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <File className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nessun documento in questa cartella
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        </BodyPortal>
      )}

      {/* Move Document Modal */}
      {showMoveModal && documentToMove && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Sposta Documento
              </h2>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setDocumentToMove(null);
                  setTargetCartellaId('');
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 pt-4">
              <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Documento: <span className="font-semibold text-slate-900 dark:text-slate-100">{documentToMove.nome}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Posizione attuale: {documentToMove.cartella?.nome || 'Radice'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Cartella di destinazione
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Radice (nessuna cartella)' },
                      ...allCartelle
                        .filter((c) => c.id !== documentToMove.cartellaId)
                        .map((cartella) => ({
                          value: cartella.id,
                          label: cartella.nome,
                          sublabel: cartella.pratica?.cliente?.ragioneSociale,
                        })),
                    ]}
                    value={targetCartellaId}
                    onChange={setTargetCartellaId}
                    placeholder="Seleziona cartella..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setDocumentToMove(null);
                    setTargetCartellaId('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                >
                  Annulla
                </button>
                <button
                  onClick={handleMoveDocument}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition"
                >
                  <ArrowRight className="h-4 w-4" />
                  Sposta
                </button>
              </div>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}

      {/* View Document Modal */}
      {showViewModal && viewingDocument && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {getFileIcon(viewingDocument.tipo)}
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {viewingDocument.nome}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {viewingDocument.nomeOriginale} • {formatFileSize(viewingDocument.dimensione)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingDocument(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {viewingDocument.descrizione && (
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrizione</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{viewingDocument.descrizione}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase">{viewingDocument.tipo}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dimensione</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatFileSize(viewingDocument.dimensione)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Caricato da</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{viewingDocument.caricatoDa || 'N/D'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Data caricamento</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {new Date(viewingDocument.dataCreazione).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {viewingDocument.pratica && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 mb-4">
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Pratica associata</p>
                  <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                    {viewingDocument.pratica.cliente?.ragioneSociale}
                  </p>
                </div>
              )}

              {viewingDocument.cartella && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cartella</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{viewingDocument.cartella.nome}</p>
                </div>
              )}

              {/* File preview placeholder */}
              <div className="mt-6 p-8 bg-slate-100 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center">
                <FileText className="h-16 w-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Anteprima non disponibile</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Scarica il file per visualizzarlo
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleDownload(viewingDocument)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition"
              >
                <Download className="h-4 w-4" />
                Scarica
              </button>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}
    </div>
  );
}
