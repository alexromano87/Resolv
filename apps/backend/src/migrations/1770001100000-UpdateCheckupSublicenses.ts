import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCheckupSublicenses1770001100000 implements MigrationInterface {
  name = 'UpdateCheckupSublicenses1770001100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        MODIFY clienteStudioId CHAR(36) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        ADD COLUMN numeroSublicenza VARCHAR(16) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        ADD COLUMN tipo VARCHAR(100) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        ADD COLUMN dataInizioValidita DATE NULL
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        ADD COLUMN dataScadenza DATE NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_checkup_sublicenses_numero ON checkup_sublicenses (numeroSublicenza)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX UQ_checkup_sublicenses_numero ON checkup_sublicenses
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        DROP COLUMN dataScadenza
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        DROP COLUMN dataInizioValidita
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        DROP COLUMN tipo
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        DROP COLUMN numeroSublicenza
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        MODIFY clienteStudioId CHAR(36) NOT NULL
    `);
  }
}
