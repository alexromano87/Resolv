import { Body, Controller, Get, Put, UseGuards, Post, Param, Patch } from '@nestjs/common';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupAdminStudioGuard } from '../auth/checkup-admin-studio.guard';
import { CheckupStaffGuard } from '../auth/checkup-staff.guard';
import { CheckupSuperadminGuard } from '../auth/checkup-superadmin.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupStudiosService } from './checkup-studios.service';
import { UpdateCheckupStudioDto } from './dto/update-checkup-studio.dto';
import { CreateCheckupClientDto } from './dto/create-checkup-client.dto';
import { UpdateCheckupClientDto } from './dto/update-checkup-client.dto';
import { CreateLicenseeFromSourceDto } from './dto/create-licensee-from-source.dto';

@Controller('checkup/studios')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupStudiosController {
  constructor(private readonly studiosService: CheckupStudiosService) {}

  @Get('me')
  getMyStudio(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.studiosService.getMyStudio(user);
  }

  @Put('me')
  @UseGuards(CheckupAdminStudioGuard)
  updateMyStudio(
    @Body() dto: UpdateCheckupStudioDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.studiosService.updateMyStudio(dto, user);
  }

  @Get('clients')
  @UseGuards(CheckupSuperadminGuard)
  listClientStudios(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.studiosService.listClientStudios(user);
  }

  /** Fase 1 — sorgenti anagrafiche riusabili per creare un nuovo licenziatario. */
  @Get('reusable-sources')
  @UseGuards(CheckupSuperadminGuard)
  listReusableSources() {
    return this.studiosService.listReusableSources();
  }

  /** Fase 1 — crea un licenziatario riusando l'anagrafica di una sorgente esistente. */
  @Post('licensee-from-source')
  @UseGuards(CheckupSuperadminGuard)
  createLicenseeFromSource(@Body() dto: CreateLicenseeFromSourceDto) {
    return this.studiosService.createLicenseeFromSource(dto);
  }

  @Get('sublicenses')
  @UseGuards(CheckupStaffGuard)
  listSublicenses(@CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.studiosService.listSublicenses(user);
  }

  @Post('clients')
  @UseGuards(CheckupSuperadminGuard)
  createClient(
    @Body() dto: CreateCheckupClientDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.studiosService.createClient(dto, user);
  }

  @Put('clients/:id')
  @UseGuards(CheckupSuperadminGuard)
  updateClient(
    @Param('id') id: string,
    @Body() dto: UpdateCheckupClientDto,
    @CheckupCurrentUser() user: CheckupCurrentUserData,
  ) {
    return this.studiosService.updateClient(id, dto, user);
  }

  @Patch('clients/:id/deactivate')
  @UseGuards(CheckupSuperadminGuard)
  deactivateClient(@Param('id') id: string, @CheckupCurrentUser() user: CheckupCurrentUserData) {
    return this.studiosService.deactivateClient(id, user);
  }
}
