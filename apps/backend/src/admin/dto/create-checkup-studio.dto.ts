import { IsArray, IsIn, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** Utenza esistente da importare nel nuovo studio come appartenenza + anagrafica. */
export class ImportStudioUserDto {
  @IsUUID()
  userId: string;

  @IsIn(['admin_studio', 'segreteria', 'collaboratore'])
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore';
}

export class CreateCheckupStudioDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsOptional()
  @IsIn(['licenziatario', 'cliente'])
  tipo?: 'licenziatario' | 'cliente';

  @IsOptional()
  @IsString()
  ragioneSociale?: string;

  @IsOptional()
  @IsString()
  partitaIva?: string;

  @IsOptional()
  @IsString()
  codiceFiscale?: string;

  @IsOptional()
  @IsString()
  indirizzo?: string;

  @IsOptional()
  @IsString()
  citta?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  cap?: string;

  @IsOptional()
  @IsString()
  paese?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  sitoWeb?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  licenseId?: string;

  // Fase 1 — riuso anagrafica: id dell'entità di origine da cui sono stati
  // precompilati i dati societari. Se è uno studio, viene tracciato in linkedStudioId.
  @IsOptional()
  @IsString()
  sourceStudioId?: string;

  @IsOptional()
  @IsString()
  sourceClientId?: string;

  @IsOptional()
  @IsString()
  sourceAnagraficaId?: string;

  // Utenze esistenti (dell'azienda sorgente) da importare nel nuovo studio:
  // per ciascuna viene creata un'appartenenza (stessa identità/credenziali) e
  // un'anagrafica licenziatario collegata.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportStudioUserDto)
  importUsers?: ImportStudioUserDto[];
}
