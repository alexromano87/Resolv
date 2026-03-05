import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperadminGuard } from '../auth/superadmin.guard';
import { AuditLogService } from './audit-log.service';
import type { AuditLogFilters } from './audit-log.service';
import type { AuditAction, AuditEntity } from './audit-log.entity';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Recupera i log di audit con filtri e paginazione
   */
  @Get()
  async getLogs(
    @Query('userId') userId?: string,
    @Query('studioId') studioId?: string,
    @Query('entityType') entityType?: AuditEntity,
    @Query('action') action?: AuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('success') success?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: AuditLogFilters = {};

    if (userId) filters.userId = userId;
    if (studioId !== undefined) filters.studioId = studioId;
    if (entityType) filters.entityType = entityType;
    if (action) filters.action = action;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (success !== undefined) filters.success = success === 'true';
    if (search) filters.search = search;

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 100;

    return this.auditLogService.findAll(
      Object.keys(filters).length > 0 ? filters : undefined,
      pageNum,
      limitNum,
    );
  }

  /**
   * Recupera statistiche sui log
   */
  @Get('stats')
  async getStats(
    @Query('userId') userId?: string,
    @Query('studioId') studioId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: AuditLogFilters = {};

    if (userId) filters.userId = userId;
    if (studioId !== undefined) filters.studioId = studioId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.auditLogService.getStats(
      Object.keys(filters).length > 0 ? filters : undefined,
    );
  }

  /**
   * Esporta i log in formato CSV
   */
  @Get('export')
  async exportLogs(
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('studioId') studioId?: string,
    @Query('entityType') entityType?: AuditEntity,
    @Query('action') action?: AuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('success') success?: string,
    @Query('search') search?: string,
  ) {
    const filters: AuditLogFilters = {};

    if (userId) filters.userId = userId;
    if (studioId !== undefined) filters.studioId = studioId;
    if (entityType) filters.entityType = entityType;
    if (action) filters.action = action;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (success !== undefined) filters.success = success === 'true';
    if (search) filters.search = search;

    const csvContent = await this.auditLogService.exportToCSV(
      Object.keys(filters).length > 0 ? filters : undefined,
    );

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csvContent);
  }

  /**
   * Elimina log precedenti a beforeDate (se omesso, elimina tutti)
   */
  @Delete('cleanup')
  async cleanupOldLogs(@Query('beforeDate') beforeDate?: string) {
    const cutoff = beforeDate ? new Date(beforeDate) : undefined;
    const deletedCount = await this.auditLogService.cleanOldLogs(cutoff);
    const message = cutoff
      ? `Eliminati ${deletedCount} log precedenti al ${cutoff.toLocaleDateString('it-IT')}`
      : `Eliminati ${deletedCount} log`;
    return { message, deletedCount };
  }
}
