import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Studio } from './studio.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { User } from '../users/user.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { Pratica } from '../pratiche/pratica.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface StudioBackup {
  timestamp: string;
  studio: any;
  users: any[];
  clienti: any[];
  debitori: any[];
  avvocati: any[];
  pratiche: any[];
  metadata: {
    totalRecords: number;
    backupDate: Date;
    studioId: string;
    studioNome: string;
  };
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups', 'studi');

  constructor(
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
    @InjectRepository(Cliente)
    private clientiRepository: Repository<Cliente>,
    @InjectRepository(Debitore)
    private debitoriRepository: Repository<Debitore>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Avvocato)
    private avvocatiRepository: Repository<Avvocato>,
    @InjectRepository(Pratica)
    private praticheRepository: Repository<Pratica>,
  ) {
    // Ensure backup directory exists
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Creates a complete backup of a studio and all its related data
   */
  async createStudioBackup(studioId: string): Promise<string> {
    this.logger.log(`Inizio backup dello studio ${studioId}`);

    try {
      // Fetch studio data
      const studio = await this.studioRepository.findOne({
        where: { id: studioId },
      });

      if (!studio) {
        throw new Error(`Studio ${studioId} non trovato`);
      }

      // Fetch all related data - senza relazioni problematiche
      const [users, clienti, debitori, avvocati, pratiche] = await Promise.all([
        this.usersRepository.find({
          where: { studioId },
        }),
        this.clientiRepository.find({
          where: { studioId },
        }),
        this.debitoriRepository.find({
          where: { studioId },
        }),
        this.avvocatiRepository.find({
          where: { studioId },
        }),
        this.praticheRepository.find({
          where: { studioId },
        }),
      ]);

      const totalRecords = users.length + clienti.length + debitori.length + avvocati.length + pratiche.length;

      // Create backup object
      const backup: StudioBackup = {
        timestamp: new Date().toISOString(),
        studio: this.sanitizeEntity(studio),
        users: users.map((u) => this.sanitizeEntity(u)),
        clienti: clienti.map((c) => this.sanitizeEntity(c)),
        debitori: debitori.map((d) => this.sanitizeEntity(d)),
        avvocati: avvocati.map((a) => this.sanitizeEntity(a)),
        pratiche: pratiche.map((p) => this.sanitizeEntity(p)),
        metadata: {
          totalRecords,
          backupDate: new Date(),
          studioId: studio.id,
          studioNome: studio.nome,
        },
      };

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `studio-${studio.nome.replace(/\s+/g, '-')}-${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);

      // Write backup to file
      fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');

      this.logger.log(
        `Backup completato: ${totalRecords} record salvati in ${filepath}`,
      );

      return filepath;
    } catch (error) {
      this.logger.error(`Errore durante il backup dello studio ${studioId}:`, error);
      throw error;
    }
  }

  /**
   * Removes sensitive data from entities before backup
   */
  private sanitizeEntity(entity: any): any {
    if (!entity) return null;

    const sanitized = { ...entity };

    // Remove password hashes
    if (sanitized.password) {
      delete sanitized.password;
    }

    // Remove circular references by converting relations to IDs only
    if (sanitized.studio && typeof sanitized.studio === 'object') {
      sanitized.studioId = sanitized.studio.id;
      delete sanitized.studio;
    }

    return sanitized;
  }

  /**
   * Get all backup files for a specific studio
   */
  async getStudioBackups(studioId: string): Promise<string[]> {
    const files = fs.readdirSync(this.backupDir);
    return files.filter((file) => file.includes(studioId));
  }

  /**
   * Delete old backups (older than specified days)
   */
  async cleanOldBackups(daysToKeep: number = 30): Promise<number> {
    const files = fs.readdirSync(this.backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;

    for (const file of files) {
      const filepath = path.join(this.backupDir, file);
      const stats = fs.statSync(filepath);

      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filepath);
        deletedCount++;
        this.logger.log(`Deleted old backup: ${file}`);
      }
    }

    this.logger.log(`Cleaned ${deletedCount} old backup files`);
    return deletedCount;
  }
}
