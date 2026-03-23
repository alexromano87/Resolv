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
import { CheckupLicense } from './checkup-license.entity';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { QuestionModel } from '../entities/question-model.entity';

@Entity('checkup_sublicenses')
export class CheckupSublicense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  licenseId: string;

  @Column({ type: 'uuid' })
  modelId: string;

  @Column({ type: 'uuid', nullable: true })
  clienteStudioId: string | null;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  @Index('UQ_checkup_sublicenses_numero', { unique: true })
  @Column({ type: 'varchar', length: 16, nullable: true })
  numeroSublicenza: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tipo: string | null;

  @Column({ type: 'int' })
  numeroUtenze: number;

  @Column({ type: 'date', nullable: true })
  dataInizioValidita: string | null;

  @Column({ type: 'date', nullable: true })
  dataScadenza: string | null;

  @Column({ default: true })
  attiva: boolean;

  @Column({ default: true })
  allowDocuments: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CheckupLicense, (license) => license.sublicenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'licenseId' })
  license: CheckupLicense;

  @ManyToOne(() => CheckupStudio, (studio) => studio.sublicensesAsCliente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clienteStudioId' })
  clienteStudio: CheckupStudio | null;

  @ManyToOne(() => CheckupClient, (client) => client.sublicenses, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clientId' })
  client: CheckupClient | null;

  @ManyToOne(() => QuestionModel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'modelId' })
  model: QuestionModel;
}
