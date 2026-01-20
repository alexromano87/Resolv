// src/relazioni/clienti-debitori.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClienteDebitore } from './cliente-debitore.entity';
import { ClientiDebitoriService } from './clienti-debitori.service';
import { Debitore } from '../debitori/debitore.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClienteDebitore, Debitore])],
  providers: [ClientiDebitoriService],
  exports: [ClientiDebitoriService],   // <-- IMPORTANTISSIMO
})
export class ClientiDebitoriModule {}
