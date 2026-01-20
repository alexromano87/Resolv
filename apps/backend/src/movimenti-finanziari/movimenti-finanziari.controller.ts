// apps/backend/src/movimenti-finanziari/movimenti-finanziari.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Inject,
  forwardRef,
  Query,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MovimentiFinanziariService } from './movimenti-finanziari.service';
import { MovimentiFinanziariPdfService } from './movimenti-finanziari-pdf.service';
import { CreateMovimentoFinanziarioDto } from './create-movimento-finanziario.dto';
import { UpdateMovimentoFinanziarioDto } from './update-movimento-finanziario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { PraticheService } from '../pratiche/pratiche.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../clienti/cliente.entity';
import { Studio } from '../studi/studio.entity';

@Controller('movimenti-finanziari')
@UseGuards(JwtAuthGuard)
export class MovimentiFinanziariController {
  constructor(
    private readonly movimentiService: MovimentiFinanziariService,
    private readonly pdfService: MovimentiFinanziariPdfService,
    @Inject(forwardRef(() => PraticheService))
    private readonly praticheService: PraticheService,
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(Studio)
    private readonly studioRepo: Repository<Studio>,
  ) {}

  @Post()
  async create(@CurrentUser() user: CurrentUserData, @Body() createMovimentoDto: CreateMovimentoFinanziarioDto) {
    // Se l'utente non è admin e ha uno studio, assegna automaticamente il suo studioId
    if (user.ruolo !== 'admin' && user.studioId) {
      createMovimentoDto.studioId = user.studioId;
    }

    const movimento = await this.movimentiService.create(createMovimentoDto);

    // Traccia l'evento nella pratica se il movimento è associato a una pratica
    if (movimento.praticaId) {
      const eseguitoDa = `${user.nome} ${user.cognome}`.trim();
      await this.praticheService.aggiungiEventoFaseCorrente(
        movimento.praticaId,
        'movimento_finanziario',
        {
          id: movimento.id,
          tipo: movimento.tipo,
          importo: movimento.importo,
          oggetto: movimento.oggetto,
          azione: 'inserimento',
        },
        eseguitoDa,
      );
    }

    return movimento;
  }

  @Get('pratica/:praticaId')
  findAllByPratica(@CurrentUser() user: CurrentUserData, @Param('praticaId') praticaId: string) {
    const studioId = user.ruolo === 'admin' ? undefined : user.studioId || undefined;
    return this.movimentiService.findAllByPratica(praticaId, studioId);
  }

