import { IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCheckupLicenseDto {
  @IsString()
  studioId: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  intestatario?: string;

  @IsString()
  @MinLength(2)
  tipo: string;

  @IsInt()
  @Min(1)
  numeroUtenze: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  numeroSottolicenze?: number;

  @IsDateString()
  dataInizioValidita: string;

  @IsDateString()
  dataScadenza: string;
}
