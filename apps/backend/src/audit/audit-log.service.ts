import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog, AuditAction, AuditEntity } from './audit-log.entity';

export interface CreateAuditLogDto {
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: AuditAction;
  entityType: AuditEntity;
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

export interface AuditLogFilters {
  userId?: string;
  studioId?: string;
  entityType?: AuditEntity;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  search?: string; // Ricerca in description, entityName, userEmail
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Crea un nuovo log di audit
   */
  async log(data: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      ...data,
      success: data.success !== undefined ? data.success : true,
    });
    return this.auditLogRepository.save(auditLog);
  }

  /**
   * Recupera i log con filtri
   */
  async findAll(
    filters?: AuditLogFilters,
    page: number = 1,
    limit: number = 100,
  ): Promise<{ logs: AuditLog[]; total: number; page: number; totalPages: number }> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC');

    // Applica filtri
    if (filters) {
      if (filters.userId) {
        query.andWhere('log.userId = :userId', { userId: filters.userId });
      }

      if (filters.studioId !== undefined) {
        query.andWhere('log.studioId = :studioId', { studioId: filters.studioId });
      }

      if (filters.entityType) {
        query.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
      }

      if (filters.action) {
        query.andWhere('log.action = :action', { action: filters.action });
      }

      if (filters.success !== undefined) {
        query.andWhere('log.success = :success', { success: filters.success });
      }

      if (filters.startDate && filters.endDate) {
        query.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      } else if (filters.startDate) {
        query.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
      } else if (filters.endDate) {
        query.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
      }

      if (filters.search) {
        query.andWhere(
          '(log.description LIKE :search OR log.entityName LIKE :search OR log.userEmail LIKE :search)',
          { search: `%${filters.search}%` },
        );
      }
    }

    // Paginazione
    const total = await query.getCount();
    const logs = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Recupera statistiche sui log
   */
  async getStats(filters?: AuditLogFilters) {
    const query = this.auditLogRepository.createQueryBuilder('log');

    // Applica gli stessi filtri di findAll
    if (filters) {
      if (filters.userId) {
        query.andWhere('log.userId = :userId', { userId: filters.userId });
      }
      if (filters.studioId !== undefined) {
        query.andWhere('log.studioId = :studioId', { studioId: filters.studioId });
      }
      if (filters.startDate && filters.endDate) {
        query.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
      } else if (filters.startDate) {
        query.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
      } else if (filters.endDate) {
        query.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
      }
    }

    const [
      total,
      successCount,
      failureCount,
    ] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('log.success = :success', { success: true }).getCount(),
      query.clone().andWhere('log.success = :success', { success: false }).getCount(),
    ]);

    // Azioni più frequenti
    const actionStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Entità più modificate
    const entityStats = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.entityType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total,
      successCount,
      failureCount,
      actionStats: actionStats.map(s => ({ action: s.action, count: parseInt(s.count) })),
      entityStats: entityStats.map(s => ({ entityType: s.entityType, count: parseInt(s.count) })),
    };
  }

  /**
   * Elimina log più vecchi di X giorni
   */
  async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Esporta log in formato CSV
   */
  async exportToCSV(filters?: AuditLogFilters): Promise<string> {
    const { logs } = await this.findAll(filters, 1, 10000); // Max 10k records per export

    const headers = [
      'Data/Ora',
      'Utente',
      'Email',
      'Ruolo',
      'Azione',
      'Entità',
      'Nome Entità',
      'Descrizione',
      'Studio ID',
      'IP',
      'Esito',
      'Errore',
    ];

    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.user ? `${log.user.nome} ${log.user.cognome}` : 'N/A',
      log.userEmail || 'N/A',
      log.userRole || 'N/A',
      log.action,
      log.entityType,
      log.entityName || 'N/A',
      log.description || '',
      log.studioId || 'N/A',
      log.ipAddress || 'N/A',
      log.success ? 'OK' : 'ERRORE',
      log.errorMessage || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}
