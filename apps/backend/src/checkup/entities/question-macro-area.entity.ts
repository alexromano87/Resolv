import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuestionSection } from './question-section.entity';
import { QuestionModel } from './question-model.entity';

@Entity('checkup_question_macro_areas')
export class QuestionMacroArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 10 })
  code: string; // 'a', 'b', 'c', etc.

  @Column({ length: 100 })
  label: string;

  @Column({ length: 7 })
  color: string; // HEX color

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'uuid' })
  modelId: string;

  @ManyToOne(() => QuestionModel, (model) => model.macroAreas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modelId' })
  model: QuestionModel;

  @OneToMany(() => QuestionSection, (section) => section.macroArea)
  sections: QuestionSection[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
