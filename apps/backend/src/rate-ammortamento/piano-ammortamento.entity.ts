import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Pratica } from '../pratiche/pratica.entity';
import { RataAmmortamento } from './rata-ammortamento.entity';

export type StatoPiano = 'attivo' | 'chiuso_positivo' | 'chiuso_negativo' | 'sospeso';
export type TipoInteresse = 'legale' | 'moratorio' | 'fisso';
export type TipoAmmortamento = 'italiano' | 'francese';
export type Capitalizzazione = 'nessuna' | 'trimestrale' | 'semestrale' | 'annuale';

@Entity('piani_ammortamento')
export class PianoAmmortamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  praticaId: string;

  @ManyToOne(() => Pratica, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticaId' })
  pratica: Pratica;

  @OneToMany(() => RataAmmortamento, (rata) => rata.piano, { cascade: true })
  rate: RataAmmortamento[];

  // Capitale iniziale del piano
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  capitaleIniziale: number;

  // Numero totale di rate
  @Column({ type: 'int' })
  numeroRate: number;

  // Data di inizio del piano
  @Column({ type: 'date' })
  dataInizio: string;

  // Stato del piano
  @Column({ type: 'varchar', length: 20, default: 'attivo' })
  stato: StatoPiano;

  // Data di chiusura (se chiuso)
  @Column({ type: 'date', nullable: true })
  dataChiusura: string | null;

  // Importo recuperato al momento della chiusura
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  importoRecuperato: number | null;

  // Flag per indicare se l'importo è stato inserito nei movimenti finanziari
  @Column({ type: 'boolean', default: false })
  importoInserito: boolean;

  // ID del movimento finanziario creato (se inserito)
  @Column({ type: 'varchar', length: 36, nullable: true })
  movimentoFinanziarioId: string | null;

  // Note sul piano
  @Column({ type: 'text', nullable: true })
  note: string | null;

  // ============================================
  // CAMPI PER GESTIONE INTERESSI
  // ============================================

  // Flag: applica calcolo interessi
  @Column({ type: 'boolean', default: false })
  applicaInteressi: boolean;

  // Tipo di interesse (legale, moratorio, fisso)
  @Column({
    type: 'enum',
    enum: ['legale', 'moratorio', 'fisso'],
    nullable: true,
  })
  tipoInteresse: TipoInteresse | null;

  // Tasso percentuale (per fisso o override)
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

  // Tipo di ammortamento (italiano o francese)
  @Column({
    type: 'enum',
    enum: ['italiano', 'francese'],
    default: 'italiano',
  })
  tipoAmmortamento: TipoAmmortamento;

  // Tipo di capitalizzazione
  @Column({
    type: 'enum',
    enum: ['nessuna', 'trimestrale', 'semestrale', 'annuale'],
    default: 'nessuna',
  })
  capitalizzazione: Capitalizzazione;

  // Data inizio maturazione interessi
  @Column({ type: 'date', nullable: true })
  dataInizioInteressi: string | null;

  // Transazione conclusa entro il 31/12/2012 (interessi moratori previgenti)
  @Column({ type: 'boolean', default: false })
  moratorioPre2013: boolean;

  // Maggiorazione aggiuntiva per prodotti agricoli e agroalimentari
  @Column({ type: 'boolean', default: false })
  moratorioMaggiorazione: boolean;

  // Percentuale maggiorazione (2 o 4)
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

  // Applica art. 1194 c.c. per imputazione acconti
  @Column({ type: 'boolean', default: true })
  applicaArt1194: boolean;

  // Totale interessi calcolati
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
  totaleInteressi: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
