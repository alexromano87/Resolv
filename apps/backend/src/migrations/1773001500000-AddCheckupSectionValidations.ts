import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupSectionValidations1773001500000 implements MigrationInterface {
  name = 'AddCheckupSectionValidations1773001500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('checkup_preassessments', 'sectionValidations');
    if (!hasColumn) {
      await queryRunner.query(
        'ALTER TABLE checkup_preassessments ADD COLUMN sectionValidations JSON NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('checkup_preassessments', 'sectionValidations');
    if (hasColumn) {
      await queryRunner.query(
        'ALTER TABLE checkup_preassessments DROP COLUMN sectionValidations',
      );
    }
  }
}
