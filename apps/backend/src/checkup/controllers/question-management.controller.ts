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
  Query,
} from '@nestjs/common';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupSuperadminGuard } from '../auth/checkup-superadmin.guard';
import { QuestionManagementService } from '../services/question-management.service';
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

@Controller('checkup/question-management')
@UseGuards(CheckupJwtAuthGuard)
export class QuestionManagementController {
  constructor(private readonly questionService: QuestionManagementService) {}

  // ==================== COMPLETE STRUCTURE ====================

  @Get('structure')
  async getCompleteStructure(@Query('modelId') modelId?: string) {
    return this.questionService.getCompleteStructure(modelId);
  }

  // ==================== MODELS ====================

  @Get('models')
  async getAllModels() {
    return this.questionService.getAllModels();
  }

  @Get('models/:id')
  async getModelById(@Param('id') id: string) {
    return this.questionService.getModelById(id);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Post('models')
  async createModel(@Body() dto: CreateQuestionModelDto) {
    return this.questionService.createModel(dto);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Put('models/:id')
  async updateModel(@Param('id') id: string, @Body() dto: UpdateQuestionModelDto) {
    return this.questionService.updateModel(id, dto);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Delete('models/:id')
  async deleteModel(@Param('id') id: string) {
    return this.questionService.deleteModel(id);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Post('models/:id/publish')
  async publishModel(@Param('id') id: string) {
    return this.questionService.publishModel(id);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Post('models/:id/archive')
  async archiveModel(@Param('id') id: string) {
    return this.questionService.archiveModel(id);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Post('models/:id/new-version')
  async createNewModelVersion(@Param('id') id: string) {
    return this.questionService.createNewModelVersion(id);
  }

  // ==================== MACRO AREAS ====================

  @Get('macro-areas')
  async getAllMacroAreas(@Query('modelId') modelId?: string) {
    return this.questionService.getAllMacroAreas(modelId);
  }

  @Get('macro-areas/:id')
  async getMacroAreaById(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.getMacroAreaById(id);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Post('macro-areas')
  async createMacroArea(@Body() dto: CreateMacroAreaDto) {
    return this.questionService.createMacroArea(dto);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Put('macro-areas/:id')
  async updateMacroArea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMacroAreaDto,
  ) {
    return this.questionService.updateMacroArea(id, dto);
  }

  @UseGuards(CheckupSuperadminGuard)
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

  @UseGuards(CheckupSuperadminGuard)
  @Post('sections')
  async createSection(@Body() dto: CreateSectionDto) {
    return this.questionService.createSection(dto);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Put('sections/:id')
  async updateSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.questionService.updateSection(id, dto);
  }

  @UseGuards(CheckupSuperadminGuard)
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

  @UseGuards(CheckupSuperadminGuard)
  @Post('fields')
  async createField(@Body() dto: CreateFieldDto) {
    return this.questionService.createField(dto);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Put('fields/:id')
  async updateField(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.questionService.updateField(id, dto);
  }

  @UseGuards(CheckupSuperadminGuard)
  @Delete('fields/:id')
  async deleteField(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.deleteField(id);
  }
}
