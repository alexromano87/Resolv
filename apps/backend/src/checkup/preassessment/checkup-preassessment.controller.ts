import { Controller, Get, Put, Post, Body, UseGuards, Param, BadRequestException, Res } from '@nestjs/common';
import { RateLimit } from '../../common/rate-limit.decorator';
import type { Response } from 'express';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { UpdatePreassessmentDto } from './dto/update-preassessment.dto';
import { CheckupStaffGuard } from '../auth/checkup-staff.guard';
import { CheckupPreassessmentReportsService } from './checkup-preassessment-reports.service';

@Controller('checkup/preassessment')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupPreassessmentController {
  constructor(
    private readonly preassessmentService: CheckupPreassessmentService,
    private readonly reportsService: CheckupPreassessmentReportsService,
  ) {}

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

  @Post('complete')
  complete(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.preassessmentService.complete(user);
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

  @UseGuards(CheckupStaffGuard)
  @Post('clients/:clientId/new-version')
  createNewVersion(
    @Param('clientId') clientId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.preassessmentService.createNewVersion(clientId, user);
  }

  @UseGuards(CheckupStaffGuard)
  @Get('clients/:clientId/history')
  getHistory(
    @Param('clientId') clientId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.preassessmentService.getHistory(clientId, user);
  }

  @Post('pdf')
  @RateLimit({ limit: 3, windowMs: 60 * 1000 })
  async generatePdf(@Body('html') html: string, @Res() res: Response) {
    if (!html || typeof html !== 'string') {
      throw new BadRequestException('HTML mancante');
    }
    const pdf = await this.preassessmentService.renderHtmlToPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="pre_assessment.pdf"');
    res.send(pdf);
  }

  @UseGuards(CheckupStaffGuard)
  @Post(':preassessmentId/report/salva')
  @RateLimit({ limit: 3, windowMs: 60 * 1000 })
  async saveReport(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Body('html') html: string,
  ) {
    if (!html || typeof html !== 'string') {
      throw new BadRequestException('HTML mancante');
    }
    const { preassessment, client } = await this.preassessmentService.getPreassessmentForReport(preassessmentId, user);
    const pdf = await this.preassessmentService.renderHtmlToPdf(html);
    const filename = `report-preassessment-${client.id}-${new Date().toISOString().split('T')[0]}.pdf`;
    return this.reportsService.save(preassessment.id, client.id, filename, pdf);
  }

  @UseGuards(CheckupStaffGuard)
  @Get('clients/:clientId/reports')
  async listReports(
    @Param('clientId') clientId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    await this.preassessmentService.getClient(clientId, user);
    return this.reportsService.listByClient(clientId);
  }

  @UseGuards(CheckupStaffGuard)
  @Get('reports/:reportId/pdf')
  async downloadReport(
    @Param('reportId') reportId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.getPdf(reportId);
    if (!report) {
      throw new BadRequestException('Report non trovato');
    }
    await this.preassessmentService.getClient(report.clientId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.setHeader('Content-Length', report.pdf.length);
    res.send(report.pdf);
  }

  @Get(':preassessmentId/presence')
  @RateLimit({ limit: 30, windowMs: 60 * 1000 })
  getPresence(
    @Param('preassessmentId') preassessmentId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.preassessmentService.getPresence(preassessmentId, user);
  }

  @Get('online')
  @RateLimit({ limit: 30, windowMs: 60 * 1000 })
  getOnline(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.preassessmentService.getOnline(user);
  }

  @Post(':preassessmentId/presence/active')
  @RateLimit({ limit: 30, windowMs: 60 * 1000 })
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
  @RateLimit({ limit: 30, windowMs: 60 * 1000 })
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
