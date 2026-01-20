// apps/backend/src/avvocati/avvocati.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvvocatiService } from './avvocati.service';
import { AvvocatiController } from './avvocati.controller';
import { Avvocato } from './avvocato.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Avvocato])],
  controllers: [AvvocatiController],
  providers: [AvvocatiService],
  exports: [AvvocatiService],
})
export class AvvocatiModule {}
