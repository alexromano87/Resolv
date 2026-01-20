import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PianoAmmortamento } from './piano-ammortamento.entity';
import { RataAmmortamento } from './rata-ammortamento.entity';
import { CreatePianoAmmortamentoDto } from './dto/create-piano-ammortamento.dto';
import { UpdateRataDto } from './dto/update-rata.dto';
import { ChiudiPianoDto } from './dto/chiudi-piano.dto';
import { InserisciCapitaleDto } from './dto/inserisci-capitale.dto';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { LOGO_RESOLV_DEFAULT, LOGO_RESOLV_FULL } from '../report/report-pdf-new.service';
import { TassiInteresseService } from './tassi-interesse.service';
import { PraticheService } from '../pratiche/pratiche.service';
import puppeteer from 'puppeteer';

interface RataCalcolata {
  numeroRata: number;
  quotaCapitale: number;
  quotaInteressi: number;
  importo: number;
  dataScadenza: Date;
  capitaleResiduo: number;
}

@Injectable()
export class PianoAmmortamentoService {
  constructor(
    @InjectRepository(PianoAmmortamento)
    private pianoRepo: Repository<PianoAmmortamento>,
    @InjectRepository(RataAmmortamento)
    private rateRepo: Repository<RataAmmortamento>,
    @InjectRepository(MovimentoFinanziario)
    private movimentoRepo: Repository<MovimentoFinanziario>,
    @InjectRepository(Pratica)
    private praticaRepo: Repository<Pratica>,
    private tassiInteresseService: TassiInteresseService,
    @Inject(forwardRef(() => PraticheService))
    private praticheService: PraticheService,
  ) {}


