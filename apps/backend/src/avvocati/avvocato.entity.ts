// apps/backend/src/avvocati/avvocato.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pratica } from '../pratiche/pratica.entity';
import { Studio } from '../studi/studio.entity';

// Livello di accesso alle pratiche
export type LivelloAccessoPratiche = 'solo_proprie' | 'tutte';

// Livello di permessi
export type LivelloPermessi = 'visualizzazione' | 'modifica';

@Entity('avvocati')
export class Avvocato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Stato attivo/disattivato (soft-delete) ---
  @Column({ default: true })
  attivo: boolean;

  // --- Studio di appartenenza ---
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.avvocati, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  // --- Dati anagrafici ---
  @Column({ length: 100 })
  nome: string;

  @Column({ length: 100 })
  cognome: string;

  @Column({ length: 16, nullable: true })
  codiceFiscale?: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  telefono?: string;

  // --- Permessi e accesso ---
  @Column({
    type: 'varchar',
    length: 20,
    default: 'solo_proprie',
  })
  livelloAccessoPratiche: LivelloAccessoPratiche;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'modifica',
  })
  livelloPermessi: LivelloPermessi;

  // --- Note ---
  @Column({ type: 'text', nullable: true })
  note?: string;

  // --- Relazione con pratiche (many-to-many) ---
  @ManyToMany(() => Pratica, (pratica) => pratica.avvocati)
  pratiche: Pratica[];

  // --- Meta ---
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
