// apps/backend/src/users/dto/update-user.dto.ts
import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsUUID, IsBoolean, MaxLength } from 'class-validator';
import type { UserRole, LivelloAccessoPratiche, LivelloPermessi } from '../user.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class UpdateUserDto {
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

  @IsEnum(['admin', 'titolare_studio', 'avvocato', 'collaboratore', 'segreteria', 'cliente'])
  @IsOptional()
  ruolo?: UserRole;

  @IsUUID()
  @IsOptional()
  clienteId?: string | null;

  @IsUUID()
  @IsOptional()
  studioId?: string | null;

  @IsBoolean()
  @IsOptional()
  attivo?: boolean;
}
