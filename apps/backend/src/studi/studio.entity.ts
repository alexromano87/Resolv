import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Documento } from '../documenti/documento.entity';
import { Cartella } from '../cartelle/cartella.entity';

@Entity('studi')
export class Studio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  ragioneSociale: string;

  @Column({ nullable: true })
  partitaIva: string;

  @Column({ nullable: true })
  codiceFiscale: string;

  @Column({ nullable: true })
  indirizzo: string;

  @Column({ nullable: true })
  citta: string;

  @Column({ nullable: true })
  cap: string;

  @Column({ nullable: true })
  provincia: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  pec: string;

  @Column({ type: 'text', nullable: true })
  logo: string | null; // Base64 encoded logo image

  @Column({ default: true })
  attivo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // Relazioni
  @OneToMany(() => User, (user) => user.studio)
  users: User[];

  @OneToMany(() => Pratica, (pratica) => pratica.studio)
  pratiche: Pratica[];

  @OneToMany(() => Cliente, (cliente) => cliente.studio)
  clienti: Cliente[];

  @OneToMany(() => Debitore, (debitore) => debitore.studio)
  debitori: Debitore[];

  @OneToMany(() => Avvocato, (avvocato) => avvocato.studio)
  avvocati: Avvocato[];

  @OneToMany(() => MovimentoFinanziario, (movimento) => movimento.studio)
  movimentiFinanziari: MovimentoFinanziario[];

  @OneToMany(() => Alert, (alert) => alert.studio)
  alerts: Alert[];

  @OneToMany(() => Ticket, (ticket) => ticket.studio)
  tickets: Ticket[];

  @OneToMany(() => Documento, (documento) => documento.studio)
  documenti: Documento[];

  @OneToMany(() => Cartella, (cartella) => cartella.studio)
  cartelle: Cartella[];
}
