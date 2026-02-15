// apps/backend/src/users/users.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @CurrentUser() currentUser: CurrentUserData,
    @Query('studioId') studioId?: string,
    @Query('ruolo') ruolo?: string,
    @Query('attivo') attivo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (currentUser.ruolo !== 'superuser') {
      if (!currentUser.studioId) {
        throw new ForbiddenException('Studio non assegnato');
      }
      filters.studioId = currentUser.studioId;
    } else if (studioId !== undefined) {
      filters.studioId = studioId;
    }

    if (ruolo) {
      filters.ruolo = ruolo;
    }

    if (attivo !== undefined) {
      filters.attivo = attivo === 'true';
    }

    return this.usersService.findAll(
      Object.keys(filters).length > 0 ? filters : undefined,
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
    );
  }

  @Get(':id')
  async findOne(@CurrentUser() currentUser: CurrentUserData, @Param('id') id: string) {
    const user = await this.usersService.findOne(id, currentUser.ruolo !== 'superuser');
    if (currentUser.ruolo !== 'superuser') {
      if (!currentUser.studioId || !this.usersService.isUserInStudio(user, currentUser.studioId)) {
        throw new ForbiddenException('Accesso negato');
      }
    }
    return user;
  }

  @Post()
  async create(@CurrentUser() currentUser: CurrentUserData, @Body() createUserDto: CreateUserDto) {
    if (createUserDto.isAdmin && createUserDto.ruolo === 'cliente') {
      throw new ForbiddenException('Non puoi assegnare admin a un cliente');
    }
    if (createUserDto.ruolo === 'superuser' && createUserDto.email?.toLowerCase() !== 'admin@resolv.legal') {
      throw new ForbiddenException('Solo admin@resolv.legal può essere superuser');
    }
    if (currentUser.ruolo !== 'superuser') {
      if (!currentUser.studioId) {
        throw new ForbiddenException('Studio non assegnato');
      }
      if (createUserDto.ruolo === 'superuser') {
        throw new ForbiddenException('Non puoi creare superuser');
      }
      createUserDto.studioId = currentUser.studioId;
    }
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  async update(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const targetUser = await this.usersService.findOne(id, true);
    const targetRole = updateUserDto.ruolo ?? targetUser.ruolo;
    if (targetUser.email.toLowerCase() === 'admin@resolv.legal') {
      if (updateUserDto.ruolo && updateUserDto.ruolo !== 'superuser') {
        throw new ForbiddenException('admin@resolv.legal deve rimanere superuser');
      }
      if (updateUserDto.email && updateUserDto.email.toLowerCase() !== 'admin@resolv.legal') {
        throw new ForbiddenException('Non puoi cambiare la mail del superuser');
      }
    }
    if (updateUserDto.isAdmin && targetRole === 'cliente') {
      throw new ForbiddenException('Non puoi assegnare admin a un cliente');
    }
    if (updateUserDto.ruolo === 'superuser') {
      const email = updateUserDto.email?.toLowerCase() ?? targetUser.email.toLowerCase();
      if (email !== 'admin@resolv.legal') {
        throw new ForbiddenException('Solo admin@resolv.legal può essere superuser');
      }
    }
    if (currentUser.ruolo !== 'superuser') {
      if (!currentUser.studioId || !this.usersService.isUserInStudio(targetUser, currentUser.studioId)) {
        throw new ForbiddenException('Accesso negato');
      }
      if (updateUserDto.ruolo === 'superuser') {
        throw new ForbiddenException('Non puoi assegnare il ruolo superuser');
      }
      updateUserDto.studioId = currentUser.studioId;
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@CurrentUser() currentUser: CurrentUserData, @Param('id') id: string) {
    if (currentUser.ruolo !== 'superuser') {
      const user = await this.usersService.findOne(id, true);
      if (!currentUser.studioId || !this.usersService.isUserInStudio(user, currentUser.studioId)) {
        throw new ForbiddenException('Accesso negato');
      }
    }
    return this.usersService.remove(id);
  }

  @Put(':id/toggle-active')
  async toggleActive(@CurrentUser() currentUser: CurrentUserData, @Param('id') id: string) {
    if (currentUser.ruolo !== 'superuser') {
      const user = await this.usersService.findOne(id, true);
      if (!currentUser.studioId || !this.usersService.isUserInStudio(user, currentUser.studioId)) {
        throw new ForbiddenException('Accesso negato');
      }
    }
    return this.usersService.toggleActive(id);
  }

  @Put(':id/reset-password')
  async resetPassword(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    if (currentUser.ruolo !== 'superuser') {
      const user = await this.usersService.findOne(id, true);
      if (!currentUser.studioId || !this.usersService.isUserInStudio(user, currentUser.studioId)) {
        throw new ForbiddenException('Accesso negato');
      }
    }
    return this.usersService.resetPassword(id, body.newPassword);
  }

  @Put(':id/studi')
  async updateStudi(
    @CurrentUser() currentUser: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { studiIds: string[] },
  ) {
    if (currentUser.ruolo !== 'superuser') {
      throw new ForbiddenException('Accesso negato');
    }
    return this.usersService.updateStudi(id, body.studiIds);
  }

  @Get(':id/studi')
  async getStudi(@CurrentUser() currentUser: CurrentUserData, @Param('id') id: string) {
    if (currentUser.ruolo !== 'superuser') {
      throw new ForbiddenException('Accesso negato');
    }
    return this.usersService.getStudi(id);
  }
}
