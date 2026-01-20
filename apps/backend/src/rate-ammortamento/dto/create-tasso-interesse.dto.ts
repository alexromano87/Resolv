import { IsEnum, IsNumber, IsString, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class CreateTassoInteresseDto {
  @IsEnum(['legale', 'moratorio'])
  tipo: 'legale' | 'moratorio';

  @IsNumber()
  @Min(0)
  @Max(100)
  tassoPercentuale: number;

  @IsDateString()
  dataInizioValidita: string;

  @IsOptional()
  @IsDateString()
  dataFineValidita?: string | null;

  @IsOptional()
  @IsString()
  decretoRiferimento?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
