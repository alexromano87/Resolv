import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Pratica } from '../pratiche/pratica.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Studio } from '../studi/studio.entity';
import { User } from '../users/user.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { Documento } from '../documenti/documento.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';
import type { CurrentUserData } from '../auth/current-user.decorator';

type SharedTimelineEventType = 'fase' | 'opposizione' | 'pignoramento';

interface SharedTimelineEvent {
  praticaId: string;
  praticaLabel: string;
  title: string;
  date: string;
  detail?: string;
  tipo: SharedTimelineEventType;
}

export interface DashboardStats {
  numeroPratiche: number;
  praticheAperte: number;
  praticheChiuse: number;
  praticheChiusePositive: number;
  praticheChiuseNegative: number;

  // Conteggi alert e tickets
  alertAttivi: number;
  ticketsAperti: number;

  // Importi totali affidati
  capitaleAffidato: number;
  interessiAffidati: number;
  anticipazioniAffidate: number;
  compensiAffidati: number;

  // Importi recuperati
  capitaleRecuperato: number;
  interessiRecuperati: number;
  anticipazioniRecuperate: number;
  compensiRecuperati: number;

  // Capital da recuperare
  capitaleDaRecuperare: number;

  // Percentuali recupero
  percentualeRecuperoCapitale: number;
  percentualeRecuperoInteressi: number;
  percentualeRecuperoAnticipazioni: number;
  percentualeRecuperoCompensi: number;
  percentualeCapitaleDaRecuperare: number;
}

export interface KPI {
  totalePraticheAffidate: number;
  totalePraticheChiuse: number;
  percentualeChiusura: number;

  esitoNegativo: number;
  esitoPositivo: number;
  esitoPositivoParziale: number;
  esitoPositivoTotale: number;

  recuperoCapitale: {
    totale: number;
    parziale: number;
    completo: number;
  };

  recuperoInteressi: {
    totale: number;
    parziale: number;
    completo: number;
  };

  recuperoCompensi: {
    totale: number;
    parziale: number;
    completo: number;
  };
}

export interface AdminDashboardStats {
  totali: {
    studi: number;
    studiAttivi: number;
    utenti: number;
    utentiAttivi: number;
    pratiche: number;
    praticheAperte: number;
    clienti: number;
    debitori: number;
    avvocati: number;
  };

  perStudio: Array<{
    studioId: string;
    studioNome: string;
    studioAttivo: boolean;
    numeroUtenti: number;
    numeroPratiche: number;
    numeroClienti: number;
    numeroDebitori: number;
    numeroAvvocati: number;
  }>;

