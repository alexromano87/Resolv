import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { QuestionManagementService } from '../services/question-management.service';
import {
  CreateMacroAreaDto,
  UpdateMacroAreaDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateFieldDto,
  UpdateFieldDto,
} from '../dto/question-management.dto';

@Controller('checkup/question-management')
@UseGuards(CheckupJwtAuthGuard)
export class QuestionManagementController {
  constructor(private readonly questionService: QuestionManagementService) {}

  // ==================== COMPLETE STRUCTURE ====================

  @Get('structure')
  async getCompleteStructure() {
    return this.questionService.getCompleteStructure();
  }

  // ==================== MACRO AREAS ====================

  @Get('macro-areas')
  async getAllMacroAreas() {
    return this.questionService.getAllMacroAreas();
  }

  @Get('macro-areas/:id')
  async getMacroAreaById(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.getMacroAreaById(id);
  }

  @Post('macro-areas')
  async createMacroArea(@Body() dto: CreateMacroAreaDto) {
    return this.questionService.createMacroArea(dto);
  }

  @Put('macro-areas/:id')
  async updateMacroArea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMacroAreaDto,
  ) {
    return this.questionService.updateMacroArea(id, dto);
  }

  @Delete('macro-areas/:id')
  async deleteMacroArea(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.deleteMacroArea(id);
  }

  // ==================== SECTIONS ====================

  @Get('sections')
  async getAllSections() {
    return this.questionService.getAllSections();
  }

  @Get('sections/:id')
  async getSectionById(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.getSectionById(id);
  }

  @Get('sections/by-macro/:macroAreaId')
  async getSectionsByMacroArea(
    @Param('macroAreaId', ParseIntPipe) macroAreaId: number,
  ) {
    return this.questionService.getSectionsByMacroArea(macroAreaId);
  }

  @Post('sections')
  async createSection(@Body() dto: CreateSectionDto) {
    return this.questionService.createSection(dto);
  }

  @Put('sections/:id')
  async updateSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.questionService.updateSection(id, dto);
  }

  @Delete('sections/:id')
  async deleteSection(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.deleteSection(id);
  }

  // ==================== FIELDS ====================

  @Get('fields')
  async getAllFields() {
    return this.questionService.getAllFields();
  }

  @Get('fields/:id')
  async getFieldById(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.getFieldById(id);
  }

  @Get('fields/by-section/:sectionId')
  async getFieldsBySection(
    @Param('sectionId', ParseIntPipe) sectionId: number,
  ) {
    return this.questionService.getFieldsBySection(sectionId);
  }

  @Post('fields')
  async createField(@Body() dto: CreateFieldDto) {
    return this.questionService.createField(dto);
  }

  @Put('fields/:id')
  async updateField(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.questionService.updateField(id, dto);
  }

  @Delete('fields/:id')
  async deleteField(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.deleteField(id);
  }
}
