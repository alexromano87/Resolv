import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackupService } from './backup.service';

@Injectable()
export class BackupSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupSchedulerService.name);
  private schedulerInterval: NodeJS.Timeout | null = null;
  private readonly backupIntervalHours: number;

  constructor(
    private readonly backupService: BackupService,
    private readonly configService: ConfigService,
  ) {
    // Get backup interval from env (in milliseconds), default 24 hours
    const intervalMs = this.configService.get<number>(
      'BACKUP_SCHEDULE_INTERVAL',
      86400000, // 24 hours in milliseconds
    );
    this.backupIntervalHours = intervalMs / (60 * 60 * 1000);
  }

  onModuleInit() {
    const enabled = this.configService.get<string>('BACKUP_SCHEDULER_ENABLED', 'true');

    if (enabled === 'true') {
      this.startScheduler();
      this.logger.log(
        `Backup scheduler started. Backups will run every ${this.backupIntervalHours} hours.`,
      );
    } else {
      this.logger.log('Backup scheduler is disabled.');
    }
  }

  onModuleDestroy() {
    this.stopScheduler();
  }

  private startScheduler() {
    // Esegui il primo backup dopo 1 minuto dall'avvio
    setTimeout(() => {
      this.runBackup();
    }, 60 * 1000);

    // Programma backup ricorrenti
    const intervalMs = this.backupIntervalHours * 60 * 60 * 1000;
    this.schedulerInterval = setInterval(() => {
      this.runBackup();
    }, intervalMs);
  }

  private stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      this.logger.log('Backup scheduler stopped.');
    }
  }

  private async runBackup() {
    try {
      this.logger.log('Starting scheduled backup...');
      const backup = await this.backupService.createBackup();
      this.logger.log(
        `Scheduled backup completed successfully: ${backup.filename} (${(backup.size / 1024 / 1024).toFixed(2)} MB)`,
      );
    } catch (error) {
      this.logger.error(`Scheduled backup failed: ${error.message}`);
    }
  }

  async triggerManualBackup() {
    this.logger.log('Manual backup triggered...');
    return this.runBackup();
  }
}
