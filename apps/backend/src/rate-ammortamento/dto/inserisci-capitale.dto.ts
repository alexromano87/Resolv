import { IsOptional, IsString } from 'class-validator';

export class InserisciCapitaleDto {
  @IsOptional()
  @IsString()
  note?: string;
}
