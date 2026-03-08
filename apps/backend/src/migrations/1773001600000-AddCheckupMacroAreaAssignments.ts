import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupMacroAreaAssignments1773001600000 implements MigrationInterface {
  name = 'AddCheckupMacroAreaAssignments1773001600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('checkup_users', 'macroAreaAssignments');
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE checkup_users
        ADD COLUMN macroAreaAssignments JSON NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('checkup_users', 'macroAreaAssignments');
    if (hasColumn) {
      await queryRunner.query(`
        ALTER TABLE checkup_users
        DROP COLUMN macroAreaAssignments
      `);
    }
  }
}
