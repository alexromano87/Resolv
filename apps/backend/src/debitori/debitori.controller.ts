// apps/backend/src/debitori/debitori.controller.ts
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
import { DebitoriService } from './debitori.service';
import { CreateDebitoreDto } from './dto/create-debitore.dto';
import { UpdateDebitoreDto } from './dto/update-debitore.dto';
import { ClientiDebitoriService } from '../relazioni/clienti-debitori.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller('debitori')
@UseGuards(JwtAuthGuard)
export class DebitoriController {
  constructor(
    private readonly debitoriService: DebitoriService,
    private readonly clientiDebitoriService: ClientiDebitoriService,
  ) {}

  // GET /debitori -> lista debitori
  // Query param: ?includeInactive=true per includere i disattivati
  // Query param: ?withClientiCount=true per includere il conteggio clienti collegati
  @Get()
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive') includeInactive?: string,
    @Query('withClientiCount') withClientiCount?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const includeInact = includeInactive === 'true';
    if (withClientiCount === 'true') {
      return this.debitoriService.findAllWithClientiCountForUser(user, includeInact, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
    }
    return this.debitoriService.findAllForUser(user, includeInact, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // GET /debitori/:id -> dettaglio singolo debitore
  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const canAccess = await this.debitoriService.canAccessDebitore(user, id);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.debitoriService.findOne(id);
  }

  // GET /debitori/:id/clienti -> lista clienti collegati al debitore
  @Get(':id/clienti')
  async getClientiForDebitore(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const canAccess = await this.debitoriService.canAccessDebitore(user, id);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const clientiIds = await this.clientiDebitoriService.getClientiByDebitore(id);
    return { clientiIds };
  }

  // GET /debitori/:id/pratiche-count -> conta pratiche collegate
  @Get(':id/pratiche-count')
  async getPraticheCount(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const canAccess = await this.debitoriService.canAccessDebitore(user, id);
    if (!canAccess) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const count = await this.debitoriService.countPraticheCollegate(id);
    return { count };
  }

  // POST /debitori -> creazione nuovo debitore
  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateDebitoreDto) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    // Se l'utente non è admin e ha uno studio, assegna automaticamente il suo studioId
    if (user.ruolo !== 'admin' && user.studioId) {
      dto.studioId = user.studioId;
    }
    return this.debitoriService.create(dto);
  }

  // PUT /debitori/:id -> aggiornamento debitore
  @Put(':id')
  update(@CurrentUser() user: CurrentUserData, @Param('id') id: string, @Body() dto: UpdateDebitoreDto) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.debitoriService.update(id, dto);
  }

  // PATCH /debitori/:id/deactivate -> disattiva debitore (soft-delete)
  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.debitoriService.deactivate(id);
  }

  // PATCH /debitori/:id/reactivate -> riattiva debitore
  @Patch(':id/reactivate')
  reactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.debitoriService.reactivate(id);
  }

  // DELETE /debitori/:id -> eliminazione fisica debitore
  // ATTENZIONE: preferire deactivate nella maggior parte dei casi
  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    return this.debitoriService.remove(id);
  }
}
