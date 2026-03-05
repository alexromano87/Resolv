import { Controller, Delete, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SuperadminGuard } from '../../auth/superadmin.guard';
import { CheckupAuditLogService } from './checkup-audit-log.service';
import type { CheckupAuditAction, CheckupAuditEntity } from './checkup-audit-log.entity';

@Controller('admin/checkup/audit-logs')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class CheckupAuditLogController {
  constructor(private readonly auditLogService: CheckupAuditLogService) {}

  @Get()
  async getLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('userId') userId?: string,
    @Query('studioId') studioId?: string,
    @Query('entityType') entityType?: CheckupAuditEntity,
    @Query('action') action?: CheckupAuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogService.getLogs({
      page: Number(page),
      limit: Number(limit),
      userId,
      studioId,
      entityType,
      action,
      startDate,
      endDate,
    });
  }

  @Get('stats')
  async getStats(
    @Query('userId') userId?: string,
    @Query('studioId') studioId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogService.getStats({
      userId,
      studioId,
      startDate,
      endDate,
    });
  }

  @Delete('cleanup')
  async cleanupLogs(@Query('beforeDate') beforeDate?: string) {
    const cutoff = beforeDate ? new Date(beforeDate) : undefined;
    const deletedCount = await this.auditLogService.cleanLogs(cutoff);
    const message = cutoff
      ? `Eliminati ${deletedCount} log precedenti al ${cutoff.toLocaleDateString('it-IT')}`
      : `Eliminati ${deletedCount} log`;
    return { message, deletedCount };
  }

  @Get('export')
  async exportLogs(
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('studioId') studioId?: string,
    @Query('entityType') entityType?: CheckupAuditEntity,
    @Query('action') action?: CheckupAuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.auditLogService.exportToCSV({
      userId,
      studioId,
      entityType,
      action,
      startDate,
      endDate,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="checkup-audit-logs.csv"');
    res.send(csv);
  }
}
