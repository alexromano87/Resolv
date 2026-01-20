// apps/backend/src/movimenti-finanziari/movimenti-finanziari.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MovimentoFinanziario } from './movimento-finanziario.entity';
import { CreateMovimentoFinanziarioDto } from './create-movimento-finanziario.dto';
import { UpdateMovimentoFinanziarioDto } from './update-movimento-finanziario.dto';

@Injectable()
export class MovimentiFinanziariService {
  constructor(
    @InjectRepository(MovimentoFinanziario)
    private movimentiRepository: Repository<MovimentoFinanziario>,
  ) {}

  async create(createMovimentoDto: CreateMovimentoFinanziarioDto): Promise<MovimentoFinanziario> {
    const movimento = this.movimentiRepository.create(createMovimentoDto);
    return await this.movimentiRepository.save(movimento);
  }

  async findAllByPratica(praticaId: string, studioId?: string): Promise<MovimentoFinanziario[]> {
    const where: any = { praticaId };

    // Se studioId è definito, filtra per studio
    if (studioId !== undefined) {
      where.studioId = studioId;
    }

    return await this.movimentiRepository.find({
      where,
      order: { data: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<MovimentoFinanziario> {
    const movimento = await this.movimentiRepository.findOne({
      where: { id },
    });
    if (!movimento) {
      throw new NotFoundException(`Movimento con id ${id} non trovato`);
    }
    return movimento;
  }

  async update(id: string, updateMovimentoDto: UpdateMovimentoFinanziarioDto): Promise<MovimentoFinanziario> {
    const movimento = await this.findOne(id);
    Object.assign(movimento, updateMovimentoDto);
    return await this.movimentiRepository.save(movimento);
  }

  async remove(id: string): Promise<void> {
    const movimento = await this.findOne(id);
    await this.movimentiRepository.remove(movimento);
  }

  // Metodo helper per calcolare totali per tipo
  async getTotaliByPratica(praticaId: string, studioId?: string) {
    const movimenti = await this.findAllByPratica(praticaId, studioId);

    const totali = {
      capitale: 0,
      anticipazioni: 0,
      compensi: 0,
      interessi: 0,
      recuperoCapitale: 0,
      recuperoAnticipazioni: 0,
      recuperoCompensi: 0,
      recuperoInteressi: 0,
    };

    movimenti.forEach((m) => {
      const importo = Number(m.importo);
      switch (m.tipo) {
        case 'capitale':
          totali.capitale += importo;
          break;
        case 'anticipazione':
          totali.anticipazioni += importo;
          break;
        case 'compenso':
          totali.compensi += importo;
          break;
        case 'interessi':
          totali.interessi += importo;
          break;
        case 'recupero_capitale':
          totali.recuperoCapitale += importo;
          break;
        case 'recupero_anticipazione':
          totali.recuperoAnticipazioni += importo;
          break;
        case 'recupero_compenso':
          totali.recuperoCompensi += importo;
          break;
        case 'recupero_interessi':
          totali.recuperoInteressi += importo;
          break;
      }
    });

    return totali;
  }

  /**
   * Trova movimenti per report fatturazione con filtri
   */
  async findForFatturazione(filters: {
    studioId?: string;
    clienteId?: string;
    statoFatturazione?: 'da_fatturare' | 'gia_fatturato';
    dataInizio?: Date;
    dataFine?: Date;
    tipoMovimento?: ('compenso' | 'anticipazione')[];
  }): Promise<MovimentoFinanziario[]> {
    const queryBuilder = this.movimentiRepository
      .createQueryBuilder('movimento')
      .leftJoinAndSelect('movimento.pratica', 'pratica')
      .leftJoinAndSelect('pratica.cliente', 'cliente')
      .leftJoinAndSelect('pratica.debitore', 'debitore');

    // Filtra solo compensi e anticipazioni (non i recuperi)
    queryBuilder.andWhere('movimento.tipo IN (:...tipi)', {
      tipi: filters.tipoMovimento || ['compenso', 'anticipazione'],
    });

    // Filtra per studio
    if (filters.studioId) {
      queryBuilder.andWhere('movimento.studioId = :studioId', {
        studioId: filters.studioId,
      });
    }

    // Filtra per cliente
    if (filters.clienteId) {
      queryBuilder.andWhere('pratica.clienteId = :clienteId', {
        clienteId: filters.clienteId,
      });
    }

    // Filtra per stato fatturazione
    if (filters.statoFatturazione === 'da_fatturare') {
      queryBuilder.andWhere('(movimento.daFatturare = :daFatturare OR movimento.daFatturare IS NULL)', {
        daFatturare: true,
      });
      queryBuilder.andWhere('(movimento.giaFatturato = :giaFatturato OR movimento.giaFatturato IS NULL)', {
        giaFatturato: false,
      });
    } else if (filters.statoFatturazione === 'gia_fatturato') {
      queryBuilder.andWhere('movimento.giaFatturato = :giaFatturato', {
        giaFatturato: true,
      });
    }

    // Filtra per periodo
    if (filters.dataInizio) {
      queryBuilder.andWhere('movimento.data >= :dataInizio', {
        dataInizio: filters.dataInizio,
      });
    }
    if (filters.dataFine) {
      queryBuilder.andWhere('movimento.data <= :dataFine', {
        dataFine: filters.dataFine,
      });
    }

    queryBuilder.orderBy('movimento.data', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Aggiorna lo stato di fatturazione di più movimenti
   */
  async aggiornaStatoFatturazione(
    movimentoIds: string[],
    statoFatturazione: { daFatturare: boolean; giaFatturato: boolean },
  ): Promise<void> {
    if (movimentoIds.length === 0) return;

    await this.movimentiRepository.update(
      { id: In(movimentoIds) },
      {
        daFatturare: statoFatturazione.daFatturare,
        giaFatturato: statoFatturazione.giaFatturato,
      },
    );
  }

  /**
   * Calcola statistiche fatturazione per studio
   */
  async getStatisticheFatturazione(studioId?: string): Promise<{
    totDaFatturare: number;
    totGiaFatturato: number;
    compensiDaFatturare: number;
    anticipazioniDaFatturare: number;
    compensiGiaFatturati: number;
    anticipazioniGiaFatturate: number;
  }> {
    const queryBuilder = this.movimentiRepository.createQueryBuilder('movimento');

    if (studioId) {
      queryBuilder.where('movimento.studioId = :studioId', { studioId });
    }

    queryBuilder.andWhere('movimento.tipo IN (:...tipi)', {
      tipi: ['compenso', 'anticipazione'],
    });

    const movimenti = await queryBuilder.getMany();

    const stats = {
      totDaFatturare: 0,
      totGiaFatturato: 0,
      compensiDaFatturare: 0,
      anticipazioniDaFatturare: 0,
      compensiGiaFatturati: 0,
      anticipazioniGiaFatturate: 0,
    };

    movimenti.forEach((m) => {
      const importo = Number(m.importo);
      const isDaFatturare = m.daFatturare === true || (m.daFatturare === null && m.giaFatturato !== true);
      const isGiaFatturato = m.giaFatturato === true;

      if (isDaFatturare && !isGiaFatturato) {
        stats.totDaFatturare += importo;
        if (m.tipo === 'compenso') {
          stats.compensiDaFatturare += importo;
        } else if (m.tipo === 'anticipazione') {
          stats.anticipazioniDaFatturare += importo;
        }
      }

      if (isGiaFatturato) {
        stats.totGiaFatturato += importo;
        if (m.tipo === 'compenso') {
          stats.compensiGiaFatturati += importo;
        } else if (m.tipo === 'anticipazione') {
          stats.anticipazioniGiaFatturate += importo;
        }
      }
    });

    return stats;
  }
}
