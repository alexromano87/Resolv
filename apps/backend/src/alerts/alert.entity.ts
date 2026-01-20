// apps/backend/src/alerts/alert.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pratica } from '../pratiche/pratica.entity';
import { Studio } from '../studi/studio.entity';

export type AlertStato = 'in_gestione' | 'chiuso';
export type AlertDestinatario = 'studio' | 'cliente';
export type AlertModalitaNotifica = 'popup';

export interface MessaggioAlert {
  id: string;
  autore: string; // 'studio' | 'cliente'
  testo: string;
  dataInvio: Date;
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Studio di appartenenza ---
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.alerts, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  @Column({ type: 'uuid' })
  praticaId: string;

  @ManyToOne(() => Pratica, { eager: true })
  @JoinColumn({ name: 'praticaId' })
  pratica: Pratica;

  @Column({ type: 'varchar', length: 255 })
  titolo: string;

  @Column({ type: 'text' })
  descrizione: string;

  @Column({ type: 'enum', enum: ['studio', 'cliente'] })
  destinatario: AlertDestinatario;

  @Column({ type: 'enum', enum: ['popup'], default: 'popup' })
  modalitaNotifica: AlertModalitaNotifica;

  @Column({ type: 'boolean', default: false })
  clienteCanClose: boolean;

  @Column({ type: 'datetime' })
  dataScadenza: Date;

  @Column({ type: 'int', default: 3 })
  giorniAnticipo: number; // giorni prima della scadenza per notifica

  @Column({ type: 'enum', enum: ['in_gestione', 'chiuso'], default: 'in_gestione' })
  stato: AlertStato;

  @Column({ type: 'json', nullable: true })
  messaggi: MessaggioAlert[];

  @Column({ type: 'boolean', default: true })
  attivo: boolean;

  @CreateDateColumn()
  dataCreazione: Date;

  @UpdateDateColumn()
  dataAggiornamento: Date;

  @Column({ type: 'timestamp', nullable: true })
  dataChiusura: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  creatoDa: string | null; // Nome dell'utente che ha creato l'alert
}
