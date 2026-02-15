import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CheckupQuestionnairesService } from './checkup-questionnaires.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireStatoDto } from './dto/update-questionnaire.dto';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupAdminStudioGuard } from '../auth/checkup-admin-studio.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

@Controller('checkup/questionnaires')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupQuestionnairesController {
  constructor(private readonly questionnairesService: CheckupQuestionnairesService) {}

  @Post()
  @UseGuards(CheckupAdminStudioGuard)
  create(
    @Body() dto: CreateQuestionnaireDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.questionnairesService.create(dto, user.id);
  }

  @Get()
  findAll(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.questionnairesService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.questionnairesService.findOne(id, user);
  }

  @Patch(':id/stato')
  updateStato(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionnaireStatoDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.questionnairesService.updateStato(id, dto, user);
  }
}
