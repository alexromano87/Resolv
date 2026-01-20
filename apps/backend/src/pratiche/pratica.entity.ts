// src/pratiche/pratica.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { User } from '../users/user.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Studio } from '../studi/studio.entity';

// Esito della pratica (solo se chiusa)
export type EsitoPratica = 'positivo' | 'negativo' | null;

// Evento che si è verificato durante una fase
export interface EventoFase {
  tipo: 'documento_caricato' | 'documento_eliminato' | 'avvocato_aggiunto' | 'avvocato_rimosso' | 'collaboratore_aggiunto' | 'collaboratore_rimosso' | 'movimento_finanziario' | 'note_fase_modificate' | 'piano_ammortamento_creato' | 'piano_ammortamento_pagamento' | 'piano_ammortamento_storno';
  data: string; // ISO date
  eseguitoDa?: string; // Nome utente che ha eseguito l'azione
  dettagli: any; // Dettagli specifici dell'evento
}

// Entry nello storico delle fasi
export interface StoricoFase {
  faseId: string;
  faseCodice: string;
  faseNome: string;
  dataInizio: string; // ISO date
  dataFine?: string; // ISO date, null se fase corrente
  note?: string; // Note inserite al momento del cambio fase
  noteFase?: string; // Note specifiche della fase, salvate quando la fase viene chiusa
  cambiatoDaUserId?: string; // ID dell'utente che ha eseguito il cambio fase
  cambiatoDaNome?: string; // Nome completo dell'utente che ha eseguito il cambio fase
  // Eventi accaduti durante questa fase
  eventi?: EventoFase[];
}

export type EsitoOpposizione = 'rigetto' | 'accoglimento_parziale' | 'accoglimento_totale';
export type TipoPignoramento = 'mobiliare_debitore' | 'mobiliare_terzi' | 'immobiliare';
export type EsitoPignoramento = 'iscrizione_a_ruolo' | 'desistenza' | 'opposizione';

export interface OpposizioneDettagli {
  esito?: EsitoOpposizione;
  dataEsito?: string;
  note?: string;
}

export interface PignoramentoDettagli {
  tipo?: TipoPignoramento;
  dataNotifica?: string;
  esito?: EsitoPignoramento;
  note?: string;
}

@Entity('pratiche')
export class Pratica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Numero progressivo pratica (formato: numero/anno) ---
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  numeroPratica?: string;

  // --- Stato attivo/disattivato (soft-delete) ---
  @Column({ default: true })
  attivo: boolean;

  // --- Relazioni con Cliente e Debitore ---

  @Column({ type: 'uuid' })
  clienteId: string;

  @ManyToOne(() => Cliente, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.pratiche, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  @Column({ type: 'uuid' })
  debitoreId: string;

  @ManyToOne(() => Debitore, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'debitoreId' })
  debitore: Debitore;

  // --- Relazione con avvocati (many-to-many) ---
  @ManyToMany(() => Avvocato, (avvocato) => avvocato.pratiche)
  @JoinTable({
    name: 'pratiche_avvocati',
    joinColumn: { name: 'praticaId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'avvocatoId', referencedColumnName: 'id' },
  })
  avvocati: Avvocato[];

  // --- Relazione con collaboratori (many-to-many) ---
  @ManyToMany(() => User)
  @JoinTable({
    name: 'pratiche_collaboratori',
    joinColumn: { name: 'praticaId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  collaboratori: User[];

  // --- Relazione con movimenti finanziari (one-to-many) ---
  @OneToMany(() => MovimentoFinanziario, (movimento) => movimento.pratica)
  movimentiFinanziari: MovimentoFinanziario[];

  // --- Fase corrente (ID hardcoded, es. 'fase-001') ---
  @Column({ type: 'varchar', length: 20, default: 'fase-001' })
  faseId: string;

  // --- Stato della pratica ---

  @Column({ default: true })
  aperta: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  esito: EsitoPratica;

  // --- Importi finanziari ---
  // Tutti i campi decimal per precisione monetaria

  // Capitale da recuperare (importo originale del credito)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  capitale: number;

  // Capitale già recuperato
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  importoRecuperatoCapitale: number;

  // Anticipazioni (spese anticipate dallo studio)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  anticipazioni: number;

  // Anticipazioni già recuperate
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  importoRecuperatoAnticipazioni: number;

  // Compensi legali maturati
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  compensiLegali: number;

  // Compensi già liquidati/incassati
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  compensiLiquidati: number;

  // --- Interessi e more (opzionali, per calcoli futuri) ---

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  interessi: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  interessiRecuperati: number;

  // Gestione calcolo interessi automatico
  @Column({ type: 'boolean', default: false })
  applicaInteressi: boolean;

  @Column({ type: 'enum', enum: ['legale', 'moratorio', 'fisso'], nullable: true })
  tipoInteresse: 'legale' | 'moratorio' | 'fisso' | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  tassoInteresse: number | null;

  @Column({ type: 'date', nullable: true })
  dataInizioInteressi: Date | null;

  @Column({ type: 'date', nullable: true })
  dataFineMaturazione: Date | null;

  // Interessi maturati nel periodo precedente (prima di una ripresa)
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  interessiPeriodoPrecedente: number;

  @Column({ type: 'boolean', default: false })
  moratorioPre2013: boolean;

  @Column({ type: 'boolean', default: false })
  moratorioMaggiorazione: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseFloat(value) : null),
    },
  })
  moratorioPctMaggiorazione: number | null;

  // --- Note e descrizione ---

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'text', nullable: true })
  noteFase?: string; // Note specifiche per la fase corrente, resettate ad ogni cambio fase

  @Column({ nullable: true })
  riferimentoCredito?: string; // es. numero fattura, contratto, etc.

  // --- Storico fasi (JSON) ---
  // Contiene l'array di StoricoFase per tracciare i passaggi
  @Column({ type: 'json', nullable: true })
  storico?: StoricoFase[];

  @Column({ type: 'json', nullable: true })
  opposizione?: OpposizioneDettagli;

  @Column({ type: 'json', nullable: true })
  pignoramento?: PignoramentoDettagli;

  // --- Date importanti ---

  @Column({ type: 'date', nullable: true })
  dataAffidamento?: Date; // quando il cliente ha affidato la pratica

  @Column({ type: 'date', nullable: true })
  dataChiusura?: Date; // quando la pratica è stata chiusa

  @Column({ type: 'date', nullable: true })
  dataScadenza?: Date; // scadenza/termine importante

  // --- Meta ---

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