  /**
   * Crea un piano di ammortamento completo per una pratica
   */
  async creaPianoAmmortamento(dto: CreatePianoAmmortamentoDto): Promise<PianoAmmortamento> {
    const { praticaId, capitaleIniziale, numeroRate, dataInizioRate, note } = dto;

    // Verifica se esiste già un piano attivo per questa pratica
    const pianoEsistente = await this.pianoRepo.findOne({
      where: { praticaId, stato: 'attivo' },
    });

    if (pianoEsistente) {
      throw new BadRequestException(
        'Esiste già un piano attivo per questa pratica. Chiudilo prima di crearne uno nuovo.'
      );
    }

    // Gestione interessi
    let tassoEffettivo: number | null = null;
    let totaleInteressi = 0;

    if (dto.applicaInteressi) {
      // Se tipo legale o moratorio, recupera il tasso dal database
      if (dto.tipoInteresse === 'legale' || dto.tipoInteresse === 'moratorio') {
        const dataRiferimento = dto.dataInizioInteressi ? new Date(dto.dataInizioInteressi) : new Date(dataInizioRate);
        const tassoDb = await this.tassiInteresseService.findByTipoAndDate(dto.tipoInteresse, dataRiferimento);

        if (!tassoDb) {
          throw new BadRequestException(
            `Nessun tasso ${dto.tipoInteresse} trovato per la data ${dataRiferimento.toISOString().split('T')[0]}. ` +
            `Assicurati che i tassi siano stati configurati nell'area amministrativa.`
          );
        }

        tassoEffettivo = Number(tassoDb.tassoPercentuale);

        if (dto.tipoInteresse === 'moratorio') {
          if (dto.moratorioPre2013) {
            tassoEffettivo = Math.max(tassoEffettivo - 1, 0);
          }
          if (dto.moratorioMaggiorazione) {
            const extra = dto.moratorioPctMaggiorazione ?? 4;
            tassoEffettivo += extra;
          }
        }
      } else if (dto.tipoInteresse === 'fisso') {
        // Per tasso fisso usa quello fornito
        if (!dto.tassoInteresse) {
          throw new BadRequestException('Per tasso fisso è necessario specificare il valore del tasso');
        }
        tassoEffettivo = dto.tassoInteresse;
      }
    }

    // Crea il piano
    const piano = this.pianoRepo.create({
      praticaId,
      capitaleIniziale,
      numeroRate,
      dataInizio: dataInizioRate,
      stato: 'attivo',
      note,
      applicaInteressi: dto.applicaInteressi || false,
      tipoInteresse: dto.tipoInteresse || null,
      tassoInteresse: tassoEffettivo,
      tipoAmmortamento: dto.tipoAmmortamento || 'italiano',
      capitalizzazione: dto.capitalizzazione || 'nessuna',
      dataInizioInteressi: dto.dataInizioInteressi || null,
      moratorioPre2013: dto.moratorioPre2013 || false,
      moratorioMaggiorazione: dto.moratorioMaggiorazione || false,
      moratorioPctMaggiorazione: dto.moratorioPctMaggiorazione ?? null,
      applicaArt1194: dto.applicaArt1194 ?? true,
      totaleInteressi: 0, // Sarà calcolato dopo
    });

    const pianoSalvato = await this.pianoRepo.save(piano);

    // Calcola rate con o senza interessi
    let rateCalcolate: RataCalcolata[];

    if (dto.applicaInteressi && tassoEffettivo) {
      rateCalcolate = this.calcolaRateConInteressi({
        capitale: capitaleIniziale,
        numeroRate,
        tasso: tassoEffettivo,
        dataInizio: new Date(dataInizioRate),
        dataInizioInteressi: dto.dataInizioInteressi ? new Date(dto.dataInizioInteressi) : new Date(dataInizioRate),
        tipoAmmortamento: dto.tipoAmmortamento || 'italiano',
      });
      totaleInteressi = rateCalcolate.reduce((sum, r) => sum + r.quotaInteressi, 0);
    } else {
      rateCalcolate = this.calcolaRateSenzaInteressi(capitaleIniziale, numeroRate, new Date(dataInizioRate));
    }

    // Crea le entità rate
    const rate: RataAmmortamento[] = rateCalcolate.map((rataCalc, index) => {
      return this.rateRepo.create({
        pianoId: pianoSalvato.id,
        numeroRata: rataCalc.numeroRata,
        importo: Number(rataCalc.importo.toFixed(2)),
        quotaCapitale: Number(rataCalc.quotaCapitale.toFixed(2)),
        quotaInteressi: Number(rataCalc.quotaInteressi.toFixed(2)),
        dataScadenza: rataCalc.dataScadenza.toISOString().split('T')[0],
        pagata: false,
        dataPagamento: null,
        note: index === 0 ? note : null,
      });
    });

    await this.rateRepo.save(rate);

    // Aggiorna il piano con il totale interessi
    pianoSalvato.totaleInteressi = Number(totaleInteressi.toFixed(2));
    await this.pianoRepo.save(pianoSalvato);

    // Se ci sono interessi, crea un movimento finanziario
    if (dto.applicaInteressi && totaleInteressi > 0) {
      // Recupera la pratica per ottenere lo studioId
      const pratica = await this.pianoRepo.manager.findOne(Pratica, {
        where: { id: praticaId },
      });

      if (pratica) {
        const movimentoInteressi = this.movimentoRepo.create({
          praticaId: praticaId,
          studioId: pratica.studioId,
          tipo: 'interessi',
          importo: Number(totaleInteressi.toFixed(2)),
          data: new Date(dataInizioRate),
          oggetto: `Piano ammortamento - Interessi maturati (${numeroRate} rate)`,
        });

        await this.movimentoRepo.save(movimentoInteressi);
      }
    }

    // Ricarica il piano con le rate
    const pianoConRate = await this.pianoRepo.findOne({
      where: { id: pianoSalvato.id },
      relations: ['rate'],
    });

    if (!pianoConRate) {
      throw new NotFoundException('Piano non trovato dopo la creazione');
    }

    // Registra evento nello storico
    await this.praticheService.aggiungiEventoFaseCorrente(
      praticaId,
      'piano_ammortamento_creato',
      {
        pianoId: pianoConRate.id,
        capitaleIniziale: Number(capitaleIniziale),
        numeroRate,
        totaleInteressi: Number(totaleInteressi.toFixed(2)),
        applicaInteressi: dto.applicaInteressi || false,
      },
    );

    return pianoConRate;
  }

  /**
   * Calcola rate senza interessi (logica originale)
   */
  private calcolaRateSenzaInteressi(capitale: number, numeroRate: number, dataInizio: Date): RataCalcolata[] {
    const quotaCapitale = Number((capitale / numeroRate).toFixed(2));
    const totaleRate = quotaCapitale * numeroRate;
    const differenza = Number((capitale - totaleRate).toFixed(2));

    const rate: RataCalcolata[] = [];

    for (let i = 0; i < numeroRate; i++) {
      const dataScadenza = new Date(dataInizio);
      dataScadenza.setMonth(dataScadenza.getMonth() + i);

      // Aggiungi differenza all'ultima rata
      const quotaCapitaleCorrente = i === numeroRate - 1
        ? quotaCapitale + differenza
        : quotaCapitale;

      rate.push({
        numeroRata: i + 1,
        quotaCapitale: quotaCapitaleCorrente,
        quotaInteressi: 0,
        importo: quotaCapitaleCorrente,
        dataScadenza,
        capitaleResiduo: capitale - (quotaCapitale * (i + 1)),
      });
    }

    return rate;
  }

  /**
   * Calcola rate con interessi usando la formula I = C × S × N / 36500
   * Supporta ammortamento italiano (quota capitale costante) e francese (rata costante)
   */
  private calcolaRateConInteressi(params: {
    capitale: number;
    numeroRate: number;
    tasso: number;
    dataInizio: Date;
    dataInizioInteressi: Date;
    tipoAmmortamento: 'italiano' | 'francese';
  }): RataCalcolata[] {
    const { capitale, numeroRate, tasso, dataInizio, dataInizioInteressi, tipoAmmortamento } = params;

    if (tipoAmmortamento === 'italiano') {
      return this.calcolaRateItaliano(capitale, numeroRate, tasso, dataInizio, dataInizioInteressi);
    } else {
      return this.calcolaRateFrancese(capitale, numeroRate, tasso, dataInizio, dataInizioInteressi);
    }
  }

