import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Res,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AuditLogService } from '../audit/audit-log.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { RateLimit } from '../common/rate-limit.decorator';

@Controller('backup')
@UseGuards(JwtAuthGuard, AdminGuard)
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('create')
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })  // 5 per hour
  async createBackup(@CurrentUser() user: CurrentUserData) {
    try {
      const backup = await this.backupService.createBackup();

      try {
        await this.auditLogService.log({
          userId: user.id,
          studioId: user.studioId,
          action: 'BACKUP_STUDIO',
          entityType: 'SYSTEM',
          description: 'Backup database creato',
          metadata: {
            filename: backup.filename,
            size: backup.size,
          },
        });
      } catch (logError) {
        this.logger.warn('Audit log backup fallito', logError);
      }

      return backup;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore durante la creazione del backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('list')
  async listBackups() {
    try {
      return await this.backupService.listBackups();
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nel recupero della lista backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getStats() {
    try {
      return await this.backupService.getBackupStats();
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nel recupero delle statistiche',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/:filename')
  async downloadBackup(
    @Param('filename') filename: string,
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
  ) {
    try {
      const { stream, size } = await this.backupService.getBackup(filename);

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', size);

      stream.pipe(res);

      try {
        await this.auditLogService.log({
          userId: user.id,
          studioId: user.studioId,
          action: 'DOWNLOAD_FILE',
          entityType: 'SYSTEM',
          description: 'Download backup database',
          metadata: { filename },
        });
      } catch (logError) {
        this.logger.warn('Audit log download backup fallito', logError);
      }
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nel download del backup',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete(':filename')
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })  // 10 per hour
  async deleteBackup(
    @Param('filename') filename: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    try {
      await this.backupService.deleteBackup(filename);

      try {
        await this.auditLogService.log({
          userId: user.id,
          studioId: user.studioId,
          action: 'DELETE_FILE',
          entityType: 'SYSTEM',
          description: 'Eliminazione backup database',
          metadata: { filename },
        });
      } catch (logError) {
        this.logger.warn('Audit log delete backup fallito', logError);
      }

      return { success: true, message: 'Backup eliminato con successo' };
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nell\'eliminazione del backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('restore/:filename')
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000 })  // 3 per hour (critical operation)
  async restoreBackup(
    @Param('filename') filename: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    try {
      await this.backupService.restoreBackup(filename);

      try {
        await this.auditLogService.log({
          userId: user.id,
          studioId: user.studioId,
          action: 'BACKUP_STUDIO',
          entityType: 'SYSTEM',
          description: 'Ripristino database da backup',
          metadata: { filename },
        });
      } catch (logError) {
        this.logger.warn('Audit log restore backup fallito', logError);
      }

      return { success: true, message: 'Database ripristinato con successo' };
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nel ripristino del backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('restore-upload')
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000 })  // 3 per hour
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    }),
  )
  async restoreFromUpload(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('File mancante', HttpStatus.BAD_REQUEST);
    }

    if (!file.originalname.endsWith('.sql')) {
      throw new HttpException(
        'Solo file .sql sono supportati',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.backupService.restoreFromUpload(file.buffer);

      try {
        await this.auditLogService.log({
          userId: user.id,
          studioId: user.studioId,
          action: 'BACKUP_STUDIO',
          entityType: 'SYSTEM',
          description: 'Ripristino database da file caricato',
          metadata: {
            filename: file.originalname,
            size: file.size,
          },
        });
      } catch (logError) {
        this.logger.warn('Audit log restore upload fallito', logError);
      }

      return { success: true, message: 'Database ripristinato con successo' };
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nel ripristino del backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
