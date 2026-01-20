// apps/backend/src/movimenti-finanziari/movimenti-finanziari.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimentiFinanziariService } from './movimenti-finanziari.service';
import { MovimentiFinanziariPdfService } from './movimenti-finanziari-pdf.service';
import { MovimentiFinanziariController } from './movimenti-finanziari.controller';
import { MovimentoFinanziario } from './movimento-finanziario.entity';
import { PraticheModule } from '../pratiche/pratiche.module';
import { Cliente } from '../clienti/cliente.entity';
import { Studio } from '../studi/studio.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimentoFinanziario, Cliente, Studio]),
    forwardRef(() => PraticheModule),
  ],
  controllers: [MovimentiFinanziariController],
  providers: [MovimentiFinanziariService, MovimentiFinanziariPdfService],
  exports: [MovimentiFinanziariService],
})
export class MovimentiFinanziariModule {}
