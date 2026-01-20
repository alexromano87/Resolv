// apps/backend/src/documenti/dto/update-documento.dto.ts
import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';
import type { TipologiaDocumento } from '../documento.entity';

export class UpdateDocumentoDto {
  @IsOptional()
  @IsString()
  @NoSpecialChars()
  nome?: string;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  descrizione?: string;

  @IsOptional()
  @IsUUID()
  cartellaId?: string | null;

  @IsOptional()
  @IsEnum(['Cliente', 'Stragiudiziale', 'Ingiunzione', 'Esecuzione', 'Pagamenti', 'Altro'])
  tipologia?: TipologiaDocumento | null;
}
