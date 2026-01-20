// apps/backend/src/tickets/tickets.controller.ts
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
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddMessaggioDto } from './dto/add-messaggio.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { RateLimit } from '../common/rate-limit.decorator';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @RateLimit({ limit: 20, windowMs: 10 * 60 * 1000 })
  create(@CurrentUser() user: CurrentUserData, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.createForUser(user, createTicketDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.findAllForUser(user, includeInactive, {
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
    return this.ticketsService.findAllByPraticaForUser(praticaId, user, includeInactive, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stato/:stato')
  findAllByStato(
    @CurrentUser() user: CurrentUserData,
    @Param('stato') stato: 'aperto' | 'in_gestione' | 'chiuso',
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.findAllByStatoForUser(stato, user, includeInactive, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.ticketsService.findOneForUser(id, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, updateTicketDto, user);
  }

  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.ticketsService.deactivate(id, user);
  }

  @Patch(':id/reactivate')
  reactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.ticketsService.reactivate(id, user);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.ticketsService.remove(id, user);
  }

  @Post(':id/messaggi')
  @RateLimit({ limit: 40, windowMs: 10 * 60 * 1000 })
  addMessaggio(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() addMessaggioDto: AddMessaggioDto,
  ) {
    return this.ticketsService.addMessaggio(id, addMessaggioDto, user);
  }

  @Patch(':id/chiudi')
  chiudiTicket(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.ticketsService.chiudiTicket(id, user);
  }

  @Patch(':id/prendi-in-carico')
  prendiInCarico(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.ticketsService.prendiInCarico(id, user);
  }

  @Patch(':id/riapri')
  riapriTicket(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.ticketsService.riapriTicket(id, user);
  }
}
