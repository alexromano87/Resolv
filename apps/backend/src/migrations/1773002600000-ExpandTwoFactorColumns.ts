import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandTwoFactorColumns1773002600000 implements MigrationInterface {
  name = 'ExpandTwoFactorColumns1773002600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN twoFactorCode VARCHAR(255) NULL,
      MODIFY COLUMN twoFactorCodePurpose VARCHAR(50) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      MODIFY COLUMN twoFactorCode VARCHAR(255) NULL,
      MODIFY COLUMN twoFactorCodePurpose VARCHAR(50) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_users
      MODIFY COLUMN twoFactorCode VARCHAR(12) NULL,
      MODIFY COLUMN twoFactorCodePurpose VARCHAR(12) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN twoFactorCode VARCHAR(12) NULL,
      MODIFY COLUMN twoFactorCodePurpose VARCHAR(12) NULL
    `);
  }
}
