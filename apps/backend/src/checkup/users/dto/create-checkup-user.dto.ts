import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCheckupUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // Password richiesta per i nuovi utenti; opzionale quando si associa
  // un'utenza già esistente (associateExisting=true), che mantiene la propria.
  @IsOptional()
  @IsString()
  @MinLength(12)
  password?: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  cognome: string;

  @IsOptional()
  @IsString()
  titolo?: string;

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
  anagraficaId?: string;

  @IsOptional()
  @IsString()
  azienda?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  macroAreaOwner?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  macroAreaAssignments?: string[];

  @IsOptional()
  @IsBoolean()
  superOwner?: boolean;

  // Se true e l'email corrisponde a un utente esistente, riusa quell'identità
  // creando una nuova appartenenza (ruolo/contesto) invece di una nuova utenza.
  @IsOptional()
  @IsBoolean()
  associateExisting?: boolean;
}
