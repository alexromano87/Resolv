import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupAlertEnhancements1773001700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_alerts
        ADD COLUMN stato varchar(20) NOT NULL DEFAULT 'aperto' AFTER messaggio,
        ADD COLUMN dataScadenza datetime NULL AFTER stato,
        ADD COLUMN preavvisoGiorni int NULL AFTER dataScadenza,
        ADD COLUMN updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) AFTER createdAt
    `);

    await queryRunner.query(`
      CREATE INDEX idx_checkup_alerts_stato ON checkup_alerts (stato)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_checkup_alerts_dataScadenza ON checkup_alerts (dataScadenza)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_checkup_alerts_stato ON checkup_alerts`);
    await queryRunner.query(`DROP INDEX idx_checkup_alerts_dataScadenza ON checkup_alerts`);
    await queryRunner.query(`
      ALTER TABLE checkup_alerts
        DROP COLUMN stato,
        DROP COLUMN dataScadenza,
        DROP COLUMN preavvisoGiorni,
        DROP COLUMN updatedAt
    `);
  }
}
