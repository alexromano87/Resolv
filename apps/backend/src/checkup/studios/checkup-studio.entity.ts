import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';

@Entity('checkup_studios')
export class CheckupStudio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  nome: string;

  @Column({
    type: 'enum',
    enum: ['licenziatario', 'cliente'],
    default: 'licenziatario',
  })
  tipo: 'licenziatario' | 'cliente';

  @Column({ type: 'varchar', length: 255, nullable: true })
  ragioneSociale: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  partitaIva: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codiceFiscale: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  indirizzo: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  citta: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  provincia: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cap: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  paese: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  sitoWeb: string | null;

  @Column({ type: 'longtext', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /**
   * Riferimento all'entità reale di origine quando questo studio è stato creato
   * riusando l'anagrafica di uno studio/sublicenziatario esistente (es. R&S Italy
   * sublicenziatario → R&S Italy licenziatario diretto). Solo tracciabilità.
   */
  @Column({ type: 'uuid', nullable: true })
  linkedStudioId: string | null;

  @Column({ default: true })
  attivo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => CheckupUser, (user) => user.studio)
  users: CheckupUser[];

  @OneToOne(() => CheckupLicense, (license) => license.studio)
  license: CheckupLicense | null;

  @OneToMany(() => CheckupSublicense, (sublicense) => sublicense.clienteStudio)
  sublicensesAsCliente: CheckupSublicense[];
}
