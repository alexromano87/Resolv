import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupNotifications1774304000000 implements MigrationInterface {
  name = 'CreateCheckupNotifications1774304000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_notifications (
        id char(36) NOT NULL DEFAULT (UUID()),
        userId char(36) NOT NULL,
        type varchar(80) NOT NULL,
        title varchar(255) NOT NULL,
        message text NOT NULL,
        actionUrl varchar(500) NULL,
        preassessmentId char(36) NULL,
        clientId char(36) NULL,
        clientName varchar(255) NULL,
        actorId char(36) NULL,
        actorName varchar(255) NULL,
        metadata json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        deletedAt datetime(6) NULL,
        PRIMARY KEY (id),
        INDEX IDX_checkup_notifications_user_created (userId, createdAt),
        INDEX IDX_checkup_notifications_preassessment (preassessmentId),
        INDEX IDX_checkup_notifications_client (clientId),
        CONSTRAINT FK_checkup_notifications_user FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS checkup_notifications');
  }
}
