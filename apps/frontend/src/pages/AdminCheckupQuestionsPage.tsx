import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { BodyPortal } from '../components/ui/BodyPortal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useToast } from '../components/ui/ToastProvider';
import * as questionApi from '../api/checkupQuestions';
import type {
  MacroArea,
  Section,
  Field,
  CreateMacroAreaDto,
  UpdateMacroAreaDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateFieldDto,
  UpdateFieldDto,
} from '../api/checkupQuestions';

type EditMode = 'macro' | 'section' | 'field' | null;

interface EditState {
  mode: EditMode;
  id: number | null;
  isNew: boolean;
}

export default function AdminCheckupQuestionsPage() {
  const { error: toastError } = useToast();
  const [models, setModels] = useState<questionApi.QuestionModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [macroAreas, setMacroAreas] = useState<MacroArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMacros, setExpandedMacros] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const [editState, setEditState] = useState<EditState>({ mode: null, id: null, isNew: false });

  // Form states
  const [macroForm, setMacroForm] = useState<Partial<MacroArea>>({});
  const [sectionForm, setSectionForm] = useState<Partial<Section>>({});
  const [fieldForm, setFieldForm] = useState<Partial<Field>>({});
  const [fieldOptionsText, setFieldOptionsText] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const buildMacroDto = (value: Partial<MacroArea>): UpdateMacroAreaDto => ({
    modelId: value.modelId,
    code: value.code,
    label: value.label,
    color: value.color,
    sortOrder: value.sortOrder,
  });

  const buildSectionDto = (value: Partial<Section>): UpdateSectionDto => ({
    code: value.code,
    title: value.title,
    description: value.description,
    macroAreaId: value.macroAreaId,
    sortOrder: value.sortOrder,
  });

  const buildFieldDto = (value: Partial<Field>): UpdateFieldDto => ({
    fieldId: value.fieldId,
    label: value.label,
    type: value.type,
    options: value.options,
    required: value.required,
    help: value.help,
    allowDocuments: value.allowDocuments,
    sectionId: value.sectionId,
    sortOrder: value.sortOrder,
  });

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (!selectedModelId) {
      setMacroAreas([]);
      return;
    }
    loadData(selectedModelId);
  }, [selectedModelId]);

  const filteredMacroAreas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return macroAreas;
    const includesTerm = (value?: string | null) => (value || '').toLowerCase().includes(term);
    return macroAreas
      .map((macro) => {
        const macroMatch = includesTerm(macro.label) || includesTerm(macro.code);
        if (macroMatch) return macro;
        const matchedSections = (macro.sections || [])
          .map((section) => {
            const sectionMatch =
              includesTerm(section.title) || includesTerm(section.code) || includesTerm(section.description || '');
            const matchedFields = (section.fields || []).filter(
              (field) =>
                includesTerm(field.label) ||
                includesTerm(field.fieldId) ||
                includesTerm(field.help || ''),
            );
            if (sectionMatch) return section;
            if (matchedFields.length) return { ...section, fields: matchedFields };
            return null;
          })
          .filter(Boolean) as Section[];
        if (!matchedSections.length) return null;
        return { ...macro, sections: matchedSections };
      })
      .filter(Boolean) as MacroArea[];
  }, [macroAreas, searchTerm]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await questionApi.getModels();
      setModels(data);
      if (data.length > 0) {
        setSelectedModelId((prev) => prev || data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dei modelli');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (modelId: string) => {
    try {
      setLoading(true);
      const data = await questionApi.getCompleteStructureByModel(modelId);
      setMacroAreas(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dei dati');
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMacro = (id: number) => {
    setExpandedMacros((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSection = (id: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // MACRO AREA CRUD
  const startEditMacro = (macro?: MacroArea) => {
    if (macro) {
      setMacroForm(macro);
      setEditState({ mode: 'macro', id: macro.id, isNew: false });
    } else {
    if (!selectedModelId) {
      toastError('Seleziona prima un modello');
      return;
    }
      setMacroForm({
        modelId: selectedModelId,
        code: '',
        label: '',
        color: '#6366f1',
        sortOrder: macroAreas.length,
      });
      setEditState({ mode: 'macro', id: null, isNew: true });
    }
  };

  const saveMacro = async () => {
    setConfirmModal({
      show: true,
      title: editState.isNew ? 'Conferma creazione' : 'Conferma modifica',
      message: editState.isNew
        ? `Vuoi creare la macro area "${macroForm.label}"?`
        : `Vuoi salvare le modifiche alla macro area "${macroForm.label}"?`,
      onConfirm: async () => {
        try {
          const payload = buildMacroDto(macroForm);
          if (editState.isNew) {
            await questionApi.createMacroArea(payload as CreateMacroAreaDto);
          } else if (editState.id) {
            await questionApi.updateMacroArea(editState.id, payload);
          }
          if (selectedModelId) {
            await loadData(selectedModelId);
          }
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          cancelEdit();
        } catch (err: any) {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          toastError(err.message || 'Errore nel salvataggio');
        }
      },
    });
  };

  const deleteMacro = async (id: number) => {
    const macro = macroAreas.find((item) => item.id === id);
    setConfirmModal({
      show: true,
      title: 'Conferma eliminazione',
      message: macro
        ? `Vuoi eliminare la macro area "${macro.label}"? Verranno eliminate anche tutte le sezioni e i campi associati.`
        : 'Vuoi eliminare questa macro area? Verranno eliminate anche tutte le sezioni e i campi associati.',
      onConfirm: async () => {
        try {
          await questionApi.deleteMacroArea(id);
          if (selectedModelId) {
            await loadData(selectedModelId);
          }
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        } catch (err: any) {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          toastError(err.message || 'Errore nell\'eliminazione');
        }
      },
    });
  };

  // SECTION CRUD
  const startEditSection = (macroAreaId: number, section?: Section) => {
    if (section) {
      setSectionForm(section);
      setEditState({ mode: 'section', id: section.id, isNew: false });
    } else {
      const macro = macroAreas.find((m) => m.id === macroAreaId);
      const sortOrder = macro?.sections?.length || 0;
      setSectionForm({ code: '', title: '', description: '', macroAreaId, sortOrder });
      setEditState({ mode: 'section', id: null, isNew: true });
    }
  };

  const saveSection = async () => {
    setConfirmModal({
      show: true,
      title: editState.isNew ? 'Conferma creazione' : 'Conferma modifica',
      message: editState.isNew
        ? `Vuoi creare la sezione "${sectionForm.title}"?`
        : `Vuoi salvare le modifiche alla sezione "${sectionForm.title}"?`,
      onConfirm: async () => {
        try {
          const payload = buildSectionDto(sectionForm);
          if (editState.isNew) {
            await questionApi.createSection(payload as CreateSectionDto);
          } else if (editState.id) {
            await questionApi.updateSection(editState.id, payload);
          }
          if (selectedModelId) {
            await loadData(selectedModelId);
          }
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          cancelEdit();
        } catch (err: any) {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          toastError(err.message || 'Errore nel salvataggio');
        }
      },
    });
  };

  const deleteSection = async (id: number) => {
    const section = macroAreas.flatMap((macro) => macro.sections || []).find((item) => item.id === id);
    setConfirmModal({
      show: true,
      title: 'Conferma eliminazione',
      message: section
        ? `Vuoi eliminare la sezione "${section.title}"? Verranno eliminati anche tutti i campi associati.`
        : 'Vuoi eliminare questa sezione? Verranno eliminati anche tutti i campi associati.',
      onConfirm: async () => {
        try {
          await questionApi.deleteSection(id);
          if (selectedModelId) {
            await loadData(selectedModelId);
          }
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        } catch (err: any) {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          toastError(err.message || 'Errore nell\'eliminazione');
        }
      },
    });
  };

  // FIELD CRUD
  const startEditField = (sectionId: number, field?: Field) => {
    if (field) {
      setFieldForm(field);
      setFieldOptionsText((field.options || []).join('\n'));
      setEditState({ mode: 'field', id: field.id, isNew: false });
    } else {
      const section = macroAreas
        .flatMap((m) => m.sections || [])
        .find((s) => s.id === sectionId);
      const sortOrder = section?.fields?.length || 0;
      setFieldForm({
        fieldId: '',
        label: '',
        type: 'text',
        help: '',
        required: false,
        allowDocuments: true,
        sectionId,
        sortOrder,
      });
      setFieldOptionsText('');
      setEditState({ mode: 'field', id: null, isNew: true });
    }
  };

  const saveField = async () => {
    if (fieldForm.type === 'select' || fieldForm.type === 'multiselect') {
      const options = fieldForm.options?.filter((o) => o.trim()) || [];
      if (options.length === 0) {
        toastError('Inserisci almeno una opzione per il campo selezionato');
        return;
      }
    }
    setConfirmModal({
      show: true,
      title: editState.isNew ? 'Conferma creazione' : 'Conferma modifica',
      message: editState.isNew
        ? `Vuoi creare il campo "${fieldForm.label}"?`
        : `Vuoi salvare le modifiche al campo "${fieldForm.label}"?`,
      onConfirm: async () => {
        try {
          const payload = buildFieldDto(fieldForm);
          if (editState.isNew) {
            await questionApi.createField(payload as CreateFieldDto);
          } else if (editState.id) {
            await questionApi.updateField(editState.id, payload);
          }
          if (selectedModelId) {
            await loadData(selectedModelId);
          }
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          cancelEdit();
        } catch (err: any) {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          toastError(err.message || 'Errore nel salvataggio');
        }
      },
    });
  };

  const deleteField = async (id: number) => {
    const field = macroAreas
      .flatMap((macro) => macro.sections || [])
      .flatMap((section) => section.fields || [])
      .find((item) => item.id === id);
    setConfirmModal({
      show: true,
      title: 'Conferma eliminazione',
      message: field
        ? `Vuoi eliminare il campo "${field.label}"?`
        : 'Vuoi eliminare questo campo?',
      onConfirm: async () => {
        try {
          await questionApi.deleteField(id);
          if (selectedModelId) {
            await loadData(selectedModelId);
          }
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        } catch (err: any) {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          toastError(err.message || 'Errore nell\'eliminazione');
        }
      },
    });
  };

  const cancelEdit = () => {
    setEditState({ mode: null, id: null, isNew: false });
    setMacroForm({});
    setSectionForm({});
    setFieldForm({});
    setFieldOptionsText('');
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Caricamento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Errore: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Domande Checkup</h1>
          <p className="text-gray-600 mt-1">
            {selectedModelId
              ? `Modello: ${models.find((m) => m.id === selectedModelId)?.label || '—'}`
              : 'Seleziona un modello per iniziare.'}
          </p>
          <p className="text-gray-600 mt-1">
            {macroAreas.length} macro-aree •{' '}
            {macroAreas.reduce((sum, m) => sum + (m.sections?.length || 0), 0)} sezioni •{' '}
            {macroAreas.reduce(
              (sum, m) =>
                sum + (m.sections?.reduce((s, sec) => s + (sec.fields?.length || 0), 0) || 0),
              0
            )}{' '}
            campi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CustomSelect
              value={selectedModelId}
              onChange={(val) => setSelectedModelId(val)}
              options={models.map((model) => ({
                value: model.id,
                label: model.label,
                sublabel: [model.code, model.attivo ? 'Attivo' : 'Disattivo'].join(' · '),
              }))}
              placeholder="Seleziona modello"
              searchable
              searchPlaceholder="Cerca modello..."
            />
          </div>
          <button
            onClick={() => startEditMacro()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={20} />
            Nuova Macro Area
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca macro-aree, sezioni o campi..."
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
          />
        </div>
      </div>

      {/* Confirmation Modal - Above everything */}
      {confirmModal.show && (
        <BodyPortal>
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-bold mb-3">{confirmModal.title}</h3>
                <p className="text-gray-700 mb-6">{confirmModal.message}</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() =>
                      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })
                    }
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confirmModal.onConfirm}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    Conferma
                  </button>
                </div>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {/* Edit Form Modal */}
      {editState.mode && (
        <BodyPortal>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editState.isNew ? 'Crea' : 'Modifica'}{' '}
                {editState.mode === 'macro' && 'Macro Area'}
                {editState.mode === 'section' && 'Sezione'}
                {editState.mode === 'field' && 'Campo'}
              </h2>

              {/* Macro Area Form */}
              {editState.mode === 'macro' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
                    <input
                      type="text"
                      value={macroForm.code || ''}
                      onChange={(e) => setMacroForm({ ...macroForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="es. a"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                    <input
                      type="text"
                      value={macroForm.label || ''}
                      onChange={(e) => setMacroForm({ ...macroForm, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="es. Identità e Struttura"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Colore</label>
                    <input
                      type="color"
                      value={macroForm.color || '#6366f1'}
                      onChange={(e) => setMacroForm({ ...macroForm, color: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                    <input
                      type="number"
                      value={macroForm.sortOrder || 0}
                      onChange={(e) =>
                        setMacroForm({ ...macroForm, sortOrder: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Section Form */}
              {editState.mode === 'section' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
                    <input
                      type="text"
                      value={sectionForm.code || ''}
                      onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                    <input
                      type="text"
                      value={sectionForm.title || ''}
                      onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrizione
                    </label>
                    <textarea
                      value={sectionForm.description || ''}
                      onChange={(e) =>
                        setSectionForm({ ...sectionForm, description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                    <input
                      type="number"
                      value={sectionForm.sortOrder || 0}
                      onChange={(e) =>
                        setSectionForm({ ...sectionForm, sortOrder: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Field Form */}
              {editState.mode === 'field' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field ID
                    </label>
                    <input
                      type="text"
                      value={fieldForm.fieldId || ''}
                      onChange={(e) => setFieldForm({ ...fieldForm, fieldId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="es. company_name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                    <input
                      type="text"
                      value={fieldForm.label || ''}
                      onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="es. Denominazione società"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tipo
                    </label>
                    <CustomSelect
                      options={[
                        { value: 'text', label: 'Text' },
                        { value: 'textarea', label: 'Textarea' },
                        { value: 'select', label: 'Select' },
                        { value: 'multiselect', label: 'Multiselect' },
                        { value: 'checkbox', label: 'Checkbox' },
                        { value: 'date', label: 'Date' },
                        { value: 'number', label: 'Number' },
                      ]}
                      value={fieldForm.type || 'text'}
                      onChange={(value) =>
                        setFieldForm({
                          ...fieldForm,
                          type: value,
                          options: value === 'select' || value === 'multiselect' ? fieldForm.options : [],
                        })}
                      placeholder="Seleziona tipo"
                    />
                  </div>
                  {(fieldForm.type === 'select' || fieldForm.type === 'multiselect') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opzioni (una per riga)
                      </label>
                      <textarea
                        value={fieldOptionsText}
                        onChange={(e) => {
                          const nextText = e.target.value;
                          setFieldOptionsText(nextText);
                          const nextOptions = e.target.value
                            .split('\n')
                            .map((o) => o.trim())
                            .filter(Boolean);
                          setFieldForm({ ...fieldForm, options: nextOptions });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={4}
                        placeholder="es. Opzione 1"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Testo di aiuto (tooltip "?")
                    </label>
                    <textarea
                      value={fieldForm.help || ''}
                      onChange={(e) => setFieldForm({ ...fieldForm, help: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={4}
                      placeholder="Inserisci il testo che apparirà quando l'utente passa sopra il punto interrogativo"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={fieldForm.allowDocuments ?? true}
                      onChange={(e) => setFieldForm({ ...fieldForm, allowDocuments: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">Consenti allegati</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={fieldForm.required || false}
                      onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">Campo obbligatorio</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                    <input
                      type="number"
                      value={fieldForm.sortOrder || 0}
                      onChange={(e) =>
                        setFieldForm({ ...fieldForm, sortOrder: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={
                    editState.mode === 'macro'
                      ? saveMacro
                      : editState.mode === 'section'
                      ? saveSection
                      : saveField
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Save size={20} />
                  Salva
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <X size={20} />
                  Annulla
                </button>
              </div>
            </div>
          </div>
          </div>
        </BodyPortal>
      )}


      {/* Macro Areas List */}
      <div className="space-y-4">
        {filteredMacroAreas.map((macro) => (
          <div key={macro.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100"
              onClick={() => toggleMacro(macro.id)}
            >
              <div className="flex items-center gap-3">
                {expandedMacros.has(macro.id) ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: macro.color }}
                />
                <span className="font-bold">{macro.label}</span>
                <span className="text-sm text-gray-500">({macro.code})</span>
                <span className="text-sm text-gray-500">
                  {macro.sections?.length || 0} sezioni
                </span>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => startEditMacro(macro)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Modifica"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deleteMacro(macro.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Elimina"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => startEditSection(macro.id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded"
                  title="Aggiungi Sezione"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {expandedMacros.has(macro.id) && (
              <div className="p-4 space-y-2 bg-white">
                {macro.sections && macro.sections.length > 0 ? (
                  macro.sections.map((section) => (
                    <div key={section.id} className="border border-gray-200 rounded">
                      <div
                        className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedSections.has(section.id) ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                          <FileText size={18} className="text-gray-600" />
                          <span className="font-medium">{section.title}</span>
                          <span className="text-sm text-gray-500">({section.code})</span>
                          <span className="text-sm text-gray-500">
                            {section.fields?.length || 0} campi
                          </span>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => startEditSection(macro.id, section)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Modifica"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Elimina"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => startEditField(section.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Aggiungi Campo"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {expandedSections.has(section.id) && (
                        <div className="p-3 space-y-2 bg-white">
                          {section.description && (
                            <p className="text-sm text-gray-600 mb-2">{section.description}</p>
                          )}
                          {section.fields && section.fields.length > 0 ? (
                            section.fields.map((field) => (
                              <div
                                key={field.id}
                                className="p-3 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{field.label}</span>
                                      {field.required && (
                                        <span className="text-xs text-red-600">*</span>
                                      )}
                                      {field.help && (
                                        <HelpCircle
                                          size={16}
                                          className="text-blue-500"
                                        />
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                      ID: {field.fieldId} • Tipo: {field.type}
                                    </div>
                                    {field.help && (
                                      <div className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                        <strong>Tooltip:</strong> {field.help}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 ml-4">
                                    <button
                                      onClick={() => startEditField(section.id, field)}
                                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                      title="Modifica"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => deleteField(field.id)}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                      title="Elimina"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Nessun campo in questa sezione
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    Nessuna sezione in questa macro area
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
