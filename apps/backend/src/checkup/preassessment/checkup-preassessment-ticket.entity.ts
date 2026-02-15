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
  status: 'open' | 'closed';

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

  @OneToMany(() => CheckupPreassessmentTicketMessage, (msg) => msg.ticket)
  messages: CheckupPreassessmentTicketMessage[];
}