  @Get('pratica/:praticaId/totali')
  getTotaliByPratica(@CurrentUser() user: CurrentUserData, @Param('praticaId') praticaId: string) {
    const studioId = user.ruolo === 'admin' ? undefined : user.studioId || undefined;
    return this.movimentiService.getTotaliByPratica(praticaId, studioId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movimentiService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMovimentoDto: UpdateMovimentoFinanziarioDto,
  ) {
    return this.movimentiService.update(id, updateMovimentoDto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    // Prima di eliminare, recupera le informazioni del movimento
    const movimento = await this.movimentiService.findOne(id);

    // Traccia l'evento nella pratica prima dell'eliminazione
    if (movimento.praticaId) {
      const eseguitoDa = `${user.nome} ${user.cognome}`.trim();
      await this.praticheService.aggiungiEventoFaseCorrente(
        movimento.praticaId,
        'movimento_finanziario',
        {
          tipo: movimento.tipo,
          importo: movimento.importo,
          oggetto: movimento.oggetto,
          azione: 'eliminazione',
        },
        eseguitoDa,
      );
    }

    return this.movimentiService.remove(id);
  }

  /**
   * GET /movimenti-finanziari/report/fatturazione
   * Ottiene movimenti per report fatturazione con filtri
   */
  @Get('report/fatturazione')
  async getReportFatturazione(
    @CurrentUser() user: CurrentUserData,
    @Query('clienteId') clienteId?: string,
    @Query('statoFatturazione') statoFatturazione?: 'da_fatturare' | 'gia_fatturato',
    @Query('dataInizio') dataInizio?: string,
    @Query('dataFine') dataFine?: string,
    @Query('tipoMovimento') tipoMovimento?: string,
  ) {
    const filters: any = {
      studioId: user.ruolo === 'admin' ? undefined : user.studioId || undefined,
      statoFatturazione,
    };

    if (clienteId) {
      filters.clienteId = clienteId;
    }
    if (dataInizio) {
      filters.dataInizio = new Date(dataInizio);
    }
    if (dataFine) {
      filters.dataFine = new Date(dataFine);
    }
    if (tipoMovimento) {
      // tipoMovimento può essere "compenso", "anticipazione", o "compenso,anticipazione"
      filters.tipoMovimento = tipoMovimento.split(',') as ('compenso' | 'anticipazione')[];
    }

    return this.movimentiService.findForFatturazione(filters);
  }

  /**
   * PATCH /movimenti-finanziari/report/fatturazione/aggiorna-stato
   * Aggiorna lo stato di fatturazione di più movimenti
   */
  @Patch('report/fatturazione/aggiorna-stato')
  async aggiornaStatoFatturazione(
    @Body()
    body: {
      movimentoIds: string[];
      statoFatturazione: { daFatturare: boolean; giaFatturato: boolean };
    },
  ) {
    return this.movimentiService.aggiornaStatoFatturazione(body.movimentoIds, body.statoFatturazione);
  }

  /**
   * GET /movimenti-finanziari/statistiche/fatturazione
   * Ottiene statistiche fatturazione per studio
   */
  @Get('statistiche/fatturazione')
  async getStatisticheFatturazione(@CurrentUser() user: CurrentUserData) {
    const studioId = user.ruolo === 'admin' ? undefined : user.studioId || undefined;
    return this.movimentiService.getStatisticheFatturazione(studioId);
  }

  /**
   * GET /movimenti-finanziari/report/fatturazione/pdf
   * Genera PDF report fatturazione
   */
  @Get('report/fatturazione/pdf')
  async generaPdfFatturazione(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
    @Query('clienteId') clienteId?: string,
    @Query('statoFatturazione') statoFatturazione?: 'da_fatturare' | 'gia_fatturato',
    @Query('dataInizio') dataInizio?: string,
    @Query('dataFine') dataFine?: string,
    @Query('tipoMovimento') tipoMovimento?: string,
  ) {
    // Costruisci filtri
    const filters: any = {
      studioId: user.ruolo === 'admin' ? undefined : user.studioId || undefined,
      statoFatturazione,
    };

    if (clienteId) {
      filters.clienteId = clienteId;
    }

    if (dataInizio) {
      filters.dataInizio = new Date(dataInizio);
    }

    if (dataFine) {
      filters.dataFine = new Date(dataFine);
    }

    if (tipoMovimento) {
      filters.tipoMovimento = tipoMovimento.split(',') as ('compenso' | 'anticipazione')[];
    }

    // Carica movimenti
    const movimenti = await this.movimentiService.findForFatturazione(filters);

    // Carica cliente (se specificato)
    let cliente: Cliente | null = null;
    if (clienteId) {
      cliente = await this.clienteRepo.findOne({ where: { id: clienteId } });
      if (!cliente) {
        throw new ForbiddenException('Cliente non trovato');
      }
    }

    // Carica studio
    const studio = user.studioId
      ? await this.studioRepo.findOne({ where: { id: user.studioId } })
      : await this.studioRepo.findOne({ where: {} });

    // Genera PDF
    const buffer = await this.pdfService.generaReportFatturazione({
      movimenti,
      cliente,
      studio,
      dataInizio: filters.dataInizio,
      dataFine: filters.dataFine,
    });

    // Invia PDF
    const filename = `report-fatturazione-${clienteId || 'tutti'}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${filename}`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
