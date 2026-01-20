import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Debitore } from './debitore.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { DebitoriService } from './debitori.service';
import { DebitoriController } from './debitori.controller';
import { ClientiDebitoriModule } from '../relazioni/clienti-debitori.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Debitore, Pratica, Avvocato]),
    ClientiDebitoriModule,           // <--- QUI
  ],
  controllers: [DebitoriController],
  providers: [DebitoriService],
})
export class DebitoriModule {}
