import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportCliente } from './report-cliente.entity';

@Injectable()
export class ReportStorageService {
  constructor(
    @InjectRepository(ReportCliente)
    private readonly reportRepo: Repository<ReportCliente>,
  ) {}

  async salva(clienteId: string, filename: string, pdf: Buffer) {
    const entity = this.reportRepo.create({
      clienteId,
      filename,
      pdf,
    });
    const saved = await this.reportRepo.save(entity);
    return saved;
  }

  async listaPerCliente(clienteId: string) {
    return this.reportRepo.find({
      where: { clienteId },
      order: { createdAt: 'DESC' },
      select: ['id', 'filename', 'createdAt', 'clienteId'],
    });
  }

  async getPdf(id: string) {
    return this.reportRepo.findOne({ where: { id } });
  }
}
