import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScoringWeight1773001000000 implements MigrationInterface {
  name = 'AddScoringWeight1773001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('checkup_question_fields', 'weight');
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_fields
        ADD COLUMN weight FLOAT NOT NULL DEFAULT 1
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('checkup_question_fields', 'weight');
    if (hasColumn) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_fields
        DROP COLUMN weight
      `);
    }
  }
}
