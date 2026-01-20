import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TipoTasso = 'legale' | 'moratorio';

@Entity('tasso_interesse')
export class TassoInteresse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['legale', 'moratorio'],
  })
  tipo: TipoTasso;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  tassoPercentuale: number;

  @Column({ type: 'date' })
  dataInizioValidita: Date;

  @Column({ type: 'date', nullable: true })
  dataFineValidita: Date | null;

  @Column({ nullable: true })
  decretoRiferimento: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
