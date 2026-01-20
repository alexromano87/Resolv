// apps/backend/src/cartelle/dto/create-cartella.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';
import type { TipologiaCartella } from '../cartella.entity';

export class CreateCartellaDto {
  @IsOptional()
  @IsUUID()
  studioId?: string | null;

  @IsString()
  @IsNotEmpty()
  @NoSpecialChars()
  nome: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  descrizione?: string;

  @IsOptional()
  @IsString()
  colore?: string;

  @IsOptional()
  @IsEnum(['Cliente', 'Stragiudiziale', 'Ingiunzione', 'Esecuzione', 'Pagamenti', 'Altro'])
  tipologia?: TipologiaCartella;

  @IsOptional()
  @IsUUID()
  praticaId?: string;

  @IsOptional()
  @IsUUID()
  cartellaParentId?: string;
}
