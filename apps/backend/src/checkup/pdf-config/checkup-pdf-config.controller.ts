import { Controller, Get, Put, Post, Body, Req, UseGuards, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupSuperadminGuard } from '../auth/checkup-superadmin.guard';
import { CheckupPdfConfigService } from './checkup-pdf-config.service';
import { CheckupPreassessmentRenderService } from '../preassessment/checkup-preassessment-render.service';
import { PdfConfigDto } from '../dto/pdf-config.dto';

@Controller('checkup/pdf-config')
export class CheckupPdfConfigController {
  constructor(
    private readonly pdfConfigService: CheckupPdfConfigService,
    private readonly renderService: CheckupPreassessmentRenderService,
  ) {}

  /** Tutti gli utenti checkup autenticati possono leggere il config (serve per generare PDF) */
  @Get()
  @UseGuards(CheckupJwtAuthGuard)
  async getConfig(): Promise<PdfConfigDto> {
    return this.pdfConfigService.getConfig();
  }

  @Get('preview-context')
  @UseGuards(CheckupJwtAuthGuard, CheckupSuperadminGuard)
  async getPreviewContext(): Promise<{ companyName: string; consultantName: string }> {
    return this.pdfConfigService.getPreviewContext();
  }

  /** Solo superadmin possono modificare il config */
  @Put()
  @UseGuards(CheckupJwtAuthGuard, CheckupSuperadminGuard)
  async updateConfig(@Body() dto: PdfConfigDto, @Req() req: any): Promise<PdfConfigDto> {
    return this.pdfConfigService.updateConfig(dto, req.user?.email);
  }

  /**
   * Genera PDF di anteprima partendo dall'HTML fornito dal frontend.
   * Il frontend chiama buildReportHtml con il config corrente e invia l'HTML qui.
   */
  @Post('preview')
  @HttpCode(200)
  @UseGuards(CheckupJwtAuthGuard, CheckupSuperadminGuard)
  async preview(@Body() body: { html: string }, @Res() res: Response): Promise<void> {
    const pdf = await this.renderService.renderHtmlToPdf(body.html ?? '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="anteprima-report.pdf"');
    res.end(pdf);
  }
}
