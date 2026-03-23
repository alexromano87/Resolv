import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { createEncryptedJsonTransformer } from '../encryption/checkup-json-encryption';

export type CheckupExportJobType = 'pdf' | 'zip';
export type CheckupExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface CheckupExportJobPayload {
  html?: string;
  excludeNA?: boolean;
  includeConsultantNotes?: boolean;
}

@Entity('checkup_export_jobs')
export class CheckupPreassessmentExportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['pdf', 'zip'],
  })
  type: CheckupExportJobType;

  @Column({
    type: 'enum',
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
  })
  status: CheckupExportJobStatus;

  @Column({ type: 'uuid' })
  requestedById: string;

  @Column({ type: 'varchar', length: 32 })
  requestedByRole: string;

  @Column({ type: 'uuid', nullable: true })
  requestedByStudioId: string | null;

  @Column({ type: 'uuid', nullable: true })
  requestedByClientId: string | null;

  @Column({ type: 'uuid', nullable: true })
  preassessmentId: string | null;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ type: process.env.DB_USE_SQLITE === 'true' ? 'text' : 'longtext', nullable: true, transformer: createEncryptedJsonTransformer<CheckupExportJobPayload>() })
  payload: CheckupExportJobPayload | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filename: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mimeType: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  resultPath: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
