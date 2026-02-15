import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LicensePlan = 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';
export type LicenseRequestStatus = 'pending' | 'provisioned' | 'rejected';

@Entity('license_requests')
export class LicenseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['starter', 'professional', 'enterprise'] })
  plan: LicensePlan;

  @Column({ type: 'enum', enum: ['monthly', 'annual'] })
  billingCycle: BillingCycle;

  @Column({ type: 'enum', enum: ['pending', 'provisioned', 'rejected'], default: 'pending' })
  status: LicenseRequestStatus;

  @Column()
  studioNome: string;

  @Column({ type: 'varchar', length: 40 })
  studioTipologia: 'individuale' | 'associato' | 'societa_tra_professionisti';

  @Column({ type: 'int', nullable: true })
  studioMaxUtenti: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  studioRagioneSociale: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  studioPartitaIva: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  studioCodiceFiscale: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  studioIndirizzo: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  studioCitta: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  studioCap: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  studioProvincia: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  studioTelefono: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  studioEmail: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  studioPec: string | null;

  @Column()
  adminEmail: string;

  @Column()
  adminNome: string;

  @Column()
  adminCognome: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  adminTelefono: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  adminCodiceFiscale: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  provisionedStudioId: string | null;

  @Column({ type: 'uuid', nullable: true })
  provisionedAdminUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
