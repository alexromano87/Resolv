import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { QuestionMacroArea } from './question-macro-area.entity';
import { QuestionField } from './question-field.entity';

@Entity('checkup_question_sections')
export class QuestionSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string; // 'a_1', 'a_2', etc.

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => QuestionMacroArea, (macro) => macro.sections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'macroAreaId' })
  macroArea: QuestionMacroArea;

  @Column()
  macroAreaId: number;

  @OneToMany(() => QuestionField, (field) => field.section)
  fields: QuestionField[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
