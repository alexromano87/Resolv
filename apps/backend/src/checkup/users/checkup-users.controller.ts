import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { CheckupUsersService } from './checkup-users.service';
import { CreateCheckupUserDto } from './dto/create-checkup-user.dto';
import { UpdateCheckupUserDto } from './dto/update-checkup-user.dto';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupAdminStudioGuard } from '../auth/checkup-admin-studio.guard';
import { CheckupSuperadminGuard } from '../auth/checkup-superadmin.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

@Controller('checkup/users')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupUsersController {
  constructor(private readonly usersService: CheckupUsersService) {}

  @Post()
  @UseGuards(CheckupSuperadminGuard)
  create(@Body() dto: CreateCheckupUserDto, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.usersService.create(dto, user);
  }

  @Get()
  @UseGuards(CheckupAdminStudioGuard)
  findAll(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.usersService.findAll(user, search, include);
  }

  @Get('usage')
  @UseGuards(CheckupAdminStudioGuard)
  getUsage(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.usersService.getUsage(user);
  }

  @Get(':id')
  @UseGuards(CheckupAdminStudioGuard)
  findOne(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.usersService.findOne(id, user);
  }

  @Put(':id')
  @UseGuards(CheckupSuperadminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCheckupUserDto, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.usersService.update(id, dto, user);
  }

  @Patch(':id/deactivate')
  @UseGuards(CheckupSuperadminGuard)
  deactivate(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.usersService.deactivate(id, user);
  }

  @Put(':id/reset-password')
  @UseGuards(CheckupSuperadminGuard)
  resetPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.usersService.resetPassword(id, body.newPassword, user);
  }
}
