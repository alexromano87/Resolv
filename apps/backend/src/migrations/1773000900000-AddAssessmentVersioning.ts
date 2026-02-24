import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssessmentVersioning1773000900000 implements MigrationInterface {
  name = 'AddAssessmentVersioning1773000900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasVersion = await queryRunner.hasColumn('checkup_preassessments', 'version');
    if (!hasVersion) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD COLUMN version INT NOT NULL DEFAULT 1
      `);
    }

    const hasParentId = await queryRunner.hasColumn('checkup_preassessments', 'parentId');
    if (!hasParentId) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD COLUMN parentId VARCHAR(36) NULL
      `);
    }

    const hasIsLatest = await queryRunner.hasColumn('checkup_preassessments', 'isLatest');
    if (!hasIsLatest) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD COLUMN isLatest TINYINT(1) NOT NULL DEFAULT 1
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['isLatest', 'parentId', 'version']) {
      const hasColumn = await queryRunner.hasColumn('checkup_preassessments', col);
      if (hasColumn) {
        await queryRunner.query(`
          ALTER TABLE checkup_preassessments
          DROP COLUMN ${col}
        `);
      }
    }
  }
}
