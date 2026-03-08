import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';

@Entity('checkup_clients')
export class CheckupClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome: string | null;

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

  @Column({ default: true })
  attivo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date | null;

  @OneToMany(() => CheckupUser, (user) => user.client)
  users: CheckupUser[];

  @OneToMany(() => CheckupSublicense, (sublicense) => sublicense.client)
  sublicenses: CheckupSublicense[];
}
