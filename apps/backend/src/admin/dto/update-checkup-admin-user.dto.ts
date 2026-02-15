import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateCheckupAdminUserDto {
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
  @IsUUID()
  studioId?: string;

  @IsOptional()
  @IsBoolean()
  attivo?: boolean;
}
