import { IsString, IsOptional, IsEmail, IsNotEmpty, IsEnum, IsInt, Min, MinLength } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class ProvisionStudioDto {
  // Studio fields
  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  nome: string;

  @IsEnum(['individuale', 'associato', 'societa_tra_professionisti'])
  tipologia: 'individuale' | 'associato' | 'societa_tra_professionisti';

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

  // Admin user fields
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  adminNome: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  adminCognome: string;

  @IsOptional()
  @MinLength(6)
  adminPassword?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  adminTelefono?: string | null;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  adminCodiceFiscale?: string | null;
}
