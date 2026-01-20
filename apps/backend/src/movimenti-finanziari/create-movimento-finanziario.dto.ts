// apps/backend/src/movimenti-finanziari/create-movimento-finanziario.dto.ts
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
  IsUUID,
  Min,
  IsBoolean,
} from 'class-validator';
import type { TipoMovimento } from './movimento-finanziario.entity';
import { NoSpecialChars } from '../common/validators/no-special-chars.decorator';

export class CreateMovimentoFinanziarioDto {
  @IsOptional()
  @IsUUID()
  studioId?: string | null;

  @IsUUID()
  praticaId: string;

  @IsEnum([
    'capitale',
    'capitale_originario',
    'nuovo_capitale',
    'anticipazione',
    'compenso',
    'interessi',
    'altro',
    'recupero_capitale',
    'recupero_anticipazione',
    'recupero_compenso',
    'recupero_interessi',
    'recupero_altro',
  ])
  tipo: TipoMovimento;

  @IsNumber()
  @Min(0)
  importo: number;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  oggetto?: string;

  @IsOptional()
  @IsBoolean()
  daFatturare?: boolean | null;

  @IsOptional()
  @IsBoolean()
  giaFatturato?: boolean | null;
}
