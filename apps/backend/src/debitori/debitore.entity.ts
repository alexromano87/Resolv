// src/debitori/debitore.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClienteDebitore } from '../relazioni/cliente-debitore.entity';
import { Studio } from '../studi/studio.entity';

export type TipoSoggetto = 'persona_fisica' | 'persona_giuridica';

export type TipologiaAzienda =
  | 'impresa_individuale'
  | 'impresa_individuale_agricola'
  | 'srl'
  | 'spa'
  | 'scpa'
  | 'srl_agricola'
  | 'snc'
  | 'sas';

@Entity('debitori')
export class Debitore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Stato attivo/disattivato (soft-delete) ---
  @Column({ default: true })
  attivo: boolean;

  // --- Studio di appartenenza ---
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.debitori, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  @Column({ type: 'varchar', length: 20 })
  tipoSoggetto: TipoSoggetto;

  // --- Persona fisica ---

  @Column({ nullable: true })
  nome?: string;

  @Column({ nullable: true })
  cognome?: string;

  @Column({ nullable: true, length: 16 })
  codiceFiscale?: string;

  @Column({ type: 'date', nullable: true })
  dataNascita?: Date;

  @Column({ nullable: true })
  luogoNascita?: string;

  // --- Persona giuridica ---

  @Column({ nullable: true })
  ragioneSociale?: string;

  @Column({ nullable: true, length: 11 })
  partitaIva?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tipologia?: TipologiaAzienda;

  @Column({ nullable: true })
  sedeLegale?: string;

  @Column({ nullable: true })
  sedeOperativa?: string;

  // --- Indirizzo / recapito (comune PF/PG) ---

  @Column({ nullable: true })
  indirizzo?: string;

  @Column({ nullable: true, length: 10 })
  cap?: string;

  @Column({ nullable: true })
  citta?: string;

  @Column({ nullable: true, length: 2 })
  provincia?: string;

  @Column({ nullable: true, length: 2 })
  nazione?: string;

  // --- Contatti / referente ---

  @Column({ nullable: true })
  referente?: string;

  @Column({ nullable: true })
  telefono?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  pec?: string;

  // --- Relazioni ---

  @OneToMany(() => ClienteDebitore, (cd) => cd.debitore)
  clientiDebitori: ClienteDebitore[];

  // --- Meta ---

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}