import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export type AuditAction =
  // Auth
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  // CRUD operations
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  // Specific operations
  | 'TOGGLE_ACTIVE'
  | 'RESET_PASSWORD'
  | 'ASSIGN_STUDIO'
  | 'UPLOAD_FILE'
  | 'DOWNLOAD_FILE'
  | 'DELETE_FILE'
  | 'EXPORT_DATA'
  | 'BACKUP_STUDIO'
  | 'IMPORT_DATA';

export type AuditEntity =
  | 'USER'
  | 'STUDIO'
  | 'CLIENTE'
  | 'DEBITORE'
  | 'PRATICA'
  | 'AVVOCATO'
  | 'MOVIMENTO_FINANZIARIO'
  | 'ALERT'
  | 'TICKET'
  | 'DOCUMENTO'
  | 'CARTELLA'
  | 'SYSTEM';

@Entity('audit_logs')
@Index(['createdAt'])
@Index(['userId'])
@Index(['entityType'])
@Index(['action'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  // Chi ha eseguito l'azione
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userEmail: string | null; // Manteniamo anche l'email per storico

  @Column({ type: 'varchar', length: 50, nullable: true })
  userRole: string | null;

  // Cosa è stato fatto
  @Column({ type: 'enum', enum: [
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'CREATE', 'UPDATE', 'DELETE', 'VIEW',
    'TOGGLE_ACTIVE', 'RESET_PASSWORD', 'ASSIGN_STUDIO',
    'UPLOAD_FILE', 'DOWNLOAD_FILE', 'DELETE_FILE',
    'EXPORT_DATA', 'BACKUP_STUDIO', 'IMPORT_DATA'
  ]})
  action: AuditAction;

  // Su quale entità
  @Column({ type: 'enum', enum: [
    'USER', 'STUDIO', 'CLIENTE', 'DEBITORE', 'PRATICA',
    'AVVOCATO', 'MOVIMENTO_FINANZIARIO', 'ALERT', 'TICKET',
    'DOCUMENTO', 'CARTELLA', 'SYSTEM'
  ]})
  entityType: AuditEntity;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityName: string | null; // Nome descrittivo dell'entità per facilità di lettura

  // Dettagli
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null; // Dati aggiuntivi (es: campi modificati, valori prima/dopo)

  // IP e User Agent
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  // Studio associato (per filtrare per studio)
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  // Esito
  @Column({ default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;
}
