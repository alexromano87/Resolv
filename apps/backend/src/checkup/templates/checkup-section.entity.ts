import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CheckupTemplate } from './checkup-template.entity';
import { CheckupQuestion } from './checkup-question.entity';

@Entity('checkup_sections')
export class CheckupSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @Column({ type: 'varchar', length: 10 })
  codice: string;

  @Column({ length: 255 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descrizione: string | null;

  @Column({ type: 'int', default: 0 })
  ordine: number;

  @Column({ default: true })
  attivo: boolean;

  @ManyToOne(() => CheckupTemplate, (template) => template.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: CheckupTemplate;

  @OneToMany(() => CheckupQuestion, (question) => question.section)
  questions: CheckupQuestion[];
}
