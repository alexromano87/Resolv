// apps/backend/src/cartelle/dto/update-cartella.dto.ts
import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';
import type { TipologiaCartella } from '../cartella.entity';

export class UpdateCartellaDto {
  @IsOptional()
  @IsString()
  @NoSpecialChars()
  nome?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  descrizione?: string;

  @IsOptional()
  @IsString()
  colore?: string;

  @IsOptional()
  @IsEnum(['Cliente', 'Stragiudiziale', 'Ingiunzione', 'Esecuzione', 'Pagamenti', 'Altro'])
  tipologia?: TipologiaCartella | null;

  @IsOptional()
  @IsUUID()
  cartellaParentId?: string;
}
