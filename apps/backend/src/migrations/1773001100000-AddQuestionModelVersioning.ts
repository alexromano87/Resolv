import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionModelVersioning1773001100000 implements MigrationInterface {
  name = 'AddQuestionModelVersioning1773001100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasStatus = await queryRunner.hasColumn('checkup_question_models', 'status');
    if (!hasStatus) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_models
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft'
      `);
    }

    const hasVersion = await queryRunner.hasColumn('checkup_question_models', 'version');
    if (!hasVersion) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_models
        ADD COLUMN version INT NOT NULL DEFAULT 1
      `);
    }

    const hasParentModelId = await queryRunner.hasColumn('checkup_question_models', 'parentModelId');
    if (!hasParentModelId) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_models
        ADD COLUMN parentModelId VARCHAR(36) NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['parentModelId', 'version', 'status']) {
      const hasColumn = await queryRunner.hasColumn('checkup_question_models', col);
      if (hasColumn) {
        await queryRunner.query(`
          ALTER TABLE checkup_question_models
          DROP COLUMN ${col}
        `);
      }
    }
  }
}
