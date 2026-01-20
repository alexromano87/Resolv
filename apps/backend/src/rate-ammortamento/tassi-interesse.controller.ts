import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { TassiInteresseService } from './tassi-interesse.service';
import { TassiMonitoraggioService } from './tassi-monitoraggio.service';
import { CreateTassoInteresseDto } from './dto/create-tasso-interesse.dto';
import { UpdateTassoInteresseDto } from './dto/update-tasso-interesse.dto';
import { ApproveFetchedRateDto, FetchTassiResultDto, OverwriteFetchedRateDto } from './dto/fetch-tassi-result.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('tassi-interesse')
@UseGuards(JwtAuthGuard)
export class TassiInteresseController {
  constructor(
    private readonly tassiInteresseService: TassiInteresseService,
    private readonly tassiMonitoraggioService: TassiMonitoraggioService,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createTassoDto: CreateTassoInteresseDto) {
    return this.tassiInteresseService.create(createTassoDto);
  }

  @Get()
  findAll() {
    return this.tassiInteresseService.findAll();
  }

  @Get('current')
  findCurrentRates() {
    return this.tassiInteresseService.findCurrentRates();
  }

  @Get('by-tipo/:tipo')
  findByTipo(@Param('tipo') tipo: 'legale' | 'moratorio') {
    return this.tassiInteresseService.findByTipo(tipo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tassiInteresseService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateTassoDto: UpdateTassoInteresseDto) {
    return this.tassiInteresseService.update(id, updateTassoDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.tassiInteresseService.remove(id);
  }

  /**
   * Recupera automaticamente i tassi di interesse correnti da fonti esterne
   * Trigger manuale (admin only)
   */
  @Post('fetch')
  @UseGuards(AdminGuard)
  async fetchCurrentRates(): Promise<FetchTassiResultDto> {
    return await this.tassiMonitoraggioService.triggerManualFetch();
  }

  /**
   * Approva e salva un tasso recuperato che richiede conferma manuale
   * Admin only
   */
  @Post('approve')
  @UseGuards(AdminGuard)
  async approveFetchedRate(@Body() dto: ApproveFetchedRateDto) {
    const dataInizio = dto.rate.dataInizioValidita instanceof Date
      ? dto.rate.dataInizioValidita
      : new Date(dto.rate.dataInizioValidita);
    if (Number.isNaN(dataInizio.getTime())) {
      throw new BadRequestException('dataInizioValidita non valida');
    }

    const dataFine = dto.rate.dataFineValidita
      ? (dto.rate.dataFineValidita instanceof Date
        ? dto.rate.dataFineValidita
        : new Date(dto.rate.dataFineValidita))
      : null;
    if (dataFine && Number.isNaN(dataFine.getTime())) {
      throw new BadRequestException('dataFineValidita non valida');
    }

    // Converti FetchedRateData in CreateTassoInteresseDto
    const createDto: CreateTassoInteresseDto = {
      tipo: dto.rate.tipo,
      tassoPercentuale: dto.rate.tassoPercentuale,
      dataInizioValidita: dataInizio.toISOString().split('T')[0],
      dataFineValidita: dataFine?.toISOString().split('T')[0] || undefined,
      decretoRiferimento: dto.rate.decretoRiferimento,
      note: dto.adminNote || dto.rate.note || `Approvato manualmente da ${dto.rate.source}`,
    };

    return await this.tassiInteresseService.create(createDto);
  }

  /**
   * Sovrascrive un tasso esistente identificato come duplicato
   * Admin only
   */
  @Post('overwrite')
  @UseGuards(AdminGuard)
  async overwriteFetchedRate(@Body() dto: OverwriteFetchedRateDto) {
    const dataInizio = dto.rate.dataInizioValidita instanceof Date
      ? dto.rate.dataInizioValidita
      : new Date(dto.rate.dataInizioValidita);
    if (Number.isNaN(dataInizio.getTime())) {
      throw new BadRequestException('dataInizioValidita non valida');
    }

    const dataFine = dto.rate.dataFineValidita
      ? (dto.rate.dataFineValidita instanceof Date
        ? dto.rate.dataFineValidita
        : new Date(dto.rate.dataFineValidita))
      : null;
    if (dataFine && Number.isNaN(dataFine.getTime())) {
      throw new BadRequestException('dataFineValidita non valida');
    }

    const updateDto: UpdateTassoInteresseDto = {
      tipo: dto.rate.tipo,
      tassoPercentuale: dto.rate.tassoPercentuale,
      dataInizioValidita: dataInizio.toISOString().split('T')[0],
      dataFineValidita: dataFine?.toISOString().split('T')[0] || undefined,
      decretoRiferimento: dto.rate.decretoRiferimento,
      note: dto.adminNote || dto.rate.note || `Sovrascritto da ${dto.rate.source}`,
    };

    return await this.tassiInteresseService.update(dto.existingRateId, updateDto);
  }
}
