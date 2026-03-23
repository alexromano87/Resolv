import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupSublicense } from './checkup-sublicense.entity';

@Entity('checkup_licenses')
export class CheckupLicense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @Column({ length: 255 })
  intestatario: string;

  @Column({ length: 100 })
  tipo: string;

  @Column({ type: 'int' })
  numeroUtenze: number;

  @Column({ type: 'int', default: 0 })
  numeroSottolicenze: number;

  @Column({ type: 'varchar', length: 16, unique: true, nullable: true })
  numeroLicenza: string | null;

  @Column({ type: 'date', nullable: true })
  dataInizioValidita: string | null;

  @Column({ type: 'date', nullable: true })
  dataScadenza: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => CheckupStudio, (studio) => studio.license, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studioId' })
  studio: CheckupStudio | null;

  @OneToMany(() => CheckupSublicense, (sublicense) => sublicense.license)
  sublicenses: CheckupSublicense[];
}
