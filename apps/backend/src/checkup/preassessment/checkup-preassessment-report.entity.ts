import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupClient } from '../clients/checkup-client.entity';

@Entity('checkup_preassessment_reports')
export class CheckupPreassessmentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  preassessmentId: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => CheckupPreassessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'preassessmentId' })
  preassessment: CheckupPreassessment;

  @ManyToOne(() => CheckupClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: CheckupClient;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: process.env.DB_USE_SQLITE === 'true' ? 'blob' : 'longblob' })
  pdf: Buffer;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
