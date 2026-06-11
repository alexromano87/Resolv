import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CheckupAuditLog } from '../audit/checkup-audit-log.entity';
import { CheckupUser } from '../users/checkup-user.entity';

@Entity('checkup_system_notification_states')
@Index(['userId', 'auditLogId'], { unique: true })
@Index(['userId', 'readAt'])
export class CheckupSystemNotificationState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;

  @Column({ type: 'uuid' })
  auditLogId: string;

  @ManyToOne(() => CheckupAuditLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditLogId' })
  auditLog: CheckupAuditLog;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date | null;
}
