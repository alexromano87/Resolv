import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a `sha256` column (VARCHAR 64, nullable) to the
 * `checkup_preassessment_documents` table for file integrity verification.
 *
 * Existing records will have sha256 = NULL (hash computed on next upload).
 */
export class AddSha256ToPreassessmentDocuments1773002400000 implements MigrationInterface {
  name = 'AddSha256ToPreassessmentDocuments1773002400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`checkup_preassessment_documents\`
      ADD COLUMN \`sha256\` VARCHAR(64) NULL DEFAULT NULL
        COMMENT 'SHA-256 hex digest of the uploaded file for integrity verification'
        AFTER \`dimensione\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`checkup_preassessment_documents\`
      DROP COLUMN \`sha256\`
    `);
  }
}
