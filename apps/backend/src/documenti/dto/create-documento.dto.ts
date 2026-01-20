// apps/backend/src/documenti/dto/create-documento.dto.ts
import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsNotEmpty } from 'class-validator';
import type { TipoDocumento, TipologiaDocumento } from '../documento.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class CreateDocumentoDto {
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

  @IsString()
  percorsoFile: string;

  @IsString()
  @NoSpecialChars()
  nomeOriginale: string;

  @IsString()
  estensione: string;

  @IsEnum(['pdf', 'word', 'excel', 'immagine', 'csv', 'xml', 'altro'])
  tipo: TipoDocumento;

  @IsOptional()
  @IsEnum(['Cliente', 'Stragiudiziale', 'Ingiunzione', 'Esecuzione', 'Pagamenti', 'Altro'])
  tipologia?: TipologiaDocumento;

  @IsNumber()
  dimensione: number;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  caricatoDa?: string;

  @IsOptional()
  @IsUUID()
  praticaId?: string;

  @IsOptional()
  @IsUUID()
  cartellaId?: string;
}
