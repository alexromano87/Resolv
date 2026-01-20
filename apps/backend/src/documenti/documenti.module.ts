// apps/backend/src/documenti/documenti.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Documento } from './documento.entity';
import { DocumentiService } from './documenti.service';
import { DocumentiController } from './documenti.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PraticheModule } from '../pratiche/pratiche.module';
import { CartelleModule } from '../cartelle/cartelle.module';
import { Avvocato } from '../avvocati/avvocato.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Documento, Avvocato]), NotificationsModule, PraticheModule, CartelleModule],
  controllers: [DocumentiController],
  providers: [DocumentiService],
  exports: [DocumentiService],
})
export class DocumentiModule {}
