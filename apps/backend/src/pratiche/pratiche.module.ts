// src/pratiche/pratiche.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pratica } from './pratica.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { User } from '../users/user.entity';
import { Documento } from '../documenti/documento.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { PraticheService } from './pratiche.service';
import { PraticheController } from './pratiche.controller';
import { FasiModule } from '../fasi/fasi.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CartelleModule } from '../cartelle/cartelle.module';
import { RateAmmortamentoModule } from '../rate-ammortamento/rate-ammortamento.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pratica, Avvocato, User, Documento, MovimentoFinanziario]),
    FasiModule,
    NotificationsModule,
    RateAmmortamentoModule,
    forwardRef(() => CartelleModule),
  ],
  controllers: [PraticheController],
  providers: [PraticheService],
  exports: [PraticheService],
})
export class PraticheModule {}