  attivitaRecente: {
    ultimiUtentiCreati: Array<{
      id: string;
      nome: string;
      cognome: string;
      email: string;
      ruolo: string;
      studioNome: string | null;
      createdAt: Date;
    }>;

    ultimePraticheCreate: Array<{
      id: string;
      numeroProtocollo: string;
      cliente: string;
      debitore: string;
      studioNome: string | null;
      createdAt: Date;
    }>;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Pratica)
    private praticheRepository: Repository<Pratica>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Debitore)
    private debitoreRepository: Repository<Debitore>,
    @InjectRepository(Avvocato)
    private avvocatoRepository: Repository<Avvocato>,
    @InjectRepository(Documento)
    private documentiRepository: Repository<Documento>,
    @InjectRepository(MovimentoFinanziario)
    private movimentiRepository: Repository<MovimentoFinanziario>,
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) {}

  async getStats(
    clienteId?: string,
    studioId?: string,
    user?: CurrentUserData,
  ): Promise<DashboardStats> {
    const query = this.praticheRepository
      .createQueryBuilder('pratica')
      .where('pratica.attivo = :attivo', { attivo: true });

    if (clienteId) {
      query.andWhere('pratica.clienteId = :clienteId', { clienteId });
    }

    if (studioId !== undefined) {
      query.andWhere('pratica.studioId = :studioId', { studioId });
    }

    if (user) {
      if (user.ruolo === 'cliente') {
        if (!user.clienteId) {
          query.andWhere('1 = 0');
        }
      } else if (user.ruolo === 'avvocato') {
        const canSeeAll = await this.canAvvocatoSeeAll(user);
        if (!canSeeAll) {
          const email = user.email?.toLowerCase().trim();
          if (!email) {
            query.andWhere('1 = 0');
          } else {
            query
              .leftJoin('pratica.avvocati', 'avvocato_access')
              .andWhere('LOWER(avvocato_access.email) = :email', { email });
          }
        }
      } else if (user.ruolo === 'collaboratore') {
        query
          .leftJoin('pratica.collaboratori', 'collaboratore_access')
          .andWhere('collaboratore_access.id = :userId', { userId: user.id });
      }
    }

    const pratiche = await query.getMany();

    const numeroPratiche = pratiche.length;
    const praticheAperte = pratiche.filter(p => p.aperta).length;
    const praticheChiuse = pratiche.filter(p => !p.aperta).length;

    // Pratiche chiuse per esito
    const praticheChiusePositive = pratiche.filter(
      p => !p.aperta && (
        p.importoRecuperatoCapitale > 0 ||
        p.importoRecuperatoAnticipazioni > 0 ||
        p.interessiRecuperati > 0 ||
        p.compensiLiquidati > 0
      )
    ).length;

    const praticheChiuseNegative = praticheChiuse - praticheChiusePositive;

    // Somme totali affidati
    const capitaleAffidato = pratiche.reduce((sum, p) => sum + (p.capitale || 0), 0);
    const interessiAffidati = pratiche.reduce((sum, p) => sum + (p.interessi || 0), 0);
    const anticipazioniAffidate = pratiche.reduce((sum, p) => sum + (p.anticipazioni || 0), 0);
    const compensiAffidati = pratiche.reduce((sum, p) => sum + (p.compensiLegali || 0), 0);

    // Somme totali recuperati
    const capitaleRecuperato = pratiche.reduce((sum, p) => sum + (p.importoRecuperatoCapitale || 0), 0);
    const interessiRecuperati = pratiche.reduce((sum, p) => sum + (p.interessiRecuperati || 0), 0);
    const anticipazioniRecuperate = pratiche.reduce((sum, p) => sum + (p.importoRecuperatoAnticipazioni || 0), 0);
    const compensiRecuperati = pratiche.reduce((sum, p) => sum + (p.compensiLiquidati || 0), 0);

    // Percentuali di recupero
    const percentualeRecuperoCapitale = capitaleAffidato > 0
      ? (capitaleRecuperato / capitaleAffidato) * 100
      : 0;
    const percentualeRecuperoInteressi = interessiAffidati > 0
      ? (interessiRecuperati / interessiAffidati) * 100
      : 0;
    const percentualeRecuperoAnticipazioni = anticipazioniAffidate > 0
      ? (anticipazioniRecuperate / anticipazioniAffidate) * 100
      : 0;
    const percentualeRecuperoCompensi = compensiAffidati > 0
      ? (compensiRecuperati / compensiAffidati) * 100
      : 0;

    // Capitale da recuperare
    const capitaleDaRecuperare = capitaleAffidato - capitaleRecuperato;
    const percentualeCapitaleDaRecuperare = capitaleAffidato > 0
      ? (capitaleDaRecuperare / capitaleAffidato) * 100
      : 0;

    // Conta alert attivi
    const alertQuery = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.stato = :stato', { stato: 'in_gestione' });

    if (studioId !== undefined) {
      alertQuery.andWhere('alert.studioId = :studioId', { studioId });
    }

    const alertAttivi = await alertQuery.getCount();

    // Conta tickets aperti
    const ticketQuery = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.stato = :stato', { stato: 'aperto' });

    if (studioId !== undefined) {
      ticketQuery.andWhere('ticket.studioId = :studioId', { studioId });
    }

    const ticketsAperti = await ticketQuery.getCount();

    return {
      numeroPratiche,
      praticheAperte,
      praticheChiuse,
      praticheChiusePositive,
      praticheChiuseNegative,
      alertAttivi,
      ticketsAperti,
      capitaleAffidato,
      interessiAffidati,
      anticipazioniAffidate,
      compensiAffidati,
      capitaleRecuperato,
      interessiRecuperati,
      anticipazioniRecuperate,
      compensiRecuperati,
      capitaleDaRecuperare,
      percentualeRecuperoCapitale,
      percentualeRecuperoInteressi,
      percentualeRecuperoAnticipazioni,
      percentualeRecuperoCompensi,
      percentualeCapitaleDaRecuperare,
    };
  }

  async getKPI(
    clienteId?: string,
    studioId?: string,
    user?: CurrentUserData,
  ): Promise<KPI> {
    const query = this.praticheRepository
      .createQueryBuilder('pratica')
      .where('pratica.attivo = :attivo', { attivo: true });

    if (clienteId) {
      query.andWhere('pratica.clienteId = :clienteId', { clienteId });
    }

    if (studioId !== undefined) {
      query.andWhere('pratica.studioId = :studioId', { studioId });
    }

    if (user) {
      if (user.ruolo === 'cliente') {
        if (!user.clienteId) {
          query.andWhere('1 = 0');
        }
      } else if (user.ruolo === 'avvocato') {
        const canSeeAll = await this.canAvvocatoSeeAll(user);
        if (!canSeeAll) {
          const email = user.email?.toLowerCase().trim();
          if (!email) {
            query.andWhere('1 = 0');
          } else {
            query
              .leftJoin('pratica.avvocati', 'avvocato_access')
              .andWhere('LOWER(avvocato_access.email) = :email', { email });
          }
        }
      } else if (user.ruolo === 'collaboratore') {
        query
          .leftJoin('pratica.collaboratori', 'collaboratore_access')
          .andWhere('collaboratore_access.id = :userId', { userId: user.id });
      }
    }

    const pratiche = await query.getMany();

    const totalePraticheAffidate = pratiche.length;
    const totalePraticheChiuse = pratiche.filter(p => !p.aperta).length;
    const percentualeChiusura = totalePraticheAffidate > 0
      ? (totalePraticheChiuse / totalePraticheAffidate) * 100
      : 0;

    const praticheChiuse = pratiche.filter(p => !p.aperta);

    // Esiti
    const esitoNegativo = praticheChiuse.filter(
      p => p.importoRecuperatoCapitale === 0 &&
           p.importoRecuperatoAnticipazioni === 0 &&
           p.interessiRecuperati === 0 &&
           p.compensiLiquidati === 0
    ).length;

    const esitoPositivo = praticheChiuse.length - esitoNegativo;

    // Esito positivo: totale vs parziale
    const esitoPositivoTotale = praticheChiuse.filter(p => {
      const capitaleOk = p.capitale === 0 || p.importoRecuperatoCapitale >= p.capitale;
      const interessiOk = p.interessi === 0 || p.interessiRecuperati >= p.interessi;
      const anticipazioniOk = p.anticipazioni === 0 || p.importoRecuperatoAnticipazioni >= p.anticipazioni;
      const compensiOk = p.compensiLegali === 0 || p.compensiLiquidati >= p.compensiLegali;

      return capitaleOk && interessiOk && anticipazioniOk && compensiOk &&
             (p.importoRecuperatoCapitale > 0 || p.importoRecuperatoAnticipazioni > 0 ||
              p.interessiRecuperati > 0 || p.compensiLiquidati > 0);
    }).length;

    const esitoPositivoParziale = esitoPositivo - esitoPositivoTotale;

    // Recupero capitale
    const capitaleRecuperatoTotale = praticheChiuse.reduce(
      (sum, p) => sum + (p.importoRecuperatoCapitale || 0), 0
    );
    const capitaleRecuperatoParziale = praticheChiuse.filter(
      p => p.importoRecuperatoCapitale > 0 && p.importoRecuperatoCapitale < p.capitale
    ).length;
    const capitaleRecuperatoCompleto = praticheChiuse.filter(
      p => p.capitale > 0 && p.importoRecuperatoCapitale >= p.capitale
    ).length;

    // Recupero interessi
    const interessiRecuperatiTotale = praticheChiuse.reduce(
      (sum, p) => sum + (p.interessiRecuperati || 0), 0
    );
    const interessiRecuperatiParziale = praticheChiuse.filter(
      p => p.interessiRecuperati > 0 && p.interessiRecuperati < p.interessi
    ).length;
    const interessiRecuperatiCompleto = praticheChiuse.filter(
      p => p.interessi > 0 && p.interessiRecuperati >= p.interessi
    ).length;

    // Recupero compensi
    const compensiRecuperatiTotale = praticheChiuse.reduce(
      (sum, p) => sum + (p.compensiLiquidati || 0), 0
    );
    const compensiRecuperatiParziale = praticheChiuse.filter(
      p => p.compensiLiquidati > 0 && p.compensiLiquidati < p.compensiLegali
    ).length;
    const compensiRecuperatiCompleto = praticheChiuse.filter(
      p => p.compensiLegali > 0 && p.compensiLiquidati >= p.compensiLegali
    ).length;

    return {
      totalePraticheAffidate,
      totalePraticheChiuse,
      percentualeChiusura,
      esitoNegativo,
      esitoPositivo,
      esitoPositivoParziale,
      esitoPositivoTotale,
      recuperoCapitale: {
        totale: capitaleRecuperatoTotale,
        parziale: capitaleRecuperatoParziale,
        completo: capitaleRecuperatoCompleto,
      },
      recuperoInteressi: {
        totale: interessiRecuperatiTotale,
        parziale: interessiRecuperatiParziale,
        completo: interessiRecuperatiCompleto,
      },
      recuperoCompensi: {
        totale: compensiRecuperatiTotale,
        parziale: compensiRecuperatiParziale,
        completo: compensiRecuperatiCompleto,
      },
    };
  }

  async getDashboardCondivisa(clienteId: string) {
    // Recupera cliente e configurazione condivisione
    const cliente = await this.clienteRepository.findOne({
      where: { id: clienteId },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${clienteId} non trovato`);
    }

    const config = cliente.configurazioneCondivisione;

    // Se la condivisione non è abilitata, restituisci errore
    if (!config || !config.abilitata) {
      throw new NotFoundException('Condivisione dashboard non abilitata per questo cliente');
    }

    const result: any = {
      cliente: {
        id: cliente.id,
        ragioneSociale: cliente.ragioneSociale,
      },
      configurazione: config,
    };

    const praticheEnabled = Object.values(config.pratiche || {}).some(Boolean);
    let praticheData: Pratica[] = [];
    const praticaLabels = new Map<string, string>();

    if (praticheEnabled) {
      praticheData = await this.praticheRepository.find({
        where: { clienteId, attivo: true },
        relations: ['cliente', 'debitore'],
        order: { createdAt: 'DESC' },
      });
      praticheData.forEach((pratica) => {
        praticaLabels.set(pratica.id, this.buildPraticaLabel(pratica));
      });
      result.pratiche = praticheData.map((pratica) => ({
        id: pratica.id,
        titolo: praticaLabels.get(pratica.id) ?? this.buildPraticaLabel(pratica),
        cliente: pratica.cliente?.ragioneSociale || 'Cliente',
        debitore: this.buildPraticaDebitoreLabel(pratica),
        faseId: pratica.faseId,
        aperta: pratica.aperta,
        esito: pratica.esito,
        capitale: Number(pratica.capitale ?? 0),
        importoRecuperatoCapitale: Number(pratica.importoRecuperatoCapitale ?? 0),
        anticipazioni: Number(pratica.anticipazioni ?? 0),
        importoRecuperatoAnticipazioni: Number(pratica.importoRecuperatoAnticipazioni ?? 0),
        compensiLegali: Number(pratica.compensiLegali ?? 0),
        compensiLiquidati: Number(pratica.compensiLiquidati ?? 0),
        interessi: Number(pratica.interessi ?? 0),
        interessiRecuperati: Number(pratica.interessiRecuperati ?? 0),
        dataAffidamento: pratica.dataAffidamento
          ? pratica.dataAffidamento.toISOString?.() ?? pratica.dataAffidamento
          : null,
        dataChiusura: pratica.dataChiusura ? pratica.dataChiusura.toISOString?.() ?? pratica.dataChiusura : null,
        riferimentoCredito: pratica.riferimentoCredito,
        storico: pratica.storico,
        opposizione: pratica.opposizione,
        pignoramento: pratica.pignoramento,
      }));
    }

    const praticaIds = praticheData.map((p) => p.id);

    if (config.pratiche.documenti && praticaIds.length > 0) {
      const documenti = await this.documentiRepository.find({
        where: { praticaId: In(praticaIds), attivo: true },
        order: { dataCreazione: 'DESC' },
      });
      result.documenti = documenti.map((doc) => {
        const praticaId = doc.praticaId;
        const praticaLabel =
          praticaId && praticaLabels.has(praticaId) ? praticaLabels.get(praticaId)! : 'Pratica';
        return {
          id: doc.id,
          nome: doc.nome,
          descrizione: doc.descrizione,
          tipo: doc.tipo,
          praticaId: doc.praticaId,
          praticaLabel,
          dataCreazione: doc.dataCreazione,
          caricatoDa: doc.caricatoDa,
        };
      });
    }

    if (config.pratiche.movimentiFinanziari && praticaIds.length > 0) {
      const movimenti = await this.movimentiRepository.find({
        where: { praticaId: In(praticaIds) },
        order: { data: 'DESC', createdAt: 'DESC' },
      });
      result.movimentiFinanziari = movimenti.map((mov) => {
        const movPraticaId = mov.praticaId;
        return {
          id: mov.id,
          tipo: mov.tipo,
          importo: Number(mov.importo ?? 0),
          data: mov.data,
          oggetto: mov.oggetto,
          praticaId: mov.praticaId,
          praticaLabel: movPraticaId ? praticaLabels.get(movPraticaId) ?? 'Pratica' : 'Pratica',
        };
      });
    }

    if (config.pratiche.timeline && praticheData.length > 0) {
      const timeline: SharedTimelineEvent[] = [];
      praticheData.forEach((pratica) => {
        const label = praticaLabels.get(pratica.id) ?? this.buildPraticaLabel(pratica);
        (pratica.storico || []).forEach((fase) => {
          if (!fase.dataInizio) return;
          timeline.push({
            praticaId: pratica.id,
            praticaLabel: label,
            title: fase.faseNome,
            date: fase.dataInizio,
            detail: fase.dataFine
              ? `Fino al ${new Date(fase.dataFine).toLocaleDateString('it-IT')}`
              : 'In corso',
            tipo: 'fase',
          });
        });
        if (pratica.opposizione?.dataEsito) {
          timeline.push({
            praticaId: pratica.id,
            praticaLabel: label,
            title: 'Esito opposizione',
            date: pratica.opposizione.dataEsito,
            detail: pratica.opposizione.note,
            tipo: 'opposizione',
          });
        }
        if (pratica.pignoramento?.dataNotifica) {
          timeline.push({
            praticaId: pratica.id,
            praticaLabel: label,
            title: 'Notifica pignoramento',
            date: pratica.pignoramento.dataNotifica,
            detail: pratica.pignoramento.tipo,
            tipo: 'pignoramento',
          });
        }
      });
      result.timeline = timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Aggiungi stats se abilitato
    if (config.dashboard.stats) {
      result.stats = await this.getStats(clienteId);
    }

    // Aggiungi KPI se abilitato
    if (config.dashboard.kpi) {
      result.kpi = await this.getKPI(clienteId);
    }

    return result;
  }

  async getAdminDashboard(): Promise<AdminDashboardStats> {
    // Totali globali
    const [
      studi,
      studiAttivi,
      utenti,
      utentiAttivi,
      pratiche,
      praticheAperte,
      clienti,
      debitori,
      avvocati,
    ] = await Promise.all([
      this.studioRepository.count(),
      this.studioRepository.count({ where: { attivo: true } }),
      this.userRepository.count(),
      this.userRepository.count({ where: { attivo: true } }),
      this.praticheRepository.count({ where: { attivo: true } }),
      this.praticheRepository.count({ where: { attivo: true, aperta: true } }),
      this.clienteRepository.count({ where: { attivo: true } }),
      this.debitoreRepository.count({ where: { attivo: true } }),
      this.avvocatoRepository.count({ where: { attivo: true } }),
    ]);

    // Statistiche per studio
    const studiConRelazioni = await this.studioRepository
      .createQueryBuilder('studio')
      .leftJoinAndSelect('studio.users', 'user')
      .leftJoinAndSelect('studio.pratiche', 'pratica', 'pratica.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.clienti', 'cliente', 'cliente.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.debitori', 'debitore', 'debitore.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.avvocati', 'avvocato', 'avvocato.attivo = :attivo', { attivo: true })
      .getMany();

    const perStudio = studiConRelazioni.map(studio => ({
      studioId: studio.id,
      studioNome: studio.nome,
      studioAttivo: studio.attivo,
      numeroUtenti: studio.users ? studio.users.length : 0,
      numeroPratiche: studio.pratiche ? studio.pratiche.length : 0,
      numeroClienti: studio.clienti ? studio.clienti.length : 0,
      numeroDebitori: studio.debitori ? studio.debitori.length : 0,
      numeroAvvocati: studio.avvocati ? studio.avvocati.length : 0,
    }));

    // Ultimi 10 utenti creati
    const ultimiUtenti = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.studio', 'studio')
      .orderBy('user.createdAt', 'DESC')
      .limit(10)
      .getMany();

    const ultimiUtentiCreati = ultimiUtenti.map(user => ({
      id: user.id,
      nome: user.nome,
      cognome: user.cognome,
      email: user.email,
      ruolo: user.ruolo,
      studioNome: user.studio ? user.studio.nome : null,
      createdAt: user.createdAt,
    }));

    // Ultime 10 pratiche create
    const ultimePratiche = await this.praticheRepository
      .createQueryBuilder('pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore')
      .leftJoinAndSelect('pratica.studio', 'studio')
      .where('pratica.attivo = :attivo', { attivo: true })
      .orderBy('pratica.createdAt', 'DESC')
      .limit(10)
      .getMany();

    const ultimePraticheCreate = ultimePratiche.map(pratica => ({
      id: pratica.id,
      numeroProtocollo: pratica.id.substring(0, 8).toUpperCase(),
      cliente: pratica.cliente ? pratica.cliente.ragioneSociale : 'N/A',
      debitore: pratica.debitore ? `${pratica.debitore.nome} ${pratica.debitore.cognome}` : 'N/A',
      studioNome: pratica.studio ? pratica.studio.nome : null,
      createdAt: pratica.createdAt,
    }));

    return {
      totali: {
        studi,
        studiAttivi,
        utenti,
        utentiAttivi,
        pratiche,
        praticheAperte,
        clienti,
        debitori,
        avvocati,
      },
      perStudio,
      attivitaRecente: {
        ultimiUtentiCreati,
        ultimePraticheCreate,
      },
    };
  }

  private buildPraticaLabel(pratica: Pratica | null): string {
    if (!pratica) return 'Pratica';
    const cliente = pratica.cliente?.ragioneSociale || 'Cliente';
    const debitore =
      pratica.debitore?.ragioneSociale ||
      [pratica.debitore?.nome, pratica.debitore?.cognome].filter(Boolean).join(' ').trim() ||
      'Debitore';
    return `${cliente} vs ${debitore}`;
  }

  private buildPraticaDebitoreLabel(pratica: Pratica): string {
    if (!pratica.debitore) return 'Debitore';
    if (pratica.debitore.ragioneSociale) return pratica.debitore.ragioneSociale;
    const nome = [pratica.debitore.nome, pratica.debitore.cognome].filter(Boolean).join(' ').trim();
    return nome || 'Debitore';
  }

  private async canAvvocatoSeeAll(user: CurrentUserData): Promise<boolean> {
    if (user.ruolo !== 'avvocato') return false;
    const email = user.email?.toLowerCase().trim();
    if (!email || !user.studioId) return false;
    const avvocato = await this.avvocatoRepository.findOne({
      where: { email, studioId: user.studioId },
    });
    return avvocato?.livelloAccessoPratiche === 'tutte';
  }
}
