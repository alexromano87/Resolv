import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionMacroArea } from '../entities/question-macro-area.entity';
import { QuestionSection } from '../entities/question-section.entity';
import { QuestionField } from '../entities/question-field.entity';
import {
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
  ) {}

  // ==================== MACRO AREAS ====================

  async getAllMacroAreas() {
    return this.macroAreaRepo.find({
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
      throw new NotFoundException(`Macro area with ID ${id} not found`);
    }
    return macroArea;
  }

  async createMacroArea(dto: CreateMacroAreaDto) {
    // Check if code already exists
    const existing = await this.macroAreaRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Macro area with code "${dto.code}" already exists`);
    }

    const macroArea = this.macroAreaRepo.create(dto);
    return this.macroAreaRepo.save(macroArea);
  }

  async updateMacroArea(id: number, dto: UpdateMacroAreaDto) {
    const macroArea = await this.getMacroAreaById(id);

    // Check code uniqueness if changing
    if (dto.code && dto.code !== macroArea.code) {
      const existing = await this.macroAreaRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Macro area with code "${dto.code}" already exists`);
      }
    }

    Object.assign(macroArea, dto);
    return this.macroAreaRepo.save(macroArea);
  }

  async deleteMacroArea(id: number) {
    const macroArea = await this.getMacroAreaById(id);
    await this.macroAreaRepo.remove(macroArea);
    return { message: 'Macro area deleted successfully' };
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
      throw new NotFoundException(`Section with ID ${id} not found`);
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
      throw new ConflictException(`Section with code "${dto.code}" already exists`);
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
        throw new ConflictException(`Section with code "${dto.code}" already exists`);
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
      throw new NotFoundException(`Field with ID ${id} not found`);
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

  async getCompleteStructure() {
    const macroAreas = await this.macroAreaRepo.find({
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
