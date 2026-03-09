import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupPreassessmentDocument } from './checkup-preassessment-document.entity';

/** Canonical base directory for checkup document uploads (mirrors documents service). */
const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads', 'checkup-preassessment');

/**
 * GDPR retention policy for pre-assessment data.
 *
 * Completed pre-assessments older than CHECKUP_PREASSESSMENT_RETENTION_DAYS
 * are anonymized by clearing all answer fields. Structural metadata
 * (status, completedAt, macroValidations, sectionValidations) is kept
 * for audit/statistical purposes.
 */
@Injectable()
export class CheckupPreassessmentRetentionService {
  private readonly logger = new Logger(CheckupPreassessmentRetentionService.name);

  constructor(
    @InjectRepository(CheckupPreassessment)
    private readonly preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupPreassessmentDocument)
    private readonly documentRepository: Repository<CheckupPreassessmentDocument>,
    private readonly configService: ConfigService,
  ) {}

  /** Runs daily at 04:00 — anonymizes old completed pre-assessments and purges physical files. */
  @Cron('0 4 * * *')
  async enforceRetentionPolicy(): Promise<void> {
    const retentionDays = this.configService.get<number>('CHECKUP_PREASSESSMENT_RETENTION_DAYS', 365);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
      // ── Step 1: identify which preassessments qualify ──────────────────────
      const qualifying = await this.preassessmentRepository
        .createQueryBuilder('p')
        .select('p.id')
        .where('p.status = :status', { status: 'concluso' })
        .andWhere('p.completedAt < :cutoff', { cutoff })
        .andWhere('p.data IS NOT NULL')
        .getMany();

      if (qualifying.length === 0) return;

      const preassessmentIds = qualifying.map((p) => p.id);

      // ── Step 2: anonymize JSON fields ──────────────────────────────────────
      const result = await this.preassessmentRepository
        .createQueryBuilder()
        .update(CheckupPreassessment)
        .set({
          data: null,
          notes: null,
          fieldNotes: null,
          userFieldNotes: null,
          naFields: null,
          fieldMeta: null,
        })
        .whereInIds(preassessmentIds)
        .execute();

      const affected = result.affected ?? 0;

      // ── Step 3: purge physical files for these preassessments ──────────────
      const docs = await this.documentRepository.find({
        where: { preassessmentId: In(preassessmentIds), attivo: true },
      });

      let filesDeleted = 0;
      let filesNotFound = 0;

      for (const doc of docs) {
        // Safety: only delete files inside the known upload directory
        const resolved = path.resolve(doc.percorsoFile);
        if (!resolved.startsWith(UPLOAD_BASE + path.sep) && resolved !== UPLOAD_BASE) {
          this.logger.warn(`Retention: skipping path outside upload dir for doc ${doc.id}`);
          continue;
        }

        try {
          fs.unlinkSync(resolved);
          filesDeleted++;
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            filesNotFound++;
          } else {
            this.logger.warn(`Retention: could not delete file for doc ${doc.id}: ${err.message}`);
          }
        }
      }

      // ── Step 4: mark documents as inactive ────────────────────────────────
      if (docs.length > 0) {
        await this.documentRepository
          .createQueryBuilder()
          .update(CheckupPreassessmentDocument)
          .set({ attivo: false })
          .where({ preassessmentId: In(preassessmentIds), attivo: true })
          .execute();
      }

      if (affected > 0 || docs.length > 0) {
        this.logger.log(
          `Pre-assessment retention: anonymized ${affected} records, purged ${filesDeleted} files` +
          ` (${filesNotFound} already missing), deactivated ${docs.length} document records` +
          ` — cutoff ${cutoff.toISOString()} (${retentionDays}-day policy)`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Pre-assessment retention policy failed: ${error.message}`);
    }
  }
}