  /**
   * Ammortamento all'italiana: quota capitale costante, interessi sul capitale residuo decrescente
   */
  private calcolaRateItaliano(
    capitale: number,
    numeroRate: number,
    tasso: number,
    dataInizio: Date,
    dataInizioInteressi: Date
  ): RataCalcolata[] {
    const rate: RataCalcolata[] = [];
    const quotaCapitale = capitale / numeroRate;
    let capitaleResiduo = capitale;
    let dataScadenzaPrecedente = dataInizioInteressi;

    for (let i = 0; i < numeroRate; i++) {
      const dataScadenza = new Date(dataInizio);
      dataScadenza.setMonth(dataScadenza.getMonth() + i);

      // Calcola giorni tra data precedente e scadenza rata
      const giorni = this.calcolaGiorni(dataScadenzaPrecedente, dataScadenza);

      // Formula: I = C × S × N / 36500
      const quotaInteressi = (capitaleResiduo * tasso * giorni) / 36500;

      rate.push({
        numeroRata: i + 1,
        quotaCapitale: quotaCapitale,
        quotaInteressi: quotaInteressi,
        importo: quotaCapitale + quotaInteressi,
        dataScadenza,
        capitaleResiduo: capitaleResiduo - quotaCapitale,
      });

      capitaleResiduo -= quotaCapitale;
      dataScadenzaPrecedente = dataScadenza;
    }

    // Gestisci arrotondamenti sull'ultima rata
    const totaleCapitale = rate.reduce((sum, r) => sum + r.quotaCapitale, 0);
    const differenzaCapitale = capitale - totaleCapitale;
    if (Math.abs(differenzaCapitale) > 0.01) {
      rate[rate.length - 1].quotaCapitale += differenzaCapitale;
      rate[rate.length - 1].importo += differenzaCapitale;
    }

    return rate;
  }

  /**
   * Ammortamento alla francese: rata costante (capitale + interessi), quota capitale crescente
   */
  private calcolaRateFrancese(
    capitale: number,
    numeroRate: number,
    tasso: number,
    dataInizio: Date,
    dataInizioInteressi: Date
  ): RataCalcolata[] {
    const rate: RataCalcolata[] = [];

    // Calcola la rata costante usando la formula del prestito
    // R = C * [i * (1 + i)^n] / [(1 + i)^n - 1]
    // dove i è il tasso mensile
    const tassoMensile = (tasso / 100) / 12;
    const rataFissa = capitale * (tassoMensile * Math.pow(1 + tassoMensile, numeroRate)) /
                      (Math.pow(1 + tassoMensile, numeroRate) - 1);

    let capitaleResiduo = capitale;
    let dataScadenzaPrecedente = dataInizioInteressi;

    for (let i = 0; i < numeroRate; i++) {
      const dataScadenza = new Date(dataInizio);
      dataScadenza.setMonth(dataScadenza.getMonth() + i);

      // Calcola giorni tra data precedente e scadenza rata
      const giorni = this.calcolaGiorni(dataScadenzaPrecedente, dataScadenza);

      // Formula: I = C × S × N / 36500
      const quotaInteressi = (capitaleResiduo * tasso * giorni) / 36500;

      // La quota capitale è la differenza tra rata fissa e interessi
      let quotaCapitale = rataFissa - quotaInteressi;

      // Ultima rata: aggiusta per chiudere il capitale residuo
      if (i === numeroRate - 1) {
        quotaCapitale = capitaleResiduo;
      }

      rate.push({
        numeroRata: i + 1,
        quotaCapitale: quotaCapitale,
        quotaInteressi: quotaInteressi,
        importo: quotaCapitale + quotaInteressi,
        dataScadenza,
        capitaleResiduo: capitaleResiduo - quotaCapitale,
      });

      capitaleResiduo -= quotaCapitale;
      dataScadenzaPrecedente = dataScadenza;
    }

    return rate;
  }

