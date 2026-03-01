import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum CheckupExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
}

export enum CheckupExportEntity {
  LICENZIATARI = 'licenziatari',
  Sublicenziatari = 'sublicenziatari',
  UTENTI = 'utenti',
  LICENZE = 'licenze',
  SUBLICENZE = 'sublicenze',
  RISPOSTE = 'risposte',
  DOMANDE = 'domande',
}

export class CheckupExportRequestDto {
  @IsEnum(CheckupExportEntity)
  entity: CheckupExportEntity;

  @IsEnum(CheckupExportFormat)
  format: CheckupExportFormat;

  @IsOptional()
  @IsString()
  licenziatarioId?: string;
}

export class CheckupBackupRequestDto {
  @IsOptional()
  @IsString()
  licenziatarioId?: string;
}
