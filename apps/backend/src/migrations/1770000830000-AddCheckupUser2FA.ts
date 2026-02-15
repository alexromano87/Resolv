import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupUser2FA1770000830000 implements MigrationInterface {
  name = 'AddCheckupUser2FA1770000830000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE checkup_users ADD COLUMN twoFactorEnabled TINYINT NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE checkup_users ADD COLUMN twoFactorChannel VARCHAR(10) NULL`);
    await queryRunner.query(`ALTER TABLE checkup_users ADD COLUMN twoFactorCode VARCHAR(12) NULL`);
    await queryRunner.query(`ALTER TABLE checkup_users ADD COLUMN twoFactorCodeExpires DATETIME NULL`);
    await queryRunner.query(`ALTER TABLE checkup_users ADD COLUMN twoFactorCodePurpose VARCHAR(12) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE checkup_users DROP COLUMN twoFactorCodePurpose`);
    await queryRunner.query(`ALTER TABLE checkup_users DROP COLUMN twoFactorCodeExpires`);
    await queryRunner.query(`ALTER TABLE checkup_users DROP COLUMN twoFactorCode`);
    await queryRunner.query(`ALTER TABLE checkup_users DROP COLUMN twoFactorChannel`);
    await queryRunner.query(`ALTER TABLE checkup_users DROP COLUMN twoFactorEnabled`);
  }
}
