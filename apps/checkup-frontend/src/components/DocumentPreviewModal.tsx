// apps/checkup-frontend/src/components/DocumentPreviewModal.tsx
import { useEffect, useState } from 'react';
import { X, Download, RefreshCw, FileText } from 'lucide-react';
import { BodyPortal } from './ui/BodyPortal';

interface DocumentPreviewModalProps {
  doc: { id: string; nomeOriginale: string } | null;
  open: boolean;
  onClose: () => void;
  downloadFn: (id: string) => Promise<Blob>;
}

function getFileType(nome: string): 'pdf' | 'image' | 'other' {
  const ext = nome.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  return 'other';
}

export function DocumentPreviewModal({ doc, open, onClose, downloadFn }: DocumentPreviewModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) return;

    const fileType = getFileType(doc.nomeOriginale);
    if (fileType === 'other') return; // no preview needed

    let url: string | null = null;
    setLoading(true);
    setError(null);

    downloadFn(doc.id)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        setError('Impossibile caricare l\'anteprima.');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      if (url) URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [open, doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async () => {
    if (!doc) return;
    try {
      const blob = await downloadFn(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nomeOriginale;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  if (!open || !doc) return null;

  const fileType = getFileType(doc.nomeOriginale);

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="modal-overlay absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="modal-content relative z-10 w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl dark:bg-slate-900 max-h-[92vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {doc.nomeOriginale}
              </h2>
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Scarica
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4 min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="text-sm">Caricamento anteprima...</span>
              </div>
            ) : error ? (
              <div className="text-center text-slate-500 space-y-3">
                <FileText className="h-12 w-12 mx-auto opacity-40" />
                <p className="text-sm">{error}</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Scarica il file
                </button>
              </div>
            ) : fileType === 'pdf' && objectUrl ? (
              <iframe
                src={objectUrl}
                title={doc.nomeOriginale}
                className="w-full rounded-lg shadow"
                style={{ height: '70vh' }}
              />
            ) : fileType === 'image' && objectUrl ? (
              <img
                src={objectUrl}
                alt={doc.nomeOriginale}
                className="max-w-full max-h-[70vh] rounded-lg shadow object-contain"
              />
            ) : (
              <div className="text-center text-slate-500 space-y-3">
                <FileText className="h-12 w-12 mx-auto opacity-40" />
                <p className="text-sm font-medium">Anteprima non disponibile per questo tipo di file</p>
                <p className="text-xs text-slate-400">{doc.nomeOriginale}</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Scarica il file
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
