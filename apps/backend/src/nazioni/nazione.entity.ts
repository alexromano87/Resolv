import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('nazioni')
export class Nazione {
  @PrimaryColumn({ type: 'varchar', length: 2 })
  codice: string;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({ type: 'boolean', default: true })
  attiva: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
