// apps/backend/src/avvocati/create-avvocato.dto.ts
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsUUID,
} from 'class-validator';
import type {
  LivelloAccessoPratiche,
  LivelloPermessi,
} from './avvocato.entity';
import { NoSpecialChars } from '../common/validators/no-special-chars.decorator';

export class CreateAvvocatoDto {
  @IsOptional()
  @IsUUID()
  studioId?: string | null;

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  @NoSpecialChars()
  nome: string;

  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  @NoSpecialChars()
  cognome: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  @NoSpecialChars()
  codiceFiscale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @NoSpecialChars()
  telefono?: string;

  @IsOptional()
  @IsEnum(['solo_proprie', 'tutte'])
  livelloAccessoPratiche?: LivelloAccessoPratiche;

  @IsOptional()
  @IsEnum(['visualizzazione', 'modifica'])
  livelloPermessi?: LivelloPermessi;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  note?: string;
}
