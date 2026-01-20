import { IsBoolean, IsOptional, IsDateString, IsString } from 'class-validator';

export class UpdateRataDto {
  @IsOptional()
  @IsBoolean()
  pagata?: boolean;

  @IsOptional()
  @IsDateString()
  dataPagamento?: string | null;

  @IsOptional()
  @IsString()
  metodoPagamento?: string | null;

  @IsOptional()
  @IsString()
  codicePagamento?: string | null;

  @IsOptional()
  @IsString()
  ricevutaPath?: string | null;

  @IsOptional()
  @IsString()
  note?: string;
}
