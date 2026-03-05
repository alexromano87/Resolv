import { Controller, Delete, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CheckupJwtAuthGuard } from '../auth/checkup-jwt-auth.guard';
import { CheckupAdminStudioGuard } from '../auth/checkup-admin-studio.guard';
import { CheckupCurrentUser } from '../auth/checkup-current-user.decorator';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupAuditLogService } from './checkup-audit-log.service';
import type { CheckupAuditAction, CheckupAuditEntity } from './checkup-audit-log.entity';

@Controller('checkup/audit-logs')
@UseGuards(CheckupJwtAuthGuard, CheckupAdminStudioGuard)
export class CheckupAuditController {
  constructor(private readonly auditService: CheckupAuditLogService) {}

  @Get()
  getLogs(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.getLogs({
      studioId: user.studioId ?? undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 50,
      userId: userId || undefined,
      action: action as CheckupAuditAction | undefined,
      entityType: entityType as CheckupAuditEntity | undefined,
      startDate: from || undefined,
      endDate: to || undefined,
    });
  }

  @Delete('cleanup')
  async cleanupLogs(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Query('beforeDate') beforeDate?: string,
  ) {
    const cutoff = beforeDate ? new Date(beforeDate) : undefined;
    const deletedCount = await this.auditService.cleanLogs(cutoff, user.studioId ?? undefined);
    const message = cutoff
      ? `Eliminati ${deletedCount} log precedenti al ${cutoff.toLocaleDateString('it-IT')}`
      : `Eliminati ${deletedCount} log`;
    return { message, deletedCount };
  }

  @Get('export.csv')
  async exportCsv(
    @CheckupCurrentUser() user: CheckupCurrentUserData,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.auditService.exportToCSV({
      studioId: user.studioId ?? undefined,
      userId: userId || undefined,
      action: action as CheckupAuditAction | undefined,
      entityType: entityType as CheckupAuditEntity | undefined,
      startDate: from || undefined,
      endDate: to || undefined,
    });
    const date = new Date().toISOString().split('T')[0];
    res!.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-log-${date}.csv"`,
    });
    res!.send(csv);
  }
}
