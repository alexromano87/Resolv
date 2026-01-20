// src/relazioni/cliente-debitore.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';

@Entity('clienti_debitori')
export class ClienteDebitore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clienteId: string;

  @Column()
  debitoreId: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.clientiDebitori, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @ManyToOne(() => Debitore, (debitore) => debitore.clientiDebitori, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'debitoreId' })
  debitore: Debitore;

  @Column({ default: true })
  attivo: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
