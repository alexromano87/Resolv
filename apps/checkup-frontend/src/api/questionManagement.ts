import { api } from './config';

// Types
export interface MacroArea {
  id: number;
  code: string;
  label: string;
  color: string;
  sortOrder: number;
  modelId: string;
  sections?: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionModel {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  attivo: boolean;
  status: 'draft' | 'published' | 'archived';
  version: number;
  parentModelId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: number;
  code: string;
  title: string;
  description?: string;
  sortOrder: number;
  macroAreaId: number;
  macroArea?: MacroArea;
  fields?: Field[];
  createdAt: string;
  updatedAt: string;
}

export interface Field {
  id: number;
  fieldId: string;
  label: string;
  type: string;
  options?: string[];
  required: boolean;
  help?: string;
  allowDocuments?: boolean;
  weight?: number;
  sortOrder: number;
  sectionId: number;
  section?: Section;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMacroAreaDto {
  modelId: string;
  code: string;
  label: string;
  color: string;
  sortOrder?: number;
}

export interface UpdateMacroAreaDto {
  modelId?: string;
  code?: string;
  label?: string;
  color?: string;
  sortOrder?: number;
}

export interface CreateQuestionModelDto {
  code: string;
  label: string;
  description?: string;
}

export interface UpdateQuestionModelDto {
  code?: string;
  label?: string;
  description?: string;
  attivo?: boolean;
}

export interface CreateSectionDto {
  code: string;
  title: string;
  description?: string;
  macroAreaId: number;
  sortOrder?: number;
}

export interface UpdateSectionDto {
  code?: string;
  title?: string;
  description?: string;
  macroAreaId?: number;
  sortOrder?: number;
}

export interface CreateFieldDto {
  fieldId: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  help?: string;
  sectionId: number;
  sortOrder?: number;
}

export interface UpdateFieldDto {
  fieldId?: string;
  label?: string;
  type?: string;
  options?: string[];
  required?: boolean;
  help?: string;
  sectionId?: number;
  sortOrder?: number;
}

// API Methods

// Complete Structure
export const getCompleteStructure = async (modelId?: string): Promise<MacroArea[]> => {
  return api.get(
    '/checkup/question-management/structure',
    modelId ? { modelId } : undefined
  );
};

export const getModels = async (): Promise<QuestionModel[]> => {
  return api.get('/checkup/question-management/models');
};

export const createModel = async (data: CreateQuestionModelDto): Promise<QuestionModel> => {
  return api.post('/checkup/question-management/models', data);
};

export const updateModel = async (id: string, data: UpdateQuestionModelDto): Promise<QuestionModel> => {
  return api.put(`/checkup/question-management/models/${id}`, data);
};

export const deleteModel = async (id: string): Promise<void> => {
  await api.delete(`/checkup/question-management/models/${id}`);
};

export const publishModel = async (id: string): Promise<QuestionModel> => {
  return api.post(`/checkup/question-management/models/${id}/publish`, {});
};

export const archiveModel = async (id: string): Promise<QuestionModel> => {
  return api.post(`/checkup/question-management/models/${id}/archive`, {});
};

export const createNewModelVersion = async (id: string): Promise<QuestionModel> => {
  return api.post(`/checkup/question-management/models/${id}/new-version`, {});
};

// Macro Areas
export const getAllMacroAreas = async (modelId?: string): Promise<MacroArea[]> => {
  return api.get('/checkup/question-management/macro-areas', modelId ? { modelId } : undefined);
};

export const getMacroAreaById = async (id: number): Promise<MacroArea> => {
  return api.get(`/checkup/question-management/macro-areas/${id}`);
};

export const createMacroArea = async (data: CreateMacroAreaDto): Promise<MacroArea> => {
  return api.post('/checkup/question-management/macro-areas', data);
};

export const updateMacroArea = async (id: number, data: UpdateMacroAreaDto): Promise<MacroArea> => {
  return api.put(`/checkup/question-management/macro-areas/${id}`, data);
};

export const deleteMacroArea = async (id: number): Promise<void> => {
  await api.delete(`/checkup/question-management/macro-areas/${id}`);
};

// Sections
export const getAllSections = async (): Promise<Section[]> => {
  return api.get('/checkup/question-management/sections');
};

export const getSectionById = async (id: number): Promise<Section> => {
  return api.get(`/checkup/question-management/sections/${id}`);
};

export const getSectionsByMacroArea = async (macroAreaId: number): Promise<Section[]> => {
  return api.get(`/checkup/question-management/sections/by-macro/${macroAreaId}`);
};

export const createSection = async (data: CreateSectionDto): Promise<Section> => {
  return api.post('/checkup/question-management/sections', data);
};

export const updateSection = async (id: number, data: UpdateSectionDto): Promise<Section> => {
  return api.put(`/checkup/question-management/sections/${id}`, data);
};

export const deleteSection = async (id: number): Promise<void> => {
  await api.delete(`/checkup/question-management/sections/${id}`);
};

// Fields
export const getAllFields = async (): Promise<Field[]> => {
  return api.get('/checkup/question-management/fields');
};

export const getFieldById = async (id: number): Promise<Field> => {
  return api.get(`/checkup/question-management/fields/${id}`);
};

export const getFieldsBySection = async (sectionId: number): Promise<Field[]> => {
  return api.get(`/checkup/question-management/fields/by-section/${sectionId}`);
};

export const createField = async (data: CreateFieldDto): Promise<Field> => {
  return api.post('/checkup/question-management/fields', data);
};

export const updateField = async (id: number, data: UpdateFieldDto): Promise<Field> => {
  return api.put(`/checkup/question-management/fields/${id}`, data);
};

export const deleteField = async (id: number): Promise<void> => {
  await api.delete(`/checkup/question-management/fields/${id}`);
};
