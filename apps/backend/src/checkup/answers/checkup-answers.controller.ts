import { Controller, Get, Put, Param, Body, Query, UseGuards, Post } from '@nestjs/common';
import { CheckupAnswersService } from './checkup-answers.service';
import { BulkSaveAnswersDto } from './dto/save-answer.dto';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

@Controller('checkup/questionnaires/:questionnaireId/answers')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupAnswersController {
  constructor(private readonly answersService: CheckupAnswersService) {}

  @Put()
  saveAnswers(
    @Param('questionnaireId') questionnaireId: string,
    @Body() dto: BulkSaveAnswersDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.answersService.saveAnswers(questionnaireId, dto, user);
  }

  @Get()
  getAnswers(
    @Param('questionnaireId') questionnaireId: string,
    @Query('sectionId') sectionId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.answersService.getAnswers(questionnaireId, user, sectionId);
  }

  @Get('presence')
  getPresence(
    @Param('questionnaireId') questionnaireId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.answersService.getPresence(questionnaireId, user);
  }

  @Post('presence/active')
  setPresenceActive(
    @Param('questionnaireId') questionnaireId: string,
    @Body('fieldId') fieldId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.answersService.setPresenceActive(questionnaireId, fieldId, user);
  }

  @Post('presence/inactive')
  setPresenceInactive(
    @Param('questionnaireId') questionnaireId: string,
    @Body('fieldId') fieldId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.answersService.setPresenceInactive(questionnaireId, fieldId, user);
  }
}
