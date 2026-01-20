// src/fasi/fasi.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { FasiService } from './fasi.service';

@Controller('fasi')
export class FasiController {
  constructor(private readonly fasiService: FasiService) {}

  // GET /fasi -> lista tutte le fasi
  @Get()
  findAll() {
    return this.fasiService.findAll();
  }

  // GET /fasi/:id -> dettaglio singola fase
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fasiService.findOne(id);
  }
}