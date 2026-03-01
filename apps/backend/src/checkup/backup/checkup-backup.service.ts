import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

const execAsync = promisify(exec);

export interface CheckupBackupInfo {
  filename: string;
  size: number;
  createdAt: Date;
  path: string;
}

@Injectable()
export class CheckupBackupService {
  private readonly logger = new Logger(CheckupBackupService.name);
  private readonly backupDir: string;

  constructor(
    private configService: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {
    this.backupDir = path.join(process.cwd(), 'backups', 'checkup');
    this.ensureBackupDir();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  private async getCheckupTables(): Promise<string[]> {
    const dbName = this.configService.get<string>('DB_DATABASE', 'recupero_crediti');
    const rows = await this.dataSource.query(
      `SELECT table_name as tableName
       FROM information_schema.tables
       WHERE table_schema = ? AND table_name LIKE 'checkup\\_%'`,
      [dbName],
    );
    return rows.map((row: { tableName: string }) => row.tableName);
  }

  async createBackup(): Promise<CheckupBackupInfo> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `checkup-backup-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const dbHost = this.configService.get<string>('DB_HOST', 'mysql');
    const dbPort = this.configService.get<string>('DB_PORT', '3306');
    const dbName = this.configService.get<string>('DB_DATABASE', 'recupero_crediti');
    const dbUser = this.configService.get<string>('DB_USERNAME', 'rc_user');
    const dbPassword = this.configService.get<string>('DB_PASSWORD', 'rc_pass');

    const tables = await this.getCheckupTables();
    if (tables.length === 0) {
      throw new Error('Nessuna tabella checkup trovata');
    }

    const tablesList = tables.join(' ');
    const command = `MYSQL_PWD='${dbPassword.replace(/'/g, "\\'")}' mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} --default-auth=mysql_native_password --single-transaction --quick --lock-tables=false --skip-ssl --no-tablespaces ${dbName} ${tablesList} > ${filepath}`;

    try {
      await execAsync(command);
      this.logger.log(`Checkup backup created successfully: ${filename}`);

      const stats = fs.statSync(filepath);
      return {
        filename,
        size: stats.size,
        createdAt: new Date(),
        path: filepath,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create checkup backup: ${error.message}`);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw new Error(`Failed to create checkup backup: ${error.message}`);
    }
  }

  async listBackups(): Promise<CheckupBackupInfo[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups: CheckupBackupInfo[] = [];

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

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      this.logger.error(`Failed to list checkup backups: ${error.message}`);
      throw new Error('Failed to list checkup backups');
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
      this.logger.log(`Checkup backup deleted: ${filename}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete checkup backup: ${error.message}`);
      throw new Error('Failed to delete checkup backup');
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

    const command = `MYSQL_PWD='${dbPassword.replace(/'/g, "\\'")}' mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} --skip-ssl ${dbName} < ${filepath}`;

    try {
      await execAsync(command);
      this.logger.log(`Checkup database restored from backup: ${filename}`);
    } catch (error: any) {
      this.logger.error(`Failed to restore checkup backup: ${error.message}`);
      throw new Error(`Failed to restore checkup backup: ${error.message}`);
    }
  }

  async restoreFromUpload(buffer: Buffer): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `checkup-restore-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    try {
      fs.writeFileSync(filepath, buffer);
      await this.restoreBackup(filename);
      this.logger.log(`Checkup database restored from upload: ${filename}`);
    } catch (error: any) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
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
