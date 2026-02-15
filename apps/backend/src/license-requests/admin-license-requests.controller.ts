import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { LicenseRequestsService } from './license-requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperuserGuard } from '../auth/superuser.guard';
import { ProvisionLicenseRequestDto } from './dto/provision-license-request.dto';
import type { LicenseRequestStatus } from './license-request.entity';

@Controller('admin/license-requests')
@UseGuards(JwtAuthGuard, SuperuserGuard)
export class AdminLicenseRequestsController {
  constructor(private readonly service: LicenseRequestsService) {}

  @Get()
  async findAll(@Query('status') status?: LicenseRequestStatus) {
    if (status && !['pending', 'provisioned', 'rejected'].includes(status)) {
      throw new BadRequestException('Status non valido');
    }
    return this.service.findAll(status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/provision')
  async provision(
    @Param('id') id: string,
    @Body() body: ProvisionLicenseRequestDto,
  ) {
    return this.service.provision(id, body.adminPassword);
  }
}
