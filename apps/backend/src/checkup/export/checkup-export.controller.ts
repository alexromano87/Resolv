import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SuperadminGuard } from '../../auth/superadmin.guard';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { CheckupExportService } from './checkup-export.service';
import { CheckupBackupRequestDto, CheckupExportRequestDto } from './dto/checkup-export-request.dto';

@Controller('admin/checkup/export')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class CheckupExportController {
  constructor(
    private readonly exportService: CheckupExportService,
    private readonly auditLogService: CheckupAuditLogService,
  ) {}

  @Post()
  async exportData(@Body() dto: CheckupExportRequestDto, @Res() res: Response) {
    const buffer = await this.exportService.exportData(dto);
    const filename = `checkup-export-${dto.entity}.${dto.format}`;
    res.setHeader('Content-Type', this.getContentType(dto.format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('backup')
  async exportBackup(@Body() dto: CheckupBackupRequestDto, @Res() res: Response) {
    const buffer = await this.exportService.exportBackup(dto.licenziatarioId);
    const filename = `checkup-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  private getContentType(format: string) {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'json':
      default:
        return 'application/json';
    }
  }
}
