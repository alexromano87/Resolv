import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToCheckupEntities1773000800000 implements MigrationInterface {
  name = 'AddSoftDeleteToCheckupEntities1773000800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'checkup_clients',
      'checkup_users',
      'checkup_studios',
      'checkup_preassessments',
    ];

    for (const table of tables) {
      const hasColumn = await queryRunner.hasColumn(table, 'deletedAt');
      if (!hasColumn) {
        await queryRunner.query(`
          ALTER TABLE ${table}
          ADD COLUMN deletedAt DATETIME NULL
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'checkup_preassessments',
      'checkup_studios',
      'checkup_users',
      'checkup_clients',
    ];

    for (const table of tables) {
      const hasColumn = await queryRunner.hasColumn(table, 'deletedAt');
      if (hasColumn) {
        await queryRunner.query(`
          ALTER TABLE ${table}
          DROP COLUMN deletedAt
        `);
      }
    }
  }
}
