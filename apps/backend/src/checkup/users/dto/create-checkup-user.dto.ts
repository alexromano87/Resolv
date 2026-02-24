import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCheckupUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  password: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  cognome: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsEnum(['admin_studio', 'segreteria', 'collaboratore', 'cliente'])
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';

  @IsOptional()
  @IsString()
  studioId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  sublicenseId?: string;

  @IsOptional()
  @IsString()
  azienda?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  macroAreaOwner?: string[];
}
