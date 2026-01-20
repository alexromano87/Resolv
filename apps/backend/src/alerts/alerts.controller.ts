// apps/backend/src/alerts/alerts.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseBoolPipe,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { AddMessaggioDto } from './dto/add-messaggio.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { RateLimit } from '../common/rate-limit.decorator';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @RateLimit({ limit: 30, windowMs: 10 * 60 * 1000 })
  create(@CurrentUser() user: CurrentUserData, @Body() createAlertDto: CreateAlertDto) {
    if (user.ruolo !== 'admin' && user.studioId) {
      createAlertDto.studioId = user.studioId;
    }
    // Aggiungi il nome dell'utente che ha creato l'alert
    const creatoDa = `${user.nome} ${user.cognome}`.trim();
    return this.alertsService.create(createAlertDto, creatoDa);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertsService.findAllForUser(user, includeInactive, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('pratica/:praticaId')
  findAllByPratica(
    @CurrentUser() user: CurrentUserData,
    @Param('praticaId') praticaId: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertsService.findAllByPraticaForUser(praticaId, user, includeInactive, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stato/:stato')
  findAllByStato(
    @CurrentUser() user: CurrentUserData,
    @Param('stato') stato: 'in_gestione' | 'chiuso',
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertsService.findAllByStatoForUser(stato, user, includeInactive, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.alertsService.findOneForUser(id, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateAlertDto: UpdateAlertDto,
  ) {
    return this.alertsService.update(id, updateAlertDto, user);
  }

  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.alertsService.deactivate(id, user);
  }

  @Patch(':id/reactivate')
  reactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.alertsService.reactivate(id, user);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.alertsService.remove(id, user);
  }

  @Post(':id/messaggi')
  @RateLimit({ limit: 60, windowMs: 10 * 60 * 1000 })
  addMessaggio(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() addMessaggioDto: AddMessaggioDto,
  ) {
    return this.alertsService.addMessaggio(id, addMessaggioDto, user);
  }

  @Patch(':id/chiudi')
  chiudiAlert(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.alertsService.update(id, { stato: 'chiuso' }, user);
  }

  @Patch(':id/riapri')
  riapriAlert(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.alertsService.update(id, { stato: 'in_gestione' }, user);
  }
}
