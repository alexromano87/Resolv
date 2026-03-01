import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SuperadminGuard } from '../../auth/superadmin.guard';
import { CheckupImportService } from './checkup-import.service';
import { CheckupImportCsvDto } from './dto/checkup-import-request.dto';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { RateLimit } from '../../common/rate-limit.decorator';

@Controller('admin/checkup/import')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class CheckupImportController {
  private readonly logger = new Logger(CheckupImportController.name);

  constructor(
    private readonly importService: CheckupImportService,
    private readonly auditLogService: CheckupAuditLogService,
  ) {}

  @Post('backup')
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async importBackup(
    @UploadedFile() file: Express.Multer.File,
    @Body('licenziatarioId') licenziatarioId?: string,
  ) {
    if (!file) {
      throw new HttpException('File mancante', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.importService.importBackup(file.buffer, licenziatarioId);
      this.auditLogService.log({
        action: 'IMPORT_DATA',
        entityType: 'SYSTEM',
        description: 'Import backup checkup',
        metadata: { filename: file.originalname, licenziatarioId: licenziatarioId || null },
        success: true,
      }).catch(() => {});
      return result;
    } catch (error: any) {
      this.logger.error('Errore import backup checkup', error);
      throw new HttpException(
        error?.message || 'Errore durante l\'import del backup checkup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('csv')
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async importCsv(
    @Body() dto: CheckupImportCsvDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('File mancante', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.importService.importCsv(dto.entity, file.buffer, dto.licenziatarioId);
      this.auditLogService.log({
        action: 'IMPORT_DATA',
        entityType: 'SYSTEM',
        description: `Import CSV checkup ${dto.entity}`,
        metadata: { filename: file.originalname, entity: dto.entity, licenziatarioId: dto.licenziatarioId || null },
        success: true,
      }).catch(() => {});
      return result;
    } catch (error: any) {
      this.logger.error('Errore import CSV checkup', error);
      throw new HttpException(
        error?.message || 'Errore durante l\'import CSV checkup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
