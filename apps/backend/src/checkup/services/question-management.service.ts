import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionMacroArea } from '../entities/question-macro-area.entity';
import { QuestionSection } from '../entities/question-section.entity';
import { QuestionField } from '../entities/question-field.entity';
import { QuestionModel } from '../entities/question-model.entity';
import {
  CreateQuestionModelDto,
  UpdateQuestionModelDto,
  CreateMacroAreaDto,
  UpdateMacroAreaDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateFieldDto,
  UpdateFieldDto,
} from '../dto/question-management.dto';

@Injectable()
export class QuestionManagementService {
  constructor(
    @InjectRepository(QuestionMacroArea)
    private macroAreaRepo: Repository<QuestionMacroArea>,
    @InjectRepository(QuestionSection)
    private sectionRepo: Repository<QuestionSection>,
    @InjectRepository(QuestionField)
    private fieldRepo: Repository<QuestionField>,
    @InjectRepository(QuestionModel)
    private modelRepo: Repository<QuestionModel>,
  ) {}

  private sanitizeCode(code: string) {
    return code.replace(/[^a-zA-Z0-9_]/g, '');
  }

  private async generateUniqueMacroCode(
    baseCode: string,
    modelCode: string,
  ) {
    const sanitizedBase = this.sanitizeCode(baseCode) || 'm';
    const sanitizedModel = this.sanitizeCode(modelCode) || 'model';
    const limit = 10;

    const makeCandidate = (suffix?: string) => {
      if (!suffix) {
        const raw = `${sanitizedModel}_${sanitizedBase}`;
        return raw.length <= limit ? raw : raw.slice(0, limit);
      }
      const maxBase = Math.max(1, limit - (suffix.length + 1));
      const base = `${sanitizedModel}_${sanitizedBase}`.slice(0, maxBase);
      return `${base}_${suffix}`;
    };

    const firstCandidate = makeCandidate();
    const firstExisting = await this.macroAreaRepo.findOne({ where: { code: firstCandidate } });
    if (!firstExisting) return firstCandidate;

    let counter = 1;
    while (counter < 1000) {
      const candidate = makeCandidate(String(counter));
      const existing = await this.macroAreaRepo.findOne({ where: { code: candidate } });
      if (!existing) return candidate;
      counter += 1;
    }

    return makeCandidate(String(Date.now()).slice(-4));
  }

  private async generateUniqueSectionCode(
    baseCode: string,
    modelCode: string,
  ) {
    const sanitizedBase = this.sanitizeCode(baseCode) || 'section';
    const sanitizedModel = this.sanitizeCode(modelCode) || 'model';
    const limit = 50;

    const makeCandidate = (suffix?: string) => {
      if (!suffix) {
        const raw = `${sanitizedModel}_${sanitizedBase}`;
        return raw.length <= limit ? raw : raw.slice(0, limit);
      }
      const maxBase = Math.max(1, limit - (suffix.length + 1));
      const base = `${sanitizedModel}_${sanitizedBase}`.slice(0, maxBase);
      return `${base}_${suffix}`;
    };

    const firstCandidate = makeCandidate();
    const firstExisting = await this.sectionRepo.findOne({ where: { code: firstCandidate } });
    if (!firstExisting) return firstCandidate;

    let counter = 1;
    while (counter < 1000) {
      const candidate = makeCandidate(String(counter));
      const existing = await this.sectionRepo.findOne({ where: { code: candidate } });
      if (!existing) return candidate;
      counter += 1;
    }

    return makeCandidate(String(Date.now()).slice(-6));
  }

  private async generateUniqueFieldId(
    baseFieldId: string,
    modelCode: string,
  ) {
    const sanitizedBase = this.sanitizeCode(baseFieldId) || 'field';
    const sanitizedModel = this.sanitizeCode(modelCode) || 'model';
    const limit = 100;

    const makeCandidate = (suffix?: string) => {
      if (!suffix) {
        const raw = `${sanitizedModel}_${sanitizedBase}`;
        return raw.length <= limit ? raw : raw.slice(0, limit);
      }
      const maxBase = Math.max(1, limit - (suffix.length + 1));
      const base = `${sanitizedModel}_${sanitizedBase}`.slice(0, maxBase);
      return `${base}_${suffix}`;
    };

    const firstCandidate = makeCandidate();
    const firstExisting = await this.fieldRepo.findOne({ where: { fieldId: firstCandidate } });
    if (!firstExisting) return firstCandidate;

    let counter = 1;
    while (counter < 1000) {
      const candidate = makeCandidate(String(counter));
      const existing = await this.fieldRepo.findOne({ where: { fieldId: candidate } });
      if (!existing) return candidate;
      counter += 1;
    }

    return makeCandidate(String(Date.now()).slice(-6));
  }

