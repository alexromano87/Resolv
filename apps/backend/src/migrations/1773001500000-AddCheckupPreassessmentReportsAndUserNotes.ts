import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupPreassessmentReportsAndUserNotes1773001500000 implements MigrationInterface {
  name = 'AddCheckupPreassessmentReportsAndUserNotes1773001500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUserFieldNotes = await queryRunner.hasColumn('checkup_preassessments', 'userFieldNotes');
    if (!hasUserFieldNotes) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD COLUMN userFieldNotes JSON NULL
      `);
    }

    const hasReportsTable = await queryRunner.hasTable('checkup_preassessment_reports');
    if (!hasReportsTable) {
      await queryRunner.query(`
        CREATE TABLE checkup_preassessment_reports (
          id CHAR(36) NOT NULL,
          preassessmentId CHAR(36) NOT NULL,
          clientId CHAR(36) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          pdf LONGBLOB NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX IDX_checkup_preassessment_reports_client (clientId),
          INDEX IDX_checkup_preassessment_reports_preassessment (preassessmentId),
          CONSTRAINT FK_checkup_preassessment_reports_preassessment
            FOREIGN KEY (preassessmentId) REFERENCES checkup_preassessments(id) ON DELETE CASCADE,
          CONSTRAINT FK_checkup_preassessment_reports_client
            FOREIGN KEY (clientId) REFERENCES checkup_clients(id) ON DELETE CASCADE
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasReportsTable = await queryRunner.hasTable('checkup_preassessment_reports');
    if (hasReportsTable) {
      await queryRunner.query(`
        DROP TABLE checkup_preassessment_reports
      `);
    }

    const hasUserFieldNotes = await queryRunner.hasColumn('checkup_preassessments', 'userFieldNotes');
    if (hasUserFieldNotes) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP COLUMN userFieldNotes
      `);
    }
  }
}
