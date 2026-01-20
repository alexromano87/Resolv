// apps/backend/src/utilita/utilita.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RisorsaUtilita } from './risorsa-utilita.entity';
import { UtilitaService } from './utilita.service';
import { UtilitaController } from './utilita.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RisorsaUtilita])],
  controllers: [UtilitaController],
  providers: [UtilitaService],
  exports: [UtilitaService],
})
export class UtilitaModule {}
