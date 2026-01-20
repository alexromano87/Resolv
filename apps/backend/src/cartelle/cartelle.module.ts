// apps/backend/src/cartelle/cartella.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cartella } from './cartella.entity';
import { CartelleService } from './cartelle.service';
import { CartelleController } from './cartelle.controller';
import { PraticheModule } from '../pratiche/pratiche.module';
import { Avvocato } from '../avvocati/avvocato.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cartella, Avvocato]), forwardRef(() => PraticheModule)],
  controllers: [CartelleController],
  providers: [CartelleService],
  exports: [CartelleService],
})
export class CartelleModule {}
