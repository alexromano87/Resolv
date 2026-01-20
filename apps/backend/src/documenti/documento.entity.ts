// apps/backend/src/documenti/documento.entity.ts
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
import { Cartella } from '../cartelle/cartella.entity';
import { Studio } from '../studi/studio.entity';

export type TipoDocumento = 'pdf' | 'word' | 'excel' | 'immagine' | 'csv' | 'xml' | 'altro';

export type TipologiaDocumento = 'Cliente' | 'Stragiudiziale' | 'Ingiunzione' | 'Esecuzione' | 'Pagamenti' | 'Altro';

@Entity('documenti')
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Studio di appartenenza ---
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.documenti, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  @Column({ type: 'varchar', length: 255 })
  nome: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descrizione: string | null;

  @Column({ type: 'varchar', length: 500 })
  percorsoFile: string; // Path where the file is stored on disk

  @Column({ type: 'varchar', length: 255 })
  nomeOriginale: string; // Original filename uploaded by user

  @Column({ type: 'varchar', length: 50 })
  estensione: string; // File extension (pdf, docx, etc.)

  @Column({ type: 'enum', enum: ['pdf', 'word', 'excel', 'immagine', 'csv', 'xml', 'altro'] })
  tipo: TipoDocumento;

  @Column({ type: 'enum', enum: ['Cliente', 'Stragiudiziale', 'Ingiunzione', 'Esecuzione', 'Pagamenti', 'Altro'], nullable: true })
  tipologia: TipologiaDocumento | null;

  @Column({ type: 'bigint' })
  dimensione: number; // File size in bytes

  @Column({ type: 'varchar', length: 100, nullable: true })
  caricatoDa: string | null; // User who uploaded the document

  @Column({ type: 'uuid', nullable: true })
  praticaId: string | null;

  @ManyToOne(() => Pratica, { nullable: true })
  @JoinColumn({ name: 'praticaId' })
  pratica: Pratica | null;

  @Column({ type: 'uuid', nullable: true })
  cartellaId: string | null;

  @ManyToOne(() => Cartella, (cartella) => cartella.documenti, { nullable: true })
  @JoinColumn({ name: 'cartellaId' })
  cartella: Cartella | null;

  @Column({ type: 'boolean', default: true })
  attivo: boolean;

  @CreateDateColumn()
  dataCreazione: Date;

  @UpdateDateColumn()
  dataAggiornamento: Date;
}
