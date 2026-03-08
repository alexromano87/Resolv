import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupSuperOwnerAndFinalValidation1773002100000 implements MigrationInterface {
  name = 'AddCheckupSuperOwnerAndFinalValidation1773002100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `checkup_users` ADD `superOwner` tinyint NOT NULL DEFAULT 0",
    );
    await queryRunner.query(
      "ALTER TABLE `checkup_preassessments` ADD `finalValidation` json NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `checkup_preassessments` DROP COLUMN `finalValidation`",
    );
    await queryRunner.query(
      "ALTER TABLE `checkup_users` DROP COLUMN `superOwner`",
    );
  }
}
