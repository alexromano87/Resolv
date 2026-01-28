import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nazione } from './nazione.entity';
import { NazioniController } from './nazioni.controller';
import { NazioniService } from './nazioni.service';

@Module({
  imports: [TypeOrmModule.forFeature([Nazione])],
  controllers: [NazioniController],
  providers: [NazioniService],
  exports: [NazioniService],
})
export class NazioniModule {}
