import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Layers, FileText, CheckCircle2, X, Save, Eye, AlertTriangle } from 'lucide-react';
import { BodyPortal } from '../components/ui/BodyPortal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useToast } from '../components/ui/ToastProvider';
import * as questionApi from '../api/checkupQuestions';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminCheckupModelsPage() {
  const { success, error: toastError } = useToast();
  const [models, setModels] = useState<questionApi.QuestionModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editingModel, setEditingModel] = useState<
    (questionApi.CreateQuestionModelDto & { id?: string; attivo?: boolean }) | null
  >(null);
  const [detailsById, setDetailsById] = useState<Record<string, { macro: number; sections: number; fields: number }>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<questionApi.QuestionModel | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const deleteConfirmationText = deleteTarget ? `Confermo ${deleteTarget.label.trim()}` : '';
  const canConfirmDelete = deleteConfirmation.trim() === deleteConfirmationText;

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await questionApi.getModels();
      setModels(data);
    } catch (err: any) {
      toastError(err.message || 'Errore nel caricamento modelli');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((model) => {
      if (status === 'active' && !model.attivo) return false;
      if (status === 'inactive' && model.attivo) return false;
      if (!q) return true;
      return [model.code, model.label, model.description]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));
    });
  }, [models, query, status]);

  const handleOpenCreate = () => {
    setEditingModel({ code: '', label: '', description: '', attivo: true, importFromModelId: '' });
  };

  const handleOpenEdit = (model: questionApi.QuestionModel) => {
    setEditingModel({
      id: model.id,
      code: model.code,
      label: model.label,
      description: model.description || '',
      attivo: model.attivo,
    });
  };

  const handleSave = async () => {
    if (!editingModel) return;
    if (!editingModel.code || !editingModel.label) {
      toastError('Codice e nome modello sono obbligatori');
      return;
    }
    try {
      setLoading(true);
      if (editingModel.id) {
        await questionApi.updateModel(editingModel.id, {
          code: editingModel.code.trim(),
          label: editingModel.label.trim(),
          description: editingModel.description?.trim(),
          attivo: editingModel.attivo,
        });
        success('Modello aggiornato');
      } else {
        await questionApi.createModel({
          code: editingModel.code.trim(),
          label: editingModel.label.trim(),
          description: editingModel.description?.trim(),
          importFromModelId: editingModel.importFromModelId?.trim() || undefined,
        });
        success('Modello creato');
      }
      setEditingModel(null);
      await loadModels();
    } catch (err: any) {
      toastError(err.message || 'Errore nel salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = (model: questionApi.QuestionModel) => {
    setDeleteTarget(model);
    setDeleteConfirmation('');
  };

  const handleCloseDelete = () => {
    if (loading) return;
    setDeleteTarget(null);
    setDeleteConfirmation('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !canConfirmDelete) return;
    try {
      setLoading(true);
      await questionApi.deleteModel(deleteTarget.id);
      success('Modello eliminato');
      setDeleteTarget(null);
      setDeleteConfirmation('');
      await loadModels();
    } catch (err: any) {
      toastError(err.message || 'Errore eliminazione modello');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (model: questionApi.QuestionModel) => {
    setEditingModel({
      id: model.id,
      code: model.code,
      label: model.label,
      description: model.description || '',
      attivo: !model.attivo,
    });
  };

  const loadDetails = async (modelId: string) => {
    if (detailsById[modelId]) return;
    setDetailsLoading((prev) => ({ ...prev, [modelId]: true }));
    try {
      const data = await questionApi.getCompleteStructureByModel(modelId);
      const macro = data.length;
      const sections = data.reduce((acc, macroArea) => acc + (macroArea.sections?.length || 0), 0);
      const fields = data.reduce(
        (acc, macroArea) =>
          acc + (macroArea.sections?.reduce((s, sec) => s + (sec.fields?.length || 0), 0) || 0),
        0
      );
      setDetailsById((prev) => ({ ...prev, [modelId]: { macro, sections, fields } }));
    } catch (err: any) {
      toastError(err.message || 'Errore nel caricamento dettagli');
    } finally {
      setDetailsLoading((prev) => ({ ...prev, [modelId]: false }));
    }
  };

  return (
    <div className="space-y-6 wow-stagger">
      <div className="wow-card p-6 md:p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="wow-chip">Checkup</span>
          <h1 className="display-font text-3xl font-semibold text-slate-900 mt-2">Gestione modelli</h1>
          <p className="text-sm text-slate-600 mt-1">Crea, ricerca e aggiorna i modelli di questionario.</p>
        </div>
        <button onClick={handleOpenCreate} className="wow-button">
          <Plus className="h-4 w-4" />
          Nuovo modello
        </button>
      </div>

      <div className="wow-panel p-4 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per codice, nome o descrizione"
            className="w-full rounded-full border border-slate-200 bg-white px-10 py-2 text-sm text-slate-900"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                status === key
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {key === 'all' ? 'Tutti' : key === 'active' ? 'Attivi' : 'Disattivi'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredModels.map((model) => {
          const details = detailsById[model.id];
          return (
            <div key={model.id} className="wow-card p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{model.code}</div>
                  <h2 className="text-lg font-semibold text-slate-900 mt-1">{model.label}</h2>
                  {model.description && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{model.description}</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    model.attivo
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {model.attivo ? 'Attivo' : 'Disattivo'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {details ? `${details.macro} macro` : 'Macro n/d'}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {details ? `${details.sections} sezioni` : 'Sezioni n/d'}
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {details ? `${details.fields} campi` : 'Campi n/d'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => loadDetails(model.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {detailsLoading[model.id] ? 'Caricamento...' : 'Dettagli'}
                </button>
                <button
                  onClick={() => handleOpenEdit(model)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifica
                </button>
                <button
                  onClick={() => handleToggleStatus(model)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  {model.attivo ? 'Disattiva' : 'Attiva'}
                </button>
                {model.code !== 'preassessment' && (
                  <button
                    onClick={() => handleOpenDelete(model)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredModels.length === 0 && (
        <div className="wow-panel p-10 text-center text-slate-500">Nessun modello trovato.</div>
      )}

      {editingModel && (
        <BodyPortal>
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingModel.id ? 'Modifica modello' : 'Nuovo modello'}
                </h2>
                <button onClick={() => setEditingModel(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Codice</label>
                  <input
                    value={editingModel.code}
                    onChange={(e) => setEditingModel({ ...editingModel, code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="es. 231"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nome modello</label>
                  <input
                    value={editingModel.label}
                    onChange={(e) => setEditingModel({ ...editingModel, label: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="es. Modello 231"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Descrizione</label>
                  <textarea
                    value={editingModel.description || ''}
                    onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Breve descrizione del questionario"
                  />
                </div>
                {!editingModel.id && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Importa struttura da</label>
                    <div className="mt-1">
                      <CustomSelect
                        value={editingModel.importFromModelId || ''}
                        onChange={(val) => setEditingModel({ ...editingModel, importFromModelId: val })}
                        options={models
                          .filter((model) => model.id !== editingModel.id)
                          .map((model) => ({
                            value: model.id,
                            label: model.label,
                            sublabel: model.code,
                          }))}
                        placeholder="Nessun modello (struttura vuota)"
                        searchable
                        searchPlaceholder="Cerca modello..."
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Seleziona un modello di partenza per copiare macro-aree, sezioni e campi.
                    </p>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingModel.attivo ?? true}
                    onChange={(e) => setEditingModel({ ...editingModel, attivo: e.target.checked })}
                  />
                  Modello attivo
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditingModel(null)} className="wow-button-ghost">
                    Annulla
                  </button>
                  <button onClick={handleSave} className="wow-button">
                    <Save className="h-4 w-4" />
                    Salva
                  </button>
                </div>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {deleteTarget && (
        <BodyPortal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Eliminare il modello?</h2>
                    <p className="text-xs text-slate-500">Questa azione elimina macro-aree, sezioni e domande associate.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDelete}
                  disabled={loading}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  Stai eliminando <span className="font-semibold">{deleteTarget.label}</span>. Per confermare digita:
                  <div className="mt-2 select-all rounded-md bg-white px-3 py-2 font-mono text-sm text-rose-900">
                    {deleteConfirmationText}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Testo di conferma</label>
                  <input
                    autoFocus
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                    placeholder={deleteConfirmationText}
                    disabled={loading}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseDelete}
                    disabled={loading}
                    className="wow-button-ghost disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={!canConfirmDelete || loading}
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {loading ? 'Eliminazione...' : 'Elimina modello'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </BodyPortal>
      )}
    </div>
  );
}
