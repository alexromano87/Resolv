import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CheckupAuditLog } from './checkup-audit-log.entity';
import { CheckupAuditLogService } from './checkup-audit-log.service';
import { CheckupAuditLogController } from './checkup-audit-log.controller';
import { CheckupAuditLogInterceptor } from './checkup-audit-log.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([CheckupAuditLog]), ConfigModule],
  controllers: [CheckupAuditLogController],
  providers: [
    CheckupAuditLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CheckupAuditLogInterceptor,
    },
  ],
  exports: [CheckupAuditLogService],
})
export class CheckupAuditLogModule {}
