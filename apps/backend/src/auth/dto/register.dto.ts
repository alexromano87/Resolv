// apps/backend/src/auth/dto/register.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import type { UserRole } from '../../users/user.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class RegisterDto {
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

  @IsEnum(['admin', 'titolare_studio', 'avvocato', 'collaboratore', 'segreteria', 'cliente'])
  @IsOptional()
  ruolo?: UserRole;

  @IsUUID()
  @IsOptional()
  clienteId?: string | null;
}
