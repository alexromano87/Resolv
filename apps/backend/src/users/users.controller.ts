// apps/backend/src/users/users.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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
    @Query('studioId') studioId?: string,
    @Query('ruolo') ruolo?: string,
    @Query('attivo') attivo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (studioId !== undefined) {
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
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Put(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }

  @Put(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.usersService.resetPassword(id, body.newPassword);
  }

  @Put(':id/studi')
  async updateStudi(@Param('id') id: string, @Body() body: { studiIds: string[] }) {
    return this.usersService.updateStudi(id, body.studiIds);
  }

  @Get(':id/studi')
  async getStudi(@Param('id') id: string) {
    return this.usersService.getStudi(id);
  }
}
