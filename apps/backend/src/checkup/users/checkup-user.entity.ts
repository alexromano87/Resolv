import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';

export type CheckupUserRole = 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';

@Entity('checkup_users')
export class CheckupUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ length: 100 })
  nome: string;

  @Column({ length: 100 })
  cognome: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({
    type: 'enum',
    enum: ['admin_studio', 'segreteria', 'collaboratore', 'cliente'],
    default: 'cliente',
  })
  ruolo: CheckupUserRole;

  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sublicenseId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  azienda: string | null;

  @Column({ type: 'json', nullable: true })
  macroAreaOwner: string[] | null;

  @Column({ type: 'json', nullable: true })
  macroAreaAssignments: string[] | null;

  @Column({ type: 'boolean', default: false })
  superOwner: boolean;

  @Column({ default: true })
  attivo: boolean;

  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastLogin: Date | null;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  twoFactorChannel: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  twoFactorCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  twoFactorCodeExpires: Date | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  twoFactorCodePurpose: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date | null;

  @ManyToOne(() => CheckupStudio, (studio) => studio.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'studioId' })
  studio: CheckupStudio | null;

  @ManyToOne(() => CheckupClient, (client) => client.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clientId' })
  client: CheckupClient | null;

  @ManyToOne(() => CheckupSublicense, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sublicenseId' })
  sublicense: CheckupSublicense | null;
}
