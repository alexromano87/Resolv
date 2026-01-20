// apps/backend/src/cartelle/cartella.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { Pratica } from '../pratiche/pratica.entity';
import { Documento } from '../documenti/documento.entity';
import { Studio } from '../studi/studio.entity';

export type TipologiaCartella = 'Cliente' | 'Stragiudiziale' | 'Ingiunzione' | 'Esecuzione' | 'Pagamenti' | 'Altro';

@Entity('cartelle')
@Tree('closure-table')
export class Cartella {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Studio di appartenenza ---
  @Column({ type: 'uuid', nullable: true })
  studioId: string | null;

  @ManyToOne(() => Studio, (studio) => studio.cartelle, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  @Column({ type: 'varchar', length: 255 })
  nome: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descrizione: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  colore: string | null; // Optional color for UI visualization

  @Column({ type: 'enum', enum: ['Cliente', 'Stragiudiziale', 'Ingiunzione', 'Esecuzione', 'Pagamenti', 'Altro'], nullable: true })
  tipologia: TipologiaCartella | null;

  @Column({ type: 'uuid', nullable: true })
  praticaId: string | null;

  @ManyToOne(() => Pratica, { nullable: true })
  @JoinColumn({ name: 'praticaId' })
  pratica: Pratica | null;

  @TreeParent()
  cartellaParent: Cartella | null;

  @TreeChildren()
  sottoCartelle: Cartella[];

  @OneToMany(() => Documento, (documento) => documento.cartella)
  documenti: Documento[];

  @Column({ type: 'boolean', default: true })
  attivo: boolean;

  @CreateDateColumn()
  dataCreazione: Date;

  @UpdateDateColumn()
  dataAggiornamento: Date;
}
