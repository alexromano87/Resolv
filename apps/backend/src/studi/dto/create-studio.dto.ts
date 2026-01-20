import { IsString, IsOptional, IsEmail, IsNotEmpty } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class CreateStudioDto {
  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  nome: string;

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
}
