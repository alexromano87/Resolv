import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupUser } from '../users/checkup-user.entity';

export type CheckupPreassessmentDocumentType = 'pdf' | 'word' | 'excel' | 'immagine' | 'csv' | 'xml' | 'altro';

@Entity('checkup_preassessment_documents')
export class CheckupPreassessmentDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  preassessmentId: string;

  @Column({ type: 'varchar', length: 255 })
  fieldId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sectionId: string | null;

  @Column({ length: 255 })
  nome: string;

  @Column({ length: 255 })
  nomeOriginale: string;

  @Column({ type: 'varchar', length: 500 })
  percorsoFile: string;

  @Column({ type: 'varchar', length: 50 })
  estensione: string;

  @Column({
    type: 'enum',
    enum: ['pdf', 'word', 'excel', 'immagine', 'csv', 'xml', 'altro'],
    default: 'altro',
  })
  tipo: CheckupPreassessmentDocumentType;

  @Column({ type: 'bigint' })
  dimensione: number;

  @Column({ type: 'uuid', nullable: true })
  caricatoDa: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sha256: string | null;

  @Column({ default: true })
  attivo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CheckupPreassessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'preassessmentId' })
  preassessment: CheckupPreassessment;

  @ManyToOne(() => CheckupUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'caricatoDa' })
  caricatoDaUser: CheckupUser | null;
}
