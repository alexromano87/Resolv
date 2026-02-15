import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CheckupSection } from './checkup-section.entity';

@Entity('checkup_templates')
export class CheckupTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descrizione: string | null;

  @Column({ type: 'varchar', length: 20, default: '1.0' })
  versione: string;

  @Column({ default: true })
  attivo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CheckupSection, (section) => section.template)
  sections: CheckupSection[];
}
