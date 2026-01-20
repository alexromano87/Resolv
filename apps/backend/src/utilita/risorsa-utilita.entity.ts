// apps/backend/src/utilita/risorsa-utilita.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Studio } from '../studi/studio.entity';

export type TipoRisorsaUtilita = 'manuale' | 'video_tutorial' | 'nota_aggiornamento' | 'altra_risorsa';

@Entity('risorse_utilita')
export class RisorsaUtilita {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  studioId: string | null;

  @ManyToOne(() => Studio, { nullable: true })
  @JoinColumn({ name: 'studioId' })
  studio: Studio | null;

  @Column({ type: 'varchar', length: 255 })
  titolo: string;

  @Column({ type: 'text', nullable: true })
  descrizione: string | null;

  @Column({ type: 'enum', enum: ['manuale', 'video_tutorial', 'nota_aggiornamento', 'altra_risorsa'] })
  tipo: TipoRisorsaUtilita;

  // Per file (manuale, altre risorse)
  @Column({ type: 'varchar', length: 500, nullable: true })
  percorsoFile: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nomeOriginale: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  estensione: string | null;

  @Column({ type: 'bigint', nullable: true })
  dimensione: number | null;

  // Per video tutorial (URL)
  @Column({ type: 'varchar', length: 500, nullable: true })
  urlVideo: string | null;

  // Per note di aggiornamento (contenuto testuale)
  @Column({ type: 'text', nullable: true })
  contenutoNota: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  versione: string | null; // Per note di aggiornamento

  @Column({ type: 'varchar', length: 100, nullable: true })
  caricatoDa: string | null;

  @Column({ type: 'boolean', default: true })
  attivo: boolean;

  @CreateDateColumn()
  dataCreazione: Date;

  @UpdateDateColumn()
  dataAggiornamento: Date;
}
