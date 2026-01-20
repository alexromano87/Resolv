// apps/backend/src/movimenti-finanziari/movimento-finanziario.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Pratica } from '../pratiche/pratica.entity';
import { Studio } from '../studi/studio.entity';

// Tipo di movimento finanziario
export type TipoMovimento =
  | 'capitale' // Capitale iniziale o aggiuntivo da recuperare (deprecato, usare capitale_originario o nuovo_capitale)
  | 'capitale_originario' // Capitale iniziale della pratica (impostato alla creazione)
  | 'nuovo_capitale' // Capitale aggiuntivo aggiunto successivamente
  | 'anticipazione' // Spese anticipate dallo studio
  | 'compenso' // Compensi legali maturati
  | 'interessi' // Interessi e more
  | 'altro' // Altri importi dovuti (es. imposta di registro)
  | 'recupero_capitale' // Pagamento ricevuto sul capitale
  | 'recupero_anticipazione' // Rimborso anticipazioni
  | 'recupero_compenso' // Liquidazione compensi
  | 'recupero_interessi' // Pagamento interessi
  | 'recupero_altro'; // Recupero altri importi

@Entity('movimenti_finanziari')
export class MovimentoFinanziario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Studio di appartenenza ---
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.movimentiFinanziari, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  // --- Relazione con pratica ---
  @Column({ type: 'uuid' })
  praticaId: string;

  @ManyToOne(() => Pratica, (pratica) => pratica.movimentiFinanziari, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'praticaId' })
  pratica: Pratica;

  // --- Tipo e importo ---
  @Column({ type: 'varchar', length: 30 })
  tipo: TipoMovimento;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  importo: number;

  // --- Data e descrizione ---
  @Column({ type: 'date' })
  data: Date;

  @Column({ type: 'text', nullable: true })
  oggetto?: string; // Descrizione/causale del movimento

  // --- Gestione fatturazione (solo per compensi e anticipazioni) ---
  @Column({ type: 'boolean', nullable: true, default: null })
  daFatturare?: boolean | null; // Se true, l'importo deve essere fatturato al cliente

  @Column({ type: 'boolean', nullable: true, default: null })
  giaFatturato?: boolean | null; // Se true, l'importo è già stato fatturato al cliente

  // --- Meta ---
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
