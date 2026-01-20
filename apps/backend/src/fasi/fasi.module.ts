// src/fasi/fasi.module.ts
import { Module } from '@nestjs/common';
import { FasiService } from './fasi.service';
import { FasiController } from './fasi.controller';

@Module({
  controllers: [FasiController],
  providers: [FasiService],
  exports: [FasiService],
})
export class FasiModule {}