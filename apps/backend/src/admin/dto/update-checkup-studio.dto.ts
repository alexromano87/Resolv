import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateCheckupStudioDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEnum(['licenziatario', 'cliente'])
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
  @IsEmail()
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

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  keepUserIds?: string[];
}