  /**
   * Calcola il numero di giorni tra due date (anno civile 365 giorni)
   */
  private calcolaGiorni(dataInizio: Date, dataFine: Date): number {
    const diff = dataFine.getTime() - dataInizio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Ottieni il piano di ammortamento attivo di una pratica
   */
  async getPianoByPratica(praticaId: string): Promise<PianoAmmortamento | null> {
    const piano = await this.pianoRepo.findOne({
      where: { praticaId },
      relations: ['rate', 'pratica', 'pratica.cliente'],
      order: { createdAt: 'DESC' },
    });
    if (piano?.rate) {
      piano.rate = piano.rate.sort((a, b) => (a.numeroRata || 0) - (b.numeroRata || 0));
    }
    return piano;
  }

  /**
   * Ottieni tutte le rate di un piano
   */
  async getRateByPiano(pianoId: string): Promise<RataAmmortamento[]> {
    return await this.rateRepo.find({
      where: { pianoId },
      order: { numeroRata: 'ASC' },
    });
  }

  /**
   * Aggiorna una rata (es. segnarla come pagata)
   */
  async updateRata(rataId: string, dto: UpdateRataDto): Promise<RataAmmortamento> {
    const rata = await this.rateRepo.findOne({
      where: { id: rataId },
      relations: ['piano'],
    });

    if (!rata) {
      throw new NotFoundException('Rata non trovata');
    }

    // Verifica che il piano sia attivo
    if (rata.piano.stato !== 'attivo') {
      throw new BadRequestException('Non puoi modificare le rate di un piano non attivo');
    }

    // Se viene segnata come pagata e non c'è una data di pagamento, usa la data odierna
    if (dto.pagata === true && !dto.dataPagamento && !rata.dataPagamento) {
      dto.dataPagamento = new Date().toISOString().split('T')[0];
    }

    // Se viene segnata come non pagata, rimuovi la data di pagamento
    if (dto.pagata === false) {
      dto.dataPagamento = null;
    }

    Object.assign(rata, dto);
    return await this.rateRepo.save(rata);
  }

  /**
   * Registra il pagamento di una rata con ricevuta
   */
  async registraPagamentoRata(
    rataId: string,
    dto: { dataPagamento: string; metodoPagamento: string; codicePagamento?: string; note?: string },
    file?: Express.Multer.File,
  ): Promise<RataAmmortamento> {
    const rata = await this.rateRepo.findOne({
      where: { id: rataId },
      relations: ['piano', 'piano.pratica', 'piano.pratica.studio'],
    });

    if (!rata) {
      throw new NotFoundException('Rata non trovata');
    }

    // Verifica che il piano sia attivo
    if (rata.piano.stato !== 'attivo') {
      throw new BadRequestException('Non puoi registrare pagamenti per le rate di un piano non attivo');
    }

    // Verifica che la rata non sia già pagata
    if (rata.pagata) {
      throw new BadRequestException('Questa rata risulta già pagata');
    }

    // Aggiorna i dati della rata
    rata.pagata = true;
    rata.dataPagamento = dto.dataPagamento;
    rata.metodoPagamento = dto.metodoPagamento;
    rata.codicePagamento = dto.codicePagamento || null;

    // Se c'è una nota, la aggiungiamo
    if (dto.note) {
      rata.note = dto.note;
    }

    // Se c'è un file caricato, salva il path
    if (file) {
      rata.ricevutaPath = file.path;
    }

    // Crea il movimento finanziario per il recupero del capitale (solo quota capitale)
    const movimentoCapitale = this.movimentoRepo.create({
      praticaId: rata.piano.praticaId,
      studioId: rata.piano.pratica.studioId,
      tipo: 'recupero_capitale',
      importo: rata.quotaCapitale,
      data: new Date(dto.dataPagamento),
      oggetto: `Piano ammortamento - Pagamento rata ${rata.numeroRata}/${rata.piano.numeroRate} - Recupero capitale${dto.codicePagamento ? ` (Rif: ${dto.codicePagamento})` : ''}`,
    });

    const movimentoCapitaleSalvato = await this.movimentoRepo.save(movimentoCapitale);
    rata.movimentoFinanziarioId = movimentoCapitaleSalvato.id;

    // Se la rata prevede interessi, crea anche il movimento per il recupero interessi
    let movimentoInteressiSalvato: MovimentoFinanziario | null = null;
    if (rata.quotaInteressi > 0) {
      const movimentoInteressi = this.movimentoRepo.create({
        praticaId: rata.piano.praticaId,
        studioId: rata.piano.pratica.studioId,
        tipo: 'recupero_interessi',
        importo: rata.quotaInteressi,
        data: new Date(dto.dataPagamento),
        oggetto: `Piano ammortamento - Pagamento rata ${rata.numeroRata}/${rata.piano.numeroRate} - Recupero interessi${dto.codicePagamento ? ` (Rif: ${dto.codicePagamento})` : ''}`,
      });

      movimentoInteressiSalvato = await this.movimentoRepo.save(movimentoInteressi);
      rata.movimentoInteressiId = movimentoInteressiSalvato.id;
    }

    const rataSalvata = await this.rateRepo.save(rata);

    // DOPO aver salvato la rata, registra i movimenti nello storico
    await this.praticheService.aggiungiEventoFaseCorrente(
      rata.piano.praticaId,
      'movimento_finanziario',
      {
        id: movimentoCapitaleSalvato.id,
        tipo: movimentoCapitaleSalvato.tipo,
        importo: Number(movimentoCapitaleSalvato.importo),
        oggetto: movimentoCapitaleSalvato.oggetto,
        azione: 'inserimento',
      },
    );

    if (rata.quotaInteressi > 0 && movimentoInteressiSalvato) {
      await this.praticheService.aggiungiEventoFaseCorrente(
        rata.piano.praticaId,
        'movimento_finanziario',
        {
          id: movimentoInteressiSalvato.id,
          tipo: movimentoInteressiSalvato.tipo,
          importo: Number(movimentoInteressiSalvato.importo),
          oggetto: movimentoInteressiSalvato.oggetto,
          azione: 'inserimento',
        },
      );
    }

    // Registra evento nello storico
    await this.praticheService.aggiungiEventoFaseCorrente(
      rata.piano.praticaId,
      'piano_ammortamento_pagamento',
      {
        pianoId: rata.piano.id,
        rataId: rata.id,
        numeroRata: rata.numeroRata,
        importo: Number(rata.importo),
        quotaCapitale: Number(rata.quotaCapitale),
        quotaInteressi: Number(rata.quotaInteressi),
        dataPagamento: dto.dataPagamento,
        metodoPagamento: dto.metodoPagamento,
        codicePagamento: dto.codicePagamento,
      },
    );

    return rataSalvata;
  }

  /**
   * Storna il pagamento di una rata
   */
  async stornaPagamentoRata(rataId: string): Promise<RataAmmortamento> {
    const rata = await this.rateRepo.findOne({
      where: { id: rataId },
      relations: ['piano'],
    });

    if (!rata) {
      throw new NotFoundException('Rata non trovata');
    }

    // Verifica che il piano sia attivo
    if (rata.piano.stato !== 'attivo') {
      throw new BadRequestException('Non puoi stornare pagamenti per le rate di un piano non attivo');
    }

    // Verifica che la rata sia pagata
    if (!rata.pagata) {
      throw new BadRequestException('Questa rata non risulta pagata');
    }

    // Se c'è un movimento finanziario per il capitale, recupera le info ed eliminalo
    if (rata.movimentoFinanziarioId) {
      const movimentoCapitale = await this.movimentoRepo.findOne({
        where: { id: rata.movimentoFinanziarioId },
      });

      if (movimentoCapitale) {
        // Registra l'eliminazione nello storico prima di eliminare
        await this.praticheService.aggiungiEventoFaseCorrente(
          rata.piano.praticaId,
          'movimento_finanziario',
          {
            tipo: movimentoCapitale.tipo,
            importo: movimentoCapitale.importo,
            oggetto: movimentoCapitale.oggetto,
            azione: 'eliminazione',
          },
        );

        await this.movimentoRepo.delete(rata.movimentoFinanziarioId);
      }
    }

    // Se c'è un movimento finanziario per gli interessi, recupera le info ed eliminalo
    if (rata.movimentoInteressiId) {
      const movimentoInteressi = await this.movimentoRepo.findOne({
        where: { id: rata.movimentoInteressiId },
      });

      if (movimentoInteressi) {
        // Registra l'eliminazione nello storico prima di eliminare
        await this.praticheService.aggiungiEventoFaseCorrente(
          rata.piano.praticaId,
          'movimento_finanziario',
          {
            tipo: movimentoInteressi.tipo,
            importo: movimentoInteressi.importo,
            oggetto: movimentoInteressi.oggetto,
            azione: 'eliminazione',
          },
        );

        await this.movimentoRepo.delete(rata.movimentoInteressiId);
      }
    }

    // Resetta i dati del pagamento
    rata.pagata = false;
    rata.dataPagamento = null;
    rata.metodoPagamento = null;
    rata.codicePagamento = null;
    rata.ricevutaPath = null;
    rata.movimentoFinanziarioId = null;
    rata.movimentoInteressiId = null;

    const rataSalvata = await this.rateRepo.save(rata);

    // Registra evento nello storico
    await this.praticheService.aggiungiEventoFaseCorrente(
      rata.piano.praticaId,
      'piano_ammortamento_storno',
      {
        pianoId: rata.piano.id,
        rataId: rata.id,
        numeroRata: rata.numeroRata,
        importo: Number(rata.importo),
        quotaCapitale: Number(rata.quotaCapitale),
        quotaInteressi: Number(rata.quotaInteressi),
      },
    );

    return rataSalvata;
  }

  /**
   * Ottieni il path della ricevuta di una rata
   */
  async getRicevutaPath(rataId: string): Promise<{ filePath: string; filename: string }> {
    const rata = await this.rateRepo.findOne({
      where: { id: rataId },
    });

    if (!rata) {
      throw new NotFoundException('Rata non trovata');
    }

    if (!rata.ricevutaPath) {
      throw new NotFoundException('Nessuna ricevuta disponibile per questa rata');
    }

    const filePath = rata.ricevutaPath;
    const filename = filePath.split('/').pop() || 'ricevuta';

    return { filePath, filename };
  }

  /**
   * Chiudi il piano con esito positivo o negativo
   */
  async chiudiPiano(pianoId: string, dto: ChiudiPianoDto): Promise<PianoAmmortamento> {
    const piano = await this.pianoRepo.findOne({
      where: { id: pianoId },
      relations: ['rate', 'pratica'],
    });

    if (!piano) {
      throw new NotFoundException('Piano non trovato');
    }

    if (piano.stato !== 'attivo') {
      throw new BadRequestException('Il piano non è attivo');
    }

    // Calcola l'importo recuperato
    const importoRecuperato = piano.rate
      .filter(r => r.pagata)
      .reduce((sum, r) => sum + Number(r.importo), 0);

    piano.stato = dto.esito === 'positivo' ? 'chiuso_positivo' : 'chiuso_negativo';
    piano.dataChiusura = new Date().toISOString().split('T')[0];
    piano.importoRecuperato = Number(importoRecuperato.toFixed(2));

    if (dto.note) {
      piano.note = piano.note ? `${piano.note}\n\nChiusura: ${dto.note}` : dto.note;
    }

    // Inserisci automaticamente il recupero nei movimenti finanziari
    if (importoRecuperato > 0) {
      const movimento = this.movimentoRepo.create({
        praticaId: piano.praticaId,
        studioId: piano.pratica?.studioId ?? null,
        tipo: 'recupero_capitale' as any,
        importo: Number(importoRecuperato.toFixed(2)),
        data: new Date(),
        oggetto: `Recupero Capitale da piano di ammortamento${dto.note ? ` - ${dto.note}` : ''}`,
      });
      const movimentoSalvato = await this.movimentoRepo.save(movimento);
      piano.movimentoFinanziarioId = movimentoSalvato.id;
      piano.importoInserito = true;
    } else {
      piano.movimentoFinanziarioId = null;
      piano.importoInserito = false;
    }

    return await this.pianoRepo.save(piano);
  }

  /**
   * Riapri un piano chiuso
   */
  async riapriPiano(pianoId: string): Promise<PianoAmmortamento> {
    const piano = await this.pianoRepo.findOne({
      where: { id: pianoId },
    });

    if (!piano) {
      throw new NotFoundException('Piano non trovato');
    }

    if (piano.stato === 'attivo') {
      throw new BadRequestException('Il piano è già attivo');
    }

    // Se era stato generato un movimento di recupero lo rimuoviamo per evitare duplicazioni
    if (piano.movimentoFinanziarioId) {
      await this.movimentoRepo.delete(piano.movimentoFinanziarioId);
      piano.movimentoFinanziarioId = null;
      piano.importoInserito = false;
    }

    piano.stato = 'attivo';
    piano.dataChiusura = null;
    piano.importoRecuperato = null;

    return await this.pianoRepo.save(piano);
  }

  /**
   * Inserisci l'importo recuperato nei movimenti finanziari
   */
  async inserisciCapitale(pianoId: string, dto: InserisciCapitaleDto): Promise<PianoAmmortamento> {
    const piano = await this.pianoRepo.findOne({
      where: { id: pianoId },
      relations: ['pratica'],
    });

    if (!piano) {
      throw new NotFoundException('Piano non trovato');
    }

    if (piano.stato === 'attivo') {
      throw new BadRequestException('Devi chiudere il piano prima di inserire il capitale');
    }

    if (piano.importoInserito) {
      throw new BadRequestException('L\'importo è già stato inserito nei movimenti finanziari');
    }

    if (!piano.importoRecuperato || piano.importoRecuperato === 0) {
      throw new BadRequestException('Non ci sono importi da recuperare');
    }

    // Crea il movimento finanziario
    const movimento = this.movimentoRepo.create({
      praticaId: piano.praticaId,
      studioId: piano.pratica?.studioId ?? null,
      tipo: 'recupero_capitale' as any,
      importo: piano.importoRecuperato,
      data: new Date(),
      oggetto: `Recupero da piano di ammortamento ${piano.stato === 'chiuso_positivo' ? '(completo)' : '(parziale)'}. ${dto.note || ''}`,
    });

    const movimentoSalvato = await this.movimentoRepo.save(movimento);

    // Aggiorna il piano
    piano.importoInserito = true;
    piano.movimentoFinanziarioId = movimentoSalvato.id;

    return await this.pianoRepo.save(piano);
  }

  /**
   * Elimina un piano e tutte le sue rate
   */
  async deletePiano(pianoId: string): Promise<void> {
    const piano = await this.pianoRepo.findOne({
      where: { id: pianoId },
    });

    if (!piano) {
      throw new NotFoundException('Piano non trovato');
    }

    if (piano.importoInserito) {
      throw new BadRequestException(
        'Non puoi eliminare un piano il cui importo è già stato inserito nei movimenti finanziari'
      );
    }

    await this.pianoRepo.remove(piano);
  }

  /**
   * Ottieni statistiche sul piano di ammortamento
   */
  async getStatistichePiano(pianoId: string) {
    const piano = await this.pianoRepo.findOne({
      where: { id: pianoId },
      relations: ['rate'],
    });

    if (!piano) {
      throw new NotFoundException('Piano non trovato');
    }

    const totaleCapitale = Number(piano.capitaleIniziale);
    const capitalePagato = piano.rate
      .filter(r => r.pagata)
      .reduce((sum, r) => sum + Number(r.importo), 0);
    const capitaleResiduo = totaleCapitale - capitalePagato;
    const ratePagate = piano.rate.filter(r => r.pagata).length;
    const rateResidue = piano.rate.filter(r => !r.pagata).length;

    return {
      totaleCapitale: Number(totaleCapitale.toFixed(2)),
      capitalePagato: Number(capitalePagato.toFixed(2)),
      capitaleResiduo: Number(capitaleResiduo.toFixed(2)),
      numeroRateTotali: piano.numeroRate,
      ratePagate,
      rateResidue,
      percentualePagata: piano.numeroRate > 0 ? Number(((ratePagate / piano.numeroRate) * 100).toFixed(2)) : 0,
      stato: piano.stato,
      importoRecuperato: piano.importoRecuperato ? Number(piano.importoRecuperato) : null,
      importoInserito: piano.importoInserito,
      dataChiusura: piano.dataChiusura,
    };
  }

  /**
   * Genera un report PDF del piano di ammortamento
   */
  async generaReportPiano(pianoId: string): Promise<Buffer> {
    const piano = await this.pianoRepo.findOne({
      where: { id: pianoId },
      relations: ['rate', 'pratica', 'pratica.cliente'],
    });

    if (!piano) {
      throw new NotFoundException('Piano non trovato');
    }

    const rateOrdinate = (piano.rate || []).sort((a, b) => a.numeroRata - b.numeroRata);
    const clienteNome = piano.pratica?.cliente?.ragioneSociale || 'Cliente';
    const praticaNumero = piano.pratica?.numeroPratica || piano.praticaId;

    const formatNumber = (value: number) =>
      value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Genera righe con o senza colonne interessi
    const righeRate = rateOrdinate.map((rata) => {
      if (piano.applicaInteressi) {
        return `
          <tr>
            <td>Rata ${rata.numeroRata}</td>
            <td>€ ${formatNumber(Number(rata.quotaCapitale))}</td>
            <td>€ ${formatNumber(Number(rata.quotaInteressi))}</td>
            <td>€ ${formatNumber(Number(rata.importo))}</td>
            <td>${new Date(rata.dataScadenza).toLocaleDateString('it-IT')}</td>
            <td>${rata.pagata ? 'Pagata' : 'Da pagare'}</td>
            <td>${rata.dataPagamento ? new Date(rata.dataPagamento).toLocaleDateString('it-IT') : '-'}</td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td>Rata ${rata.numeroRata}</td>
            <td>€ ${formatNumber(Number(rata.importo))}</td>
            <td>${new Date(rata.dataScadenza).toLocaleDateString('it-IT')}</td>
            <td>${rata.pagata ? 'Pagata' : 'Da pagare'}</td>
            <td>${rata.dataPagamento ? new Date(rata.dataPagamento).toLocaleDateString('it-IT') : '-'}</td>
          </tr>
        `;
      }
    }).join('');

    const capitalePagato = rateOrdinate
      .filter((rata) => rata.pagata)
      .reduce((sum, rata) => sum + Number(rata.importo), 0);
    const capitaleResiduo = Number(piano.capitaleIniziale) - capitalePagato;

    const dataOggi = new Date().toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
          background:#eef2f7;
          margin: 0;
          color:#0f172a;
          padding: 20px;
        }
        .page {
          max-width: 1240px;
          margin: 0 auto;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(4, 12, 34, 0.18);
          overflow: hidden;
        }
        .hero {
          background: linear-gradient(135deg, #0b1224 0%, #132b4a 40%, #1c4c80 100%);
          color: #fff;
          padding: 18px 24px;
        }
        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .brand img {
          width: 52px;
          height: 52px;
        }
        .title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }
        .subtitle {
          margin-top: 2px;
          font-size: 11px;
          color: #d8e4ff;
        }
        .badge {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 10px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          color: #e9f0ff;
        }
        .section { padding: 22px 28px 28px; }
        .card { background:#fff; border-radius:12px; padding:20px; box-shadow:0 14px 36px rgba(4,12,34,0.12); }
        h1 { margin:0 0 4px 0; font-size:22px; }
        h2 { margin:18px 0 10px 0; font-size:16px; }
        .meta { color:#475569; font-size:13px; margin-bottom:12px; }
        table { width:100%; border-collapse:collapse; margin-top:10px; }
        th, td { border:1px solid #e2e8f0; padding:10px; font-size:12px; text-align:left; }
        thead { background:#eef2f6; }
        tfoot td { font-weight:700; }
        table, tr, td, th { page-break-inside: avoid; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        .card { page-break-inside: avoid; }
        .footer {
          margin-top: 24px;
          background: linear-gradient(135deg, #0c162b 0%, #13335a 45%, #1f4d8b 100%);
          color: #e7ecf5;
          padding: 18px 32px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 16px;
          border-radius: 0;
        }
        .footer-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .footer-left img { height: 44px; width: auto; }
        .footer-name {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .footer-text { font-size: 11px; line-height: 1.5; }
        .footer-text .copyright { margin-top: 6px; color: #c7d1df; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="hero">
          <div class="hero-top">
            <div class="brand">
              <img src="data:image/png;base64,${LOGO_RESOLV_DEFAULT}" alt="Logo" />
              <div>
                <div class="title">Piano di ammortamento</div>
                <div class="subtitle">${clienteNome}</div>
                <div class="subtitle">Pratica: ${praticaNumero}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="card">
            <h1>Dettaglio Piano di Ammortamento</h1>
            <div class="meta">Cliente: ${clienteNome} • Pratica: ${praticaNumero}</div>
            <div class="meta">
              Stato: ${piano.stato.replace('_', ' ')} • Capitale totale: € ${formatNumber(Number(piano.capitaleIniziale))}
            </div>
            <div class="meta">
              Capitale recuperato: € ${formatNumber(Number(capitalePagato))} •
              Capitale rimanente: € ${formatNumber(Number(capitaleResiduo))}
            </div>
            ${piano.applicaInteressi ? `
              <div class="meta">
                Totale interessi: € ${formatNumber(Number(piano.totaleInteressi))} •
                Tasso applicato: ${formatNumber(Number(piano.tassoInteresse))}% (${piano.tipoInteresse})
              </div>
            ` : ''}
            <h2>Rate</h2>
            <table>
              <thead>
                <tr>
                  ${piano.applicaInteressi ? `
                    <th>Rata</th><th>Quota Capitale</th><th>Quota Interessi</th><th>Importo Totale</th><th>Scadenza</th><th>Stato</th><th>Pagamento</th>
                  ` : `
                    <th>Rata</th><th>Importo</th><th>Scadenza</th><th>Stato</th><th>Pagamento</th>
                  `}
                </tr>
              </thead>
              <tbody>
                ${righeRate}
              </tbody>
            </table>
            ${piano.applicaInteressi ? `
              <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-left: 4px solid #ff6b35;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">DISCLAIMER LEGALE</h3>
                <ul style="font-size: 11px; line-height: 1.6; margin: 0; padding-left: 20px;">
                  <li>Calcolo degli interessi effettuato secondo artt. 1283 e 1284 del Codice Civile</li>
                  <li>Anno civile di 365 giorni (anche per anni bisestili)</li>
                  <li>Tassi di interesse legali stabiliti dal Ministero dell'Economia e delle Finanze</li>
                  <li>Tassi moratori: tasso BCE + maggiorazioni ex D.Lgs. 231/2002 e successive modifiche</li>
                  <li>Per interessi moratori non si applica l'anatocismo (interessi sugli interessi)</li>
                  <li>Capitalizzazione ammessa solo nei casi previsti dall'art. 1283 c.c.</li>
                  <li>Capitalizzazione trimestrale: 1° gennaio, 1° aprile, 1° luglio, 1° ottobre</li>
                  <li>Capitalizzazione semestrale: 1° gennaio, 1° luglio • Annuale: 1° gennaio</li>
                  <li>Pagamenti imputati prima agli interessi poi al capitale (art. 1194 c.c.)</li>
                  <li>I risultati hanno carattere indicativo e devono essere verificati</li>
                </ul>
                <p style="font-size: 10px; margin: 10px 0 0 0; color: #666;">
                  <strong>Riferimenti normativi:</strong> Codice Civile artt. 1194, 1283, 1284 |
                  D.Lgs. 231/2002 (interessi moratori) | D.Lgs. 192/2012 (maggiorazione 8%) |
                  Tassi BCE pubblicati semestralmente
                </p>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">
            <img src="data:image/png;base64,${LOGO_RESOLV_FULL}" alt="Resolv" />
            <div class="footer-name">RESOLV</div>
          </div>
          <div class="footer-text">
            <div>Software gestionale per studi legali e professionisti del settore creditizio</div>
            <div>Report generato il ${dataOggi}</div>
            <div class="copyright">© ${new Date().getFullYear()} Resolv. Tutti i diritti riservati.</div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    return this.renderHtmlToPdf(html);
  }

  private async renderHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
    });
    await browser.close();
    return Buffer.from(pdf);
  }
}
