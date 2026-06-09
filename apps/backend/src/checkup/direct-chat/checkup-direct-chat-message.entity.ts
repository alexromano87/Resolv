import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupDirectChatConversation } from './checkup-direct-chat-conversation.entity';

@Entity('checkup_direct_chat_messages')
@Index('IDX_checkup_direct_chat_messages_conversation', ['conversationId'])
@Index('IDX_checkup_direct_chat_messages_user', ['userId'])
export class CheckupDirectChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'text' })
  messaggio: string;

  @Column({ default: false })
  letto: boolean;

  @Column({ type: 'datetime', nullable: true })
  editedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  deletedForEveryoneAt: Date | null;

  @Column({ type: 'json', nullable: true })
  deletedForUserIds: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CheckupDirectChatConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: CheckupDirectChatConversation;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;
}
