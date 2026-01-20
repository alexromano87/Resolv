import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OneToMany } from 'typeorm';
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

@Entity('clienti')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // --- Stato attivo/disattivato (soft-delete) ---
  @Column({ default: true })
  attivo: boolean;

  // --- Studio di appartenenza ---
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.clienti, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  @Column({ type: 'varchar', length: 20, default: 'persona_giuridica' })
  tipoSoggetto: TipoSoggetto;

  @Column()
  ragioneSociale: string;

  @Column({ nullable: true, length: 16 })
  codiceFiscale?: string;

  @Column({ nullable: true, length: 11 })
  partitaIva?: string;

  // --- Dati aziendali / sedi ---

  @Column({ nullable: true })
  sedeLegale?: string;       // es: via + civico + CAP + città (oppure descrizione libera)

  @Column({ nullable: true })
  sedeOperativa?: string;

  @Column({ nullable: true })
  indirizzo?: string;

  @Column({ nullable: true, length: 5 })
  cap?: string;

  @Column({ nullable: true })
  citta?: string;

  @Column({ nullable: true, length: 2 })
  provincia?: string;

  @Column({ nullable: true, length: 2 })
  nazione?: string;

  // --- Tipologia / referente ---

  @Column({ nullable: true })
  tipologia?: TipologiaAzienda;

  @Column({ nullable: true })
  referente?: string;

  @Column({ nullable: true })
  referenteNome?: string;

  @Column({ nullable: true })
  referenteCognome?: string;

  @Column({ nullable: true })
  referenteEmail?: string;

  // --- Contatti ---

  @Column({ nullable: true })
  telefono?: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  pec?: string;

  // --- Configurazione condivisione dashboard ---
  @Column({ type: 'json', nullable: true })
  configurazioneCondivisione?: {
    abilitata: boolean;
    dashboard: {
      stats: boolean;
      kpi: boolean;
    };
    pratiche: {
      elenco: boolean;
      dettagli: boolean;
      documenti: boolean;
      movimentiFinanziari: boolean;
      timeline: boolean;
    };
  };

  @OneToMany(() => ClienteDebitore, (cd) => cd.cliente)
  clientiDebitori: ClienteDebitore[];
}
