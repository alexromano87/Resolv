import * as fs from 'fs';
import { Controller, Get, Put, Post, Body, UseGuards, Param, BadRequestException, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RateLimit } from '../../common/rate-limit.decorator';
import type { Response } from 'express';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupPreassessmentPresenceService } from './checkup-preassessment-presence.service';
import { UpdatePreassessmentDto } from './dto/update-preassessment.dto';
import { CheckupStaffGuard } from '../auth/checkup-staff.guard';
import { CheckupPreassessmentReportsService } from './checkup-preassessment-reports.service';
import { CheckupPreassessmentExportJobsService } from './checkup-preassessment-export-jobs.service';
import { CheckupPreassessmentExcelExportService } from './checkup-preassessment-excel-export.service';
import { CheckupPreassessmentExcelImportService } from './checkup-preassessment-excel-import.service';

@Controller('checkup/preassessment')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupPreassessmentController {
  constructor(
    private readonly preassessmentService: CheckupPreassessmentService,
    private readonly presenceService: CheckupPreassessmentPresenceService,
    private readonly reportsService: CheckupPreassessmentReportsService,
    private readonly exportJobsService: CheckupPreassessmentExportJobsService,
    private readonly excelExportService: CheckupPreassessmentExcelExportService,
    private readonly excelImportService: CheckupPreassessmentExcelImportService,
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

  @Post('final-validate')
  finalValidate(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.preassessmentService.finalValidate(user);
  }

  @Post('final-reopen')
  reopenFinalValidation(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.preassessmentService.reopenFinalValidation(user);
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

  @UseGuards(CheckupStaffGuard)
  @Get('excel/export')
  @RateLimit({ limit: 5, windowMs: 60 * 1000 })
  async downloadExcel(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Res() res: Response,
  ) {
    const buffer = await this.excelExportService.generateExcel(user);
    const filename = `pre_assessment_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @UseGuards(CheckupStaffGuard)
  @Post('excel/import')
  @RateLimit({ limit: 5, windowMs: 60 * 1000 })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.xlsx')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Sono accettati solo file Excel (.xlsx)'), false);
        }
      },
    }),
  )
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    if (!file) throw new BadRequestException('File mancante');
    return this.excelImportService.importExcel(file.buffer, user);
  }

  @Post('pdf/jobs')
  @RateLimit({ limit: 3, windowMs: 60 * 1000 })
  createPdfJob(
    @Body('html') html: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.exportJobsService.createPdfJob(html, user);
  }

  @Get('export-jobs/:jobId')
  getExportJob(
    @Param('jobId') jobId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.exportJobsService.getJob(jobId, user);
  }

  @Get('export-jobs/:jobId/download')
  async downloadExportJob(
    @Param('jobId') jobId: string,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Res() res: Response,
  ) {
    const file = await this.exportJobsService.getJobFile(jobId, user);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    fs.createReadStream(file.path).pipe(res);
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
    return this.presenceService.getPresence(preassessmentId, user);
  }

  @Get('online')
  @RateLimit({ limit: 30, windowMs: 60 * 1000 })
  getOnline(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.presenceService.getOnline(user);
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
    return this.presenceService.setPresenceActive(preassessmentId, fieldId, user);
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
    return this.presenceService.setPresenceInactive(preassessmentId, fieldId, user);
  }
}
