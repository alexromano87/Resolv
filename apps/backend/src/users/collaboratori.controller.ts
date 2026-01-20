import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { CreateCollaboratoreDto } from './dto/create-collaboratore.dto';
import { UpdateCollaboratoreDto } from './dto/update-collaboratore.dto';

@Controller('collaboratori')
@UseGuards(JwtAuthGuard)
export class CollaboratoriController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const filters: { ruolo: string; studioId?: string; attivo?: boolean } = {
      ruolo: 'collaboratore',
    };

    if (user.ruolo !== 'admin') {
      if (!user.studioId) {
        return [];
      }
      filters.studioId = user.studioId;
    }

    if (!includeInactive) {
      filters.attivo = true;
    }

    return this.usersService.findAll(filters, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createDto: CreateCollaboratoreDto,
  ) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const isAdmin = user.ruolo === 'admin';

    if (!isAdmin) {
      if (!user.studioId) {
        throw new ForbiddenException('Studio non associato');
      }
      createDto.studioId = user.studioId;
    }

    const password =
      createDto.password ??
      (isAdmin
        ? undefined
        : randomBytes(12).toString('base64url'));

    if (isAdmin && !password) {
      throw new BadRequestException('Password obbligatoria');
    }

    const created = await this.usersService.create({
      email: createDto.email,
      password: password as string,
      nome: createDto.nome,
      cognome: createDto.cognome,
      telefono: createDto.telefono ?? null,
      codiceFiscale: createDto.codiceFiscale ?? null,
      livelloAccessoPratiche: createDto.livelloAccessoPratiche,
      livelloPermessi: createDto.livelloPermessi,
      note: createDto.note ?? null,
      ruolo: 'collaboratore',
      studioId: createDto.studioId ?? null,
      clienteId: null,
    });

    if (!isAdmin) {
      return this.usersService.update(created.id, { attivo: false });
    }

    return created;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateDto: UpdateCollaboratoreDto,
  ) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const collaborator = await this.usersService.findOne(id);
    if (!collaborator || collaborator.ruolo !== 'collaboratore') {
      throw new NotFoundException('Collaboratore non trovato');
    }

    if (user.ruolo !== 'admin' && collaborator.studioId !== user.studioId) {
      throw new ForbiddenException('Accesso non consentito');
    }

    return this.usersService.update(id, {
      email: updateDto.email,
      password: updateDto.password,
      nome: updateDto.nome,
      cognome: updateDto.cognome,
      telefono: updateDto.telefono ?? undefined,
      codiceFiscale: updateDto.codiceFiscale ?? undefined,
      livelloAccessoPratiche: updateDto.livelloAccessoPratiche,
      livelloPermessi: updateDto.livelloPermessi,
      note: updateDto.note ?? undefined,
    });
  }

  @Patch(':id/deactivate')
  async deactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const collaborator = await this.usersService.findOne(id);
    if (!collaborator || collaborator.ruolo !== 'collaboratore') {
      throw new NotFoundException('Collaboratore non trovato');
    }

    if (user.ruolo !== 'admin' && collaborator.studioId !== user.studioId) {
      throw new ForbiddenException('Accesso non consentito');
    }

    return this.usersService.update(id, { attivo: false });
  }

  @Patch(':id/reactivate')
  async reactivate(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const collaborator = await this.usersService.findOne(id);
    if (!collaborator || collaborator.ruolo !== 'collaboratore') {
      throw new NotFoundException('Collaboratore non trovato');
    }

    if (user.ruolo !== 'admin' && collaborator.studioId !== user.studioId) {
      throw new ForbiddenException('Accesso non consentito');
    }

    return this.usersService.update(id, { attivo: true });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    if (!['admin', 'titolare_studio', 'segreteria'].includes(user.ruolo)) {
      throw new ForbiddenException('Accesso non consentito');
    }
    const collaborator = await this.usersService.findOne(id);
    if (!collaborator || collaborator.ruolo !== 'collaboratore') {
      throw new NotFoundException('Collaboratore non trovato');
    }

    if (user.ruolo !== 'admin' && collaborator.studioId !== user.studioId) {
      throw new ForbiddenException('Accesso non consentito');
    }

    await this.usersService.remove(id);
    return { success: true };
  }
}
