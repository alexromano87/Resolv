import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ChiudiPianoDto {
  @IsEnum(['positivo', 'negativo'])
  esito: 'positivo' | 'negativo';

  @IsOptional()
  @IsString()
  note?: string;
}
