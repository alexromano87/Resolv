import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CheckupPreassessment } from './checkup-preassessment.entity';

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
    private readonly configService: ConfigService,
  ) {}

  /** Runs daily at 04:00 — anonymizes old completed pre-assessments. */
  @Cron('0 4 * * *')
  async enforceRetentionPolicy(): Promise<void> {
    const retentionDays = this.configService.get<number>('CHECKUP_PREASSESSMENT_RETENTION_DAYS', 365);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
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
        .where('status = :status', { status: 'concluso' })
        .andWhere('completedAt < :cutoff', { cutoff })
        .andWhere('data IS NOT NULL')
        .execute();

      const affected = result.affected ?? 0;
      if (affected > 0) {
        this.logger.log(
          `Pre-assessment retention: anonymized ${affected} records completed before ${cutoff.toISOString()} (${retentionDays}-day policy)`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Pre-assessment retention policy failed: ${error.message}`);
    }
  }
}
