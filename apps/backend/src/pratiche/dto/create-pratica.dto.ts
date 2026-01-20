// src/pratiche/dto/create-pratica.dto.ts
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  IsDateString,
  IsBoolean,
  Min,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  EsitoPratica,
  EsitoOpposizione,
  EsitoPignoramento,
  TipoPignoramento,
} from '../pratica.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

class OpposizioneDto {
  @IsOptional()
  @IsIn(['rigetto', 'accoglimento_parziale', 'accoglimento_totale'])
  esito?: EsitoOpposizione;

  @IsOptional()
  @IsDateString()
  dataEsito?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  note?: string;
}

class PignoramentoDto {
  @IsOptional()
  @IsIn(['mobiliare_debitore', 'mobiliare_terzi', 'immobiliare'])
  tipo?: TipoPignoramento;

  @IsOptional()
  @IsDateString()
  dataNotifica?: string;

  @IsOptional()
  @IsIn(['iscrizione_a_ruolo', 'desistenza', 'opposizione'])
  esito?: EsitoPignoramento;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  note?: string;
}

export class CreatePraticaDto {
  // --- Relazioni obbligatorie ---

  @IsUUID()
  @IsNotEmpty()
  clienteId: string;

  @IsUUID()
  @IsNotEmpty()
  debitoreId: string;

  @IsOptional()
  @IsUUID()
  studioId?: string | null;

  // --- Avvocati associati (opzionale) ---

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  avvocatiIds?: string[];

  // --- Collaboratori associati (opzionale) ---

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  collaboratoriIds?: string[];

  // --- Fase (opzionale, se non specificato usa la prima fase disponibile) ---

  @IsOptional()
  @IsString()
  faseId?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  numeroPratica?: string;

  @IsOptional()
  @IsBoolean()
  aperta?: boolean;

  @IsOptional()
  @IsIn(['positivo', 'negativo', null])
  esito?: EsitoPratica;

  // --- Importi finanziari ---

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  capitale?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  importoRecuperatoCapitale?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  anticipazioni?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  importoRecuperatoAnticipazioni?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  compensiLegali?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  compensiLiquidati?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  interessi?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  interessiRecuperati?: number;

  // --- Calcolo automatico interessi ---

  @IsOptional()
  @IsBoolean()
  applicaInteressi?: boolean;

  @IsOptional()
  @IsIn(['legale', 'moratorio', 'fisso'])
  tipoInteresse?: 'legale' | 'moratorio' | 'fisso' | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tassoInteresse?: number | null;

  @IsOptional()
  @IsDateString()
  dataInizioInteressi?: string | null;

  @IsOptional()
  @IsDateString()
  dataFineMaturazione?: string | null;

  @IsOptional()
  @IsBoolean()
  moratorioPre2013?: boolean;

  @IsOptional()
  @IsBoolean()
  moratorioMaggiorazione?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  moratorioPctMaggiorazione?: number | null;

  // --- Note e riferimenti ---

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  note?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  noteFase?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  riferimentoCredito?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OpposizioneDto)
  opposizione?: OpposizioneDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PignoramentoDto)
  pignoramento?: PignoramentoDto;

  // --- Date ---

  @IsOptional()
  @IsDateString()
  dataAffidamento?: string;

  @IsOptional()
  @IsDateString()
  dataChiusura?: string;

  @IsOptional()
  @IsDateString()
  dataScadenza?: string;
}
