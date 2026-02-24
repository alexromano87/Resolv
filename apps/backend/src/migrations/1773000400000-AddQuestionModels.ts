import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionModels1773000400000 implements MigrationInterface {
  name = 'AddQuestionModels1773000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasModels = await queryRunner.hasTable('checkup_question_models');
    if (!hasModels) {
      await queryRunner.query(`
        CREATE TABLE checkup_question_models (
          id CHAR(36) NOT NULL,
          code VARCHAR(50) NOT NULL,
          label VARCHAR(150) NOT NULL,
          description TEXT NULL,
          attivo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX UQ_checkup_question_models_code (code),
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    const hasModelId = await queryRunner.hasColumn('checkup_question_macro_areas', 'modelId');
    if (!hasModelId) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_macro_areas
        ADD COLUMN modelId CHAR(36) NULL
      `);
    }

    const existing = await queryRunner.query(
      `SELECT id FROM checkup_question_models WHERE code = 'preassessment' LIMIT 1`,
    );
    let modelId: string;
    if (existing.length > 0) {
      modelId = existing[0].id;
    } else {
      const res = await queryRunner.query(
        `INSERT INTO checkup_question_models (id, code, label, description, attivo)
         VALUES (UUID(), 'preassessment', 'Pre-Assessment', 'Modello standard pre-assessment', 1)`,
      );
      const inserted = await queryRunner.query(
        `SELECT id FROM checkup_question_models WHERE code = 'preassessment' LIMIT 1`,
      );
      modelId = inserted[0].id;
    }

    await queryRunner.query(
      `UPDATE checkup_question_macro_areas SET modelId = ? WHERE modelId IS NULL`,
      [modelId],
    );

    await queryRunner.query(`
      ALTER TABLE checkup_question_macro_areas
      MODIFY COLUMN modelId CHAR(36) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_question_macro_areas
      ADD CONSTRAINT FK_checkup_question_macro_areas_model
      FOREIGN KEY (modelId) REFERENCES checkup_question_models(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasModelFk = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'checkup_question_macro_areas'
         AND CONSTRAINT_NAME = 'FK_checkup_question_macro_areas_model'`,
    );
    if (hasModelFk.length) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_macro_areas
        DROP FOREIGN KEY FK_checkup_question_macro_areas_model
      `);
    }

    const hasModelId = await queryRunner.hasColumn('checkup_question_macro_areas', 'modelId');
    if (hasModelId) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_macro_areas
        DROP COLUMN modelId
      `);
    }

    const hasModels = await queryRunner.hasTable('checkup_question_models');
    if (hasModels) {
      await queryRunner.query(`DROP TABLE checkup_question_models`);
    }
  }
}
