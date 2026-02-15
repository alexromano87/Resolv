import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CheckupQuestionnaire } from '../questionnaires/checkup-questionnaire.entity';
import { CheckupQuestion } from '../templates/checkup-question.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupDocument } from '../documents/checkup-document.entity';

@Entity('checkup_answers')
@Unique(['questionnaireId', 'questionId'])
export class CheckupAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  questionnaireId: string;

  @Column({ type: 'uuid' })
  questionId: string;

  @Column({ type: 'text', nullable: true })
  valore: string | null;

  @Column({ default: false })
  richiesto: boolean;

  @Column({ default: false })
  evaso: boolean;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CheckupQuestionnaire, (q) => q.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionnaireId' })
  questionnaire: CheckupQuestionnaire;

  @ManyToOne(() => CheckupQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: CheckupQuestion;

  @ManyToOne(() => CheckupUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser: CheckupUser | null;

  @OneToMany(() => CheckupDocument, (doc) => doc.answer)
  documents: CheckupDocument[];
}
