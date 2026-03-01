import { IsArray, IsDateString, IsInt, IsOptional, IsString, Min, MinLength, IsUUID } from 'class-validator';

export class CreateCheckupLicenseDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  studioId?: string;

  @IsOptional()
  @IsUUID()
  modelId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  modelIds?: string[];

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

  @IsDateString()
  dataInizioValidita: string;

  @IsDateString()
  dataScadenza: string;
}
