import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCheckupSublicenseDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  licenseId: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsInt()
  @Min(1)
  numeroUtenze: number;

  @IsOptional()
  @IsDateString()
  dataInizioValidita?: string;

  @IsOptional()
  @IsDateString()
  dataScadenza?: string;

  @IsOptional()
  @IsBoolean()
  attiva?: boolean;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clienteStudioId?: string;
}
