import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';

@Entity('checkup_anagrafiche_licenziatario')
@Index('IDX_checkup_anagrafiche_studio', ['studioId'])
export class CheckupAnagraficaLicenziatario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studioId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  titolo: string | null;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'varchar', length: 100 })
  cognome: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  pec: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  partitaIva: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codiceFiscale: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  indirizzo: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  citta: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  provincia: string | null;

  @Column({ default: true })
  attiva: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => CheckupStudio, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studioId' })
  studio: CheckupStudio;

  @OneToMany(() => CheckupUser, (user) => user.anagrafica)
  users: CheckupUser[];

  @OneToMany(() => CheckupSublicense, (sublicense) => sublicense.consultantAnagrafica)
  sublicenses: CheckupSublicense[];
}
