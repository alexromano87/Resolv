import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupUser } from '../users/checkup-user.entity';

export type CheckupAlertPriority = 'info' | 'warning' | 'urgent';
export type CheckupAlertStato = 'aperto' | 'chiuso' | 'scaduto';

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

  @Column({ type: 'varchar', length: 20, default: 'aperto' })
  stato: CheckupAlertStato;

  @Column({ type: 'datetime', nullable: true })
  dataScadenza: Date | null;

  @Column({ type: 'int', nullable: true })
  preavvisoGiorni: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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
