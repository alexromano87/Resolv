import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { QuestionMacroArea } from './question-macro-area.entity';

@Entity('checkup_question_models')
export class QuestionModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 150 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: true })
  attivo: boolean;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'uuid', nullable: true })
  parentModelId: string | null;

  @OneToMany(() => QuestionMacroArea, (macro) => macro.model)
  macroAreas: QuestionMacroArea[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
