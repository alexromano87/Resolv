// apps/backend/src/users/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsUUID, MaxLength } from 'class-validator';
import type { UserRole, LivelloAccessoPratiche, LivelloPermessi } from '../user.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

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

  @IsEnum(['admin', 'titolare_studio', 'avvocato', 'collaboratore', 'segreteria', 'cliente'])
  ruolo: UserRole;

  @IsOptional()
  @IsUUID()
  clienteId?: string | null;

  @IsOptional()
  @IsUUID()
  studioId?: string | null;
}
