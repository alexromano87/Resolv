import { IsString, IsOptional, IsEmail, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class UpdateStudioDto {
  @IsString()
  @IsOptional()
  @NoSpecialChars()
  nome?: string;

  @IsEnum(['individuale', 'associato', 'societa_tra_professionisti'])
  @IsOptional()
  tipologia?: 'individuale' | 'associato' | 'societa_tra_professionisti';

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUtenti?: number | null;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  ragioneSociale?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  partitaIva?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  codiceFiscale?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  indirizzo?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  citta?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  cap?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  provincia?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEmail()
  @IsOptional()
  pec?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsBoolean()
  @IsOptional()
  attivo?: boolean;
}
