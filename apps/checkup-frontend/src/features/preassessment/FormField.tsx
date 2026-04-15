import { memo, useEffect, useRef, useState } from 'react';
import {
  Eye,
  FileText,
  HelpCircle,
  Lock,
  StickyNote,
  Trash2,
  Upload,
} from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import { getDocumentPreviewType } from '../../components/DocumentPreviewModal';
import type { PreassessmentDocument } from '../../api/preassessment';
import type { FieldSpec } from '../../data/preassessment';
import {
  DOC_ICON_FIELDS,
  formatNumberValue,
  getAssettiOptionLabel,
  getOptionLabel,
  getOptions,
  normalizeNumberValue,
} from './preassessment-utils';

type FieldMeta = {
  updatedAt: string;
  updatedBy: { id: string; name: string; ruolo: string };
};

type ActiveEditor = {
  userId: string;
  name: string;
};

type FormFieldProps = {
  field: FieldSpec;
  value: string;
  onChange: (id: string, val: string) => void;
  consultantNote?: string;
  userNote?: string;
  onConsultantNoteChange: (id: string, val: string) => void;
  onUserNoteChange: (id: string, val: string) => void;
  readOnly?: boolean;
  ownerProtected?: boolean;
  fieldMeta?: FieldMeta;
  activeEditor?: ActiveEditor;
  currentUserId?: string;
  onFieldFocus?: (id: string) => void;
  onFieldBlur?: (id: string) => void;
  naChecked?: boolean;
  onNaChange?: (id: string, checked: boolean) => void;
  canEditConsultantNotes?: boolean;
  canEditUserNotes?: boolean;
  documents?: PreassessmentDocument[];
  documentsLoading?: boolean;
  documentsEnabled?: boolean;
  onUploadDocument?: (fieldId: string, sectionId: string, file: File) => Promise<void> | void;
  onDeleteDocument?: (docId: string) => Promise<void> | void;
  onDownloadDocument?: (doc: PreassessmentDocument) => Promise<void> | void;
  onPreviewDocument?: (doc: PreassessmentDocument) => void;
  sectionId: string;
  highlightCompletionState?: boolean;
};

