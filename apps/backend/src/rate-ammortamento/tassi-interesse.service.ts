import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { TassoInteresse } from './tasso-interesse.entity';
import { CreateTassoInteresseDto } from './dto/create-tasso-interesse.dto';
import { UpdateTassoInteresseDto } from './dto/update-tasso-interesse.dto';

@Injectable()
export class TassiInteresseService {
  constructor(
    @InjectRepository(TassoInteresse)
    private tassiRepository: Repository<TassoInteresse>,
  ) {}

  /**
   * Crea un nuovo tasso di interesse
   */
  async create(dto: CreateTassoInteresseDto): Promise<TassoInteresse> {
    // Validazione: dataInizioValidita deve essere <= dataFineValidita (se presente)
    if (dto.dataFineValidita) {
      const dataInizio = new Date(dto.dataInizioValidita);
      const dataFine = new Date(dto.dataFineValidita);
      if (dataInizio > dataFine) {
        throw new BadRequestException('La data di inizio validità non può essere successiva alla data di fine');
      }
    }

    const tasso = this.tassiRepository.create(dto);
    return await this.tassiRepository.save(tasso);
  }

  /**
   * Recupera tutti i tassi di interesse
   */
  async findAll(): Promise<TassoInteresse[]> {
    return await this.tassiRepository.find({
      order: {
        tipo: 'ASC',
        dataInizioValidita: 'DESC',
      },
    });
  }

  /**
   * Recupera un tasso per ID
   */
  async findOne(id: string): Promise<TassoInteresse> {
    const tasso = await this.tassiRepository.findOne({ where: { id } });
    if (!tasso) {
      throw new NotFoundException(`Tasso con ID ${id} non trovato`);
    }
    return tasso;
  }

  /**
   * Recupera il tasso valido per un tipo e una data specifica
   * @param tipo - 'legale' o 'moratorio'
   * @param data - Data di riferimento (default: oggi)
   */
  async findByTipoAndDate(tipo: 'legale' | 'moratorio', data?: Date): Promise<TassoInteresse | null> {
    const dataRiferimento = data || new Date();

    // Cerca un tasso dove:
    // - tipo corrisponde
    // - dataInizioValidita <= dataRiferimento
    // - dataFineValidita >= dataRiferimento OR dataFineValidita IS NULL (ancora valido)
    const tasso = await this.tassiRepository
      .createQueryBuilder('tasso')
      .where('tasso.tipo = :tipo', { tipo })
      .andWhere('tasso.dataInizioValidita <= :data', { data: dataRiferimento })
      .andWhere('(tasso.dataFineValidita >= :data OR tasso.dataFineValidita IS NULL)', { data: dataRiferimento })
      .orderBy('tasso.dataInizioValidita', 'DESC')
      .getOne();

    if (tasso) {
      return tasso;
    }

    // Se non esiste un tasso moratorio valido, usa l'ultimo disponibile <= dataRiferimento.
    if (tipo === 'moratorio') {
      return await this.tassiRepository.findOne({
        where: {
          tipo,
          dataInizioValidita: LessThanOrEqual(dataRiferimento),
        },
        order: { dataInizioValidita: 'DESC' },
      });
    }

    return null;
  }

  /**
   * Recupera tutti i tassi per un tipo specifico
   */
  async findByTipo(tipo: 'legale' | 'moratorio'): Promise<TassoInteresse[]> {
    return await this.tassiRepository.find({
      where: { tipo },
      order: { dataInizioValidita: 'DESC' },
    });
  }

  /**
   * Aggiorna un tasso esistente
   */
  async update(id: string, dto: UpdateTassoInteresseDto): Promise<TassoInteresse> {
    const tasso = await this.findOne(id);

    // Validazione date se presenti
    if (dto.dataInizioValidita || dto.dataFineValidita) {
      const dataInizio = new Date(dto.dataInizioValidita || tasso.dataInizioValidita);
      const dataFine = dto.dataFineValidita ? new Date(dto.dataFineValidita) : (tasso.dataFineValidita ? new Date(tasso.dataFineValidita) : null);

      if (dataFine && dataInizio > dataFine) {
        throw new BadRequestException('La data di inizio validità non può essere successiva alla data di fine');
      }
    }

    Object.assign(tasso, dto);
    return await this.tassiRepository.save(tasso);
  }

  /**
   * Elimina un tasso
   */
  async remove(id: string): Promise<void> {
    const tasso = await this.findOne(id);
    await this.tassiRepository.remove(tasso);
  }

  /**
   * Recupera tutti i tassi attualmente validi
   */
  async findCurrentRates(): Promise<TassoInteresse[]> {
    const oggi = new Date();

    return await this.tassiRepository
      .createQueryBuilder('tasso')
      .where('tasso.dataInizioValidita <= :oggi', { oggi })
      .andWhere('(tasso.dataFineValidita >= :oggi OR tasso.dataFineValidita IS NULL)', { oggi })
      .orderBy('tasso.tipo', 'ASC')
      .getMany();
  }

  /**
   * Verifica se esiste un tasso con stesso tipo e periodo sovrapposto
   * Utilizzato dal TassiFetchService per rilevare duplicati
   * @param tipo - Tipo di tasso (legale o moratorio)
   * @param dataInizio - Data inizio validità del nuovo tasso
   * @param dataFine - Data fine validità del nuovo tasso (null = indefinita)
   * @returns Tasso esistente se trovato, null altrimenti
   */
  async checkForOverlappingRate(
    tipo: 'legale' | 'moratorio',
    dataInizio: Date,
    dataFine: Date | null,
  ): Promise<TassoInteresse | null> {
    const qb = this.tassiRepository.createQueryBuilder('tasso');

    qb.where('tasso.tipo = :tipo', { tipo });

    // Verifica sovrapposizione periodi:
    // Due periodi si sovrappongono se:
    // - Il nuovo inizio è durante un periodo esistente, OPPURE
    // - Il nuovo fine è durante un periodo esistente, OPPURE
    // - Il nuovo periodo contiene completamente un periodo esistente

    if (dataFine) {
      // Caso 1: nuovo periodo ha data fine specifica
      qb.andWhere(
        '(' +
          '(tasso.dataInizioValidita <= :dataFine AND (tasso.dataFineValidita >= :dataInizio OR tasso.dataFineValidita IS NULL))' +
        ')',
        { dataInizio, dataFine },
      );
    } else {
      // Caso 2: nuovo periodo ha validità indefinita (dataFine = null)
      // Si sovrappone se esiste un tasso con dataFineValidita >= dataInizio O dataFineValidita IS NULL
      qb.andWhere(
        '(tasso.dataFineValidita >= :dataInizio OR tasso.dataFineValidita IS NULL)',
        { dataInizio },
      );
    }

    // Restituisce il primo tasso trovato (se esiste sovrapposizione)
    return await qb.getOne();
  }
}
