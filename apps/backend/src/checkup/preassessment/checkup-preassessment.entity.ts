import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckupUser } from '../users/checkup-user.entity';

@Entity('checkup_preassessments')
export class CheckupPreassessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, string> | null;

  @Column({ type: 'json', nullable: true })
  notes: Record<string, string> | null;

  @Column({ type: 'json', nullable: true })
  fieldNotes: Record<string, string> | null;

  @Column({ default: false })
  studioCanEdit: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;
}
