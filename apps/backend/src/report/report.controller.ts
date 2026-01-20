import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  ForbiddenException,
  Post,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportPdfService } from './report-pdf.service';
import { ReportPdfServiceNew } from './report-pdf-new.service';
import { ReportExcelService } from './report-excel.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { ClientiService } from '../clienti/clienti.service';
import { ReportStorageService } from './report-storage.service';
import { MovimentiFinanziariService } from '../movimenti-finanziari/movimenti-finanziari.service';

@Controller('report')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(
    private readonly pdfService: ReportPdfService,
    private readonly pdfServiceNew: ReportPdfServiceNew,
    private readonly excelService: ReportExcelService,
    private readonly clientiService: ClientiService,
    private readonly reportStorage: ReportStorageService,
    private readonly movimentiService: MovimentiFinanziariService,
  ) {}

  @Get('cliente/:clienteId/pdf')
  async generaPdfCliente(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
    @Param('clienteId') clienteId: string,
    @Query('dataInizio') dataInizio?: string,
    @Query('dataFine') dataFine?: string,
    @Query('includiDettaglio') includiDettaglio?: string,
    @Query('includiMovimenti') includiMovimenti?: string,
    @Query('includiAnticipazioni') includiAnticipazioni?: string,
    @Query('includiCompensi') includiCompensi?: string,
    @Query('includiRiepilogo') includiRiepilogo?: string,
    @Query('includiAlert') includiAlert?: string,
    @Query('includiTickets') includiTickets?: string,
    @Query('includePraticheIds') includePraticheIds?: string,
    @Query('includeMovimentiIds') includeMovimentiIds?: string,
    @Query('includeAlertIds') includeAlertIds?: string,
    @Query('includeTicketIds') includeTicketIds?: string,
    @Query('note') note?: string,
  ) {
    // Verifica accesso al cliente
    const canAccess = await this.clientiService.canAccessCliente(user, clienteId);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }

    const options = {
      clienteId,
      dataInizio: dataInizio ? new Date(dataInizio) : undefined,
      dataFine: dataFine ? new Date(dataFine) : undefined,
      includiDettaglioPratiche: includiDettaglio !== 'false',
      includiMovimenti: includiMovimenti !== 'false',
      includiAnticipazioni: includiAnticipazioni !== 'false',
      includiCompensi: includiCompensi !== 'false',
      includiRiepilogo: includiRiepilogo !== 'false',
      includiAlert: includiAlert !== 'false',
      includiTickets: includiTickets !== 'false',
      includePraticheIds: includePraticheIds ? includePraticheIds.split(',').filter(Boolean) : undefined,
      includeMovimentiIds: includeMovimentiIds ? includeMovimentiIds.split(',').filter(Boolean) : undefined,
      includeAlertIds: includeAlertIds ? includeAlertIds.split(',').filter(Boolean) : undefined,
      includeTicketIds: includeTicketIds ? includeTicketIds.split(',').filter(Boolean) : undefined,
      note,
    };

    const buffer = await this.pdfServiceNew.generaReportCliente(options);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=report-${clienteId}-${new Date().toISOString().split('T')[0]}.pdf`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Post('cliente/:clienteId/salva')
  async salvaReportCliente(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
    @Param('clienteId') clienteId: string,
    @Query('dataInizio') dataInizio?: string,
    @Query('dataFine') dataFine?: string,
    @Query('includiDettaglio') includiDettaglio?: string,
    @Query('includiMovimenti') includiMovimenti?: string,
    @Query('includiAnticipazioni') includiAnticipazioni?: string,
    @Query('includiCompensi') includiCompensi?: string,
    @Query('includiRiepilogo') includiRiepilogo?: string,
    @Query('includiAlert') includiAlert?: string,
    @Query('includiTickets') includiTickets?: string,
    @Query('includePraticheIds') includePraticheIds?: string,
    @Query('includeMovimentiIds') includeMovimentiIds?: string,
    @Query('includeAlertIds') includeAlertIds?: string,
    @Query('includeTicketIds') includeTicketIds?: string,
    @Query('note') note?: string,
  ) {
    const canAccess = await this.clientiService.canAccessCliente(user, clienteId);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }

    const options = {
      clienteId,
      dataInizio: dataInizio ? new Date(dataInizio) : undefined,
      dataFine: dataFine ? new Date(dataFine) : undefined,
      includiDettaglioPratiche: includiDettaglio !== 'false',
      includiMovimenti: includiMovimenti !== 'false',
      includiAnticipazioni: includiAnticipazioni !== 'false',
      includiCompensi: includiCompensi !== 'false',
      includiRiepilogo: includiRiepilogo !== 'false',
      includiAlert: includiAlert !== 'false',
      includiTickets: includiTickets !== 'false',
      includePraticheIds: includePraticheIds ? includePraticheIds.split(',').filter(Boolean) : undefined,
      includeMovimentiIds: includeMovimentiIds ? includeMovimentiIds.split(',').filter(Boolean) : undefined,
      includeAlertIds: includeAlertIds ? includeAlertIds.split(',').filter(Boolean) : undefined,
      includeTicketIds: includeTicketIds ? includeTicketIds.split(',').filter(Boolean) : undefined,
      note,
    };

    const buffer = await this.pdfServiceNew.generaReportCliente(options);
    const filename = `report-${clienteId}-${new Date().toISOString().split('T')[0]}.pdf`;
    const saved = await this.reportStorage.salva(clienteId, filename, buffer);

    res.json({
      id: saved.id,
      filename: saved.filename,
      createdAt: saved.createdAt,
      clienteId: saved.clienteId,
    });
  }

  @Get('cliente/:clienteId/salvati')
  async listaReportCliente(
    @CurrentUser() user: CurrentUserData,
    @Param('clienteId') clienteId: string,
  ) {
    const canAccess = await this.clientiService.canAccessCliente(user, clienteId);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.reportStorage.listaPerCliente(clienteId);
  }

  @Get('salvato/:reportId/pdf')
  async downloadReportSalvato(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
    @Param('reportId') reportId: string,
  ) {
    const report = await this.reportStorage.getPdf(reportId);
    if (!report) {
      throw new ForbiddenException('Report non trovato');
    }
    const canAccess = await this.clientiService.canAccessCliente(user, report.clienteId);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${report.filename}`,
      'Content-Length': report.pdf.length,
    });
    res.send(report.pdf);
  }

  @Get('cliente/:clienteId/excel')
  async generaExcelCliente(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
    @Param('clienteId') clienteId: string,
    @Query('dataInizio') dataInizio?: string,
    @Query('dataFine') dataFine?: string,
  ) {
    // Verifica accesso al cliente
    const canAccess = await this.clientiService.canAccessCliente(user, clienteId);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }

    const options = {
      clienteId,
      dataInizio: dataInizio ? new Date(dataInizio) : undefined,
      dataFine: dataFine ? new Date(dataFine) : undefined,
    };

    const buffer = await this.excelService.generaReportCliente(options);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=report-${clienteId}-${new Date().toISOString().split('T')[0]}.xlsx`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Get('cliente/:clienteId/csv')
  async generaCsvCliente(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
    @Param('clienteId') clienteId: string,
    @Query('dataInizio') dataInizio?: string,
    @Query('dataFine') dataFine?: string,
  ) {
    const canAccess = await this.clientiService.canAccessCliente(user, clienteId);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }

    const options = {
      clienteId,
      dataInizio: dataInizio ? new Date(dataInizio) : undefined,
      dataFine: dataFine ? new Date(dataFine) : undefined,
    };

    const buffer = await this.excelService.generaReportClienteCsv(options);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=report-${clienteId}-${new Date().toISOString().split('T')[0]}.csv`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Get('fatturazione/pdf')
  async generaPdfFatturazione(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
    @Query('clienteId') clienteId?: string,
    @Query('statoFatturazione') statoFatturazione?: 'da_fatturare' | 'gia_fatturato',
    @Query('dataInizio') dataInizio?: string,
    @Query('dataFine') dataFine?: string,
    @Query('tipoMovimento') tipoMovimento?: string,
  ) {
    // Verifica accesso al cliente se specificato
    if (clienteId) {
      const canAccess = await this.clientiService.canAccessCliente(user, clienteId);
      if (!canAccess) {
        throw new ForbiddenException('Accesso non consentito');
      }
    }

    // Prepara filtri
    const filters: any = {
      studioId: user.ruolo === 'admin' ? undefined : user.studioId || undefined,
      statoFatturazione,
      clienteId,
    };

    if (dataInizio) {
      filters.dataInizio = new Date(dataInizio);
    }
    if (dataFine) {
      filters.dataFine = new Date(dataFine);
    }
    if (tipoMovimento) {
      const tipi = tipoMovimento.split(',').filter(Boolean);
      if (tipi.length > 0) {
        filters.tipoMovimento = tipi as ('compenso' | 'anticipazione')[];
      }
    }

    // Recupera movimenti
    const movimenti = await this.movimentiService.findForFatturazione(filters);

    // Genera PDF
    const buffer = await this.pdfServiceNew.generaReportFatturazione(movimenti, clienteId);

    const filename = clienteId
      ? `report-fatturazione-${clienteId}-${new Date().toISOString().split('T')[0]}.pdf`
      : `report-fatturazione-${new Date().toISOString().split('T')[0]}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${filename}`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
