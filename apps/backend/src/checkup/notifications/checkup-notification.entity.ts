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
import { CheckupUser } from '../users/checkup-user.entity';

export type CheckupNotificationType =
  | 'preassessment_section_validated'
  | 'preassessment_final_validated'
  | 'preassessment_reopened'
  | 'preassessment_new_version'
  | 'consultant_note'
  | 'client_note'
  | 'ticket_created'
  | 'ticket_updated'
  | 'chat_message'
  | 'direct_chat_message';

@Entity('checkup_notifications')
@Index(['userId', 'createdAt'])
@Index(['preassessmentId'])
@Index(['clientId'])
export class CheckupNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;

  @Column({ type: 'varchar', length: 80 })
  type: CheckupNotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl: string | null;

  @Column({ type: 'uuid', nullable: true })
  preassessmentId: string | null;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientName: string | null;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date | null;
}
