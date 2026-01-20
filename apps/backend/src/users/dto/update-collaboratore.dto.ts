import { IsEmail, IsOptional, IsString, MinLength, IsEnum, MaxLength } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';
import type { LivelloAccessoPratiche, LivelloPermessi } from '../user.entity';

export class UpdateCollaboratoreDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  nome?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  cognome?: string;

  @IsString()
  @IsOptional()
  @NoSpecialChars()
  telefono?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  @NoSpecialChars()
  codiceFiscale?: string | null;

  @IsOptional()
  @IsEnum(['solo_proprie', 'tutte'])
  livelloAccessoPratiche?: LivelloAccessoPratiche;

  @IsOptional()
  @IsEnum(['visualizzazione', 'modifica'])
  livelloPermessi?: LivelloPermessi;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  note?: string | null;
}
