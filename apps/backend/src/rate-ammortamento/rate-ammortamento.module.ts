import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PianoAmmortamento } from './piano-ammortamento.entity';
import { RataAmmortamento } from './rata-ammortamento.entity';
import { TassoInteresse } from './tasso-interesse.entity';
import { PianoAmmortamentoService } from './piano-ammortamento.service';
import { TassiInteresseService } from './tassi-interesse.service';
import { TassiFetchService } from './tassi-fetch.service';
import { TassiMonitoraggioService } from './tassi-monitoraggio.service';
import { PianoAmmortamentoController } from './piano-ammortamento.controller';
import { TassiInteresseController } from './tassi-interesse.controller';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { CacheService } from '../common/cache.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PraticheModule } from '../pratiche/pratiche.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PianoAmmortamento,
      RataAmmortamento,
      TassoInteresse,
      MovimentoFinanziario,
      Pratica,
    ]),
    NotificationsModule,
    forwardRef(() => PraticheModule),
  ],
  controllers: [PianoAmmortamentoController, TassiInteresseController],
  providers: [
    PianoAmmortamentoService,
    TassiInteresseService,
    TassiFetchService,
    TassiMonitoraggioService,
    CacheService,
  ],
  exports: [
    PianoAmmortamentoService,
    TassiInteresseService,
    TassiFetchService,
  ],
})
export class RateAmmortamentoModule {}
