import { api } from './config';

// Types
export interface MacroArea {
  id: number;
  code: string;
  label: string;
  color: string;
  sortOrder: number;
  sections?: Section[];
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
  sortOrder: number;
  sectionId: number;
  section?: Section;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMacroAreaDto {
  code: string;
  label: string;
  color: string;
  sortOrder?: number;
}

export interface UpdateMacroAreaDto {
  code?: string;
  label?: string;
  color?: string;
  sortOrder?: number;
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
export const getCompleteStructure = async (): Promise<MacroArea[]> => {
  return api.get('/admin/checkup/questions/structure');
};

// Macro Areas
export const getAllMacroAreas = async (): Promise<MacroArea[]> => {
  return api.get('/admin/checkup/questions/macro-areas');
};

export const getMacroAreaById = async (id: number): Promise<MacroArea> => {
  return api.get(`/admin/checkup/questions/macro-areas/${id}`);
};

export const createMacroArea = async (data: CreateMacroAreaDto): Promise<MacroArea> => {
  return api.post('/admin/checkup/questions/macro-areas', data);
};

export const updateMacroArea = async (id: number, data: UpdateMacroAreaDto): Promise<MacroArea> => {
  return api.put(`/admin/checkup/questions/macro-areas/${id}`, data);
};

export const deleteMacroArea = async (id: number): Promise<void> => {
  await api.delete(`/admin/checkup/questions/macro-areas/${id}`);
};

// Sections
export const getAllSections = async (): Promise<Section[]> => {
  return api.get('/admin/checkup/questions/sections');
};

export const getSectionById = async (id: number): Promise<Section> => {
  return api.get(`/admin/checkup/questions/sections/${id}`);
};

export const getSectionsByMacroArea = async (macroAreaId: number): Promise<Section[]> => {
  return api.get(`/admin/checkup/questions/sections/by-macro/${macroAreaId}`);
};

export const createSection = async (data: CreateSectionDto): Promise<Section> => {
  return api.post('/admin/checkup/questions/sections', data);
};

export const updateSection = async (id: number, data: UpdateSectionDto): Promise<Section> => {
  return api.put(`/admin/checkup/questions/sections/${id}`, data);
};

export const deleteSection = async (id: number): Promise<void> => {
  await api.delete(`/admin/checkup/questions/sections/${id}`);
};

// Fields
export const getAllFields = async (): Promise<Field[]> => {
  return api.get('/admin/checkup/questions/fields');
};

export const getFieldById = async (id: number): Promise<Field> => {
  return api.get(`/admin/checkup/questions/fields/${id}`);
};

export const getFieldsBySection = async (sectionId: number): Promise<Field[]> => {
  return api.get(`/admin/checkup/questions/fields/by-section/${sectionId}`);
};

export const createField = async (data: CreateFieldDto): Promise<Field> => {
  return api.post('/admin/checkup/questions/fields', data);
};

export const updateField = async (id: number, data: UpdateFieldDto): Promise<Field> => {
  return api.put(`/admin/checkup/questions/fields/${id}`, data);
};

export const deleteField = async (id: number): Promise<void> => {
  await api.delete(`/admin/checkup/questions/fields/${id}`);
};
