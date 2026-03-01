import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CheckupUser } from '../users/checkup-user.entity';

export type CheckupAuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'TOGGLE_ACTIVE'
  | 'RESET_PASSWORD'
  | 'ASSIGN'
  | 'UPLOAD_FILE'
  | 'DOWNLOAD_FILE'
  | 'DELETE_FILE'
  | 'EXPORT_DATA'
  | 'BACKUP_DATA'
  | 'IMPORT_DATA';

export type CheckupAuditEntity =
  | 'STUDIO'
  | 'CLIENTE'
  | 'UTENTE'
  | 'LICENZA'
  | 'SUBLICENZA'
  | 'MODELLO'
  | 'DOMANDA'
  | 'PREASSESSMENT'
  | 'REPORT'
  | 'DOCUMENTO'
  | 'CHAT'
  | 'TICKET'
  | 'ALERT'
  | 'SYSTEM';

@Entity('checkup_audit_logs')
@Index(['createdAt'])
@Index(['userId'])
@Index(['entityType'])
@Index(['action'])
export class CheckupAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => CheckupUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userEmail: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  userRole: string | null;

  @Column({ type: 'enum', enum: [
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'CREATE', 'UPDATE', 'DELETE', 'VIEW',
    'TOGGLE_ACTIVE', 'RESET_PASSWORD', 'ASSIGN',
    'UPLOAD_FILE', 'DOWNLOAD_FILE', 'DELETE_FILE',
    'EXPORT_DATA', 'BACKUP_DATA', 'IMPORT_DATA',
  ] })
  action: CheckupAuditAction;

  @Column({ type: 'enum', enum: [
    'STUDIO', 'CLIENTE', 'UTENTE', 'LICENZA', 'SUBLICENZA',
    'MODELLO', 'DOMANDA', 'PREASSESSMENT', 'REPORT',
    'DOCUMENTO', 'CHAT', 'TICKET', 'ALERT', 'SYSTEM',
  ] })
  entityType: CheckupAuditEntity;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;
}
