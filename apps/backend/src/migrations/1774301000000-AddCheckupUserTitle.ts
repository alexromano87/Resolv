import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupUserTitle1774301000000 implements MigrationInterface {
  name = 'AddCheckupUserTitle1774301000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_users
      ADD COLUMN titolo VARCHAR(50) NULL AFTER cognome
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_users
      DROP COLUMN titolo
    `);
  }
}
