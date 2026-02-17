import { Controller, Get, Put, Post, Body, UseGuards, Param, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { UpdatePreassessmentDto } from './dto/update-preassessment.dto';
import { CheckupStaffGuard } from '../auth/checkup-staff.guard';

@Controller('checkup/preassessment')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupPreassessmentController {
  constructor(private readonly preassessmentService: CheckupPreassessmentService) {}

  @Get()
  get(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.preassessmentService.getOrCreate(user);
  }

  @Put()
  update(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body() dto: UpdatePreassessmentDto,
  ) {
    return this.preassessmentService.update(user, dto);
  }

  @UseGuards(CheckupStaffGuard)
  @Get('clients')
  listClients(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.preassessmentService.listClients(user);
  }

  @UseGuards(CheckupStaffGuard)
  @Get('clients/:clientId')
  getClient(
    @Param('clientId') clientId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.preassessmentService.getClient(clientId, user);
  }

  @UseGuards(CheckupStaffGuard)
  @Put('clients/:clientId')
  updateClient(
    @Param('clientId') clientId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body() dto: UpdatePreassessmentDto,
  ) {
    return this.preassessmentService.updateClient(clientId, dto, user);
  }

  @Post('pdf')
  async generatePdf(@Body('html') html: string, @Res() res: Response) {
    if (!html || typeof html !== 'string') {
      throw new BadRequestException('HTML mancante');
    }
    const pdf = await this.preassessmentService.renderHtmlToPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="pre_assessment.pdf"');
    res.send(pdf);
  }

  @Get(':preassessmentId/presence')
  getPresence(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.preassessmentService.getPresence(preassessmentId, user);
  }

  @Get('online')
  getOnline(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.preassessmentService.getOnline(user);
  }

  @Post(':preassessmentId/presence/active')
  setPresenceActive(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body('fieldId') fieldId: string,
  ) {
    if (!fieldId) {
      throw new BadRequestException('Campo mancante');
    }
    return this.preassessmentService.setPresenceActive(preassessmentId, fieldId, user);
  }

  @Post(':preassessmentId/presence/inactive')
  setPresenceInactive(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body('fieldId') fieldId: string,
  ) {
    if (!fieldId) {
      throw new BadRequestException('Campo mancante');
    }
    return this.preassessmentService.setPresenceInactive(preassessmentId, fieldId, user);
  }
}
