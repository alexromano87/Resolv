import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckupQuestionnaire } from '../questionnaires/checkup-questionnaire.entity';
import { CheckupAnswer } from '../answers/checkup-answer.entity';
import { CheckupSection } from '../templates/checkup-section.entity';
import { CheckupUser } from '../users/checkup-user.entity';

export type CheckupDocumentType = 'pdf' | 'word' | 'excel' | 'immagine' | 'csv' | 'xml' | 'altro';

@Entity('checkup_documents')
export class CheckupDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  questionnaireId: string;

  @Column({ type: 'uuid', nullable: true })
  answerId: string | null;

  @Column({ type: 'uuid', nullable: true })
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
  tipo: CheckupDocumentType;

  @Column({ type: 'bigint' })
  dimensione: number;

  @Column({ type: 'uuid', nullable: true })
  caricatoDa: string | null;

  @Column({ default: true })
  attivo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CheckupQuestionnaire, (q) => q.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionnaireId' })
  questionnaire: CheckupQuestionnaire;

  @ManyToOne(() => CheckupAnswer, (a) => a.documents, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'answerId' })
  answer: CheckupAnswer | null;

  @ManyToOne(() => CheckupSection, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sectionId' })
  section: CheckupSection | null;

  @ManyToOne(() => CheckupUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'caricatoDa' })
  caricatoDaUser: CheckupUser | null;
}
