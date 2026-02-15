import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupTicketsAlerts1770000600000 implements MigrationInterface {
  name = 'CreateCheckupTicketsAlerts1770000600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_tickets (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        preassessmentId CHAR(36) NOT NULL,
        createdById CHAR(36) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_checkup_tickets_preassessment (preassessmentId),
        INDEX IDX_checkup_tickets_creator (createdById),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_tickets_preassessment FOREIGN KEY (preassessmentId) REFERENCES checkup_preassessments(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_tickets_creator FOREIGN KEY (createdById) REFERENCES checkup_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE checkup_ticket_messages (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        ticketId CHAR(36) NOT NULL,
        userId CHAR(36) NOT NULL,
        messaggio TEXT NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_checkup_ticket_messages_ticket (ticketId),
        INDEX IDX_checkup_ticket_messages_user (userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_ticket_messages_ticket FOREIGN KEY (ticketId) REFERENCES checkup_tickets(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_ticket_messages_user FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE checkup_alerts (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        preassessmentId CHAR(36) NOT NULL,
        createdById CHAR(36) NOT NULL,
        targetUserId CHAR(36) NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'info',
        messaggio TEXT NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_checkup_alerts_preassessment (preassessmentId),
        INDEX IDX_checkup_alerts_creator (createdById),
        INDEX IDX_checkup_alerts_target (targetUserId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_alerts_preassessment FOREIGN KEY (preassessmentId) REFERENCES checkup_preassessments(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_alerts_creator FOREIGN KEY (createdById) REFERENCES checkup_users(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_alerts_target FOREIGN KEY (targetUserId) REFERENCES checkup_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS checkup_alerts');
    await queryRunner.query('DROP TABLE IF EXISTS checkup_ticket_messages');
    await queryRunner.query('DROP TABLE IF EXISTS checkup_tickets');
  }
}
