import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Tipo di fonte da cui è stato recuperato il tasso
 */
export type SourceType = 'banca-italia' | 'mef' | 'normattiva' | 'avvocato-andreani';

/**
 * Tipo di tasso di interesse
 */
export type TipoTasso = 'legale' | 'moratorio';

/**
 * Dati di un tasso recuperato da fonte esterna (prima della validazione)
 */
export interface FetchedRateData {
  tipo: TipoTasso;
  tassoPercentuale: number;
  dataInizioValidita: Date;
  dataFineValidita?: Date | null;
  decretoRiferimento?: string;
  note?: string;

  // Metadata sulla fonte
  source: SourceType;
  sourceUrl: string;
  fetchedAt: Date;
  isReliable: boolean; // true per API ufficiali, false per scraping
  calculationDetails?: string; // es. "Tasso BCE base + 8 punti percentuali"
}

/**
 * Risultato della validazione di un tasso recuperato
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Risultato del controllo duplicati
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingRateId?: string;
  existingRate?: {
    id: string;
    tipo: TipoTasso;
    tassoPercentuale: number;
    dataInizioValidita: Date;
    dataFineValidita?: Date | null;
    decretoRiferimento?: string | null;
    note?: string | null;
  };
  reason?: string;
}

/**
 * Status del tasso recuperato dopo validazione e controllo duplicati
 */
export type FetchedRateStatus = 'auto-saved' | 'needs-approval' | 'skipped' | 'error';

/**
 * Tasso recuperato con informazioni su validazione, duplicati e status
 */
export interface FetchedRateWithStatus {
  data: FetchedRateData;
  validation: ValidationResult;
  duplicateCheck: DuplicateCheckResult;
  status: FetchedRateStatus;
  savedTassoId?: string; // ID del tasso se salvato automaticamente
}

/**
 * Errore durante il fetch da una fonte
 */
export interface FetchError {
  source: string;
  message: string;
  url?: string;
}

/**
 * Risultato complessivo dell'operazione di fetch
 */
export class FetchTassiResultDto {
  // Statistiche sommarie
  totalFetched: number;
  autoSaved: number;
  needsApproval: number;
  skipped: number;
  errors: number;

  // Array di tassi recuperati con status
  rates: FetchedRateWithStatus[];

  // Errori durante il fetch dalle varie fonti
  fetchErrors: FetchError[];

  // Timestamp del fetch
  fetchedAt: Date;

  constructor() {
    this.totalFetched = 0;
    this.autoSaved = 0;
    this.needsApproval = 0;
    this.skipped = 0;
    this.errors = 0;
    this.rates = [];
    this.fetchErrors = [];
    this.fetchedAt = new Date();
  }
}

/**
 * DTO per approvare e salvare un tasso recuperato
 */
export class ApproveFetchedRateDto {
  @IsObject()
  rate: FetchedRateData;

  @IsOptional()
  @IsString()
  adminNote?: string; // Nota aggiuntiva dell'admin durante l'approvazione
}

/**
 * DTO per sovrascrivere un tasso duplicato
 */
export class OverwriteFetchedRateDto {
  @IsObject()
  rate: FetchedRateData;

  @IsString()
  existingRateId: string;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
