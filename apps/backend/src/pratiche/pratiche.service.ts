// src/pratiche/pratiche.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Pratica, StoricoFase } from './pratica.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { User } from '../users/user.entity';
import { Documento } from '../documenti/documento.entity';
import { CreatePraticaDto } from './dto/create-pratica.dto';
import { UpdatePraticaDto } from './dto/update-pratica.dto';
import { CambiaFaseDto } from './dto/cambia-fase.dto';
import { FasiService } from '../fasi/fasi.service';
import type { FaseDefinition } from '../fasi/fasi.constants';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePagination, type PaginationOptions } from '../common/pagination';
import { CartelleService } from '../cartelle/cartelle.service';
import { TassiInteresseService } from '../rate-ammortamento/tassi-interesse.service';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';

@Injectable()
export class PraticheService {
  private readonly logger = new Logger(PraticheService.name);

  constructor(
    @InjectRepository(Pratica)
    private readonly repo: Repository<Pratica>,
    @InjectRepository(Avvocato)
    private readonly avvocatiRepo: Repository<Avvocato>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Documento)
    private readonly documentiRepo: Repository<Documento>,
    @InjectRepository(MovimentoFinanziario)
    private readonly movimentiRepo: Repository<MovimentoFinanziario>,
    private readonly fasiService: FasiService,
    private readonly notificationsService: NotificationsService,
    private readonly cartelleService: CartelleService,
    private readonly tassiInteresseService: TassiInteresseService,
  ) {}

  /**
   * Restituisce tutte le pratiche.
   * @param includeInactive - se true, include anche le pratiche disattivate
   * @param studioId - se fornito, filtra per studio
   */
  async findAll(
    includeInactive = false,
    studioId?: string,
    pagination?: PaginationOptions,
  ): Promise<Pratica[]> {
    const where: any = includeInactive ? {} : { attivo: true };

    // Se studioId è fornito, filtra per studio
    if (studioId) {
      where.studioId = studioId;
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.repo.find({
      where,
      relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari', 'studio'],
      order: { createdAt: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    }).then((rows) => this.attachFasi(rows));
  }

  async findAllForUser(
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Pratica[]> {
    const where: any = includeInactive ? {} : { attivo: true };
    const page = normalizePagination(pagination?.page, pagination?.limit);

    if (user.ruolo === 'admin') {
      return this.repo.find({
        where,
        relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari', 'studio'],
        order: { createdAt: 'DESC' },
        ...(page ? { skip: page.skip, take: page.take } : {}),
      }).then((rows) => this.attachFasi(rows));
    }

    if (user.ruolo === 'cliente') {
      if (!user.clienteId) return [];
      return this.repo.find({
        where: { ...where, clienteId: user.clienteId },
        relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari', 'studio'],
        order: { createdAt: 'DESC' },
        ...(page ? { skip: page.skip, take: page.take } : {}),
      }).then((rows) => this.attachFasi(rows));
    }

    if (!user.studioId) return [];
    const pratiche = await this.repo.find({
      where: { ...where, studioId: user.studioId },
      relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari', 'studio'],
      order: { createdAt: 'DESC' },
    });

    const filtered = this.filterByAssignment(this.attachFasi(pratiche), user);
    if (page) {
      return filtered.slice(page.skip, page.skip + page.take);
    }
    return filtered;
    }

  /**
   * Restituisce le pratiche di un cliente specifico.
   */
  async findByCliente(
    clienteId: string,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Pratica[]> {
    const where = includeInactive
      ? { clienteId }
      : { clienteId, attivo: true };
    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.repo.find({
      where,
      relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
      order: { createdAt: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    }).then((rows) => this.attachFasi(rows));
  }

  async findByClienteForUser(
    clienteId: string,
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Pratica[]> {
    const where = includeInactive
      ? { clienteId }
      : { clienteId, attivo: true };
    const page = normalizePagination(pagination?.page, pagination?.limit);

    if (user.ruolo === 'admin') {
      return this.repo.find({
        where,
        relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
        order: { createdAt: 'DESC' },
        ...(page ? { skip: page.skip, take: page.take } : {}),
      }).then((rows) => this.attachFasi(rows));
    }

    if (user.ruolo === 'cliente') {
      if (!user.clienteId || user.clienteId !== clienteId) return [];
      return this.repo.find({
        where,
        relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
        order: { createdAt: 'DESC' },
        ...(page ? { skip: page.skip, take: page.take } : {}),
      }).then((rows) => this.attachFasi(rows));
    }

    if (!user.studioId) return [];
    const pratiche = await this.repo.find({
      where: { ...where, studioId: user.studioId },
      relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
      order: { createdAt: 'DESC' },
    });
    if (user.ruolo === 'avvocato') {
      const canSeeAll = await this.canAvvocatoSeeAll(user);
      if (canSeeAll) {
        return this.attachFasi(pratiche);
      }
    }

    return this.filterByAssignment(this.attachFasi(pratiche), user);
  }

  /**
   * Restituisce le pratiche di un debitore specifico.
   */
  async findByDebitore(
    debitoreId: string,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Pratica[]> {
    const where = includeInactive
      ? { debitoreId }
      : { debitoreId, attivo: true };
    const page = normalizePagination(pagination?.page, pagination?.limit);
    return this.repo.find({
      where,
      relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
      order: { createdAt: 'DESC' },
      ...(page ? { skip: page.skip, take: page.take } : {}),
    }).then((rows) => this.attachFasi(rows));
  }

  async findByDebitoreForUser(
    debitoreId: string,
    user: CurrentUserData,
    includeInactive = false,
    pagination?: PaginationOptions,
  ): Promise<Pratica[]> {
    const where = includeInactive
      ? { debitoreId }
      : { debitoreId, attivo: true };
    const page = normalizePagination(pagination?.page, pagination?.limit);

    if (user.ruolo === 'admin') {
      return this.repo.find({
        where,
        relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
        order: { createdAt: 'DESC' },
        ...(page ? { skip: page.skip, take: page.take } : {}),
      }).then((rows) => this.attachFasi(rows));
    }

    if (user.ruolo === 'cliente') {
      if (!user.clienteId) return [];
      return this.repo.find({
        where: { ...where, clienteId: user.clienteId },
        relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
        order: { createdAt: 'DESC' },
        ...(page ? { skip: page.skip, take: page.take } : {}),
      }).then((rows) => this.attachFasi(rows));
    }

    if (!user.studioId) return [];
    const pratiche = await this.repo.find({
      where: { ...where, studioId: user.studioId },
      relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
      order: { createdAt: 'DESC' },
    });
    if (user.ruolo === 'avvocato') {
      const canSeeAll = await this.canAvvocatoSeeAll(user);
      if (canSeeAll) {
        if (page) {
          return this.attachFasi(pratiche).slice(page.skip, page.skip + page.take);
        }
        return this.attachFasi(pratiche);
      }
    }
    const filtered = this.filterByAssignment(this.attachFasi(pratiche), user);
    if (page) {
      return filtered.slice(page.skip, page.skip + page.take);
    }
    return filtered;
  }

  /**
   * Restituisce una pratica specifica.
   */
  async findOne(id: string): Promise<Pratica> {
    const pratica = await this.repo.findOne({
      where: { id },
      relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari'],
    });
    if (!pratica) {
      throw new NotFoundException(`Pratica con ID ${id} non trovata`);
    }
    return this.attachFase(pratica);
  }

  async findOneForUser(id: string, user: CurrentUserData): Promise<Pratica> {
    const pratica = await this.repo.findOne({
      where: { id },
      relations: ['cliente', 'debitore', 'avvocati', 'collaboratori', 'movimentiFinanziari', 'studio'],
    });
    if (!pratica) {
      throw new NotFoundException(`Pratica con ID ${id} non trovata`);
    }

    if (user.ruolo === 'admin') return this.attachFase(pratica);
    if (user.ruolo === 'cliente') {
      if (user.clienteId && pratica.clienteId === user.clienteId) return this.attachFase(pratica);
      throw new NotFoundException(`Pratica con ID ${id} non trovata`);
    }
    if (!user.studioId || pratica.studioId !== user.studioId) {
      throw new NotFoundException(`Pratica con ID ${id} non trovata`);
    }

    if (user.ruolo === 'avvocato') {
      const canSeeAll = await this.canAvvocatoSeeAll(user);
      if (canSeeAll) {
        return this.attachFase(pratica);
      }
    }

    if (this.isUserAssignedToPratica(pratica, user)) {
      return this.attachFase(pratica);
    }

    throw new NotFoundException(`Pratica con ID ${id} non trovata`);
  }

  private filterByAssignment(pratiche: Pratica[], user: CurrentUserData): Pratica[] {
    if (user.ruolo === 'avvocato' || user.ruolo === 'collaboratore') {
      return pratiche.filter((pratica) => this.isUserAssignedToPratica(pratica, user));
    }
    return pratiche;
  }

  private async canAvvocatoSeeAll(user: CurrentUserData): Promise<boolean> {
    if (user.ruolo !== 'avvocato') return false;
    const email = user.email?.toLowerCase().trim();
    if (!email || !user.studioId) return false;
    const avvocato = await this.avvocatiRepo.findOne({
      where: { email, studioId: user.studioId },
    });
    return avvocato?.livelloAccessoPratiche === 'tutte';
  }

  private isUserAssignedToPratica(pratica: Pratica, user: CurrentUserData): boolean {
    if (user.ruolo === 'avvocato') {
      const userEmail = user.email?.toLowerCase().trim();
      if (!userEmail) return false;
      return pratica.avvocati?.some((avvocato) => avvocato.email?.toLowerCase().trim() === userEmail) ?? false;
    }

    if (user.ruolo === 'collaboratore') {
      return pratica.collaboratori?.some((collaboratore) => collaboratore.id === user.id) ?? false;
    }

    return true;
  }

  async canUserModifyPratica(user: CurrentUserData): Promise<boolean> {
    if (user.ruolo === 'admin' || user.ruolo === 'titolare_studio') return true;
    if (user.ruolo === 'collaboratore') return true;
    if (user.ruolo === 'segreteria' || user.ruolo === 'cliente') return false;
    if (user.ruolo !== 'avvocato') return false;
    const email = user.email?.toLowerCase().trim();
    if (!email || !user.studioId) return false;
    const avvocato = await this.avvocatiRepo.findOne({
      where: { email, studioId: user.studioId },
    });
    return avvocato?.livelloPermessi === 'modifica';
  }

  /**
   * Genera il prossimo numero pratica progressivo per l'anno corrente.
   * Formato: numero/anno (es: 01/2026, 02/2026, etc.)
   */
  private async generateNumeroPratica(): Promise<string> {
    const currentYear = new Date().getFullYear();

    // Trova tutte le pratiche dell'anno corrente
    const pratiche = await this.repo
      .createQueryBuilder('pratica')
      .where('pratica.numeroPratica LIKE :pattern', { pattern: `%/${currentYear}` })
      .getMany();

    let maxNumber = 0;

    // Trova il numero più alto tra tutte le pratiche dell'anno
    for (const pratica of pratiche) {
      if (pratica.numeroPratica) {
        const parts = pratica.numeroPratica.split('/');
        if (parts.length === 2 && parts[1] === currentYear.toString()) {
          const numero = parseInt(parts[0], 10);
          if (!isNaN(numero) && numero > maxNumber) {
            maxNumber = numero;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;

    // Formatta con padding a 2 cifre (01, 02, 03... 10, 11...)
    return `${nextNumber.toString().padStart(2, '0')}/${currentYear}`;
  }

  /**
   * Associa l'oggetto fase (dal catalogo costante) alla pratica, così il frontend
   * può leggere nome/codice senza ulteriori chiamate.
   */
  private attachFase(pratica: Pratica): Pratica {
    if (!pratica) return pratica;
    try {
      const fase: FaseDefinition = this.fasiService.findOne(pratica.faseId);
      (pratica as any).fase = fase;
    } catch {
      // Se la fase non esiste o manca, non bloccare la risposta
    }
    return pratica;
  }

  private attachFasi(pratiche: Pratica[]): Pratica[] {
    return pratiche.map((p) => this.attachFase(p));
  }

  /**
   * Aggiunge un evento alla fase corrente della pratica
   */
  async aggiungiEventoFaseCorrente(
    praticaId: string,
    tipo: 'documento_caricato' | 'documento_eliminato' | 'avvocato_aggiunto' | 'avvocato_rimosso' | 'collaboratore_aggiunto' | 'collaboratore_rimosso' | 'movimento_finanziario' | 'note_fase_modificate' | 'piano_ammortamento_creato' | 'piano_ammortamento_pagamento' | 'piano_ammortamento_storno',
    dettagli: any,
    eseguitoDa?: string,
  ): Promise<void> {
    const pratica = await this.repo.findOne({ where: { id: praticaId } });
    if (!pratica) return;

    const storico = pratica.storico || [];
    if (storico.length === 0) return;

    // Trova la fase corrente (l'ultima nello storico senza dataFine)
    const faseCorrente = storico[storico.length - 1];
    if (faseCorrente.dataFine) return; // La fase è già chiusa

    // Inizializza array eventi se non esiste
    if (!faseCorrente.eventi) {
      faseCorrente.eventi = [];
    }

    // Aggiungi l'evento
    faseCorrente.eventi.push({
      tipo,
      data: new Date().toISOString(),
      eseguitoDa,
      dettagli,
    });

    pratica.storico = storico;
    await this.repo.save(pratica);
  }

  /**
   * Crea una nuova pratica.
   */
  async create(dto: CreatePraticaDto): Promise<Pratica> {
    const customNumero = dto.numeroPratica?.trim();
    const numeroPratica = customNumero && customNumero.length > 0
      ? customNumero
      : await this.generateNumeroPratica();

    // Determina la fase iniziale
    let faseIniziale;
    if (dto.faseId) {
      faseIniziale = this.fasiService.findOne(dto.faseId);
    } else {
      // Prendi la prima fase (ordine più basso, non di chiusura)
      const fasi = this.fasiService.findAll();
      faseIniziale = fasi.find((f) => !f.isFaseChiusura);
      if (!faseIniziale) {
        throw new BadRequestException(
          'Nessuna fase disponibile.',
        );
      }
    }

    // Inizializza lo storico con la fase iniziale
    const storico: StoricoFase[] = [
      {
        faseId: faseIniziale.id,
        faseCodice: faseIniziale.codice,
        faseNome: faseIniziale.nome,
        dataInizio: new Date().toISOString(),
      },
    ];

    // Carica avvocati se specificati
    let avvocati: Avvocato[] = [];
    if (dto.avvocatiIds && dto.avvocatiIds.length > 0) {
      avvocati = await this.avvocatiRepo.find({
        where: { id: In(dto.avvocatiIds) },
      });
      if (avvocati.length !== dto.avvocatiIds.length) {
        throw new BadRequestException('Uno o più avvocati non trovati');
      }
    }

    // Carica collaboratori se specificati
    let collaboratori: User[] = [];
    if (dto.collaboratoriIds && dto.collaboratoriIds.length > 0) {
      collaboratori = await this.usersRepo.find({
        where: { id: In(dto.collaboratoriIds), ruolo: 'collaboratore', attivo: true },
      });
      if (collaboratori.length !== dto.collaboratoriIds.length) {
        throw new BadRequestException('Uno o più collaboratori non trovati');
      }
    }

    const { avvocatiIds, collaboratoriIds, ...dtoWithoutRelations } = dto;

    const pratica = this.repo.create({
      ...dtoWithoutRelations,
      numeroPratica,
      faseId: faseIniziale.id,
      aperta: dto.aperta !== undefined ? dto.aperta : true,
      storico,
      avvocati,
      collaboratori,
      dataAffidamento: dto.dataAffidamento
        ? new Date(dto.dataAffidamento)
        : new Date(),
      dataChiusura: dto.dataChiusura ? new Date(dto.dataChiusura) : undefined,
      dataScadenza: dto.dataScadenza ? new Date(dto.dataScadenza) : undefined,
    });

    const saved = await this.repo.save(pratica);

    // Crea movimento finanziario per il capitale originario se presente
    if (saved.capitale && saved.capitale > 0) {
      const movimentoCapitale = this.movimentiRepo.create({
        praticaId: saved.id,
        studioId: saved.studioId,
        tipo: 'capitale_originario',
        importo: saved.capitale,
        data: saved.dataAffidamento || new Date(),
        oggetto: 'Capitale originario pratica',
      });
      await this.movimentiRepo.save(movimentoCapitale);
    }

    // Crea le 6 cartelle predefinite per la pratica
    try {
      await this.cartelleService.createDefaultFoldersForPratica(saved.id, saved.studioId);
    } catch (error) {
      // Log l'errore ma non bloccare la creazione della pratica
      this.logger.error('Errore nella creazione delle cartelle predefinite:', error);
    }

    return this.findOne(saved.id);
  }

  /**
   * Aggiorna una pratica esistente.
   */
  async update(id: string, dto: UpdatePraticaDto, user?: { nome: string; cognome: string }): Promise<Pratica> {
    const pratica = await this.repo.findOne({
      where: { id },
      relations: ['avvocati', 'collaboratori'],
    });

    if (!pratica) {
      throw new NotFoundException('Pratica non trovata');
    }

    // Se sta cambiando la fase, usa il metodo apposito
    if (dto.faseId && dto.faseId !== pratica.faseId) {
      throw new BadRequestException(
        'Per cambiare fase usa l\'endpoint PATCH /pratiche/:id/fase',
      );
    }

    // Se imposta esito, chiudi la pratica
    if (dto.esito && dto.esito !== pratica.esito) {
      pratica.aperta = false;
      pratica.esito = dto.esito;
      pratica.dataChiusura = new Date();
    }

    const eseguitoDa = user ? `${user.nome} ${user.cognome}`.trim() : undefined;

    // Gestisci aggiornamento avvocati
    if (dto.avvocatiIds !== undefined) {
      const avvocatiPrecedenti = new Set(pratica.avvocati?.map(a => a.id) || []);
      const avvocatiNuovi = new Set(dto.avvocatiIds);

      if (dto.avvocatiIds.length > 0) {
        const avvocati = await this.avvocatiRepo.find({
          where: { id: In(dto.avvocatiIds) },
        });
        if (avvocati.length !== dto.avvocatiIds.length) {
          throw new BadRequestException('Uno o più avvocati non trovati');
        }

        // Traccia aggiunte
        for (const avv of avvocati) {
          if (!avvocatiPrecedenti.has(avv.id)) {
            await this.aggiungiEventoFaseCorrente(id, 'avvocato_aggiunto', {
              id: avv.id,
              nome: `${avv.nome} ${avv.cognome}`,
            }, eseguitoDa);
          }
        }

        pratica.avvocati = avvocati;
      } else {
        pratica.avvocati = [];
      }

      // Traccia rimozioni
      for (const avvId of avvocatiPrecedenti) {
        if (!avvocatiNuovi.has(avvId)) {
          const avv = pratica.avvocati?.find(a => a.id === avvId);
          if (avv) {
            await this.aggiungiEventoFaseCorrente(id, 'avvocato_rimosso', {
              id: avv.id,
              nome: `${avv.nome} ${avv.cognome}`,
            }, eseguitoDa);
          }
        }
      }
    }

    // Gestisci aggiornamento collaboratori
    if (dto.collaboratoriIds !== undefined) {
      const collaboratoriPrecedenti = new Set(pratica.collaboratori?.map(c => c.id) || []);
      const collaboratoriNuovi = new Set(dto.collaboratoriIds);

      if (dto.collaboratoriIds.length > 0) {
        const collaboratori = await this.usersRepo.find({
          where: { id: In(dto.collaboratoriIds), ruolo: 'collaboratore', attivo: true },
        });
        if (collaboratori.length !== dto.collaboratoriIds.length) {
          throw new BadRequestException('Uno o più collaboratori non trovati');
        }

        // Traccia aggiunte
        for (const collab of collaboratori) {
          if (!collaboratoriPrecedenti.has(collab.id)) {
            await this.aggiungiEventoFaseCorrente(id, 'collaboratore_aggiunto', {
              id: collab.id,
              nome: `${collab.nome} ${collab.cognome}`,
            }, eseguitoDa);
          }
        }

        pratica.collaboratori = collaboratori;
      } else {
        pratica.collaboratori = [];
      }

      // Traccia rimozioni
      for (const collabId of collaboratoriPrecedenti) {
        if (!collaboratoriNuovi.has(collabId)) {
          const collab = pratica.collaboratori?.find(c => c.id === collabId);
          if (collab) {
            await this.aggiungiEventoFaseCorrente(id, 'collaboratore_rimosso', {
              id: collab.id,
              nome: `${collab.nome} ${collab.cognome}`,
            }, eseguitoDa);
          }
        }
      }
    }

    const { avvocatiIds, collaboratoriIds, ...dtoWithoutRelations } = dto;

    // Gestisci aggiunta capitale
    // Se viene modificato il campo capitale e il nuovo valore è maggiore del precedente,
    // crea un movimento di tipo "nuovo_capitale" per la differenza
    if (dto.capitale !== undefined && dto.capitale > pratica.capitale) {
      const differenzaCapitale = dto.capitale - pratica.capitale;
      const movimentoNuovoCapitale = this.movimentiRepo.create({
        praticaId: pratica.id,
        studioId: pratica.studioId,
        tipo: 'nuovo_capitale',
        importo: differenzaCapitale,
        data: new Date(),
        oggetto: 'Nuovo capitale aggiunto',
      });
      await this.movimentiRepo.save(movimentoNuovoCapitale);
    }

    // Gestisci ripresa calcolo interessi
    // Se viene impostata una nuova dataInizioInteressi e viene rimossa dataFineMaturazione,
    // significa che stiamo riprendendo il calcolo interessi
    if (dto.dataInizioInteressi && dto.dataFineMaturazione === undefined && pratica.dataFineMaturazione) {
      // Calcola gli interessi del periodo precedente (dalla vecchia dataInizio fino a dataFineMaturazione)
      const interessiPrecedenti = await this.calcolaInteressiPratica(
        pratica,
        new Date(pratica.dataFineMaturazione),
      );

      // Salva gli interessi del periodo precedente
      pratica.interessiPeriodoPrecedente = (pratica.interessiPeriodoPrecedente || 0) + interessiPrecedenti.interesse;
    }

    // Aggiorna i campi
    Object.assign(pratica, {
      ...dtoWithoutRelations,
      dataAffidamento: dto.dataAffidamento
        ? new Date(dto.dataAffidamento)
        : pratica.dataAffidamento,
      dataChiusura: dto.dataChiusura
        ? new Date(dto.dataChiusura)
        : pratica.dataChiusura,
      dataScadenza: dto.dataScadenza
        ? new Date(dto.dataScadenza)
        : pratica.dataScadenza,
    });

    await this.repo.save(pratica);
    return this.findOne(id);
  }

  /**
   * Cambia la fase di una pratica e aggiorna lo storico.
   */
  async cambiaFase(id: string, dto: CambiaFaseDto, user?: CurrentUserData): Promise<Pratica> {
    // Carica la pratica con tutte le relazioni per creare snapshot
    const pratica = await this.repo.findOne({
      where: { id },
      relations: ['avvocati', 'collaboratori'],
    });

    if (!pratica) {
      throw new NotFoundException('Pratica non trovata');
    }

    const nuovaFase = this.fasiService.findOne(dto.nuovaFaseId);

    if (!pratica.aperta && !nuovaFase.isFaseChiusura) {
      throw new BadRequestException(
        'Non puoi cambiare fase a una pratica chiusa. Riapri prima la pratica.',
      );
    }

    if (pratica.faseId === dto.nuovaFaseId) {
      throw new BadRequestException(
        `La pratica è già nella fase "${nuovaFase.nome}"`,
      );
    }

    const now = new Date().toISOString();

    // Chiudi la fase corrente nello storico e salva le note fase
    const storico = pratica.storico || [];
    if (storico.length > 0) {
      const faseCorrente = storico[storico.length - 1];
      if (!faseCorrente.dataFine) {
        faseCorrente.dataFine = now;
        // Salva le note fase della fase che sta per essere chiusa
        faseCorrente.noteFase = pratica.noteFase;
      }
    }

    // Prepara i dati dell'utente che ha eseguito il cambio
    const cambiatoDaNome = user ? `${user.nome} ${user.cognome}`.trim() : undefined;

    // Aggiungi la nuova fase (gli eventi verranno tracciati durante la fase)
    storico.push({
      faseId: nuovaFase.id,
      faseCodice: nuovaFase.codice,
      faseNome: nuovaFase.nome,
      dataInizio: now,
      note: dto.note,
      cambiatoDaUserId: user?.id,
      cambiatoDaNome,
      eventi: [], // Array vuoto, verrà popolato con eventi durante la fase
    });

    pratica.faseId = nuovaFase.id;
    pratica.storico = storico;
    // Reset delle note fase per la nuova fase
    pratica.noteFase = '';

    // Se la nuova fase è di chiusura, chiudi la pratica
    // Determina l'esito in base al codice della fase
    if (nuovaFase.isFaseChiusura) {
      pratica.aperta = false;
      pratica.dataChiusura = new Date();
      
      // Determina esito dal codice fase o dal dto
      if (nuovaFase.codice === 'chiusura_positiva') {
        pratica.esito = 'positivo';
      } else if (nuovaFase.codice === 'chiusura_negativa') {
        pratica.esito = 'negativo';
      } else if (dto.esito) {
        pratica.esito = dto.esito;
      } else {
        throw new BadRequestException(
          'Per chiudere la pratica devi specificare un esito (positivo/negativo)',
        );
      }
    }

    await this.repo.save(pratica);
    return this.findOne(id);
  }

  /**
   * Riapre una pratica chiusa.
   */
  async riapri(id: string, nuovaFaseId?: string): Promise<Pratica> {
    const pratica = await this.findOne(id);

    if (pratica.aperta) {
      throw new BadRequestException('La pratica è già aperta');
    }

    // Determina la nuova fase
    let nuovaFase;
    if (nuovaFaseId) {
      nuovaFase = this.fasiService.findOne(nuovaFaseId);
    } else {
      // Prendi la prima fase (ordine più basso, non di chiusura)
      const fasi = await this.fasiService.findAll();
      nuovaFase = fasi.find((f) => !f.isFaseChiusura);
      if (!nuovaFase) {
        throw new BadRequestException('Nessuna fase disponibile');
      }
    }

    const now = new Date().toISOString();
    const storico = pratica.storico || [];

    // Chiudi la fase corrente nello storico
    if (storico.length > 0) {
      const faseCorrente = storico[storico.length - 1];
      if (!faseCorrente.dataFine) {
        faseCorrente.dataFine = now;
      }
    }

    // Aggiungi la nuova fase
    storico.push({
      faseId: nuovaFase.id,
      faseCodice: nuovaFase.codice,
      faseNome: nuovaFase.nome,
      dataInizio: now,
      note: 'Pratica riaperta',
    });

    pratica.aperta = true;
    pratica.esito = null;
    pratica.faseId = nuovaFase.id;
    pratica.storico = storico;
    pratica.dataChiusura = undefined;

    await this.repo.save(pratica);
    return this.findOne(id);
  }

  /**
   * Disattiva una pratica (soft-delete).
   */
  async deactivate(id: string): Promise<Pratica> {
    const pratica = await this.findOne(id);
    await this.repo.update({ id }, { attivo: false });
    return this.findOne(id);
  }

  /**
   * Riattiva una pratica precedentemente disattivata.
   */
  async reactivate(id: string): Promise<Pratica> {
    const pratica = await this.findOne(id);
    await this.repo.update({ id }, { attivo: true });
    return this.findOne(id);
  }

  /**
   * Elimina fisicamente una pratica.
   * ATTENZIONE: Usare solo se necessario.
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id); // Verifica esistenza
    await this.repo.delete({ id });
  }

  /**
   * Conta le pratiche per stato.
   */
  async countByStato(): Promise<{
    aperte: number;
    chiusePositive: number;
    chiuseNegative: number;
    totali: number;
  }> {
    const [aperte, chiusePositive, chiuseNegative, totali] = await Promise.all([
      this.repo.count({ where: { aperta: true, attivo: true } }),
      this.repo.count({
        where: { aperta: false, esito: 'positivo', attivo: true },
      }),
      this.repo.count({
        where: { aperta: false, esito: 'negativo', attivo: true },
      }),
      this.repo.count({ where: { attivo: true } }),
    ]);

    return { aperte, chiusePositive, chiuseNegative, totali };
  }

  /**
   * Calcola i totali finanziari.
   */
  async calcolaTotaliFinanziari(): Promise<{
    capitaleAffidato: number;
    capitaleRecuperato: number;
    capitaleDaRecuperare: number;
    anticipazioni: number;
    anticipazioniRecuperate: number;
    compensiMaturati: number;
    compensiLiquidati: number;
  }> {
    const result = await this.repo
      .createQueryBuilder('pratica')
      .select([
        'SUM(pratica.capitale) as capitaleAffidato',
        'SUM(pratica.importoRecuperatoCapitale) as capitaleRecuperato',
        'SUM(pratica.anticipazioni) as anticipazioni',
        'SUM(pratica.importoRecuperatoAnticipazioni) as anticipazioniRecuperate',
        'SUM(pratica.compensiLegali) as compensiMaturati',
        'SUM(pratica.compensiLiquidati) as compensiLiquidati',
      ])
      .where('pratica.attivo = :attivo', { attivo: true })
      .getRawOne();

    const capitaleAffidato = parseFloat(result.capitaleAffidato) || 0;
    const capitaleRecuperato = parseFloat(result.capitaleRecuperato) || 0;

    return {
      capitaleAffidato,
      capitaleRecuperato,
      capitaleDaRecuperare: capitaleAffidato - capitaleRecuperato,
      anticipazioni: parseFloat(result.anticipazioni) || 0,
      anticipazioniRecuperate: parseFloat(result.anticipazioniRecuperate) || 0,
      compensiMaturati: parseFloat(result.compensiMaturati) || 0,
      compensiLiquidati: parseFloat(result.compensiLiquidati) || 0,
    };
  }

  /**
   * Conta pratiche per fase.
   */
  async countByFase(): Promise<Record<string, number>> {
    const results = await this.repo
      .createQueryBuilder('pratica')
      .select('pratica.faseId', 'faseId')
      .addSelect('COUNT(*)', 'count')
      .where('pratica.attivo = :attivo', { attivo: true })
      .groupBy('pratica.faseId')
      .getRawMany();

    const counts: Record<string, number> = {};
    results.forEach((r) => {
      // Usa la costante per ottenere il codice dalla faseId
      const fase = this.fasiService.findOne(r.faseId);
      if (fase) {
        counts[fase.codice] = parseInt(r.count, 10);
      }
    });

    return counts;
  }

  /**
   * Calcola gli interessi su una pratica dalla data di inizio al giorno corrente (o dataFine se specificata)
   * Formula: I = C × S × N / 36500
   * dove C = capitale, S = tasso %, N = giorni, 36500 = anno civile (365 giorni, 100 per percentuale)
   */
  async calcolaInteressiPratica(
    pratica: Pratica,
    dataFine?: Date,
  ): Promise<{ interesse: number; tasso: number }> {
    if (!pratica.applicaInteressi) {
      return { interesse: 0, tasso: 0 };
    }

    if (!pratica.dataInizioInteressi) {
      return { interesse: 0, tasso: 0 };
    }

    const capitale = pratica.capitale || 0;
    if (capitale <= 0) {
      return { interesse: 0, tasso: 0 };
    }

    const dataInizio = new Date(pratica.dataInizioInteressi);

    // Se è specificata una data fine maturazione, usa quella, altrimenti usa dataFine o oggi
    let dataCalcolo: Date;
    if (pratica.dataFineMaturazione) {
      dataCalcolo = new Date(pratica.dataFineMaturazione);
    } else {
      dataCalcolo = dataFine || new Date();
    }

    // Calcola i giorni tra data inizio e data fine
    const giorni = this.calcolaGiorni(dataInizio, dataCalcolo);
    if (giorni <= 0) {
      return { interesse: 0, tasso: 0 };
    }

    // Determina il tasso da utilizzare
    let tasso: number;

    if (pratica.tipoInteresse === 'fisso') {
      // Tasso fisso fornito dall'utente
      tasso = pratica.tassoInteresse || 0;
    } else if (pratica.tipoInteresse === 'legale') {
      // Recupera tasso legale dalla tabella
      const tassoLegale = await this.tassiInteresseService.findByTipoAndDate('legale', dataInizio);
      tasso = tassoLegale ? parseFloat(String(tassoLegale.tassoPercentuale)) : 0;
    } else if (pratica.tipoInteresse === 'moratorio') {
      // Recupera tasso moratorio dalla tabella
      const tassoMoratorio = await this.tassiInteresseService.findByTipoAndDate('moratorio', dataInizio);
      tasso = tassoMoratorio ? parseFloat(String(tassoMoratorio.tassoPercentuale)) : 0;

      // Applica maggiorazioni se configurate
      if (pratica.moratorioPre2013) {
        // Tasso moratorio previgente (ante 2013)
        // Il tasso già recuperato è quello corretto per il periodo
      }

      if (pratica.moratorioMaggiorazione && pratica.moratorioPctMaggiorazione) {
        // Aggiungi maggiorazione (es. 2% o 4% per prodotti agricoli)
        tasso += pratica.moratorioPctMaggiorazione;
      }
    } else {
      // Tipo interesse non specificato
      return { interesse: 0, tasso: 0 };
    }

    // Formula: I = C × S × N / 36500
    const interessePeriodoCorrente = (capitale * tasso * giorni) / 36500;

    // Somma gli interessi del periodo precedente (se presenti)
    const interesseTotale = interessePeriodoCorrente + (pratica.interessiPeriodoPrecedente || 0);

    return {
      interesse: Math.round(interesseTotale * 100) / 100, // Arrotonda a 2 decimali
      tasso: Math.round(tasso * 100) / 100, // Arrotonda a 2 decimali
    };
  }

  /**
   * Calcola il numero di giorni tra due date (usando anno civile 365 giorni)
   */
  private calcolaGiorni(dataInizio: Date, dataFine: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = dataFine.getTime() - dataInizio.getTime();
    return Math.floor(diffMs / msPerDay);
  }
}
