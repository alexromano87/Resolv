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
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { createEncryptedJsonTransformer } from '../encryption/checkup-json-encryption';

const encryptedStringMapTransformer = createEncryptedJsonTransformer<Record<string, string>>();
const encryptedBooleanMapTransformer = createEncryptedJsonTransformer<Record<string, boolean>>();
const encryptedMacroValidationTransformer = createEncryptedJsonTransformer<Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>>();
const encryptedSectionValidationTransformer = createEncryptedJsonTransformer<Record<string, { by: { id: string; name: string; ruolo: string }; at: string }>>();
const encryptedFieldMetaTransformer = createEncryptedJsonTransformer<Record<string, { updatedAt: string; updatedBy: { id: string; name: string; ruolo: string } }>>();
const encryptedFinalValidationTransformer = createEncryptedJsonTransformer<{ by: { id: string; name: string; ruolo: string }; at: string }>();

@Entity('checkup_preassessments')
export class CheckupPreassessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedStringMapTransformer })
  data: Record<string, string> | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedStringMapTransformer })
  notes: Record<string, string> | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedStringMapTransformer })
  fieldNotes: Record<string, string> | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedStringMapTransformer })
  userFieldNotes: Record<string, string> | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedBooleanMapTransformer })
  naFields: Record<string, boolean> | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedMacroValidationTransformer })
  macroValidations: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }> | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedSectionValidationTransformer })
  sectionValidations: Record<string, { by: { id: string; name: string; ruolo: string }; at: string }> | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedFieldMetaTransformer })
  fieldMeta: Record<string, { updatedAt: string; updatedBy: { id: string; name: string; ruolo: string } }> | null;

  @Column({ type: 'varchar', length: 20, default: 'in_progress' })
  status: 'in_progress' | 'concluso';

  @Column({ type: 'longtext', nullable: true, transformer: encryptedFinalValidationTransformer })
  finalValidation: { by: { id: string; name: string; ruolo: string }; at: string } | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  completedById: string | null;

  @Column({ default: false })
  studioCanEdit: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ default: true })
  isLatest: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date | null;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;

  @ManyToOne(() => CheckupClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: CheckupClient;
}
