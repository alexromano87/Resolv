import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupNotificationReadStates1775300000000 implements MigrationInterface {
  name = 'AddCheckupNotificationReadStates1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasReadAt = await queryRunner.hasColumn('checkup_notifications', 'readAt');
    if (!hasReadAt) {
      await queryRunner.query(`
        ALTER TABLE checkup_notifications
        ADD COLUMN readAt datetime NULL
      `);
      await queryRunner.query(`
        CREATE INDEX IDX_checkup_notifications_user_read
        ON checkup_notifications (userId, readAt)
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS checkup_system_notification_states (
        id char(36) NOT NULL DEFAULT (UUID()),
        userId char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        auditLogId varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        readAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        deletedAt datetime(6) NULL,
        PRIMARY KEY (id),
        UNIQUE INDEX IDX_checkup_system_notification_user_log (userId, auditLogId),
        INDEX IDX_checkup_system_notification_user_read (userId, readAt),
        CONSTRAINT FK_checkup_system_notification_state_user FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_system_notification_state_audit FOREIGN KEY (auditLogId) REFERENCES checkup_audit_logs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS checkup_system_notification_states');
    const hasReadAt = await queryRunner.hasColumn('checkup_notifications', 'readAt');
    if (hasReadAt) {
      await queryRunner.query('DROP INDEX IDX_checkup_notifications_user_read ON checkup_notifications');
      await queryRunner.query('ALTER TABLE checkup_notifications DROP COLUMN readAt');
    }
  }
}
