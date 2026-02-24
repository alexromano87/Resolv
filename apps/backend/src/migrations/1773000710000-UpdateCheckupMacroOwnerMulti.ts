import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCheckupMacroOwnerMulti1773000710000 implements MigrationInterface {
  name = 'UpdateCheckupMacroOwnerMulti1773000710000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasMacroOwner = await queryRunner.hasColumn('checkup_users', 'macroAreaOwner');
    if (!hasMacroOwner) {
      await queryRunner.query(`
        ALTER TABLE checkup_users
        ADD COLUMN macroAreaOwner JSON NULL
      `);
      return;
    }

    const hasTemp = await queryRunner.hasColumn('checkup_users', 'macroAreaOwnerJson');
    if (!hasTemp) {
      await queryRunner.query(`
        ALTER TABLE checkup_users
        ADD COLUMN macroAreaOwnerJson JSON NULL
      `);
    }

    await queryRunner.query(`
      UPDATE checkup_users
      SET macroAreaOwnerJson = CASE
        WHEN macroAreaOwner IS NULL OR macroAreaOwner = '' THEN NULL
        ELSE JSON_ARRAY(macroAreaOwner)
      END
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      DROP COLUMN macroAreaOwner
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      CHANGE COLUMN macroAreaOwnerJson macroAreaOwner JSON NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasMacroOwner = await queryRunner.hasColumn('checkup_users', 'macroAreaOwner');
    if (!hasMacroOwner) return;

    const hasTemp = await queryRunner.hasColumn('checkup_users', 'macroAreaOwnerText');
    if (!hasTemp) {
      await queryRunner.query(`
        ALTER TABLE checkup_users
        ADD COLUMN macroAreaOwnerText VARCHAR(12) NULL
      `);
    }

    await queryRunner.query(`
      UPDATE checkup_users
      SET macroAreaOwnerText = JSON_UNQUOTE(JSON_EXTRACT(macroAreaOwner, '$[0]'))
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      DROP COLUMN macroAreaOwner
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      CHANGE COLUMN macroAreaOwnerText macroAreaOwner VARCHAR(12) NULL
    `);
  }
}
