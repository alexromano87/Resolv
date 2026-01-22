import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';

const execAsync = promisify(exec);

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: Date;
  path: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly maxBackups: number;
  private readonly retentionDays: number;

  constructor(private configService: ConfigService) {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.maxBackups = this.configService.get<number>('BACKUP_MAX_COUNT', 30);
    this.retentionDays = this.configService.get<number>('BACKUP_RETENTION_DAYS', 30);
    this.ensureBackupDir();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  async createBackup(): Promise<BackupInfo> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const dbHost = this.configService.get<string>('DB_HOST', 'mysql');
    const dbPort = this.configService.get<string>('DB_PORT', '3306');
    const dbName = this.configService.get<string>('DB_DATABASE', 'recupero_crediti');
    const dbUser = this.configService.get<string>('DB_USERNAME', 'rc_user');
    const dbPassword = this.configService.get<string>('DB_PASSWORD', 'rc_pass');

    const command = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} --single-transaction --quick --lock-tables=false --skip-ssl ${dbName} > ${filepath}`;

    try {
      await execAsync(command);
      this.logger.log(`Backup created successfully: ${filename}`);

      const stats = fs.statSync(filepath);

      // Cleanup old backups
      await this.cleanupOldBackups();

      return {
        filename,
        size: stats.size,
        createdAt: new Date(),
        path: filepath,
      };
    } catch (error) {
      this.logger.error(`Failed to create backup: ${error.message}`);
      // Cleanup failed backup file
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filepath = path.join(this.backupDir, file);
          const stats = fs.statSync(filepath);
          backups.push({
            filename: file,
            size: stats.size,
            createdAt: stats.mtime,
            path: filepath,
          });
        }
      }

      // Sort by creation date, newest first
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      throw new Error('Failed to list backups');
    }
  }

  async getBackup(filename: string): Promise<{ stream: fs.ReadStream; size: number }> {
    const filepath = path.join(this.backupDir, filename);

    if (!fs.existsSync(filepath) || !filename.endsWith('.sql')) {
      throw new Error('Backup file not found');
    }

    const stats = fs.statSync(filepath);
    const stream = createReadStream(filepath);

    return { stream, size: stats.size };
  }

  async deleteBackup(filename: string): Promise<void> {
    const filepath = path.join(this.backupDir, filename);

    if (!fs.existsSync(filepath) || !filename.endsWith('.sql')) {
      throw new Error('Backup file not found');
    }

    try {
      fs.unlinkSync(filepath);
      this.logger.log(`Backup deleted: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete backup: ${error.message}`);
      throw new Error('Failed to delete backup');
    }
  }

  async restoreBackup(filename: string): Promise<void> {
    const filepath = path.join(this.backupDir, filename);

    if (!fs.existsSync(filepath) || !filename.endsWith('.sql')) {
      throw new Error('Backup file not found');
    }

    const dbHost = this.configService.get<string>('DB_HOST', 'mysql');
    const dbPort = this.configService.get<string>('DB_PORT', '3306');
    const dbName = this.configService.get<string>('DB_DATABASE', 'recupero_crediti');
    const dbUser = this.configService.get<string>('DB_USERNAME', 'rc_user');
    const dbPassword = this.configService.get<string>('DB_PASSWORD', 'rc_pass');

    const command = `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} --skip-ssl ${dbName} < ${filepath}`;

    try {
      await execAsync(command);
      this.logger.log(`Database restored from backup: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to restore backup: ${error.message}`);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  async restoreFromUpload(buffer: Buffer): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `restore-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    try {
      // Save uploaded file
      fs.writeFileSync(filepath, buffer);

      // Restore from file
      await this.restoreBackup(filename);

      // Keep the restore file for record
      this.logger.log(`Database restored from upload: ${filename}`);
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      const now = new Date();
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000; // 30 giorni in millisecondi

      let deletedCount = 0;

      for (const backup of backups) {
        const backupAge = now.getTime() - backup.createdAt.getTime();

        if (backupAge > retentionMs) {
          await this.deleteBackup(backup.filename);
          deletedCount++;
          this.logger.log(`Old backup deleted (${Math.floor(backupAge / (24 * 60 * 60 * 1000))} days old): ${backup.filename}`);
        }
      }

      if (this.maxBackups > 0) {
        const remainingBackups = (await this.listBackups()).sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        const excess = remainingBackups.length - this.maxBackups;

        if (excess > 0) {
          const toDelete = remainingBackups.slice(-excess);
          for (const backup of toDelete) {
            await this.deleteBackup(backup.filename);
            deletedCount++;
            this.logger.log(`Oldest backup deleted to enforce max count: ${backup.filename}`);
          }
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleanup completed: ${deletedCount} backup(s) deleted`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old backups: ${error.message}`);
    }
  }

  /**
   * Scheduled job to cleanup backups older than retention period
   * Runs every day at 3:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledBackupCleanup(): Promise<void> {
    this.logger.log('Running scheduled backup cleanup...');
    await this.cleanupOldBackups();
  }

  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
  }> {
    const backups = await this.listBackups();

    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
      };
    }

    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const oldestBackup = backups[backups.length - 1].createdAt;
    const newestBackup = backups[0].createdAt;

    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup,
      newestBackup,
    };
  }
}
