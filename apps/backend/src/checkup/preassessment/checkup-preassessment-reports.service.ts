import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupPreassessmentReport } from './checkup-preassessment-report.entity';

@Injectable()
export class CheckupPreassessmentReportsService {
  constructor(
    @InjectRepository(CheckupPreassessmentReport)
    private readonly reportRepository: Repository<CheckupPreassessmentReport>,
  ) {}

  async save(preassessmentId: string, clientId: string, filename: string, pdf: Buffer) {
    const report = this.reportRepository.create({
      preassessmentId,
      clientId,
      filename,
      pdf,
    });
    return this.reportRepository.save(report);
  }

  async listByClient(clientId: string) {
    return this.reportRepository.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
      select: ['id', 'filename', 'createdAt', 'clientId', 'preassessmentId'],
    });
  }

  async getPdf(reportId: string) {
    return this.reportRepository.findOne({ where: { id: reportId } });
  }
}
