import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CheckupSection } from './checkup-section.entity';

export type CheckupQuestionType = 'text' | 'yesno' | 'choice' | 'number' | 'date';

@Entity('checkup_questions')
export class CheckupQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sectionId: string;

  @Column({ type: 'text' })
  testo: string;

  @Column({
    type: 'enum',
    enum: ['text', 'yesno', 'choice', 'number', 'date'],
    default: 'text',
  })
  tipo: CheckupQuestionType;

  @Column({ type: 'json', nullable: true })
  opzioni: string[] | null;

  @Column({ type: 'int', default: 0 })
  ordine: number;

  @Column({ default: false })
  obbligatoria: boolean;

  @Column({ default: true })
  accettaDocumenti: boolean;

  @Column({ type: 'uuid', nullable: true })
  parentQuestionId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  parentConditionValue: string | null;

  @Column({ default: true })
  attivo: boolean;

  @ManyToOne(() => CheckupSection, (section) => section.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section: CheckupSection;

  @ManyToOne(() => CheckupQuestion, (q) => q.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentQuestionId' })
  parent: CheckupQuestion | null;

  @OneToMany(() => CheckupQuestion, (q) => q.parent)
  children: CheckupQuestion[];
}
