import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, UploadCloud, Download } from 'lucide-react';
import { fetchPratica, type Pratica } from '../api/pratiche';
import { documentiApi, type Documento } from '../api/documenti';
import { useToast } from '../components/ui/ToastProvider';

export function PraticaClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [pratica, setPratica] = useState<Pratica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [loadingDocumenti, setLoadingDocumenti] = useState(false);
  const [documentiError, setDocumentiError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadLimitMb = Number(import.meta.env.VITE_UPLOAD_DOCUMENT_MAX_MB ?? '50');
  const uploadLimitBytes = uploadLimitMb * 1024 * 1024;

  const loadPratica = async () => {
    if (!id) {
      setError('Pratica non trovata');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPratica(id);
      setPratica(data);
    } catch (err) {
      console.error('Errore caricamento pratica cliente:', err);
      setError('Impossibile caricare i dettagli della pratica');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPratica();
  }, [id]);

  useEffect(() => {
    if (!pratica?.id) return;
    const loadDocumenti = async () => {
      try {
        setLoadingDocumenti(true);
        setDocumentiError(null);
        const docs = await documentiApi.getAllByPratica(pratica.id);
        setDocumenti(docs);
      } catch (err) {
        console.error('Errore caricamento documenti pratica cliente:', err);
        setDocumentiError('Impossibile caricare i documenti della pratica');
      } finally {
        setLoadingDocumenti(false);
      }
    };
    loadDocumenti();
  }, [pratica?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !pratica) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-600">{error || 'Pratica non disponibile'}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna indietro
        </button>
      </div>
    );
  }

  const clienteLabel = pratica.cliente?.ragioneSociale || 'Cliente';
  const debitoreLabel = pratica.debitore?.ragioneSociale
    || `${pratica.debitore?.nome ?? ''} ${pratica.debitore?.cognome ?? ''}`.trim()
    || 'Debitore';
  const formatAmount = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return '€ 0,00';
    return `€ ${num.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleUploadDocumento = async () => {
    if (!pratica || !uploadFile) return;
    if (uploadFile.size > uploadLimitBytes) {
      toastError(`Il file supera il limite massimo di ${uploadLimitMb} MB`);
      return;
    }
    try {
      setUploading(true);
      await documentiApi.upload({
        file: uploadFile,
        praticaId: pratica.id,
        tipologia: 'Cliente',
      });
      const docs = await documentiApi.getAllByPratica(pratica.id);
      setDocumenti(docs);
      setUploadFile(null);
      success('Documento caricato con successo');
    } catch (err: any) {
      console.error('Errore upload documento cliente:', err);
      toastError(err.message || 'Errore nel caricamento del documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <span className="wow-chip">Dettaglio pratica</span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-50 display-font">
            {clienteLabel}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Pratica #{pratica.numeroPratica || pratica.id.slice(0, 8)} • {pratica.fase?.nome || 'Fase non disponibile'}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alle pratiche
        </button>
      </div>

      <div className="wow-panel p-6 space-y-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          <FileText className="h-5 w-5 text-indigo-600" />
          Informazioni principali
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-400">Cliente</p>
            <p className="mt-1 font-semibold">{clienteLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-400">Debitore</p>
            <p className="mt-1 font-semibold">{debitoreLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-400">Stato</p>
            <p className="mt-1 font-semibold">{pratica.aperta ? 'Aperta' : 'Chiusa'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-400">Fase</p>
            <p className="mt-1 font-semibold">{pratica.fase?.nome || 'N/D'}</p>
          </div>
        </div>
      </div>

      <div className="wow-panel p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          <FileText className="h-5 w-5 text-indigo-600" />
          Dati economici
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-400">Capitale</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {formatAmount(pratica.capitale)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-400">Recuperato</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {formatAmount(pratica.importoRecuperatoCapitale)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-400">Interessi</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {formatAmount(pratica.interessi)}
            </p>
          </div>
        </div>
      </div>

      <div className="wow-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <FileText className="h-5 w-5 text-indigo-600" />
            Documenti della pratica
          </div>
          <span className="text-xs text-slate-500">Totale: {documenti.length}</span>
        </div>

        {loadingDocumenti && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Caricamento documenti...
          </div>
        )}

        {documentiError && (
          <p className="text-sm text-rose-600">{documentiError}</p>
        )}

        {!loadingDocumenti && !documentiError && documenti.length === 0 && (
          <p className="text-sm text-slate-500">Nessun documento disponibile.</p>
        )}

        {documenti.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {documenti.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{doc.nomeOriginale || doc.nome}</p>
                  <p className="text-xs text-slate-500">
                    {doc.tipologia || 'Documento'} • {(doc.dimensione / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={() => documentiApi.download(doc.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Download className="h-3 w-3" />
                  Scarica
                </button>
              </div>
            ))}
          </div>
        )}

        {pratica.aperta && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Carica un nuovo documento</p>
            <p className="mt-1 text-xs text-slate-500">
              Puoi caricare documenti solo su pratiche aperte. Limite {uploadLimitMb} MB.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
              />
              <button
                onClick={handleUploadDocumento}
                disabled={!uploadFile || uploading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <UploadCloud className="h-4 w-4" />
                {uploading ? 'Caricamento...' : 'Carica'}
              </button>
            </div>
            {uploadFile && (
              <p className="mt-2 text-xs text-slate-500">
                File selezionato: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
