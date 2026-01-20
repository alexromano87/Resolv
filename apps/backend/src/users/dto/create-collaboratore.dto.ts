import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength, IsEnum, MaxLength } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';
import type { LivelloAccessoPratiche, LivelloPermessi } from '../user.entity';

export class CreateCollaboratoreDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  nome: string;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  cognome: string;

  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsUUID()
  studioId?: string | null;
}
