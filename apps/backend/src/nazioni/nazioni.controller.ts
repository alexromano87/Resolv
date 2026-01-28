import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NazioniService } from './nazioni.service';

@Controller('nazioni')
@UseGuards(JwtAuthGuard)
export class NazioniController {
  constructor(private readonly nazioniService: NazioniService) {}

  @Get()
  async findAll(@Query('attive') attive?: string) {
    const attiveOnly = attive === undefined ? true : attive === 'true';
    return this.nazioniService.findAll(attiveOnly);
  }
}
