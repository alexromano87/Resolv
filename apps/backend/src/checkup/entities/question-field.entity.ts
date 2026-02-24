import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuestionSection } from './question-section.entity';

@Entity('checkup_question_fields')
export class QuestionField {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  fieldId: string; // 'ragione_sociale', 'forma_giuridica', etc.

  @Column({ length: 300 })
  label: string;

  @Column({ length: 50 })
  type: string; // 'text', 'textarea', 'select', 'radio', 'checkbox', 'date', etc.

  @Column({ type: 'json', nullable: true })
  options: string[]; // For select/radio/checkbox types

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'text', nullable: true })
  help: string; // Tooltip text - this is what the user sees with the "?"

  @Column({ default: true })
  allowDocuments: boolean;

  @Column({ type: 'float', default: 1 })
  weight: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => QuestionSection, (section) => section.fields, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sectionId' })
  section: QuestionSection;

  @Column()
  sectionId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
