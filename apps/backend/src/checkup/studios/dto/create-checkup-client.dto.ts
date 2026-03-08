import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateCheckupClientDto {
  @ValidateIf((o) => !o.ragioneSociale)
  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  sublicenseId: string;

  @ValidateIf((o) => !o.nome)
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
}
