import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length, IsUUID } from 'class-validator';
import type { TipologiaAzienda, TipoSoggetto } from '../cliente.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class CreateClienteDto {
  @IsOptional()
  @IsUUID()
  studioId?: string | null;

  @IsOptional()
  @IsIn(['persona_fisica', 'persona_giuridica'])
  tipoSoggetto?: TipoSoggetto;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  ragioneSociale: string;

  @IsOptional()
  @IsString()
  @Length(11, 16)
  @NoSpecialChars()
  codiceFiscale?: string;

  @IsOptional()
  @IsString()
  @Length(11, 11)
  @NoSpecialChars()
  partitaIva?: string;

  // --- Sedi ---

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  sedeLegale?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  sedeOperativa?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  indirizzo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5)
  @NoSpecialChars()
  cap?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  citta?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2)
  @NoSpecialChars()
  provincia?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  nazione?: string;

  // --- Tipologia / referente ---

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
  ])
  tipologia?: TipologiaAzienda;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  referente?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  referenteNome?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  referenteCognome?: string;

  @IsOptional()
  @IsEmail()
  referenteEmail?: string;

  // --- Contatti ---

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  telefono?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsEmail()
  pec?: string;
}
