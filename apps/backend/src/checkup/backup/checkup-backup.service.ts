import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

export interface CheckupBackupInfo {
  filename: string;
  size: number;
  createdAt: Date;
  path: string;
  encrypted: boolean;
}

// AES-256-GCM layout: IV(16 bytes) + AuthTag(16 bytes) + ciphertext
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class CheckupBackupService {
  private readonly logger = new Logger(CheckupBackupService.name);
  private readonly backupDir: string;
  /** Derived 32-byte key from env var CHECKUP_BACKUP_ENCRYPTION_KEY (64 hex chars). Null = encryption disabled. */
  private readonly encryptionKey: Buffer | null;

  constructor(
    private configService: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {
    this.backupDir = path.join(process.cwd(), 'backups', 'checkup');
    this.ensureBackupDir();

    const rawKey = this.configService.get<string>('CHECKUP_BACKUP_ENCRYPTION_KEY');
    if (rawKey && rawKey.length === 64) {
      this.encryptionKey = Buffer.from(rawKey, 'hex');
    } else {
      this.encryptionKey = null;
      if (rawKey) {
        this.logger.warn('CHECKUP_BACKUP_ENCRYPTION_KEY must be exactly 64 hex characters. Backup encryption is DISABLED.');
      } else {
        this.logger.warn('CHECKUP_BACKUP_ENCRYPTION_KEY not set. Backup files will NOT be encrypted.');
      }
    }
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  // ── AES-256-GCM encryption/decryption ────────────────────────────────────

  private encryptFile(plainPath: string, encPath: string): void {
    if (!this.encryptionKey) throw new Error('Encryption key not configured');

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    const plainData = fs.readFileSync(plainPath);
    const encrypted = Buffer.concat([cipher.update(plainData), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // File format: IV (16) || AuthTag (16) || ciphertext
    fs.writeFileSync(encPath, Buffer.concat([iv, authTag, encrypted]));
  }

  private decryptFile(encPath: string, plainPath: string): void {
    if (!this.encryptionKey) throw new Error('Encryption key not configured');

    const data = fs.readFileSync(encPath);
    if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Encrypted backup file is too short — possibly corrupt');
    }

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    fs.writeFileSync(plainPath, decrypted);
  }

  // ── MySQL helpers ─────────────────────────────────────────────────────────

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

  /**
   * Runs mysqldump safely via spawn (no shell) — password passed via MYSQL_PWD
   * env var, never embedded in the command string or visible in ps output.
   */
  private spawnMysqldump(filepath: string, tables: string[]): Promise<void> {
    const dbHost = this.configService.get<string>('DB_HOST', 'mysql');
    const dbPort = this.configService.get<string>('DB_PORT', '3306');
    const dbName = this.configService.get<string>('DB_DATABASE', 'resolv');
    const dbUser = this.configService.get<string>('DB_USERNAME', 'rc_user');
    const dbPassword = this.configService.get<string>('DB_PASSWORD', '');

    const args = [
      `-h${dbHost}`,
      `-P${dbPort}`,
      `-u${dbUser}`,
      '--default-auth=mysql_native_password',
      '--single-transaction',
      '--quick',
      '--lock-tables=false',
      '--skip-ssl',
      '--no-tablespaces',
      dbName,
      ...tables,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn('mysqldump', args, {
        // Password injected only via environment — never in CLI args or shell string
        env: { ...process.env, MYSQL_PWD: dbPassword },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const writeStream = fs.createWriteStream(filepath);
      child.stdout.pipe(writeStream);

      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

      child.on('close', (code) => {
        writeStream.end();
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`mysqldump exited with code ${code}: ${stderr.slice(0, 500)}`));
        }
      });
      child.on('error', reject);
    });
  }

  /**
   * Runs mysql restore safely via spawn (no shell).
   */
  private spawnMysqlRestore(filepath: string): Promise<void> {
    const dbHost = this.configService.get<string>('DB_HOST', 'mysql');
    const dbPort = this.configService.get<string>('DB_PORT', '3306');
    const dbName = this.configService.get<string>('DB_DATABASE', 'resolv');
    const dbUser = this.configService.get<string>('DB_USERNAME', 'rc_user');
    const dbPassword = this.configService.get<string>('DB_PASSWORD', '');

    const args = [
      `-h${dbHost}`,
      `-P${dbPort}`,
      `-u${dbUser}`,
      '--skip-ssl',
      dbName,
    ];

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filepath);
      const child = spawn('mysql', args, {
        env: { ...process.env, MYSQL_PWD: dbPassword },
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      readStream.pipe(child.stdin);

      let stderr = '';
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`mysql restore exited with code ${code}: ${stderr.slice(0, 500)}`));
        }
      });
      child.on('error', reject);
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async createBackup(): Promise<CheckupBackupInfo> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tables = await this.getCheckupTables();
    if (tables.length === 0) {
      throw new Error('Nessuna tabella checkup trovata');
    }

    const encrypted = this.encryptionKey !== null;
    const plainFilename = `checkup-backup-${timestamp}.sql`;
    const plainFilepath = path.join(this.backupDir, plainFilename);
    const finalFilename = encrypted ? `${plainFilename}.enc` : plainFilename;
    const finalFilepath = path.join(this.backupDir, finalFilename);

    try {
      await this.spawnMysqldump(plainFilepath, tables);

      if (encrypted) {
        this.encryptFile(plainFilepath, finalFilepath);
        fs.unlinkSync(plainFilepath); // remove plaintext immediately
        this.logger.log(`Checkup backup created (AES-256-GCM encrypted): ${finalFilename}`);
      } else {
        this.logger.log(`Checkup backup created (unencrypted): ${finalFilename}`);
      }

      const stats = fs.statSync(finalFilepath);
      return {
        filename: finalFilename,
        size: stats.size,
        createdAt: new Date(),
        path: finalFilepath,
        encrypted,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create checkup backup: ${error.message}`);
      for (const fp of [plainFilepath, finalFilepath]) {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      throw new Error(`Failed to create checkup backup: ${error.message}`);
    }
  }

  async listBackups(): Promise<CheckupBackupInfo[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups: CheckupBackupInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.sql.enc')) {
          const filepath = path.join(this.backupDir, file);
          const stats = fs.statSync(filepath);
          backups.push({
            filename: file,
            size: stats.size,
            createdAt: stats.mtime,
            path: filepath,
            encrypted: file.endsWith('.enc'),
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
    if (!filename.endsWith('.sql') && !filename.endsWith('.sql.enc')) {
      throw new Error('File di backup non trovato');
    }

    const filepath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error('File di backup non trovato');
    }

    if (filename.endsWith('.sql.enc')) {
      // Decrypt to a temporary file and stream it
      if (!this.encryptionKey) throw new Error('Encryption key not configured — cannot decrypt backup');
      const tmpPath = `${filepath}.tmp-decrypt-${Date.now()}`;
      this.decryptFile(filepath, tmpPath);
      const stats = fs.statSync(tmpPath);
      const stream = fs.createReadStream(tmpPath);
      // Clean up temp file after stream ends
      stream.on('close', () => { try { fs.unlinkSync(tmpPath); } catch { /* ignore */ } });
      return { stream, size: stats.size };
    }

    const stats = fs.statSync(filepath);
    const stream = createReadStream(filepath);
    return { stream, size: stats.size };
  }

  async deleteBackup(filename: string): Promise<void> {
    if (!filename.endsWith('.sql') && !filename.endsWith('.sql.enc')) {
      throw new Error('File di backup non trovato');
    }

    const filepath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error('File di backup non trovato');
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
    if (!filename.endsWith('.sql') && !filename.endsWith('.sql.enc')) {
      throw new Error('File di backup non trovato');
    }

    const filepath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error('File di backup non trovato');
    }

    let restorePath = filepath;
    let tmpDecryptPath: string | null = null;

    try {
      if (filename.endsWith('.sql.enc')) {
        if (!this.encryptionKey) throw new Error('Encryption key not configured — cannot decrypt backup');
        tmpDecryptPath = `${filepath}.tmp-restore-${Date.now()}`;
        this.decryptFile(filepath, tmpDecryptPath);
        restorePath = tmpDecryptPath;
      }

      await this.spawnMysqlRestore(restorePath);
      this.logger.log(`Checkup database restored from backup: ${filename}`);
    } catch (error: any) {
      this.logger.error(`Failed to restore checkup backup: ${error.message}`);
      throw new Error(`Failed to restore checkup backup: ${error.message}`);
    } finally {
      if (tmpDecryptPath && fs.existsSync(tmpDecryptPath)) {
        fs.unlinkSync(tmpDecryptPath);
      }
    }
  }

  async restoreFromUpload(buffer: Buffer): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Accept both plain SQL and encrypted uploads
    const isEncrypted = this.encryptionKey !== null && buffer.length >= IV_LENGTH + AUTH_TAG_LENGTH;
    const filename = isEncrypted
      ? `checkup-restore-${timestamp}.sql.enc`
      : `checkup-restore-${timestamp}.sql`;
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
    encryptionEnabled: boolean;
  }> {
    const backups = await this.listBackups();

    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        encryptionEnabled: this.encryptionKey !== null,
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
      encryptionEnabled: this.encryptionKey !== null,
    };
  }
}
