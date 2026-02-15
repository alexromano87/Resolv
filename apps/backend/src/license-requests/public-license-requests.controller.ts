import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { LicenseRequestsService } from './license-requests.service';
import { CreateLicenseRequestDto } from './dto/create-license-request.dto';
import { RateLimit } from '../common/rate-limit.decorator';

@Controller('public/license-requests')
export class PublicLicenseRequestsController {
  constructor(private readonly service: LicenseRequestsService) {}

  @Post()
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })
  async create(@Body() dto: CreateLicenseRequestDto) {
    const request = await this.service.create(dto);
    return { id: request.id, status: request.status };
  }
}
