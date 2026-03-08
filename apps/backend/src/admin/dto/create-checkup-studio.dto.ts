import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

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
}
