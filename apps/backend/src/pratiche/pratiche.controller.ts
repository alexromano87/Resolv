// src/pratiche/pratiche.controller.ts
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PraticheService } from './pratiche.service';
import { CreatePraticaDto } from './dto/create-pratica.dto';
import { UpdatePraticaDto } from './dto/update-pratica.dto';
import { CambiaFaseDto } from './dto/cambia-fase.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller('pratiche')
@UseGuards(JwtAuthGuard)
export class PraticheController {
  constructor(private readonly praticheService: PraticheService) {}

  // ====== CRUD BASE PRATICHE ======

  // GET /pratiche -> lista pratiche
  // Query params:
  //   ?includeInactive=true per includere le disattivate
  //   ?clienteId=xxx per filtrare per cliente
  //   ?debitoreId=xxx per filtrare per debitore
  @Get()
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive') includeInactive?: string,
    @Query('clienteId') clienteId?: string,
    @Query('debitoreId') debitoreId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const includeInact = includeInactive === 'true';
    const pagination = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    if (clienteId) {
      return this.praticheService.findByClienteForUser(clienteId, user, includeInact, pagination);
    }
    if (debitoreId) {
      return this.praticheService.findByDebitoreForUser(debitoreId, user, includeInact, pagination);
    }

    return this.praticheService.findAllForUser(user, includeInact, pagination);
  }

  // GET /pratiche/stats -> statistiche pratiche
  @Get('stats')
  async getStats() {
    const [countByStato, totaliFinanziari, countByFase] = await Promise.all([
      this.praticheService.countByStato(),
      this.praticheService.calcolaTotaliFinanziari(),
      this.praticheService.countByFase(),
    ]);

    return {
      ...countByStato,
      ...totaliFinanziari,
      perFase: countByFase,
    };
  }

  // GET /pratiche/:id/calcola-interessi -> calcola interessi automatici
  // IMPORTANTE: Deve venire PRIMA di @Get(':id') altrimenti viene intercettato come ID
  @Get(':id/calcola-interessi')
  async calcolaInteressi(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    const pratica = await this.praticheService.findOneForUser(id, user);
    const risultato = await this.praticheService.calcolaInteressiPratica(pratica);
    return {
      interessiCalcolati: risultato.interesse,
      capitale: pratica.capitale,
      dataInizioInteressi: pratica.dataInizioInteressi,
      dataFineMaturazione: pratica.dataFineMaturazione,
      tipoInteresse: pratica.tipoInteresse,
      tassoInteresse: risultato.tasso, // Usa il tasso calcolato invece di quello del DB
      applicaInteressi: pratica.applicaInteressi,
    };
  }

  // GET /pratiche/:id -> dettaglio singola pratica
  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.praticheService.findOneForUser(id, user);
  }

  // POST /pratiche -> creazione nuova pratica
  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreatePraticaDto) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    // Assegna automaticamente lo studioId dell'utente loggato (se non è admin)
    if (user.ruolo !== 'admin' && user.studioId) {
      dto.studioId = user.studioId;
    }
    return this.praticheService.create(dto);
  }

  // PUT /pratiche/:id -> aggiornamento pratica
  @Put(':id')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdatePraticaDto,
  ) {
    await this.praticheService.findOneForUser(id, user);
    if (user.ruolo === 'segreteria') {
      const allowedKeys = ['avvocatiIds', 'collaboratoriIds'];
      const hasOtherFields = Object.entries(dto).some(
        ([key, value]) => value !== undefined && !allowedKeys.includes(key),
      );
      if (hasOtherFields) {
        throw new ForbiddenException('La segreteria può solo aggiornare le assegnazioni');
      }
      return this.praticheService.update(id, dto, user);
    }
    const canModify = await this.praticheService.canUserModifyPratica(user);
    if (!canModify) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.praticheService.update(id, dto, user);
  }

  // ====== GESTIONE FASI ======

  // PATCH /pratiche/:id/fase -> cambia fase
  @Patch(':id/fase')
  async cambiaFase(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: CambiaFaseDto,
  ) {
    await this.praticheService.findOneForUser(id, user);
    const canModify = await this.praticheService.canUserModifyPratica(user);
    if (!canModify) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.praticheService.cambiaFase(id, dto, user);
  }

  // PATCH /pratiche/:id/riapri -> riapre una pratica chiusa
  @Patch(':id/riapri')
  async riapri(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { faseId?: string },
  ) {
    await this.praticheService.findOneForUser(id, user);
    const canModify = await this.praticheService.canUserModifyPratica(user);
    if (!canModify) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.praticheService.riapri(id, body?.faseId);
  }

  // ====== SOFT DELETE ======

  // PATCH /pratiche/:id/deactivate -> disattiva pratica
  @Patch(':id/deactivate')
  async deactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.praticheService.findOneForUser(id, user);
    const canModify = await this.praticheService.canUserModifyPratica(user);
    if (!canModify) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.praticheService.deactivate(id);
  }

  // PATCH /pratiche/:id/reactivate -> riattiva pratica
  @Patch(':id/reactivate')
  async reactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.praticheService.findOneForUser(id, user);
    const canModify = await this.praticheService.canUserModifyPratica(user);
    if (!canModify) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.praticheService.reactivate(id);
  }

  // DELETE /pratiche/:id -> eliminazione fisica
  // ATTENZIONE: preferire deactivate
  @Delete(':id')
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    await this.praticheService.findOneForUser(id, user);
    const canModify = await this.praticheService.canUserModifyPratica(user);
    if (!canModify) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.praticheService.remove(id);
  }
}
