import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupTemplate } from './checkup-template.entity';

@Injectable()
export class CheckupTemplatesService {
  constructor(
    @InjectRepository(CheckupTemplate)
    private templateRepository: Repository<CheckupTemplate>,
  ) {}

  async findAll(): Promise<CheckupTemplate[]> {
    return this.templateRepository.find({
      where: { attivo: true },
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CheckupTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, attivo: true },
      relations: ['sections', 'sections.questions'],
      order: {
        sections: {
          ordine: 'ASC',
          questions: {
            ordine: 'ASC',
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template non trovato');
    }

    // Filter active sections and questions
    template.sections = template.sections
      .filter((s) => s.attivo)
      .map((s) => ({
        ...s,
        questions: s.questions.filter((q) => q.attivo),
      }));

    return template;
  }
}
