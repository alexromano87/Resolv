import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupLicenseModel1773000500000 implements MigrationInterface {
  name = 'AddCheckupLicenseModel1773000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasModelId = await queryRunner.hasColumn('checkup_licenses', 'modelId');
    if (!hasModelId) {
      await queryRunner.query(`
        ALTER TABLE checkup_licenses
        ADD COLUMN modelId CHAR(36) NULL
      `);
    }

    const existingModel = await queryRunner.query(
      `SELECT id FROM checkup_question_models WHERE code = 'preassessment' LIMIT 1`,
    );

    let modelId: string;
    if (existingModel.length > 0) {
      modelId = existingModel[0].id;
    } else {
      await queryRunner.query(
        `INSERT INTO checkup_question_models (id, code, label, description, attivo)
         VALUES (UUID(), 'preassessment', 'Pre-Assessment', 'Modello standard pre-assessment', 1)`,
      );
      const inserted = await queryRunner.query(
        `SELECT id FROM checkup_question_models WHERE code = 'preassessment' LIMIT 1`,
      );
      modelId = inserted[0].id;
    }

    await queryRunner.query(
      `UPDATE checkup_licenses SET modelId = ? WHERE modelId IS NULL`,
      [modelId],
    );

    await queryRunner.query(`
      ALTER TABLE checkup_licenses
      MODIFY COLUMN modelId CHAR(36) NOT NULL
    `);

    const fk = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'checkup_licenses'
         AND CONSTRAINT_NAME = 'FK_checkup_licenses_model'`,
    );
    if (!fk.length) {
      await queryRunner.query(`
        ALTER TABLE checkup_licenses
        ADD CONSTRAINT FK_checkup_licenses_model
        FOREIGN KEY (modelId) REFERENCES checkup_question_models(id) ON DELETE RESTRICT
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const fk = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'checkup_licenses'
         AND CONSTRAINT_NAME = 'FK_checkup_licenses_model'`,
    );
    if (fk.length) {
      await queryRunner.query(`
        ALTER TABLE checkup_licenses
        DROP FOREIGN KEY FK_checkup_licenses_model
      `);
    }

    const hasModelId = await queryRunner.hasColumn('checkup_licenses', 'modelId');
    if (hasModelId) {
      await queryRunner.query(`
        ALTER TABLE checkup_licenses
        DROP COLUMN modelId
      `);
    }
  }
}
