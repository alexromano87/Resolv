import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveModelFromLicenseToSublicense1773003100000 implements MigrationInterface {
  name = 'MoveModelFromLicenseToSublicense1773003100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure every sublicense has a modelId populated from its parent license (safety net)
    await queryRunner.query(`
      UPDATE checkup_sublicenses s
      INNER JOIN checkup_licenses l ON l.id = s.licenseId
      SET s.modelId = l.modelId
      WHERE s.modelId IS NULL AND l.modelId IS NOT NULL
    `);

    // 2. Drop old SET NULL FK on sublicenses.modelId and replace with RESTRICT
    const oldFk = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'checkup_sublicenses'
         AND CONSTRAINT_NAME = 'FK_checkup_sublicenses_model'`,
    );
    if (oldFk.length) {
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses DROP FOREIGN KEY FK_checkup_sublicenses_model
      `);
    }

    // 3. Make sublicenses.modelId NOT NULL
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
      MODIFY COLUMN modelId CHAR(36) NOT NULL
    `);

    // 4. Re-add FK with RESTRICT so model cannot be deleted while sublicenses reference it
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
      ADD CONSTRAINT FK_checkup_sublicenses_model
      FOREIGN KEY (modelId) REFERENCES checkup_question_models(id) ON DELETE RESTRICT
    `);

    // 5. Drop FK on licenses.modelId before dropping the column
    const licenseFks = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'checkup_licenses'
         AND COLUMN_NAME = 'modelId'
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
    );
    for (const fk of licenseFks) {
      await queryRunner.query(
        `ALTER TABLE checkup_licenses DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
      );
    }

    // 6. Drop modelId and modelIds from checkup_licenses
    const hasModelId = await queryRunner.hasColumn('checkup_licenses', 'modelId');
    if (hasModelId) {
      await queryRunner.query(`ALTER TABLE checkup_licenses DROP COLUMN modelId`);
    }

    const hasModelIds = await queryRunner.hasColumn('checkup_licenses', 'modelIds');
    if (hasModelIds) {
      await queryRunner.query(`ALTER TABLE checkup_licenses DROP COLUMN modelIds`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore modelId and modelIds on checkup_licenses
    const hasModelId = await queryRunner.hasColumn('checkup_licenses', 'modelId');
    if (!hasModelId) {
      await queryRunner.query(`
        ALTER TABLE checkup_licenses ADD COLUMN modelId CHAR(36) NOT NULL
      `);
    }

    const hasModelIds = await queryRunner.hasColumn('checkup_licenses', 'modelIds');
    if (!hasModelIds) {
      await queryRunner.query(`
        ALTER TABLE checkup_licenses ADD COLUMN modelIds JSON NULL
      `);
    }

    // Restore sublicenses.modelId as nullable and switch FK back to SET NULL
    const fk = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'checkup_sublicenses'
         AND CONSTRAINT_NAME = 'FK_checkup_sublicenses_model'`,
    );
    if (fk.length) {
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses DROP FOREIGN KEY FK_checkup_sublicenses_model
      `);
    }

    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses MODIFY COLUMN modelId CHAR(36) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
      ADD CONSTRAINT FK_checkup_sublicenses_model
      FOREIGN KEY (modelId) REFERENCES checkup_question_models(id) ON DELETE SET NULL
    `);
  }
}
