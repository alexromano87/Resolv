import { IsEmail, IsOptional, IsString, MinLength, IsUUID } from 'class-validator';

export class CreateCheckupAdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(1)
  nome: string;

  @IsString()
  @MinLength(1)
  cognome: string;

  @IsUUID()
  studioId: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}
