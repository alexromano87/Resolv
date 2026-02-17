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
import { CheckupClient } from '../clients/checkup-client.entity';

@Entity('checkup_preassessments')
export class CheckupPreassessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, string> | null;

  @Column({ type: 'json', nullable: true })
  notes: Record<string, string> | null;

  @Column({ type: 'json', nullable: true })
  fieldNotes: Record<string, string> | null;

  @Column({ type: 'json', nullable: true })
  naFields: Record<string, boolean> | null;

  @Column({ type: 'json', nullable: true })
  macroValidations: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }> | null;

  @Column({ type: 'json', nullable: true })
  fieldMeta: Record<string, { updatedAt: string; updatedBy: { id: string; name: string; ruolo: string } }> | null;

  @Column({ default: false })
  studioCanEdit: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;

  @ManyToOne(() => CheckupClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: CheckupClient;
}
