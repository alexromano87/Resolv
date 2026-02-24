import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameRuoloSuperuserToSuperadmin1773001200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add 'superadmin' alongside 'superuser' in the enum so both are valid
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY \`ruolo\` ENUM('superadmin', 'superuser', 'titolare_studio', 'avvocato', 'collaboratore', 'segreteria', 'cliente')
      NOT NULL DEFAULT 'collaboratore'
    `);

    // Step 2: Migrate existing 'superuser' rows to 'superadmin'
    await queryRunner.query(`
      UPDATE \`users\` SET \`ruolo\` = 'superadmin' WHERE \`ruolo\` = 'superuser'
    `);

    // Step 3: Remove 'superuser' from the enum
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY \`ruolo\` ENUM('superadmin', 'titolare_studio', 'avvocato', 'collaboratore', 'segreteria', 'cliente')
      NOT NULL DEFAULT 'collaboratore'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add 'superuser' back alongside 'superadmin'
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY \`ruolo\` ENUM('superadmin', 'superuser', 'titolare_studio', 'avvocato', 'collaboratore', 'segreteria', 'cliente')
      NOT NULL DEFAULT 'collaboratore'
    `);

    // Step 2: Revert 'superadmin' rows to 'superuser'
    await queryRunner.query(`
      UPDATE \`users\` SET \`ruolo\` = 'superuser' WHERE \`ruolo\` = 'superadmin'
    `);

    // Step 3: Remove 'superadmin' from the enum
    await queryRunner.query(`
      ALTER TABLE \`users\`
      MODIFY \`ruolo\` ENUM('superuser', 'titolare_studio', 'avvocato', 'collaboratore', 'segreteria', 'cliente')
      NOT NULL DEFAULT 'collaboratore'
    `);
  }
}
