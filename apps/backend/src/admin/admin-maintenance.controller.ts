import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AdminMaintenanceService } from './admin-maintenance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperadminGuard } from '../auth/superadmin.guard';

@Controller('admin/maintenance')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class AdminMaintenanceController {
  constructor(private readonly adminMaintenanceService: AdminMaintenanceService) {}

  @Get('orphan-data')
  async getOrphanData() {
    return this.adminMaintenanceService.getOrphanData();
  }

  @Post('assign-orphan-data')
  async assignOrphanData(@Body() body: { studioId: string }) {
    return this.adminMaintenanceService.assignOrphanDataToStudio(body.studioId);
  }
}
