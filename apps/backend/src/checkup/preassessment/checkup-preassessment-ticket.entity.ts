import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupPreassessmentTicketMessage } from './checkup-preassessment-ticket-message.entity';

@Entity('checkup_tickets')
export class CheckupPreassessmentTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  preassessmentId: string;

  @Column({ type: 'uuid' })
  createdById: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: 'open' | 'in_progress' | 'pending_close' | 'closed';

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  @Column({ type: 'uuid', nullable: true })
  closeRequestedById: string | null;

  @Column({ type: 'datetime', nullable: true })
  closeRequestedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedById: string | null;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date | null;

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

  @ManyToOne(() => CheckupUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: CheckupUser | null;

  @ManyToOne(() => CheckupUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closeRequestedById' })
  closeRequestedBy: CheckupUser | null;

  @ManyToOne(() => CheckupUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closedById' })
  closedBy: CheckupUser | null;

  @OneToMany(() => CheckupPreassessmentTicketMessage, (msg) => msg.ticket)
  messages: CheckupPreassessmentTicketMessage[];
}
