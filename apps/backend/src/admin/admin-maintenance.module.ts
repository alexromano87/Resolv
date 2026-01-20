import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminMaintenanceController } from './admin-maintenance.controller';
import { AdminMaintenanceService } from './admin-maintenance.service';
import { Pratica } from '../pratiche/pratica.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Documento } from '../documenti/documento.entity';
import { Cartella } from '../cartelle/cartella.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pratica,
      Cliente,
      Debitore,
      Avvocato,
      MovimentoFinanziario,
      Alert,
      Ticket,
      Documento,
      Cartella,
      User,
    ]),
  ],
  controllers: [AdminMaintenanceController],
  providers: [AdminMaintenanceService],
  exports: [AdminMaintenanceService],
})
export class AdminMaintenanceModule {}
