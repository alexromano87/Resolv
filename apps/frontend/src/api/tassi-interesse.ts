import { api } from './config';

export interface TassoInteresse {
  id: string;
  tipo: 'legale' | 'moratorio';
  tassoPercentuale: number;
  dataInizioValidita: string;
  dataFineValidita: string | null;
  decretoRiferimento: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTassoInteresseDto {
  tipo: 'legale' | 'moratorio';
  tassoPercentuale: number;
  dataInizioValidita: string;
  dataFineValidita?: string | null;
  decretoRiferimento?: string;
  note?: string;
}

export interface UpdateTassoInteresseDto {
  tipo?: 'legale' | 'moratorio';
  tassoPercentuale?: number;
  dataInizioValidita?: string;
  dataFineValidita?: string | null;
  decretoRiferimento?: string;
  note?: string;
}

// ============================================================================
// Automatic Fetch Interfaces
// ============================================================================

export type SourceType = 'banca-italia' | 'mef' | 'normattiva' | 'avvocato-andreani';
export type FetchedRateStatus = 'auto-saved' | 'needs-approval' | 'skipped' | 'error';

export interface FetchedRateData {
  tipo: 'legale' | 'moratorio';
  tassoPercentuale: number;
  dataInizioValidita: string;
  dataFineValidita?: string | null;
  decretoRiferimento?: string;
  note?: string;
  source: SourceType;
  sourceUrl: string;
  fetchedAt: string;
  isReliable: boolean;
  calculationDetails?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingRateId?: string;
  existingRate?: {
    id: string;
    tipo: 'legale' | 'moratorio';
    tassoPercentuale: number;
    dataInizioValidita: string;
    dataFineValidita?: string | null;
    decretoRiferimento?: string | null;
    note?: string | null;
  };
  reason?: string;
}

export interface FetchedRateWithStatus {
  data: FetchedRateData;
  validation: ValidationResult;
  duplicateCheck: DuplicateCheckResult;
  status: FetchedRateStatus;
  savedTassoId?: string;
}

export interface FetchError {
  source: string;
  message: string;
  url?: string;
}

export interface FetchTassiResultDto {
  totalFetched: number;
  autoSaved: number;
  needsApproval: number;
  skipped: number;
  errors: number;
  rates: FetchedRateWithStatus[];
  fetchErrors: FetchError[];
  fetchedAt: string;
}

export const tassiInteresseApi = {
  /**
   * Recupera tutti i tassi di interesse
   */
  getAll: async (): Promise<TassoInteresse[]> => {
    return await api.get<TassoInteresse[]>('/tassi-interesse');
  },

  /**
   * Recupera un tasso per ID
   */
  getById: async (id: string): Promise<TassoInteresse> => {
    return await api.get<TassoInteresse>(`/tassi-interesse/${id}`);
  },

  /**
   * Recupera tassi per tipo (legale/moratorio)
   */
  getByTipo: async (tipo: 'legale' | 'moratorio'): Promise<TassoInteresse[]> => {
    return await api.get<TassoInteresse[]>(`/tassi-interesse/by-tipo/${tipo}`);
  },

  /**
   * Recupera i tassi attualmente validi
   */
  getCurrentRates: async (): Promise<TassoInteresse[]> => {
    return await api.get<TassoInteresse[]>('/tassi-interesse/current');
  },

  /**
   * Crea un nuovo tasso
   */
  create: async (dto: CreateTassoInteresseDto): Promise<TassoInteresse> => {
    return await api.post<TassoInteresse>('/tassi-interesse', dto);
  },

  /**
   * Aggiorna un tasso esistente
   */
  update: async (id: string, dto: UpdateTassoInteresseDto): Promise<TassoInteresse> => {
    return await api.patch<TassoInteresse>(`/tassi-interesse/${id}`, dto);
  },

  /**
   * Elimina un tasso
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/tassi-interesse/${id}`);
  },

  /**
   * Recupera automaticamente i tassi correnti da fonti esterne
   * Trigger manuale (admin only)
   */
  fetchCurrentRates: async (): Promise<FetchTassiResultDto> => {
    return await api.post<FetchTassiResultDto>('/tassi-interesse/fetch');
  },

  /**
   * Approva e salva un tasso recuperato che richiede conferma manuale
   * Admin only
   */
  approveFetchedRate: async (rate: FetchedRateData, adminNote?: string): Promise<TassoInteresse> => {
    return await api.post<TassoInteresse>('/tassi-interesse/approve', {
      rate,
      adminNote,
    });
  },

  /**
   * Sovrascrive un tasso duplicato con i dati recuperati
   * Admin only
   */
  overwriteFetchedRate: async (rate: FetchedRateData, existingRateId: string, adminNote?: string): Promise<TassoInteresse> => {
    return await api.post<TassoInteresse>('/tassi-interesse/overwrite', {
      rate,
      existingRateId,
      adminNote,
    });
  },
};
