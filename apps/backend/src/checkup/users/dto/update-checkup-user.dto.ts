import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import type { CheckupUserRole } from '../checkup-user.entity';

export class UpdateCheckupUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  cognome?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsIn(['admin_studio', 'segreteria', 'collaboratore', 'cliente'])
  ruolo?: CheckupUserRole;

  @IsOptional()
  @IsUUID()
  studioId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  sublicenseId?: string;

  @IsOptional()
  @IsString()
  azienda?: string;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;
}
