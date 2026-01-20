import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Pratica } from '../pratiche/pratica.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Documento } from '../documenti/documento.entity';
import { Cartella } from '../cartelle/cartella.entity';
import { User } from '../users/user.entity';

export interface OrphanDataReport {
  praticheSenzaStudio: number;
  clientiSenzaStudio: number;
  debitoriSenzaStudio: number;
  avvocatiSenzaStudio: number;
  movimentiFinanziariSenzaStudio: number;
  alertsSenzaStudio: number;
  ticketsSenzaStudio: number;
  documentiSenzaStudio: number;
  cartelleSenzaStudio: number;
  utentiSenzaStudio: number;
}

@Injectable()
export class AdminMaintenanceService {
  constructor(
    @InjectRepository(Pratica)
    private praticheRepository: Repository<Pratica>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(Debitore)
    private debitoreRepository: Repository<Debitore>,
    @InjectRepository(Avvocato)
    private avvocatoRepository: Repository<Avvocato>,
    @InjectRepository(MovimentoFinanziario)
    private movimentiFinanziariRepository: Repository<MovimentoFinanziario>,
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Documento)
    private documentoRepository: Repository<Documento>,
    @InjectRepository(Cartella)
    private cartellaRepository: Repository<Cartella>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getOrphanData(): Promise<OrphanDataReport> {
    const [
      praticheSenzaStudio,
      clientiSenzaStudio,
      debitoriSenzaStudio,
      avvocatiSenzaStudio,
      movimentiFinanziariSenzaStudio,
      alertsSenzaStudio,
      ticketsSenzaStudio,
      documentiSenzaStudio,
      cartelleSenzaStudio,
      utentiSenzaStudio,
    ] = await Promise.all([
      this.praticheRepository.count({ where: { studioId: IsNull() } }),
      this.clienteRepository.count({ where: { studioId: IsNull() } }),
      this.debitoreRepository.count({ where: { studioId: IsNull() } }),
      this.avvocatoRepository.count({ where: { studioId: IsNull() } }),
      this.movimentiFinanziariRepository.count({ where: { studioId: IsNull() } }),
      this.alertRepository.count({ where: { studioId: IsNull() } }),
      this.ticketRepository.count({ where: { studioId: IsNull() } }),
      this.documentoRepository.count({ where: { studioId: IsNull() } }),
      this.cartellaRepository.count({ where: { studioId: IsNull() } }),
      this.userRepository.count({ where: { studioId: IsNull(), ruolo: Not('admin') } }),
    ]);

    return {
      praticheSenzaStudio,
      clientiSenzaStudio,
      debitoriSenzaStudio,
      avvocatiSenzaStudio,
      movimentiFinanziariSenzaStudio,
      alertsSenzaStudio,
      ticketsSenzaStudio,
      documentiSenzaStudio,
      cartelleSenzaStudio,
      utentiSenzaStudio,
    };
  }

  async assignOrphanDataToStudio(studioId: string): Promise<{ message: string; updated: any }> {
    const [
      pratiche,
      clienti,
      debitori,
      avvocati,
      movimenti,
      alerts,
      tickets,
      documenti,
      cartelle,
      utenti,
    ] = await Promise.all([
      this.praticheRepository.update({ studioId: IsNull() }, { studioId }),
      this.clienteRepository.update({ studioId: IsNull() }, { studioId }),
      this.debitoreRepository.update({ studioId: IsNull() }, { studioId }),
      this.avvocatoRepository.update({ studioId: IsNull() }, { studioId }),
      this.movimentiFinanziariRepository.update({ studioId: IsNull() }, { studioId }),
      this.alertRepository.update({ studioId: IsNull() }, { studioId }),
      this.ticketRepository.update({ studioId: IsNull() }, { studioId }),
      this.documentoRepository.update({ studioId: IsNull() }, { studioId }),
      this.cartellaRepository.update({ studioId: IsNull() }, { studioId }),
      this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ studioId })
        .where('studioId IS NULL AND ruolo != :ruolo', { ruolo: 'admin' })
        .execute(),
    ]);

    return {
      message: 'Dati orfani assegnati con successo',
      updated: {
        pratiche: pratiche.affected || 0,
        clienti: clienti.affected || 0,
        debitori: debitori.affected || 0,
        avvocati: avvocati.affected || 0,
        movimentiFinanziari: movimenti.affected || 0,
        alerts: alerts.affected || 0,
        tickets: tickets.affected || 0,
        documenti: documenti.affected || 0,
        cartelle: cartelle.affected || 0,
        utenti: utenti.affected || 0,
      },
    };
  }
}
