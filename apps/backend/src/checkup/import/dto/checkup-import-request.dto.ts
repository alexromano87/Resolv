import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum CheckupImportEntity {
  LICENZIATARI = 'licenziatari',
  SUBLICENZIATARI = 'sublicenziatari',
  UTENTI = 'utenti',
  LICENZE = 'licenze',
  SUBLICENZE = 'sublicenze',
  RISPOSTE = 'risposte',
  DOMANDE = 'domande',
}

export class CheckupImportCsvDto {
  @IsEnum(CheckupImportEntity)
  entity: CheckupImportEntity;

  @IsOptional()
  @IsString()
  licenziatarioId?: string;
}
