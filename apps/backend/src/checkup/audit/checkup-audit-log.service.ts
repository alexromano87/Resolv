import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
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
  userQuery?: string;
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

    const qb = this.auditLogRepository.createQueryBuilder('log');
    if (filters.userId) qb.andWhere('log.userId = :userId', { userId: filters.userId });
    if (filters.userQuery) {
      const query = filters.userQuery.trim().toLowerCase();
      if (query) {
        qb.andWhere(
          `(LOWER(COALESCE(log.userEmail, '')) LIKE :userQuery OR LOWER(COALESCE(log.userId, '')) LIKE :userQuery)`,
          { userQuery: `%${query}%` },
        );
      }
    }
    if (filters.studioId) qb.andWhere('log.studioId = :studioId', { studioId: filters.studioId });
    if (filters.entityType) qb.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
    if (filters.action) qb.andWhere('log.action = :action', { action: filters.action });
    if (filters.startDate) qb.andWhere('log.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
        endDate.setHours(23, 59, 59, 999);
      }
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const [logs, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(filters: CheckupAuditLogFilters = {}) {
    const buildQb = () => {
      const qb = this.auditLogRepository.createQueryBuilder('log');
      if (filters.userId) qb.andWhere('log.userId = :userId', { userId: filters.userId });
      if (filters.studioId) qb.andWhere('log.studioId = :studioId', { studioId: filters.studioId });
      if (filters.startDate) qb.andWhere('log.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
      if (filters.endDate) qb.andWhere('log.createdAt <= :endDate', { endDate: new Date(filters.endDate) });
      return qb;
    };

    const total = await buildQb().getCount();
    const success = await buildQb().andWhere('log.success = :success', { success: true }).getCount();
    const failed = await buildQb().andWhere('log.success = :success', { success: false }).getCount();

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
          let stringValue = String(value);

          // [M-04] Formula injection: celle che iniziano con =, +, -, @, TAB o CR
          // vengono interpretate come formule da Excel/LibreOffice. Prefissiamo
          // con un apostrofo per forzare il trattamento come testo letterale.
          if (/^[=+\-@\t\r]/.test(stringValue)) {
            stringValue = `'${stringValue}`;
          }

          // Escape delle virgolette interne e quoting se necessario
          const escaped = stringValue.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
            ? `"${escaped}"`
            : escaped;
        })
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
