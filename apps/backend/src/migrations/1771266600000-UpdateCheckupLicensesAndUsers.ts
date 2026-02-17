import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCheckupLicensesAndUsers1771266600000 implements MigrationInterface {
  name = 'UpdateCheckupLicensesAndUsers1771266600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_licenses
      MODIFY studioId CHAR(36) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      ADD COLUMN sublicenseId CHAR(36) NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_checkup_users_sublicense ON checkup_users (sublicenseId)
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      ADD CONSTRAINT FK_checkup_users_sublicense
      FOREIGN KEY (sublicenseId) REFERENCES checkup_sublicenses(id)
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_users
      DROP FOREIGN KEY FK_checkup_users_sublicense
    `);
    await queryRunner.query(`
      DROP INDEX IDX_checkup_users_sublicense ON checkup_users
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_users
      DROP COLUMN sublicenseId
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_licenses
      MODIFY studioId CHAR(36) NOT NULL
    `);
  }
}
