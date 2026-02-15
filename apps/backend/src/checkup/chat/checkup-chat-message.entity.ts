import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckupQuestionnaire } from '../questionnaires/checkup-questionnaire.entity';
import { CheckupSection } from '../templates/checkup-section.entity';
import { CheckupQuestion } from '../templates/checkup-question.entity';
import { CheckupUser } from '../users/checkup-user.entity';

@Entity('checkup_chat_messages')
export class CheckupChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  questionnaireId: string;

  @Column({ type: 'uuid' })
  sectionId: string;

  @Column({ type: 'uuid', nullable: true })
  questionId: string | null;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  messaggio: string;

  @Column({ default: false })
  letto: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CheckupQuestionnaire, (q) => q.chatMessages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionnaireId' })
  questionnaire: CheckupQuestionnaire;

  @ManyToOne(() => CheckupSection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section: CheckupSection;

  @ManyToOne(() => CheckupQuestion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'questionId' })
  question: CheckupQuestion | null;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;
}
