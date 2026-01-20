// src/pratiche/dto/cambia-fase.dto.ts
import { IsIn, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import type { EsitoPratica } from '../pratica.entity';
import { NoSpecialChars } from '../../common/validators/no-special-chars.decorator';

export class CambiaFaseDto {
  @IsString()
  @IsNotEmpty()
  nuovaFaseId: string;

  // Se la nuova fase è di chiusura, specificare l'esito
  @IsOptional()
  @IsIn(['positivo', 'negativo'])
  esito?: EsitoPratica;

  @IsOptional()
  @IsString()
  @NoSpecialChars()
  note?: string;
}
