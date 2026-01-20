// apps/backend/src/cartelle/cartelle.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { CartelleService } from './cartelle.service';
import { CreateCartellaDto } from './dto/create-cartella.dto';
import { UpdateCartellaDto } from './dto/update-cartella.dto';
import { Cartella } from './cartella.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { PraticheService } from '../pratiche/pratiche.service';

@Controller('cartelle')
@UseGuards(JwtAuthGuard)
export class CartelleController {
  constructor(
    private readonly cartelleService: CartelleService,
    private readonly praticheService: PraticheService,
  ) {}

  @Post()
  async create(@CurrentUser() user: CurrentUserData, @Body() createDto: CreateCartellaDto): Promise<Cartella> {
    if (user.ruolo !== 'admin' && user.studioId) {
      createDto.studioId = user.studioId;
    }
    return this.cartelleService.create(createDto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<Cartella[]> {
    return this.cartelleService.findAllForUser(user, includeInactive === 'true', {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('pratica/:praticaId')
  async findByPratica(
    @CurrentUser() user: CurrentUserData,
    @Param('praticaId') praticaId: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<Cartella[]> {
    await this.praticheService.findOneForUser(praticaId, user);
    return this.cartelleService.findByPratica(
      praticaId,
      includeInactive === 'true',
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
    );
  }

  @Get('tree')
  async findTree(@Query('praticaId') praticaId?: string): Promise<Cartella[]> {
    return this.cartelleService.findTree(praticaId);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<Cartella> {
    await this.assertCartellaAccess(id, user);
    return this.cartelleService.findOne(id);
  }

  @Get(':id/descendants')
  async findDescendants(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<Cartella[]> {
    await this.assertCartellaAccess(id, user);
    return this.cartelleService.findDescendants(id);
  }

  @Get(':id/ancestors')
  async findAncestors(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<Cartella[]> {
    await this.assertCartellaAccess(id, user);
    return this.cartelleService.findAncestors(id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateDto: UpdateCartellaDto,
  ): Promise<Cartella> {
    await this.assertCartellaAccess(id, user);
    return this.cartelleService.update(id, updateDto);
  }

  @Patch(':id/deactivate')
  async deactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<Cartella> {
    await this.assertCartellaAccess(id, user);
    return this.cartelleService.deactivate(id);
  }

  @Patch(':id/reactivate')
  async reactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<Cartella> {
    await this.assertCartellaAccess(id, user);
    return this.cartelleService.reactivate(id);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string): Promise<void> {
    await this.assertCartellaAccess(id, user);
    return this.cartelleService.remove(id);
  }

  private async assertCartellaAccess(id: string, user: CurrentUserData | null) {
    if (!user || user.ruolo === 'admin') return;
    const cartella = await this.cartelleService.findOne(id);
    if (cartella.praticaId) {
      await this.praticheService.findOneForUser(cartella.praticaId, user);
      return;
    }

    if (cartella.studioId && cartella.studioId === user.studioId) {
      return;
    }

    throw new NotFoundException('Cartella non trovata');
  }
}
