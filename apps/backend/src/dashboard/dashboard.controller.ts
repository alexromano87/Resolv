import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @UseGuards(AdminGuard)
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('stats')
  async getStats(@CurrentUser() user: CurrentUserData, @Query('clienteId') clienteId?: string) {
    const studioId = user.ruolo === 'admin' ? undefined : (user.studioId || undefined);
    const effectiveClienteId = user.ruolo === 'cliente' ? (user.clienteId || undefined) : clienteId;
    return this.dashboardService.getStats(effectiveClienteId, studioId, user);
  }

  @Get('kpi')
  async getKPI(@CurrentUser() user: CurrentUserData, @Query('clienteId') clienteId?: string) {
    const studioId = user.ruolo === 'admin' ? undefined : (user.studioId || undefined);
    const effectiveClienteId = user.ruolo === 'cliente' ? (user.clienteId || undefined) : clienteId;
    return this.dashboardService.getKPI(effectiveClienteId, studioId, user);
  }

  @Get('condivisa/:clienteId')
  async getDashboardCondivisa(@Param('clienteId') clienteId: string) {
    return this.dashboardService.getDashboardCondivisa(clienteId);
  }
}
