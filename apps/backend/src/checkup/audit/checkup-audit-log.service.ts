import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { CheckupAuditLog, type CheckupAuditAction, type CheckupAuditEntity } from './checkup-audit-log.entity';

export interface CreateCheckupAuditLogDto {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: CheckupAuditAction;
  entityType: CheckupAuditEntity;
  entityId?: string | null;
  entityName?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  studioId?: string | null;
  success?: boolean;
  errorMessage?: string | null;
}

export interface CheckupAuditLogFilters {
  userId?: string;
  studioId?: string;
  entityType?: CheckupAuditEntity;
  action?: CheckupAuditAction;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CheckupAuditLogService {
  private readonly logger = new Logger(CheckupAuditLogService.name);

  constructor(
    @InjectRepository(CheckupAuditLog)
    private auditLogRepository: Repository<CheckupAuditLog>,
    private configService: ConfigService,
  ) {}

  async log(data: CreateCheckupAuditLogDto): Promise<CheckupAuditLog> {
    const entry = this.auditLogRepository.create({
      userId: data.userId ?? null,
      userEmail: data.userEmail ?? null,
      userRole: data.userRole ?? null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      entityName: data.entityName ?? null,
      description: data.description ?? null,
      metadata: data.metadata ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      studioId: data.studioId ?? null,
      success: data.success ?? true,
      errorMessage: data.errorMessage ?? null,
    });
    return this.auditLogRepository.save(entry);
  }

  async getLogs(filters: CheckupAuditLogFilters = {}) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.studioId) where.studioId = filters.studioId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;
    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(filters: CheckupAuditLogFilters = {}) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.studioId) where.studioId = filters.studioId;
    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    const total = await this.auditLogRepository.count({ where });
    const success = await this.auditLogRepository.count({ where: { ...where, success: true } });
    const failed = await this.auditLogRepository.count({ where: { ...where, success: false } });

    return { total, success, failed };
  }

  /**
   * Elimina log precedenti a beforeDate (se omesso, elimina tutti).
   * Se studioId è fornito, limita la cancellazione allo studio.
   */
  async cleanLogs(beforeDate?: Date, studioId?: string): Promise<number> {
    const qb = this.auditLogRepository.createQueryBuilder().delete();
    const conditions: string[] = [];
    const params: Record<string, any> = {};
    if (beforeDate) { conditions.push('createdAt < :beforeDate'); params.beforeDate = beforeDate; }
    if (studioId) { conditions.push('studioId = :studioId'); params.studioId = studioId; }
    if (conditions.length) qb.where(conditions.join(' AND '), params);
    const result = await qb.execute();
    return result.affected || 0;
  }

  /**
   * Retention policy: delete audit logs older than CHECKUP_AUDIT_RETENTION_DAYS (default 90).
   * Runs daily at 03:00 to avoid peak-hour load.
   */
  @Cron('0 3 * * *')
  async enforceRetentionPolicy(): Promise<void> {
    const retentionDays = this.configService.get<number>('CHECKUP_AUDIT_RETENTION_DAYS', 90);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
      const result = await this.auditLogRepository.delete({ createdAt: LessThan(cutoff) });
      const deleted = result.affected ?? 0;
      if (deleted > 0) {
        this.logger.log(`Audit log retention: deleted ${deleted} records older than ${retentionDays} days (cutoff: ${cutoff.toISOString()})`);
      }
    } catch (error: any) {
      this.logger.error(`Audit log retention policy failed: ${error.message}`);
    }
  }

  async exportToCSV(filters: CheckupAuditLogFilters = {}): Promise<string> {
    const { logs } = await this.getLogs({ ...filters, page: 1, limit: 10000 });
    if (!logs.length) return 'Nessun dato';

    const headers = [
      'id',
      'createdAt',
      'userId',
      'userEmail',
      'userRole',
      'action',
      'entityType',
      'entityId',
      'entityName',
      'description',
      'ipAddress',
      'studioId',
      'success',
      'errorMessage',
    ];

    const rows = logs.map((log) =>
      headers
        .map((key) => {
          const value = (log as any)[key];
          if (value === null || value === undefined) return '';
          const stringValue = String(value).replace(/"/g, '""');
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        })
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
