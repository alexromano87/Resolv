import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupLicenseModelsAndSublicenseOptions1773001400000 implements MigrationInterface {
  name = 'AddCheckupLicenseModelsAndSublicenseOptions1773001400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasModelIds = await queryRunner.hasColumn('checkup_licenses', 'modelIds');
    if (!hasModelIds) {
      await queryRunner.query(`
        ALTER TABLE checkup_licenses
        ADD COLUMN modelIds JSON NULL
      `);
    }

    await queryRunner.query(`
      UPDATE checkup_licenses
      SET modelIds = JSON_ARRAY(modelId)
      WHERE modelIds IS NULL AND modelId IS NOT NULL
    `);

    const hasSublicenseModelId = await queryRunner.hasColumn('checkup_sublicenses', 'modelId');
    if (!hasSublicenseModelId) {
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses
        ADD COLUMN modelId CHAR(36) NULL
      `);
    }

    const hasAllowDocuments = await queryRunner.hasColumn('checkup_sublicenses', 'allowDocuments');
    if (!hasAllowDocuments) {
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses
        ADD COLUMN allowDocuments TINYINT(1) NOT NULL DEFAULT 1
      `);
    }

    await queryRunner.query(`
      UPDATE checkup_sublicenses s
      INNER JOIN checkup_licenses l ON l.id = s.licenseId
      SET s.modelId = l.modelId
      WHERE s.modelId IS NULL
    `);

    const fk = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'checkup_sublicenses'
         AND CONSTRAINT_NAME = 'FK_checkup_sublicenses_model'`,
    );
    if (!fk.length) {
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses
        ADD CONSTRAINT FK_checkup_sublicenses_model
        FOREIGN KEY (modelId) REFERENCES checkup_question_models(id) ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const fk = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'checkup_sublicenses'
         AND CONSTRAINT_NAME = 'FK_checkup_sublicenses_model'`,
    );
    if (fk.length) {
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses
        DROP FOREIGN KEY FK_checkup_sublicenses_model
      `);
    }

    const hasAllowDocuments = await queryRunner.hasColumn('checkup_sublicenses', 'allowDocuments');
    if (hasAllowDocuments) {
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses
        DROP COLUMN allowDocuments
      `);
    }

    const hasSublicenseModelId = await queryRunner.hasColumn('checkup_sublicenses', 'modelId');
    if (hasSublicenseModelId) {
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses
        DROP COLUMN modelId
      `);
    }

    const hasModelIds = await queryRunner.hasColumn('checkup_licenses', 'modelIds');
    if (hasModelIds) {
      await queryRunner.query(`
        ALTER TABLE checkup_licenses
        DROP COLUMN modelIds
      `);
    }
  }
}
