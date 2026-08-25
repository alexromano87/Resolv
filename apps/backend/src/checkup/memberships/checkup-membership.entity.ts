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
import type { CheckupUserRole } from '../users/checkup-user.entity';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupAnagraficaLicenziatario } from '../anagrafiche/checkup-anagrafica-licenziatario.entity';

/**
 * Appartenenza (membership): collega un'identità (CheckupUser, con email unica)
 * a un contesto operativo (studio/cliente/sublicenza/anagrafica) con un ruolo.
 *
 * Un utente può avere più appartenenze attive contemporaneamente — es. la stessa
 * persona può essere `collaboratore` di un sublicenziatario E `admin_studio` di un
 * licenziatario diretto. Le colonne "legacy" su CheckupUser rappresentano
 * l'appartenenza attiva/primaria (isPrimary=true) per retro-compatibilità.
 */
@Entity('checkup_memberships')
@Index('IDX_checkup_memberships_user', ['userId'])
@Index('IDX_checkup_memberships_studio', ['studioId'])
@Index('IDX_checkup_memberships_client', ['clientId'])
export class CheckupMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ['admin_studio', 'segreteria', 'collaboratore', 'cliente'],
    default: 'cliente',
  })
  ruolo: CheckupUserRole;

  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sublicenseId: string | null;

  @Column({ type: 'uuid', nullable: true })
  anagraficaId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  azienda: string | null;

  @Column({ type: 'json', nullable: true })
  macroAreaOwner: string[] | null;

  @Column({ type: 'json', nullable: true })
  macroAreaAssignments: string[] | null;

  @Column({ type: 'boolean', default: false })
  superOwner: boolean;

  /** Appartenenza attiva di default per l'utente (rispecchia le colonne legacy di CheckupUser). */
  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ default: true })
  attiva: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CheckupUser, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: CheckupUser;

  @ManyToOne(() => CheckupStudio, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'studioId' })
  studio: CheckupStudio | null;

  @ManyToOne(() => CheckupClient, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clientId' })
  client: CheckupClient | null;

  @ManyToOne(() => CheckupSublicense, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sublicenseId' })
  sublicense: CheckupSublicense | null;

  @ManyToOne(() => CheckupAnagraficaLicenziatario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'anagraficaId' })
  anagrafica: CheckupAnagraficaLicenziatario | null;
}
