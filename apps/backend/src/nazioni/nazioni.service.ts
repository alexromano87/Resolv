import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nazione } from './nazione.entity';

@Injectable()
export class NazioniService {
  constructor(
    @InjectRepository(Nazione)
    private nazioniRepository: Repository<Nazione>,
  ) {}

  async findAll(attiveOnly = true): Promise<Nazione[]> {
    const where = attiveOnly ? { attiva: true } : undefined;
    return this.nazioniRepository.find({ where, order: { nome: 'ASC' } });
  }
}
