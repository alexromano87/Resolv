import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupPreassessment1770000300000 implements MigrationInterface {
  name = 'CreateCheckupPreassessment1770000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_preassessments (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        userId CHAR(36) NOT NULL,
        data JSON NULL,
        notes JSON NULL,
        fieldNotes JSON NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_checkup_preassessments_user (userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_preassessments_user FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS checkup_preassessments');
  }
}
