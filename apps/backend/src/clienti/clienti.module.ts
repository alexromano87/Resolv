// src/clienti/clienti.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from './cliente.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { ClientiController } from './clienti.controller';
import { ClientiService } from './clienti.service';
import { ClientiDebitoriModule } from '../relazioni/clienti-debitori.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cliente, Pratica, Avvocato]),
    ClientiDebitoriModule,   
  ],
  controllers: [ClientiController],
  providers: [ClientiService],
  exports: [ClientiService],
})
export class ClientiModule {}
