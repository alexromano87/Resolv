// src/debitori/dto/create-debitore.dto.ts
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsUUID,
} from 'class-validator';
import type { TipoSoggetto, TipologiaAzienda } from '../debitore.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class CreateDebitoreDto {
  @IsOptional()
  @IsUUID()
  studioId?: string | null;

  @IsIn(['persona_fisica', 'persona_giuridica'])
  @IsNotEmpty()
  tipoSoggetto: TipoSoggetto;

  // --- PF ---

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  nome?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  cognome?: string;

  @IsOptional()
  @IsString()
  @Length(11, 16)
  @NoSpecialChars()
  codiceFiscale?: string;

  @IsOptional()
  @IsDateString()
  dataNascita?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  luogoNascita?: string;

  // --- PG ---

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  ragioneSociale?: string;

  @IsOptional()
  @IsString()
  @Length(11, 11)
  @NoSpecialChars()
  partitaIva?: string;

  @IsOptional()
  @IsIn([
    'impresa_individuale',
    'impresa_individuale_agricola',
    'srl',
    'spa',
    'scpa',
    'srl_agricola',
    'snc',
    'sas',
  ] as TipologiaAzienda[])
  tipologia?: TipologiaAzienda;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  sedeLegale?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  sedeOperativa?: string;

  // --- Indirizzo / contatti comuni ---

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  indirizzo?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  cap?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  citta?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  provincia?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  nazione?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  referente?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEmail()
  pec?: string;

  // --- Clienti collegati ---

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clientiIds?: string[];
}
