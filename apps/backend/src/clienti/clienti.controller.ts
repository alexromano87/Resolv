// apps/backend/src/clienti/clienti.controller.ts

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
import { ClientiService } from './clienti.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ClientiDebitoriService } from '../relazioni/clienti-debitori.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller('clienti')
@UseGuards(JwtAuthGuard)
export class ClientiController {
  constructor(
    private readonly clientiService: ClientiService,
    private readonly clientiDebitoriService: ClientiDebitoriService,
  ) {}

  // ====== CRUD BASE CLIENTI ======

  // GET /clienti  -> lista clienti
  // Query param: ?includeInactive=true per includere i disattivati
  @Get()
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const includeInact = includeInactive === 'true';
    return this.clientiService.findAllForUser(user, includeInact, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // GET /clienti/:id  -> dettaglio singolo cliente
  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const canAccess = await this.clientiService.canAccessCliente(user, id);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.clientiService.findOne(id);
  }

  // GET /clienti/:id/pratiche-count -> conta pratiche collegate
  @Get(':id/pratiche-count')
  async getPraticheCount(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const canAccess = await this.clientiService.canAccessCliente(user, id);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const count = await this.clientiService.countPraticheCollegate(id);
    return { count };
  }

  // POST /clienti  -> creazione nuovo cliente
  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateClienteDto) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    // Se l'utente non è admin e ha uno studio, assegna automaticamente il suo studioId
    if (user.ruolo !== 'admin' && user.studioId) {
      dto.studioId = user.studioId;
    }
    return this.clientiService.create(dto);
  }

  // PUT /clienti/:id  -> aggiornamento cliente esistente
  @Put(':id')
  update(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: UpdateClienteDto) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.clientiService.update(id, dto);
  }

  // PATCH /clienti/:id/deactivate -> disattiva cliente (soft-delete)
  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.clientiService.deactivate(id);
  }

  // PATCH /clienti/:id/reactivate -> riattiva cliente
  @Patch(':id/reactivate')
  reactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.clientiService.reactivate(id);
  }

  // DELETE /clienti/:id  -> eliminazione fisica cliente
  // ATTENZIONE: preferire deactivate nella maggior parte dei casi
  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.clientiService.remove(id);
  }

  // ====== RELAZIONE CLIENTE <-> DEBITORI ======
  // usata dalla pagina Debitori e/o sezione debitori in Clienti

  // GET /clienti/:id/debitori?includeInactive=true
  @Get(':id/debitori')
  async getDebitoriForCliente(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const canAccess = await this.clientiService.canAccessCliente(user, id);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const includeInact = includeInactive === 'true';
    return this.clientiDebitoriService.getDebitoriByCliente(id, includeInact);
  }

  // PUT /clienti/:id/debitori
  // body: { debitoriIds: string[] }
  @Put(':id/debitori')
  async updateDebitoriForCliente(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { debitoriIds: string[] },
  ) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    await this.clientiDebitoriService.setDebitoriForCliente(
      id,
      body.debitoriIds ?? [],
    );
    return { success: true };
  }

  // DELETE /clienti/:id/debitori/:debitoreId
  @Delete(':id/debitori/:debitoreId')
  async unlinkDebitore(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('debitoreId') debitoreId: string,
  ) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    await this.clientiDebitoriService.unlinkDebitoreFromCliente(
      id,
      debitoreId,
    );
    return { success: true };
  }

  // POST /clienti/:id/debitori/:debitoreId - collega un debitore esistente a un cliente
  @Post(':id/debitori/:debitoreId')
  async linkDebitore(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('debitoreId') debitoreId: string,
  ) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    await this.clientiDebitoriService.linkDebitoreToCliente(id, debitoreId);
    return { success: true };
  }

  // ====== CONFIGURAZIONE CONDIVISIONE DASHBOARD ======

  // GET /clienti/:id/condivisione -> ottieni configurazione condivisione
  @Get(':id/condivisione')
  getConfigurazioneCondivisione(@Param('id') id: string) {
    return this.clientiService.getConfigurazioneCondivisione(id);
  }

  // PUT /clienti/:id/condivisione -> aggiorna configurazione condivisione
  @Put(':id/condivisione')
  updateConfigurazioneCondivisione(
    @Param('id') id: string,
    @Body() configurazione: any,
  ) {
    return this.clientiService.updateConfigurazioneCondivisione(id, configurazione);
  }
}
