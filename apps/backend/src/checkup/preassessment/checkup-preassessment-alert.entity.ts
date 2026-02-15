import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupUser } from '../users/checkup-user.entity';

export type CheckupAlertPriority = 'info' | 'warning' | 'urgent';

@Entity('checkup_alerts')
export class CheckupPreassessmentAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  preassessmentId: string;

  @Column({ type: 'uuid' })
  createdById: string;

  @Column({ type: 'uuid', nullable: true })
  targetUserId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'info' })
  priority: CheckupAlertPriority;

  @Column({ type: 'text' })
  messaggio: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CheckupPreassessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'preassessmentId' })
  preassessment: CheckupPreassessment;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: CheckupUser;

  @ManyToOne(() => CheckupUser, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetUserId' })
  targetUser: CheckupUser | null;
}