  // ==================== MODELS ====================

  async getAllModels() {
    return this.modelRepo.find({ order: { createdAt: 'ASC' } });
  }

  async getModelById(id: string) {
    const model = await this.modelRepo.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Modello con ID ${id} non trovato`);
    }
    return model;
  }

  async createModel(dto: CreateQuestionModelDto) {
    const existing = await this.modelRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Esiste gia un modello con codice "${dto.code}"`);
    }
    const template = dto.importFromModelId
      ? await this.modelRepo.findOne({
          where: { id: dto.importFromModelId },
          relations: ['macroAreas', 'macroAreas.sections', 'macroAreas.sections.fields'],
        })
      : null;
    if (dto.importFromModelId && !template) {
      throw new NotFoundException(`Modello con ID ${dto.importFromModelId} non trovato`);
    }

    const model = this.modelRepo.create({
      code: dto.code,
      label: dto.label,
      description: dto.description ?? null,
      parentModelId: dto.importFromModelId ?? null,
    });
    const savedModel = await this.modelRepo.save(model);

    if (!dto.importFromModelId) {
      return savedModel;
    }
    if (!template) {
      return savedModel;
    }

    const sortedMacros = [...(template.macroAreas || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const macro of sortedMacros) {
      const macroCode = await this.generateUniqueMacroCode(macro.code, savedModel.code);
      const newMacro = this.macroAreaRepo.create({
        modelId: savedModel.id,
        code: macroCode,
        label: macro.label,
        color: macro.color,
        sortOrder: macro.sortOrder,
      });
      const savedMacro = await this.macroAreaRepo.save(newMacro);

      const sortedSections = [...(macro.sections || [])].sort((a, b) => a.sortOrder - b.sortOrder);
      for (const section of sortedSections) {
        const sectionCode = await this.generateUniqueSectionCode(section.code, savedModel.code);
        const newSection = this.sectionRepo.create({
          macroAreaId: savedMacro.id,
          code: sectionCode,
          title: section.title,
          description: section.description,
          sortOrder: section.sortOrder,
        });
        const savedSection = await this.sectionRepo.save(newSection);

        const sortedFields = [...(section.fields || [])].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const field of sortedFields) {
          const fieldId = await this.generateUniqueFieldId(field.fieldId, savedModel.code);
          const newField = this.fieldRepo.create({
            sectionId: savedSection.id,
            fieldId,
            label: field.label,
            type: field.type,
            options: field.options,
            required: field.required,
            help: field.help,
            allowDocuments: field.allowDocuments,
            weight: field.weight,
            sortOrder: field.sortOrder,
          });
          await this.fieldRepo.save(newField);
        }
      }
    }

    return this.modelRepo.findOne({ where: { id: savedModel.id } });
  }

  async updateModel(id: string, dto: UpdateQuestionModelDto) {
    const model = await this.getModelById(id);
    if (model.status === 'published') {
      throw new ForbiddenException('Il modello è pubblicato e non può essere modificato. Crea una nuova versione.');
    }
    if (dto.code && dto.code !== model.code) {
      const existing = await this.modelRepo.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`Esiste gia un modello con codice "${dto.code}"`);
      }
    }
    Object.assign(model, dto);
    return this.modelRepo.save(model);
  }

  async deleteModel(id: string) {
    const model = await this.getModelById(id);
    if (model.status === 'published') {
      throw new ForbiddenException('Il modello è pubblicato e non può essere eliminato. Archivialo prima.');
    }
    await this.modelRepo.remove(model);
    return { message: 'Model deleted successfully' };
  }

  async publishModel(id: string) {
    const model = await this.getModelById(id);
    if (model.status === 'published') {
      throw new ConflictException('Il modello è già pubblicato');
    }
    model.status = 'published';
    return this.modelRepo.save(model);
  }

  async archiveModel(id: string) {
    const model = await this.getModelById(id);
    model.status = 'archived';
    return this.modelRepo.save(model);
  }

  async createNewModelVersion(id: string) {
    const parent = await this.modelRepo.findOne({
      where: { id },
      relations: ['macroAreas', 'macroAreas.sections', 'macroAreas.sections.fields'],
    });
    if (!parent) throw new NotFoundException(`Modello con ID ${id} non trovato`);
    if (parent.status !== 'published') {
      throw new ConflictException('Solo i modelli pubblicati possono generare una nuova versione');
    }

    const newCode = `${parent.code}_v${parent.version + 1}`;
    const existing = await this.modelRepo.findOne({ where: { code: newCode } });
    if (existing) {
      throw new ConflictException(`Una nuova versione esiste già (${newCode})`);
    }

    const newModel = this.modelRepo.create({
      code: newCode,
      label: parent.label,
      description: parent.description,
      attivo: true,
      status: 'draft',
      version: parent.version + 1,
      parentModelId: parent.id,
    });
    const savedModel = await this.modelRepo.save(newModel);

    // Deep-clone all macro areas → sections → fields
    const sortedMacros = [...(parent.macroAreas || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const macro of sortedMacros) {
      const macroCode = await this.generateUniqueMacroCode(macro.code, newModel.code);
      const newMacro = this.macroAreaRepo.create({
        modelId: savedModel.id,
        code: macroCode,
        label: macro.label,
        color: macro.color,
        sortOrder: macro.sortOrder,
      });
      const savedMacro = await this.macroAreaRepo.save(newMacro);

      const sortedSections = [...(macro.sections || [])].sort((a, b) => a.sortOrder - b.sortOrder);
      for (const section of sortedSections) {
        const sectionCode = await this.generateUniqueSectionCode(section.code, newModel.code);
        const newSection = this.sectionRepo.create({
          macroAreaId: savedMacro.id,
          code: sectionCode,
          title: section.title,
          description: section.description,
          sortOrder: section.sortOrder,
        });
        const savedSection = await this.sectionRepo.save(newSection);

        const sortedFields = [...(section.fields || [])].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const field of sortedFields) {
          const fieldId = await this.generateUniqueFieldId(field.fieldId, newModel.code);
          const newField = this.fieldRepo.create({
            sectionId: savedSection.id,
            fieldId,
            label: field.label,
            type: field.type,
            options: field.options,
            required: field.required,
            help: field.help,
            allowDocuments: field.allowDocuments,
            weight: field.weight,
            sortOrder: field.sortOrder,
          });
          await this.fieldRepo.save(newField);
        }
      }
    }

    return this.modelRepo.findOne({ where: { id: savedModel.id } });
  }

  // ==================== MACRO AREAS ====================

  async getAllMacroAreas(modelId?: string) {
    return this.macroAreaRepo.find({
      where: modelId ? { modelId } : undefined,
      order: { sortOrder: 'ASC', id: 'ASC' },
      relations: ['sections'],
    });
  }

  async getMacroAreaById(id: number) {
    const macroArea = await this.macroAreaRepo.findOne({
      where: { id },
      relations: ['sections'],
    });
    if (!macroArea) {
      throw new NotFoundException(`Macro area con ID ${id} non trovata`);
    }
    return macroArea;
  }

  async createMacroArea(dto: CreateMacroAreaDto) {
    await this.getModelById(dto.modelId);
    // Check if code already exists
    const existing = await this.macroAreaRepo.findOne({
      where: { code: dto.code, modelId: dto.modelId },
    });
    if (existing) {
      throw new ConflictException(`Esiste gia una macro area con codice "${dto.code}"`);
    }

    const macroArea = this.macroAreaRepo.create(dto);
    return this.macroAreaRepo.save(macroArea);
  }

  async updateMacroArea(id: number, dto: UpdateMacroAreaDto) {
    const macroArea = await this.getMacroAreaById(id);

    if (dto.modelId && dto.modelId !== macroArea.modelId) {
      await this.getModelById(dto.modelId);
    }

    // Check code uniqueness if changing
    if (dto.code && dto.code !== macroArea.code) {
      const existing = await this.macroAreaRepo.findOne({
        where: { code: dto.code, modelId: dto.modelId ?? macroArea.modelId },
      });
      if (existing) {
        throw new ConflictException(`Esiste gia una macro area con codice "${dto.code}"`);
      }
    }

    Object.assign(macroArea, dto);
    return this.macroAreaRepo.save(macroArea);
  }

  async deleteMacroArea(id: number) {
    const macroArea = await this.getMacroAreaById(id);
    await this.macroAreaRepo.remove(macroArea);
    return { message: 'Macro area eliminata correttamente' };
  }

  // ==================== SECTIONS ====================

  async getAllSections() {
    return this.sectionRepo.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
      relations: ['macroArea', 'fields'],
    });
  }

  async getSectionById(id: number) {
    const section = await this.sectionRepo.findOne({
      where: { id },
      relations: ['macroArea', 'fields'],
    });
    if (!section) {
      throw new NotFoundException(`Sezione con ID ${id} non trovata`);
    }
    return section;
  }

  async getSectionsByMacroArea(macroAreaId: number) {
    return this.sectionRepo.find({
      where: { macroAreaId },
      order: { sortOrder: 'ASC', id: 'ASC' },
      relations: ['fields'],
    });
  }

  async createSection(dto: CreateSectionDto) {
    // Check if macro area exists
    await this.getMacroAreaById(dto.macroAreaId);

    // Check if code already exists
    const existing = await this.sectionRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Esiste gia una sezione con codice "${dto.code}"`);
    }

    const section = this.sectionRepo.create(dto);
    return this.sectionRepo.save(section);
  }

  async updateSection(id: number, dto: UpdateSectionDto) {
    const section = await this.getSectionById(id);

    // Check macro area exists if changing
    if (dto.macroAreaId && dto.macroAreaId !== section.macroAreaId) {
      await this.getMacroAreaById(dto.macroAreaId);
    }

    // Check code uniqueness if changing
    if (dto.code && dto.code !== section.code) {
      const existing = await this.sectionRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Esiste gia una sezione con codice "${dto.code}"`);
      }
    }

    Object.assign(section, dto);
    return this.sectionRepo.save(section);
  }

  async deleteSection(id: number) {
    const section = await this.getSectionById(id);
    await this.sectionRepo.remove(section);
    return { message: 'Section deleted successfully' };
  }

  // ==================== FIELDS ====================

  async getAllFields() {
    return this.fieldRepo.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
      relations: ['section'],
    });
  }

  async getFieldById(id: number) {
    const field = await this.fieldRepo.findOne({
      where: { id },
      relations: ['section'],
    });
    if (!field) {
      throw new NotFoundException(`Campo con ID ${id} non trovato`);
    }
    return field;
  }

  async getFieldsBySection(sectionId: number) {
    return this.fieldRepo.find({
      where: { sectionId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async createField(dto: CreateFieldDto) {
    // Check if section exists
    await this.getSectionById(dto.sectionId);

    const field = this.fieldRepo.create(dto);
    return this.fieldRepo.save(field);
  }

  async updateField(id: number, dto: UpdateFieldDto) {
    const field = await this.getFieldById(id);

    // Check section exists if changing
    if (dto.sectionId && dto.sectionId !== field.sectionId) {
      await this.getSectionById(dto.sectionId);
    }

    Object.assign(field, dto);
    return this.fieldRepo.save(field);
  }

  async deleteField(id: number) {
    const field = await this.getFieldById(id);
    await this.fieldRepo.remove(field);
    return { message: 'Field deleted successfully' };
  }

  // ==================== COMPLETE STRUCTURE ====================

  async getCompleteStructure(modelId?: string) {
    const macroAreas = await this.macroAreaRepo.find({
      where: modelId ? { modelId } : undefined,
      order: { sortOrder: 'ASC', id: 'ASC' },
      relations: ['sections', 'sections.fields'],
    });

    return macroAreas.map((macro) => ({
      ...macro,
      sections: macro.sections
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((section) => ({
          ...section,
          fields: section.fields.sort((a, b) => a.sortOrder - b.sortOrder),
        })),
    }));
  }
}
