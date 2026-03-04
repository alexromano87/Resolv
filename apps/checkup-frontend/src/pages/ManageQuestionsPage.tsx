import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, HelpCircle, GripVertical, Folder, FileText, List } from 'lucide-react';
import * as questionApi from '../api/questionManagement';

interface EditingMacro {
  id?: number;
  modelId: string;
  code: string;
  label: string;
  color: string;
  sortOrder: number;
}

interface EditingSection {
  id?: number;
  code: string;
  title: string;
  description: string;
  macroAreaId: number;
  sortOrder: number;
}

interface EditingField {
  id?: number;
  fieldId: string;
  label: string;
  type: string;
  options: string;
  required: boolean;
  help: string;
  sectionId: number;
  sortOrder: number;
}

export default function ManageQuestionsPage() {
  const [models, setModels] = useState<questionApi.QuestionModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [editingModel, setEditingModel] = useState<questionApi.CreateQuestionModelDto & { id?: string; attivo?: boolean } | null>(null);

  const [macroAreas, setMacroAreas] = useState<questionApi.MacroArea[]>([]);
  const [sections, setSections] = useState<questionApi.Section[]>([]);
  const [fields, setFields] = useState<questionApi.Field[]>([]);

  const [selectedMacro, setSelectedMacro] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);

  const [editingMacro, setEditingMacro] = useState<EditingMacro | null>(null);
  const [editingSection, setEditingSection] = useState<EditingSection | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedModelId) {
      loadData(selectedModelId);
    } else {
      setMacroAreas([]);
      setSections([]);
      setFields([]);
      setSelectedMacro(null);
      setSelectedSection(null);
    }
  }, [selectedModelId]);

  useEffect(() => {
    if (selectedMacro) {
      loadSections(selectedMacro);
    } else {
      setSections([]);
      setFields([]);
      setSelectedSection(null);
    }
  }, [selectedMacro]);

  useEffect(() => {
    if (selectedSection) {
      loadFields(selectedSection);
    } else {
      setFields([]);
    }
  }, [selectedSection]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await questionApi.getModels();
      setModels(data);
      if (data.length > 0) {
        setSelectedModelId((prev) => prev || data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (modelId: string) => {
    try {
      setLoading(true);
      const data = await questionApi.getAllMacroAreas(modelId);
      setMacroAreas(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModel = () => {
    setEditingModel({
      code: '',
      label: '',
      description: '',
      attivo: true,
    });
  };

  const handleEditModel = (model: questionApi.QuestionModel) => {
    setEditingModel({
      id: model.id,
      code: model.code,
      label: model.label,
      description: model.description || '',
      attivo: model.attivo,
    });
  };

  const handleSaveModel = async () => {
    if (!editingModel) return;
    try {
      setLoading(true);
      setError(null);
      if (editingModel.id) {
        await questionApi.updateModel(editingModel.id, {
          code: editingModel.code,
          label: editingModel.label,
          description: editingModel.description,
          attivo: editingModel.attivo,
        });
      } else {
        await questionApi.createModel({
          code: editingModel.code,
          label: editingModel.label,
          description: editingModel.description,
        });
      }
      setEditingModel(null);
      await loadModels();
    } catch (err: any) {
      setError(err.message || 'Failed to save model');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Eliminare questo modello? Verranno eliminate tutte le macro-aree e domande associate.')) return;
    try {
      setLoading(true);
      await questionApi.deleteModel(id);
      if (selectedModelId === id) {
        setSelectedModelId('');
      }
      await loadModels();
    } catch (err: any) {
      setError(err.message || 'Failed to delete model');
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (macroAreaId: number) => {
    try {
      const data = await questionApi.getSectionsByMacroArea(macroAreaId);
      setSections(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sections');
    }
  };

  const loadFields = async (sectionId: number) => {
    try {
      const data = await questionApi.getFieldsBySection(sectionId);
      setFields(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load fields');
    }
  };

  // ============ MACRO AREA HANDLERS ============

  const handleCreateMacro = () => {
    if (!selectedModelId) {
      alert('Seleziona prima un modello');
      return;
    }
    setEditingMacro({
      code: '',
      label: '',
      color: '#6366f1',
      sortOrder: macroAreas.length,
      modelId: selectedModelId,
    });
  };

  const handleEditMacro = (macro: questionApi.MacroArea) => {
    setEditingMacro({
      id: macro.id,
      modelId: macro.modelId,
      code: macro.code,
      label: macro.label,
      color: macro.color,
      sortOrder: macro.sortOrder,
    });
  };

  const handleSaveMacro = async () => {
    if (!editingMacro) return;

    try {
      setLoading(true);
      setError(null);

      if (editingMacro.id) {
        await questionApi.updateMacroArea(editingMacro.id, editingMacro);
      } else {
        await questionApi.createMacroArea(editingMacro);
      }

      setEditingMacro(null);
      if (selectedModelId) {
        await loadData(selectedModelId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save macro area');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMacro = async (id: number) => {
    if (!confirm('Eliminare questa macro-area? Verranno eliminate anche tutte le sezioni e domande associate.')) return;

    try {
      setLoading(true);
      await questionApi.deleteMacroArea(id);
      if (selectedMacro === id) {
        setSelectedMacro(null);
      }
      if (selectedModelId) {
        await loadData(selectedModelId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete macro area');
    } finally {
      setLoading(false);
    }
  };

  // ============ SECTION HANDLERS ============

  const handleCreateSection = () => {
    if (!selectedMacro) {
      alert('Seleziona prima una macro-area');
      return;
    }

    setEditingSection({
      code: '',
      title: '',
      description: '',
      macroAreaId: selectedMacro,
      sortOrder: sections.length,
    });
  };

  const handleEditSection = (section: questionApi.Section) => {
    setEditingSection({
      id: section.id,
      code: section.code,
      title: section.title,
      description: section.description || '',
      macroAreaId: section.macroAreaId,
      sortOrder: section.sortOrder,
    });
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;

    try {
      setLoading(true);
      setError(null);

      if (editingSection.id) {
        await questionApi.updateSection(editingSection.id, editingSection);
      } else {
        await questionApi.createSection(editingSection);
      }

      setEditingSection(null);
      if (selectedMacro) {
        await loadSections(selectedMacro);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save section');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (!confirm('Eliminare questa sezione? Verranno eliminate anche tutte le domande associate.')) return;

    try {
      setLoading(true);
      await questionApi.deleteSection(id);
      if (selectedSection === id) {
        setSelectedSection(null);
      }
      if (selectedMacro) {
        await loadSections(selectedMacro);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete section');
    } finally {
      setLoading(false);
    }
  };

  // ============ FIELD HANDLERS ============

  const handleCreateField = () => {
    if (!selectedSection) {
      alert('Seleziona prima una sezione');
      return;
    }

    setEditingField({
      fieldId: '',
      label: '',
      type: 'text',
      options: '',
      required: false,
      help: '',
      sectionId: selectedSection,
      sortOrder: fields.length,
    });
  };

  const handleEditField = (field: questionApi.Field) => {
    setEditingField({
      id: field.id,
      fieldId: field.fieldId,
      label: field.label,
      type: field.type,
      options: field.options?.join('\n') || '',
      required: field.required,
      help: field.help || '',
      sectionId: field.sectionId,
      sortOrder: field.sortOrder,
    });
  };

  const handleSaveField = async () => {
    if (!editingField) return;

    try {
      setLoading(true);
      setError(null);

      const fieldData = {
        ...editingField,
        options: editingField.options.trim() ? editingField.options.split('\n').map(o => o.trim()).filter(Boolean) : undefined,
      };

      if (editingField.id) {
        await questionApi.updateField(editingField.id, fieldData);
      } else {
        await questionApi.createField(fieldData);
      }

      setEditingField(null);
      if (selectedSection) {
        await loadFields(selectedSection);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save field');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (id: number) => {
    if (!confirm('Eliminare questa domanda?')) return;

    try {
      setLoading(true);
      await questionApi.deleteField(id);
      if (selectedSection) {
        await loadFields(selectedSection);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete field');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <List className="w-8 h-8" />
            Gestione Domande Checkup
          </h1>
          <p className="text-gray-600 mt-2">
            Configura le macro-aree, sezioni e domande del questionario pre-assessment
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-900 font-bold">×</button>
          </div>
        )}

        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <List className="w-5 h-5 text-slate-600" />
              <div>
                <div className="text-sm font-semibold text-slate-900">Modelli questionario</div>
                <div className="text-xs text-slate-500">Seleziona o crea un modello (231, GDPR, ecc.)</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Seleziona modello</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} {model.attivo ? '' : '(disattivo)'}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateModel}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              >
                <Plus className="w-4 h-4" />
                Nuovo modello
              </button>
              {selectedModelId && (
                <>
                  <button
                    onClick={() => {
                      const model = models.find((m) => m.id === selectedModelId);
                      if (model) handleEditModel(model);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifica
                  </button>
                  {models.find((m) => m.id === selectedModelId)?.code !== 'preassessment' && (
                    <button
                      onClick={() => handleDeleteModel(selectedModelId)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Elimina
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MACRO AREAS COLUMN */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-600" />
                Macro-Aree
              </h2>
              <button
                onClick={handleCreateMacro}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Aggiungi macro-area"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {macroAreas.map((macro) => (
                <div
                  key={macro.id}
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                    selectedMacro === macro.id
                      ? 'bg-indigo-50 border-2 border-indigo-500'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedMacro(macro.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: macro.color }}
                      />
                      <div>
                        <div className="font-medium text-sm">{macro.label}</div>
                        <div className="text-xs text-gray-500">{macro.code}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMacro(macro);
                        }}
                        className="p-1 text-gray-600 hover:text-indigo-600 hover:bg-white rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMacro(macro.id);
                        }}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-white rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTIONS COLUMN */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Sezioni
              </h2>
              <button
                onClick={handleCreateSection}
                disabled={!selectedMacro}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Aggiungi sezione"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {!selectedMacro && (
                <div className="p-8 text-center text-gray-400">
                  Seleziona una macro-area
                </div>
              )}
              {selectedMacro && sections.map((section) => (
                <div
                  key={section.id}
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                    selectedSection === section.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-sm">{section.title}</div>
                        <div className="text-xs text-gray-500">{section.code}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSection(section);
                        }}
                        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-white rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id);
                        }}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-white rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FIELDS COLUMN */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-green-600" />
                Domande
              </h2>
              <button
                onClick={handleCreateField}
                disabled={!selectedSection}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Aggiungi domanda"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {!selectedSection && (
                <div className="p-8 text-center text-gray-400">
                  Seleziona una sezione
                </div>
              )}
              {selectedSection && fields.map((field) => (
                <div
                  key={field.id}
                  className="p-3 mb-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{field.label}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                          <span>{field.fieldId}</span>
                          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">{field.type}</span>
                          {field.required && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">required</span>
                          )}
                        </div>
                        {field.help && (
                          <div className="text-xs text-blue-600 mt-1 flex items-start gap-1">
                            <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{field.help}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditField(field)}
                        className="p-1 text-gray-600 hover:text-green-600 hover:bg-white rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-white rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* EDIT MODAL */}
        {(editingModel || editingMacro || editingSection || editingField) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">
                    {editingModel && (editingModel.id ? 'Modifica Modello' : 'Nuovo Modello')}
                    {editingMacro && (editingMacro.id ? 'Modifica Macro-Area' : 'Nuova Macro-Area')}
                    {editingSection && (editingSection.id ? 'Modifica Sezione' : 'Nuova Sezione')}
                    {editingField && (editingField.id ? 'Modifica Domanda' : 'Nuova Domanda')}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingModel(null);
                      setEditingMacro(null);
                      setEditingSection(null);
                      setEditingField(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* MODEL FORM */}
                {editingModel && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
                      <input
                        type="text"
                        value={editingModel.code}
                        onChange={(e) => setEditingModel({ ...editingModel, code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        placeholder="es: preassessment, 231, gdpr"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                      <input
                        type="text"
                        value={editingModel.label}
                        onChange={(e) => setEditingModel({ ...editingModel, label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        placeholder="es: Modello 231"
                        maxLength={150}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                      <textarea
                        value={editingModel.description || ''}
                        onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descrizione del modello"
                      />
                    </div>
                    {editingModel.id && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="model-active"
                          checked={editingModel.attivo ?? true}
                          onChange={(e) => setEditingModel({ ...editingModel, attivo: e.target.checked })}
                          className="w-4 h-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500"
                        />
                        <label htmlFor="model-active" className="text-sm font-medium text-gray-700">
                          Modello attivo
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* MACRO AREA FORM */}
                {editingMacro && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
                      <input
                        type="text"
                        value={editingMacro.code}
                        onChange={(e) => setEditingMacro({ ...editingMacro, code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="es: a, b, c..."
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                      <input
                        type="text"
                        value={editingMacro.label}
                        onChange={(e) => setEditingMacro({ ...editingMacro, label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="es: Identità e Struttura"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Colore *</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingMacro.color}
                          onChange={(e) => setEditingMacro({ ...editingMacro, color: e.target.value })}
                          className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editingMacro.color}
                          onChange={(e) => setEditingMacro({ ...editingMacro, color: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="#6366f1"
                          maxLength={7}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                      <input
                        type="number"
                        value={editingMacro.sortOrder}
                        onChange={(e) => setEditingMacro({ ...editingMacro, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        min={0}
                      />
                    </div>
                  </div>
                )}

                {/* SECTION FORM */}
                {editingSection && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
                      <input
                        type="text"
                        value={editingSection.code}
                        onChange={(e) => setEditingSection({ ...editingSection, code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="es: a_1, b_2..."
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
                      <input
                        type="text"
                        value={editingSection.title}
                        onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="es: Anagrafica Societaria"
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                      <textarea
                        value={editingSection.description}
                        onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                      <input
                        type="number"
                        value={editingSection.sortOrder}
                        onChange={(e) => setEditingSection({ ...editingSection, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={0}
                      />
                    </div>
                  </div>
                )}

                {/* FIELD FORM */}
                {editingField && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Field ID *</label>
                      <input
                        type="text"
                        value={editingField.fieldId}
                        onChange={(e) => setEditingField({ ...editingField, fieldId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="es: ragione_sociale"
                        maxLength={100}
                      />
                      <p className="text-xs text-gray-500 mt-1">ID univoco del campo (snake_case)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                      <input
                        type="text"
                        value={editingField.label}
                        onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="es: Ragione sociale"
                        maxLength={300}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                      <select
                        value={editingField.type}
                        onChange={(e) => setEditingField({ ...editingField, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                        <option value="radio">Radio</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="date">Date</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="tel">Tel</option>
                      </select>
                    </div>
                    {(editingField.type === 'select' || editingField.type === 'radio' || editingField.type === 'checkbox') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Opzioni</label>
                        <textarea
                          value={editingField.options}
                          onChange={(e) => setEditingField({ ...editingField, options: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          rows={5}
                          placeholder="Un'opzione per riga"
                        />
                        <p className="text-xs text-gray-500 mt-1">Un'opzione per riga</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="required"
                        checked={editingField.required}
                        onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="required" className="text-sm font-medium text-gray-700">Campo obbligatorio</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        Testo di aiuto (tooltip con "?")
                      </label>
                      <textarea
                        value={editingField.help}
                        onChange={(e) => setEditingField({ ...editingField, help: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows={3}
                        placeholder="Testo che apparirà nel tooltip quando l'utente passa il mouse sul punto di domanda"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                      <input
                        type="number"
                        value={editingField.sortOrder}
                        onChange={(e) => setEditingField({ ...editingField, sortOrder: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min={0}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => {
                      setEditingModel(null);
                      setEditingMacro(null);
                      setEditingSection(null);
                      setEditingField(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annulla
                  </button>
                  <button
                    onClick={() => {
                      if (editingModel) handleSaveModel();
                      if (editingMacro) handleSaveMacro();
                      if (editingSection) handleSaveSection();
                      if (editingField) handleSaveField();
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
