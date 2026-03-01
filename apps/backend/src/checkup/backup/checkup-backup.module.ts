import { Module } from '@nestjs/common';
import { CheckupBackupController } from './checkup-backup.controller';
import { CheckupBackupService } from './checkup-backup.service';
import { CheckupAuditLogModule } from '../audit/checkup-audit-log.module';

@Module({
  imports: [CheckupAuditLogModule],
  controllers: [CheckupBackupController],
  providers: [CheckupBackupService],
})
export class CheckupBackupModule {}