export const FormField = memo(function FormField({
  field,
  value,
  onChange,
  consultantNote,
  userNote,
  onConsultantNoteChange,
  onUserNoteChange,
  readOnly = false,
  fieldMeta,
  activeEditor,
  currentUserId,
  onFieldFocus,
  onFieldBlur,
  naChecked = false,
  onNaChange,
  canEditConsultantNotes = false,
  canEditUserNotes = false,
  documents = [],
  documentsLoading = false,
  documentsEnabled = true,
  onUploadDocument,
  onDeleteDocument,
  onDownloadDocument,
  onPreviewDocument,
  sectionId,
  highlightCompletionState = false,
  ownerProtected = false,
}: FormFieldProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showUserNote, setShowUserNote] = useState(Boolean(userNote));
  const [showConsultantNote, setShowConsultantNote] = useState(Boolean(consultantNote));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const isEditingOther = activeEditor && activeEditor.userId !== currentUserId;
  const showModified = !!fieldMeta;
  const modifiedAt = fieldMeta
    ? new Date(fieldMeta.updatedAt).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const disabled = readOnly || ownerProtected || !!isEditingOther || naChecked;
  const consultantNoteDisabled = !!isEditingOther || naChecked;
  const normalizedValue = (value || '').trim();
  const hasResolvedValue = naChecked || (field.type === 'multiselect'
    ? normalizedValue.split('||').filter(Boolean).length > 0
    : normalizedValue.length > 0);
  const shouldHighlightField = highlightCompletionState && !readOnly && !ownerProtected && !isEditingOther;
  const cleanLabel = field.label.replace(/\s*\*+\s*$/g, '');
  const completionBorderClass = shouldHighlightField
    ? hasResolvedValue
      ? 'border-emerald-300 focus:ring-emerald-500'
      : 'border-rose-300 focus:ring-rose-500'
    : 'border-slate-200 focus:ring-blue-500';
  const multiSelectContainerClass = shouldHighlightField
    ? hasResolvedValue
      ? 'border-emerald-300 bg-emerald-50/30'
      : 'border-rose-300 bg-rose-50/30'
    : 'border-slate-200 bg-slate-50';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadDocument) return;

    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Il file supera la dimensione massima consentita di 30 MB.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploadError(null);

    setUploading(true);
    try {
      await onUploadDocument(field.id, sectionId, file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  useEffect(() => {
    if (userNote) setShowUserNote(true);
  }, [userNote]);

  useEffect(() => {
    if (consultantNote) setShowConsultantNote(true);
  }, [consultantNote]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!helpRef.current) return;
      if (!helpRef.current.contains(e.target as Node)) setShowHelp(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const renderValue = (raw: string) => {
    if (!raw) return '';
    if (raw.includes('||')) return raw.split('||').join(', ');
    return raw;
  };

  return (
    <div className={`space-y-2 rounded-xl ${isEditingOther ? 'ring-2 ring-blue-200/70 bg-blue-50/40 p-3' : ''}`}>
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <label className={`text-sm font-medium ${naChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
            {cleanLabel}
          </label>
          <div className="flex items-center gap-2">
            {isEditingOther && (
              <span className="rounded-full border border-blue-200 bg-blue-100/80 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                In modifica da {activeEditor?.name}
              </span>
            )}
            {ownerProtected && (
              <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                <Lock className="h-2.5 w-2.5" />
                Campo Studio
              </span>
            )}
            {!readOnly && !ownerProtected && !isEditingOther && (
              <label
                className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                  naChecked ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={naChecked}
                  onChange={(e) => onNaChange?.(field.id, e.target.checked)}
                  className="h-3 w-3 rounded border-slate-300 text-rose-600"
                />
                N/A
              </label>
            )}
            {canEditUserNotes && !naChecked && (
              <button
                type="button"
                onClick={() => setShowUserNote((prev) => !prev)}
                className={`rounded-md border px-2 py-1 text-xs transition ${
                  showUserNote || userNote
                    ? 'border-slate-200 bg-slate-50 text-slate-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
                title="Nota utente"
              >
                <StickyNote className="h-3.5 w-3.5" />
              </button>
            )}
            {canEditConsultantNotes && (
              <button
                type="button"
                onClick={() => setShowConsultantNote((prev) => !prev)}
                className={`rounded-md border px-2 py-1 text-xs transition ${
                  showConsultantNote || consultantNote
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
                title="Nota consulente"
              >
                <StickyNote className="h-3.5 w-3.5" />
              </button>
            )}
            {field.help && (
              <div className="relative" ref={helpRef}>
                <button
                  type="button"
                  onClick={() => setShowHelp((prev) => !prev)}
                  className={`rounded-md border px-2 py-1 text-xs transition ${
                    showHelp ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
                {showHelp && (
                  <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-blue-100/60 bg-white/95 p-3 text-xs text-slate-600 shadow-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">INFORMAZIONI</div>
                    <div className="mt-2 whitespace-pre-wrap">{field.help}</div>
                    <button
                      type="button"
                      onClick={() => setShowHelp(false)}
                      className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 hover:text-blue-700"
                    >
                      CHIUDI
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {naChecked && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
          Campo contrassegnato come Non Applicabile
        </div>
      )}

      {field.type === 'textarea' && (
        <textarea
          value={renderValue(value)}
          onChange={(e) => onChange(field.id, e.target.value)}
          onFocus={() => onFieldFocus?.(field.id)}
          onBlur={() => onFieldBlur?.(field.id)}
          rows={3}
          disabled={disabled}
          className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${completionBorderClass}`}
        />
      )}

      {field.type === 'select' && (
        <CustomSelect
          value={value}
          onChange={(val) => onChange(field.id, val)}
          options={getOptions(field).map((option) => ({
            value: option,
            label: DOC_ICON_FIELDS.has(field.id)
              ? getOptionLabel(field, option)
              : getAssettiOptionLabel(field, option),
          }))}
          placeholder="— Selezionare —"
          triggerClassName="rounded-xl bg-white px-3 py-2 text-sm"
          status={
            shouldHighlightField
              ? hasResolvedValue
                ? 'success'
                : 'error'
              : 'default'
          }
          disabled={disabled}
          onOpen={() => onFieldFocus?.(field.id)}
          onClose={() => onFieldBlur?.(field.id)}
          allowClear={!disabled}
        />
      )}

      {field.type === 'multiselect' && (
        <div className={`flex flex-wrap gap-2 rounded-xl border px-3 py-2 ${multiSelectContainerClass}`}>
          {(field.options || []).map((option) => {
            const selected = (value || '').split('||').filter(Boolean).includes(option);
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  const current = (value || '').split('||').filter(Boolean);
                  const next = selected ? current.filter((item) => item !== option) : [...current, option];
                  onFieldFocus?.(field.id);
                  onChange(field.id, next.join('||'));
                  onFieldBlur?.(field.id);
                }}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  selected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {field.type === 'number' && (
        <input
          type="text"
          inputMode="decimal"
          value={formatNumberValue(value)}
          onChange={(e) => onChange(field.id, normalizeNumberValue(e.target.value))}
          onFocus={() => onFieldFocus?.(field.id)}
          onBlur={() => onFieldBlur?.(field.id)}
          disabled={disabled}
          className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${completionBorderClass}`}
        />
      )}

      {field.type === 'text' && (
        <input
          type="text"
          value={renderValue(value)}
          onChange={(e) => onChange(field.id, e.target.value)}
          onFocus={() => onFieldFocus?.(field.id)}
          onBlur={() => onFieldBlur?.(field.id)}
          disabled={disabled}
          className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${completionBorderClass}`}
        />
      )}

      {showModified && (
        <div className="text-right text-[10px] text-slate-400">
          Ultima modifica: <span className="font-medium text-slate-500">{fieldMeta?.updatedBy.name}</span> • {modifiedAt}
        </div>
      )}

      {documentsEnabled && field.allowDocuments !== false && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Documenti allegati</span>
            {documentsLoading && <span className="text-[10px] text-slate-400">Caricamento...</span>}
          </div>
          {documents.length > 0 ? (
            <div className="mt-2 space-y-1">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => (getDocumentPreviewType(doc.nomeOriginale) !== 'other' ? onPreviewDocument?.(doc) : onDownloadDocument?.(doc))}
                    className="min-w-0 flex-1 truncate text-left text-slate-700 hover:text-blue-700"
                    title={getDocumentPreviewType(doc.nomeOriginale) !== 'other' ? 'Apri anteprima' : 'Scarica documento'}
                  >
                    {doc.nomeOriginale}
                  </button>
                  <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPreviewDocument?.(doc)}
                      className="text-slate-400 transition-colors hover:text-indigo-600"
                      title="Anteprima"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onDeleteDocument?.(doc.id)}
                        className="text-slate-400 transition-colors hover:text-rose-600"
                        title="Elimina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-400">Nessun documento caricato.</div>
          )}
          {!readOnly && (
            <>
              <input ref={fileRef} type="file" onChange={handleFileUpload} className="hidden" />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadError(null);
                    fileRef.current?.click();
                  }}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? 'Caricamento...' : 'Carica documento'}
                </button>
                <span className="text-[10px] text-slate-400">Max 30 MB</span>
              </div>
              {uploadError && <p className="mt-1 text-[10px] text-rose-600">{uploadError}</p>}
            </>
          )}
        </div>
      )}

      {showUserNote && canEditUserNotes && !naChecked && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-blue-700">Nota utente</label>
            {userNote && (
              <button
                type="button"
                onClick={() => {
                  onUserNoteChange(field.id, '');
                  setShowUserNote(false);
                }}
                className="inline-flex items-center gap-1 text-[10px] text-rose-400 transition-colors hover:text-rose-600"
                title="Elimina nota"
              >
                <Trash2 className="h-3 w-3" />
                Elimina
              </button>
            )}
          </div>
          <textarea
            value={userNote || ''}
            onChange={(e) => onUserNoteChange(field.id, e.target.value)}
            onFocus={() => onFieldFocus?.(field.id)}
            onBlur={() => onFieldBlur?.(field.id)}
            rows={2}
            placeholder="Nota utente..."
            disabled={disabled}
            className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      )}

      {!canEditUserNotes && userNote && !naChecked && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <strong>Nota utente:</strong> {userNote}
        </div>
      )}

      {showConsultantNote && canEditConsultantNotes && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-amber-700">Nota consulente</label>
            {consultantNote && (
              <button
                type="button"
                onClick={() => {
                  onConsultantNoteChange(field.id, '');
                  setShowConsultantNote(false);
                }}
                className="inline-flex items-center gap-1 text-[10px] text-rose-400 transition-colors hover:text-rose-600"
                title="Elimina nota"
              >
                <Trash2 className="h-3 w-3" />
                Elimina
              </button>
            )}
          </div>
          <textarea
            value={consultantNote || ''}
            onChange={(e) => onConsultantNoteChange(field.id, e.target.value)}
            onFocus={() => onFieldFocus?.(field.id)}
            onBlur={() => onFieldBlur?.(field.id)}
            rows={2}
            placeholder="Nota consulente..."
            disabled={consultantNoteDisabled}
            className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      )}

      {!canEditConsultantNotes && consultantNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>Nota consulente:</strong> {consultantNote}
        </div>
      )}
    </div>
  );
});
