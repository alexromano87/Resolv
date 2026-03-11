import { IsDateString } from 'class-validator';

export class RenewCheckupValidityDto {
  @IsDateString()
  dataInizioValidita: string;

  @IsDateString()
  dataScadenza: string;
}
