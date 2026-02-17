import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupPreassessmentNAAndValidations1771264200000 implements MigrationInterface {
  name = 'AddCheckupPreassessmentNAAndValidations1771264200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      ADD COLUMN naFields JSON NULL,
      ADD COLUMN macroValidations JSON NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      DROP COLUMN macroValidations,
      DROP COLUMN naFields
    `);
  }
}
