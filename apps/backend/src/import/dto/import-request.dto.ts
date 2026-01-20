// src/import/dto/import-request.dto.ts
import { IsEnum } from 'class-validator';

export enum ImportCsvEntity {
  CLIENTI = 'clienti',
  DEBITORI = 'debitori',
  USERS = 'users',
  AVVOCATI = 'avvocati',
  PRATICHE = 'pratiche',
}

export class ImportCsvDto {
  @IsEnum(ImportCsvEntity)
  entity: ImportCsvEntity;
}
