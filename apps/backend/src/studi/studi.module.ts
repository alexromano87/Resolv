import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Studio } from './studio.entity';
import { StudiService } from './studi.service';
import { StudiController } from './studi.controller';
import { BackupService } from './backup.service';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { User } from '../users/user.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { Pratica } from '../pratiche/pratica.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Studio, Cliente, Debitore, User, Avvocato, Pratica])],
  controllers: [StudiController],
  providers: [StudiService, BackupService],
  exports: [StudiService, BackupService],
})
export class StudiModule {}
