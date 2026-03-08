import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCheckupClientLogoUrlToLongtext1773002000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `checkup_clients` MODIFY COLUMN `logoUrl` LONGTEXT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `checkup_clients` MODIFY COLUMN `logoUrl` VARCHAR(255) NULL',
    );
  }
}
