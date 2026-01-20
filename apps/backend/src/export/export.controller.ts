// src/export/export.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ExportRequestDto, BackupStudioDto } from './dto/export-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AuditLogService } from '../audit/audit-log.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { RateLimit } from '../common/rate-limit.decorator';

@Controller('export')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(
    private readonly exportService: ExportService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('data')
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })  // 10 per hour
  async exportData(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ExportRequestDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportData(dto);

      // Log export action (non bloccare l'export se il log fallisce)
      try {
        await this.auditLogService.log({
          userId: user.id,
          studioId: dto.studioId || user.studioId,
          action: 'EXPORT_DATA',
          entityType: 'SYSTEM',
          description: `Export ${dto.entity} in formato ${dto.format}`,
          metadata: {
            format: dto.format,
            entity: dto.entity,
            studioId: dto.studioId,
            filters: {
              dataInizio: dto.dataInizio,
              dataFine: dto.dataFine,
              includeInactive: dto.includeInactive,
            },
          },
        });
      } catch (logError) {
        this.logger.warn('Audit log export fallito', logError);
      }

      // Set appropriate headers
      const filename = `export_${dto.entity}_${new Date().toISOString().split('T')[0]}`;
      let contentType = 'application/octet-stream';
      let extension = dto.format;

      switch (dto.format) {
        case 'csv':
          contentType = 'text/csv';
          break;
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'json':
          contentType = 'application/json';
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.${extension}"`);
      res.send(buffer);
    } catch (error) {
      this.logger.error('Error exporting data', error);
      throw new HttpException(
        'Errore durante l\'esportazione dei dati',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('backup-studio')
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })  // 5 per hour
  async backupStudio(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: BackupStudioDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.backupStudio(
        dto.studioId,
        dto.includeDocuments,
        dto.includeAuditLogs,
      );

      // Log backup action (non bloccare il backup se il log fallisce)
      try {
        await this.auditLogService.log({
          userId: user.id,
          studioId: dto.studioId,
          action: 'BACKUP_STUDIO',
          entityType: 'STUDIO',
          entityId: dto.studioId,
          description: `Backup completo studio`,
          metadata: {
            includeDocuments: dto.includeDocuments,
            includeAuditLogs: dto.includeAuditLogs,
          },
        });
      } catch (logError) {
        this.logger.warn('Audit log backup fallito', logError);
      }

      const filename = `backup_studio_${dto.studioId}_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      this.logger.error('Error backing up studio', error);
      throw new HttpException(
        'Errore durante il backup dello studio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
