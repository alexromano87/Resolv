import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * Crea un nuovo studio licenziatario riusando l'anagrafica (dati societari) di
 * un'entità esistente — tipicamente un sublicenziatario (CheckupClient) che
 * acquista una licenza diretta (es. R&S Italy). Copia i dati e imposta
 * `linkedStudioId` per tracciare che è la stessa entità reale.
 */
export class CreateLicenseeFromSourceDto {
  /** Sorgente da cui copiare i dati societari (una sola tra le tre). */
  @IsOptional()
  @IsUUID()
  sourceClientId?: string;

  @IsOptional()
  @IsUUID()
  sourceStudioId?: string;

  @IsOptional()
  @IsUUID()
  sourceAnagraficaId?: string;

  /** Nome dello studio licenziatario (default: nome/ragione sociale della sorgente). */
  @IsOptional()
  @IsString()
  nome?: string;

  // ── Dati licenza ───────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  intestatario: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsInt()
  @Min(1)
  numeroUtenze: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numeroSottolicenze?: number;

  @IsOptional()
  @IsString()
  numeroLicenza?: string;

  @IsOptional()
  @IsString()
  dataInizioValidita?: string;

  @IsOptional()
  @IsString()
  dataScadenza?: string;
}
