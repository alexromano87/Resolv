import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Cliente } from '../clienti/cliente.entity';

@Entity('report_clienti')
export class ReportCliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  clienteId: string;

  @ManyToOne(() => Cliente, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: process.env.DB_USE_SQLITE === 'true' ? 'blob' : 'longblob' })
  pdf: Buffer;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
