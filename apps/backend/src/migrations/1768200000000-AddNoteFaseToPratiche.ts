import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoteFaseToPratiche1768200000000 implements MigrationInterface {
  name = 'AddNoteFaseToPratiche1768200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('pratiche', 'noteFase');
    if (!hasColumn) {
      await queryRunner.query('ALTER TABLE `pratiche` ADD `noteFase` text NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('pratiche', 'noteFase');
    if (hasColumn) {
      await queryRunner.query('ALTER TABLE `pratiche` DROP COLUMN `noteFase`');
    }
  }
}
