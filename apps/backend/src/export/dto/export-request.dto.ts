// src/export/dto/export-request.dto.ts
import { IsEnum, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
}

export enum ExportEntity {
  PRATICHE = 'pratiche',
  CLIENTI = 'clienti',
  DEBITORI = 'debitori',
  AVVOCATI = 'avvocati',
  MOVIMENTI_FINANZIARI = 'movimenti_finanziari',
  DOCUMENTI = 'documenti',
  ALERTS = 'alerts',
  TICKETS = 'tickets',
  AUDIT_LOGS = 'audit_logs',
  USERS = 'users',
}

export class ExportRequestDto {
  @IsOptional()
  @IsString()
  studioId?: string;

  @IsEnum(ExportEntity)
  entity: ExportEntity;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsDateString()
  dataInizio?: string;

  @IsOptional()
  @IsDateString()
  dataFine?: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsString()
  searchTerm?: string;
}

export class BackupStudioDto {
  @IsString()
  studioId: string;

  @IsOptional()
  @IsBoolean()
  includeDocuments?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAuditLogs?: boolean;
}
