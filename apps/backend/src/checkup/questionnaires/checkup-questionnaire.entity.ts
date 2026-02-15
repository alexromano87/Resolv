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
import { CheckupTemplate } from '../templates/checkup-template.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupAnswer } from '../answers/checkup-answer.entity';
import { CheckupDocument } from '../documents/checkup-document.entity';
import { CheckupChatMessage } from '../chat/checkup-chat-message.entity';

export type CheckupQuestionnaireStato = 'bozza' | 'in_compilazione' | 'completato' | 'revisionato';

@Entity('checkup_questionnaires')
export class CheckupQuestionnaire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @Column({ type: 'uuid' })
  clienteUserId: string;

  @Column({ type: 'uuid', nullable: true })
  assegnatoDaId: string | null;

  @Column({
    type: 'enum',
    enum: ['bozza', 'in_compilazione', 'completato', 'revisionato'],
    default: 'bozza',
  })
  stato: CheckupQuestionnaireStato;

  @Column({ type: 'int', default: 0 })
  percentualeCompletamento: number;

  @Column({ type: 'datetime', nullable: true })
  dataAssegnazione: Date | null;

  @Column({ type: 'datetime', nullable: true })
  dataCompletamento: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ default: true })
  attivo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CheckupTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'templateId' })
  template: CheckupTemplate;

  @ManyToOne(() => CheckupUser, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clienteUserId' })
  cliente: CheckupUser;

  @ManyToOne(() => CheckupUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assegnatoDaId' })
  assegnatoDa: CheckupUser | null;

  @OneToMany(() => CheckupAnswer, (answer) => answer.questionnaire)
  answers: CheckupAnswer[];

  @OneToMany(() => CheckupDocument, (doc) => doc.questionnaire)
  documents: CheckupDocument[];

  @OneToMany(() => CheckupChatMessage, (msg) => msg.questionnaire)
  chatMessages: CheckupChatMessage[];
}
