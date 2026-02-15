import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CheckupTemplatesService } from './checkup-templates.service';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';

@Controller('checkup/templates')
@UseGuards(CheckupJwtAuthGuard)
export class CheckupTemplatesController {
  constructor(private readonly templatesService: CheckupTemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }
}
