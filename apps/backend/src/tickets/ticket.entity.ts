// apps/backend/src/tickets/ticket.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm';
import { Pratica } from '../pratiche/pratica.entity';
import { Studio } from '../studi/studio.entity';

export type TicketStato = 'aperto' | 'in_gestione' | 'chiuso';
export type TicketPriorita = 'bassa' | 'normale' | 'alta' | 'urgente';
export type TicketCategoria = 'richiesta_informazioni' | 'documentazione' | 'pagamenti' | 'segnalazione_problema' | 'altro';

export interface MessaggioTicket {
  id: string;
  autore: string; // 'studio' | 'cliente'
  autoreNome?: string;
  testo: string;
  dataInvio: Date;
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  numeroTicket: string;

  // --- Studio di appartenenza ---
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.tickets, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  @Column({ type: 'uuid', nullable: true })
  alertId: string | null;

  @Column({ type: 'uuid', nullable: true })
  praticaId: string | null;

  @ManyToOne(() => Pratica, { eager: true, nullable: true })
  @JoinColumn({ name: 'praticaId' })
  pratica: Pratica | null;

  @Column({ type: 'varchar', length: 255 })
  oggetto: string;

  @Column({ type: 'text' })
  descrizione: string;

  @Column({ type: 'varchar', length: 100 })
  autore: string; // Nome del richiedente

  @Column({ type: 'enum', enum: ['richiesta_informazioni', 'documentazione', 'pagamenti', 'segnalazione_problema', 'altro'], default: 'richiesta_informazioni' })
  categoria: TicketCategoria;

  @Column({ type: 'enum', enum: ['bassa', 'normale', 'alta', 'urgente'], default: 'normale' })
  priorita: TicketPriorita;

  @Column({ type: 'enum', enum: ['aperto', 'in_gestione', 'chiuso'], default: 'aperto' })
  stato: TicketStato;

  @Column({ type: 'json', nullable: true })
  messaggi: MessaggioTicket[];

  @Column({ type: 'boolean', default: true })
  attivo: boolean;

  @CreateDateColumn()
  dataCreazione: Date;

  @UpdateDateColumn()
  dataAggiornamento: Date;

  @Column({ type: 'timestamp', nullable: true })
  dataChiusura: Date | null;
}
