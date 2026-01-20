// src/import/import.controller.ts
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
import { ImportService } from './import.service';
import { ImportCsvDto } from './dto/import-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AuditLogService } from '../audit/audit-log.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { RateLimit } from '../common/rate-limit.decorator';

@Controller('import')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ImportController {
  private readonly logger = new Logger(ImportController.name);

  constructor(
    private readonly importService: ImportService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('backup')
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })  // 5 per hour
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async importBackup(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('File mancante', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.importService.importBackup(file.buffer);

      try {
        await this.auditLogService.log({
          userId: user.id,
          studioId: user.studioId,
          action: 'IMPORT_DATA',
          entityType: 'SYSTEM',
          description: 'Import backup JSON',
          metadata: {
            filename: file.originalname,
            results: result.results,
          },
        });
      } catch (logError) {
        this.logger.warn('Audit log import backup fallito', logError);
      }

      return result;
    } catch (error: any) {
      this.logger.error('Errore import backup', error);
      throw new HttpException(
        error?.message || 'Errore durante l\'import del backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('csv')
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })  // 10 per hour
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async importCsv(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ImportCsvDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('File mancante', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.importService.importCsv(dto.entity, file.buffer);

      try {
        let entityType: 'USER' | 'CLIENTE' | 'DEBITORE' | 'AVVOCATO' | 'PRATICA' | 'SYSTEM' = 'SYSTEM';
        if (dto.entity === 'clienti') entityType = 'CLIENTE';
        else if (dto.entity === 'debitori') entityType = 'DEBITORE';
        else if (dto.entity === 'users') entityType = 'USER';
        else if (dto.entity === 'avvocati') entityType = 'AVVOCATO';
        else if (dto.entity === 'pratiche') entityType = 'PRATICA';

        await this.auditLogService.log({
          userId: user.id,
          studioId: user.studioId,
          action: 'IMPORT_DATA',
          entityType,
          description: `Import CSV ${dto.entity}`,
          metadata: {
            filename: file.originalname,
            result,
          },
        });
      } catch (logError) {
        this.logger.warn('Audit log import CSV fallito', logError);
      }

      return result;
    } catch (error: any) {
      this.logger.error('Errore import CSV', error);
      throw new HttpException(
        error?.message || 'Errore durante l\'import CSV',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
