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

@Entity('checkup_direct_chat_conversations')
@Index('IDX_checkup_direct_chat_conversations_user_one', ['userOneId'])
@Index('IDX_checkup_direct_chat_conversations_user_two', ['userTwoId'])
export class CheckupDirectChatConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userOneId: string;

  @Column({ type: 'uuid' })
  userTwoId: string;

  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ type: 'uuid' })
  createdById: string;

  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  userOneArchivedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  userTwoArchivedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  userOneDeletedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  userTwoDeletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userOneId' })
  userOne: CheckupUser;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userTwoId' })
  userTwo: CheckupUser;

  @ManyToOne(() => CheckupUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: CheckupUser;
}
