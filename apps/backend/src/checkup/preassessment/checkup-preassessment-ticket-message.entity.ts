import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckupPreassessmentTicket } from './checkup-preassessment-ticket.entity';
import { CheckupUser } from '../users/checkup-user.entity';

@Entity('checkup_ticket_messages')
export class CheckupPreassessmentTicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticketId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  messaggio: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CheckupPreassessmentTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: CheckupPreassessmentTicket;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;
}
