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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SuperadminGuard } from '../../auth/superadmin.guard';
import { CheckupBackupService } from './checkup-backup.service';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { RateLimit } from '../../common/rate-limit.decorator';

@Controller('admin/checkup/backup')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class CheckupBackupController {
  private readonly logger = new Logger(CheckupBackupController.name);

  constructor(
    private readonly backupService: CheckupBackupService,
    private readonly auditLogService: CheckupAuditLogService,
  ) {}

  @Post('create')
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  async createBackup() {
    try {
      const backup = await this.backupService.createBackup();
      this.auditLogService.log({
        action: 'BACKUP_DATA',
        entityType: 'SYSTEM',
        description: 'Backup checkup creato',
        metadata: { filename: backup.filename, size: backup.size },
        success: true,
      }).catch(() => {});
      return backup;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore durante la creazione del backup checkup',
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
  ) {
    try {
      const { stream, size } = await this.backupService.getBackup(filename);

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', size);

      stream.pipe(res);

      this.auditLogService.log({
        action: 'DOWNLOAD_FILE',
        entityType: 'SYSTEM',
        description: 'Download backup checkup',
        metadata: { filename },
        success: true,
      }).catch(() => {});
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nel download del backup',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Delete(':filename')
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })
  async deleteBackup(@Param('filename') filename: string) {
    try {
      await this.backupService.deleteBackup(filename);
      this.auditLogService.log({
        action: 'DELETE_FILE',
        entityType: 'SYSTEM',
        description: 'Eliminazione backup checkup',
        metadata: { filename },
        success: true,
      }).catch(() => {});
      return { success: true, message: 'Backup eliminato con successo' };
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nell\'eliminazione del backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('restore/:filename')
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000 })
  async restoreBackup(@Param('filename') filename: string) {
    try {
      await this.backupService.restoreBackup(filename);
      this.auditLogService.log({
        action: 'BACKUP_DATA',
        entityType: 'SYSTEM',
        description: 'Ripristino checkup da backup',
        metadata: { filename },
        success: true,
      }).catch(() => {});
      return { success: true, message: 'Database checkup ripristinato con successo' };
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Errore nel ripristino del backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('restore-upload')
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async restoreFromUpload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('File mancante', HttpStatus.BAD_REQUEST);
    }

    if (!file.originalname.endsWith('.sql')) {
      throw new HttpException('Solo file .sql sono supportati', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.backupService.restoreFromUpload(file.buffer);
      this.auditLogService.log({
        action: 'BACKUP_DATA',
        entityType: 'SYSTEM',
        description: 'Ripristino checkup da file caricato',
        metadata: { filename: file.originalname, size: file.size },
        success: true,
      }).catch(() => {});
      return { success: true, message: 'Database checkup ripristinato con successo' };
    } catch (error: any) {
      this.logger.error('Errore ripristino checkup', error);
      throw new HttpException(
        error?.message || 'Errore nel ripristino del backup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
