import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupMacroOwnersAndStatus1773000700000 implements MigrationInterface {
  name = 'AddCheckupMacroOwnersAndStatus1773000700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasMacroOwner = await queryRunner.hasColumn('checkup_users', 'macroAreaOwner');
    if (!hasMacroOwner) {
      await queryRunner.query(`
        ALTER TABLE checkup_users
        ADD COLUMN macroAreaOwner VARCHAR(12) NULL
      `);
    }

    const hasStatus = await queryRunner.hasColumn('checkup_preassessments', 'status');
    if (!hasStatus) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
      `);
    }

    const hasCompletedAt = await queryRunner.hasColumn('checkup_preassessments', 'completedAt');
    if (!hasCompletedAt) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD COLUMN completedAt DATETIME NULL
      `);
    }

    const hasCompletedBy = await queryRunner.hasColumn('checkup_preassessments', 'completedById');
    if (!hasCompletedBy) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD COLUMN completedById VARCHAR(36) NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCompletedBy = await queryRunner.hasColumn('checkup_preassessments', 'completedById');
    if (hasCompletedBy) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP COLUMN completedById
      `);
    }

    const hasCompletedAt = await queryRunner.hasColumn('checkup_preassessments', 'completedAt');
    if (hasCompletedAt) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP COLUMN completedAt
      `);
    }

    const hasStatus = await queryRunner.hasColumn('checkup_preassessments', 'status');
    if (hasStatus) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP COLUMN status
      `);
    }

    const hasMacroOwner = await queryRunner.hasColumn('checkup_users', 'macroAreaOwner');
    if (hasMacroOwner) {
      await queryRunner.query(`
        ALTER TABLE checkup_users
        DROP COLUMN macroAreaOwner
      `);
    }
  }
}
