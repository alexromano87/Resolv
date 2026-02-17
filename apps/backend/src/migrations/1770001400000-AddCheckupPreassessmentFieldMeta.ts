import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupPreassessmentFieldMeta1770001400000 implements MigrationInterface {
  name = 'AddCheckupPreassessmentFieldMeta1770001400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      ADD COLUMN fieldMeta JSON NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      DROP COLUMN fieldMeta
    `);
  }
}
