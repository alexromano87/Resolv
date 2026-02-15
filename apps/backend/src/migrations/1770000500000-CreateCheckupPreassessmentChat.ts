import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupPreassessmentChat1770000500000 implements MigrationInterface {
  name = 'CreateCheckupPreassessmentChat1770000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_preassessment_messages (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        preassessmentId CHAR(36) NOT NULL,
        sectionId VARCHAR(50) NOT NULL,
        userId CHAR(36) NOT NULL,
        messaggio TEXT NOT NULL,
        letto TINYINT NOT NULL DEFAULT 0,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_checkup_preassessment_messages_pre (preassessmentId),
        INDEX IDX_checkup_preassessment_messages_section (sectionId),
        INDEX IDX_checkup_preassessment_messages_user (userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_preassessment_messages_pre FOREIGN KEY (preassessmentId) REFERENCES checkup_preassessments(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_preassessment_messages_user FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS checkup_preassessment_messages');
  }
}
