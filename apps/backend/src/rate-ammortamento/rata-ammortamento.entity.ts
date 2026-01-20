import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PianoAmmortamento } from './piano-ammortamento.entity';

@Entity('rate_ammortamento')
export class RataAmmortamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  pianoId: string;

  @ManyToOne(() => PianoAmmortamento, (piano) => piano.rate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pianoId' })
  piano: PianoAmmortamento;

  // Numero progressivo della rata (1, 2, 3, ...)
  @Column({ type: 'int' })
  numeroRata: number;

  // Importo della rata (totale)
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  importo: number;

  // Quota capitale della rata
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  quotaCapitale: number;

  // Quota interessi della rata
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  quotaInteressi: number;

  // Data di scadenza della rata
  @Column({ type: 'date' })
  dataScadenza: string;

  // Flag per indicare se la rata è stata pagata
  @Column({ type: 'boolean', default: false })
  pagata: boolean;

  // Data del pagamento (se pagata)
  @Column({ type: 'date', nullable: true })
  dataPagamento: string | null;

  // Metodo di pagamento
  @Column({ type: 'varchar', length: 50, nullable: true })
  metodoPagamento: string | null;

  // Codice/riferimento del pagamento
  @Column({ type: 'varchar', length: 255, nullable: true })
  codicePagamento: string | null;

  // Path della ricevuta caricata
  @Column({ type: 'varchar', length: 500, nullable: true })
  ricevutaPath: string | null;

  // ID del movimento finanziario creato per questa rata (recupero capitale)
  @Column({ type: 'varchar', length: 36, nullable: true })
  movimentoFinanziarioId: string | null;

  // ID del movimento finanziario per il recupero interessi
  @Column({ type: 'varchar', length: 36, nullable: true })
  movimentoInteressiId: string | null;

  // Note sulla rata
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
