import {
  IsUUID,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  ValidateIf
} from 'class-validator';

export class CreatePianoAmmortamentoDto {
  @IsUUID()
  praticaId: string;

  @IsNumber()
  @Min(0)
  capitaleIniziale: number;

  @IsInt()
  @Min(1)
  numeroRate: number;

  @IsDateString()
  dataInizioRate: string;

  @IsOptional()
  @IsString()
  note?: string;

  // ============================================
  // CAMPI PER GESTIONE INTERESSI
  // ============================================

  @IsOptional()
  @IsBoolean()
  applicaInteressi?: boolean;

  @ValidateIf((o) => o.applicaInteressi === true)
  @IsEnum(['legale', 'moratorio', 'fisso'])
  tipoInteresse?: 'legale' | 'moratorio' | 'fisso';

  @ValidateIf((o) => o.applicaInteressi === true)
  @IsNumber()
  @Min(0)
  @Max(100)
  tassoInteresse?: number;

  @ValidateIf((o) => o.applicaInteressi === true)
  @IsEnum(['italiano', 'francese'])
  tipoAmmortamento?: 'italiano' | 'francese';

  @ValidateIf((o) => o.applicaInteressi === true)
  @IsEnum(['nessuna', 'trimestrale', 'semestrale', 'annuale'])
  capitalizzazione?: 'nessuna' | 'trimestrale' | 'semestrale' | 'annuale';

  @ValidateIf((o) => o.applicaInteressi === true)
  @IsDateString()
  dataInizioInteressi?: string;

  @IsOptional()
  @IsBoolean()
  moratorioPre2013?: boolean;

  @IsOptional()
  @IsBoolean()
  moratorioMaggiorazione?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  moratorioPctMaggiorazione?: number;

  @IsOptional()
  @IsBoolean()
  applicaArt1194?: boolean;
}
