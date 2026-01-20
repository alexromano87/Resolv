// src/import/import.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Documento } from '../documenti/documento.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { User } from '../users/user.entity';
import { AuditLogService } from '../audit/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cliente,
      Debitore,
      Avvocato,
      Pratica,
      MovimentoFinanziario,
      Documento,
      Alert,
      Ticket,
      AuditLog,
      User,
    ]),
  ],
  controllers: [ImportController],
  providers: [ImportService, AuditLogService],
})
export class ImportModule {}
