import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportPdfService } from './report-pdf.service';
import { ReportPdfServiceNew } from './report-pdf-new.service';
import { ReportExcelService } from './report-excel.service';
import { Cliente } from '../clienti/cliente.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Studio } from '../studi/studio.entity';
import { Ticket } from '../tickets/ticket.entity';
import { ReportCliente } from './report-cliente.entity';
import { ClientiModule } from '../clienti/clienti.module';
import { ReportStorageService } from './report-storage.service';
import { MovimentiFinanziariModule } from '../movimenti-finanziari/movimenti-finanziari.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cliente,
      Pratica,
      MovimentoFinanziario,
      Alert,
      Studio,
      Ticket,
      ReportCliente,
    ]),
    ClientiModule,
    MovimentiFinanziariModule,
  ],
  controllers: [ReportController],
  providers: [ReportPdfService, ReportPdfServiceNew, ReportExcelService, ReportStorageService],
  exports: [ReportPdfService, ReportPdfServiceNew, ReportExcelService, ReportStorageService],
})
export class ReportModule {}
