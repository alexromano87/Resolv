import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegistraPagamentoRataDto {
  @IsNotEmpty()
  @IsDateString()
  dataPagamento: string;

  @IsNotEmpty()
  @IsString()
  metodoPagamento: string;

  @IsOptional()
  @IsString()
  codicePagamento?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
