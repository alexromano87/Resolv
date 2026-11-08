import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aggiunge `isDemo` a studi, clienti e utenti Checkup: i record dimostrativi
 * (seed-demo) restano isolati nel proprio ambiente e non compaiono negli
 * elenchi superadmin se non richiesti esplicitamente.
 */
export class AddDemoFlag1775600000000 implements MigrationInterface {
  name = 'AddDemoFlag1775600000000';

  private static readonly TABLES = ['checkup_studios', 'checkup_clients', 'checkup_users'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of AddDemoFlag1775600000000.TABLES) {
      if (!(await queryRunner.hasColumn(table, 'isDemo'))) {
        await queryRunner.query(`ALTER TABLE ${table} ADD isDemo tinyint(1) NOT NULL DEFAULT 0`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of AddDemoFlag1775600000000.TABLES) {
      if (await queryRunner.hasColumn(table, 'isDemo')) {
        await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN isDemo`);
      }
    }
  }
}
