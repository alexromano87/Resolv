// apps/backend/src/utilita/utilita.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RisorsaUtilita } from './risorsa-utilita.entity';
import { CreateRisorsaUtilitaDto } from './dto/create-risorsa-utilita.dto';
import { UpdateRisorsaUtilitaDto } from './dto/update-risorsa-utilita.dto';
import * as fs from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class UtilitaService {
  private readonly logger = new Logger(UtilitaService.name);

  constructor(
    @InjectRepository(RisorsaUtilita)
    private risorsaRepo: Repository<RisorsaUtilita>,
  ) {}

  async create(createDto: CreateRisorsaUtilitaDto): Promise<RisorsaUtilita> {
    const risorsa = this.risorsaRepo.create(createDto);
    return await this.risorsaRepo.save(risorsa);
  }

  async findAll(studioId?: string, includeInactive = false): Promise<RisorsaUtilita[]> {
    const where: any = {};

    if (!includeInactive) {
      where.attivo = true;
    }

    if (studioId !== undefined) {
      where.studioId = studioId;
    }

    return await this.risorsaRepo.find({
      where,
      order: { dataCreazione: 'DESC' },
    });
  }

  async findByTipo(tipo: string, studioId?: string): Promise<RisorsaUtilita[]> {
    const where: any = { tipo, attivo: true };

    if (studioId !== undefined) {
      where.studioId = studioId;
    }

    return await this.risorsaRepo.find({
      where,
      order: { dataCreazione: 'DESC' },
    });
  }

  async findOne(id: string): Promise<RisorsaUtilita> {
    const risorsa = await this.risorsaRepo.findOne({
      where: { id },
    });
    if (!risorsa) {
      throw new NotFoundException(`Risorsa con ID ${id} non trovata`);
    }
    return risorsa;
  }

  async update(id: string, updateDto: UpdateRisorsaUtilitaDto): Promise<RisorsaUtilita> {
    const risorsa = await this.findOne(id);
    Object.assign(risorsa, updateDto);
    return await this.risorsaRepo.save(risorsa);
  }

  async remove(id: string): Promise<void> {
    const risorsa = await this.findOne(id);

    // Delete the physical file from disk if exists
    if (risorsa.percorsoFile) {
      try {
        if (fs.existsSync(risorsa.percorsoFile)) {
          await unlinkAsync(risorsa.percorsoFile);
        }
      } catch (error) {
        this.logger.error(`Error deleting file: ${risorsa.percorsoFile}`, error);
      }
    }

    await this.risorsaRepo.remove(risorsa);
  }

  async getFileStream(id: string): Promise<{ stream: fs.ReadStream; risorsa: RisorsaUtilita }> {
    const risorsa = await this.findOne(id);

    if (!risorsa.percorsoFile) {
      throw new NotFoundException('Questa risorsa non ha un file associato');
    }

    if (!fs.existsSync(risorsa.percorsoFile)) {
      throw new NotFoundException(`File fisico non trovato: ${risorsa.percorsoFile}`);
    }

    const stream = fs.createReadStream(risorsa.percorsoFile);
    return { stream, risorsa };
  }
}
