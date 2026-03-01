import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupAuditLogs1773001600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_audit_logs (
        id varchar(36) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        userId varchar(36) NULL,
        userEmail varchar(255) NULL,
        userRole varchar(50) NULL,
        action enum(
          'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
          'CREATE', 'UPDATE', 'DELETE', 'VIEW',
          'TOGGLE_ACTIVE', 'RESET_PASSWORD', 'ASSIGN',
          'UPLOAD_FILE', 'DOWNLOAD_FILE', 'DELETE_FILE',
          'EXPORT_DATA', 'BACKUP_DATA', 'IMPORT_DATA'
        ) NOT NULL,
        entityType enum(
          'STUDIO', 'CLIENTE', 'UTENTE', 'LICENZA', 'SUBLICENZA',
          'MODELLO', 'DOMANDA', 'PREASSESSMENT', 'REPORT',
          'DOCUMENTO', 'CHAT', 'TICKET', 'ALERT', 'SYSTEM'
        ) NOT NULL,
        entityId varchar(36) NULL,
        entityName varchar(255) NULL,
        description text NULL,
        metadata json NULL,
        ipAddress varchar(45) NULL,
        userAgent text NULL,
        studioId varchar(36) NULL,
        success tinyint NOT NULL DEFAULT 1,
        errorMessage text NULL,
        PRIMARY KEY (id),
        INDEX idx_checkup_audit_logs_createdAt (createdAt),
        INDEX idx_checkup_audit_logs_userId (userId),
        INDEX idx_checkup_audit_logs_entityType (entityType),
        INDEX idx_checkup_audit_logs_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE checkup_audit_logs`);
  }
}
