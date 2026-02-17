import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionMacroArea } from '../entities/question-macro-area.entity';
import { QuestionSection } from '../entities/question-section.entity';
import { QuestionField } from '../entities/question-field.entity';

// Import static data from frontend
const MACRO_AREAS = [
  { id: 'a', label: 'Identità e Struttura', color: '#6366f1' },
  { id: 'b', label: 'Governance', color: '#8b5cf6' },
  { id: 'c', label: 'Organizzazione', color: '#0ea5e9' },
  { id: 'd', label: 'Compliance e Controlli', color: '#f59e0b' },
  { id: 'e', label: 'Risk Management', color: '#ef4444' },
  { id: 'f', label: 'Rapporti Esterni', color: '#10b981' },
  { id: 'g', label: 'Adeguati Assetti', color: '#7c3aed' },
  { id: 'h', label: 'Documentazione', color: '#64748b' },
];

@Injectable()
export class QuestionSeedService implements OnModuleInit {
  private readonly logger = new Logger(QuestionSeedService.name);

  constructor(
    @InjectRepository(QuestionMacroArea)
    private macroAreaRepo: Repository<QuestionMacroArea>,
    @InjectRepository(QuestionSection)
    private sectionRepo: Repository<QuestionSection>,
    @InjectRepository(QuestionField)
    private fieldRepo: Repository<QuestionField>,
  ) {}

  async onModuleInit() {
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    try {
      // Check if data already exists
      const count = await this.macroAreaRepo.count();

      if (count > 0) {
        this.logger.log('Question data already seeded, skipping...');
        return;
      }

      this.logger.log('Question tables are empty, seeding initial data...');

      // Seed only macro areas initially
      // The full data will be loaded by the superadmin using the seed script if needed
      const macroAreaMap = new Map<string, QuestionMacroArea>();

      for (let i = 0; i < MACRO_AREAS.length; i++) {
        const macro = MACRO_AREAS[i];
        const entity = this.macroAreaRepo.create({
          code: macro.id,
          label: macro.label,
          color: macro.color,
          sortOrder: i,
        });
        const saved = await this.macroAreaRepo.save(entity);
        macroAreaMap.set(macro.id, saved);
      }

      this.logger.log(`✅ Seeded ${MACRO_AREAS.length} macro areas`);
      this.logger.log('ℹ️  To load complete question data, run: npm run seed:questions');
    } catch (error) {
      this.logger.error('Failed to seed question data', error);
    }
  }
}
