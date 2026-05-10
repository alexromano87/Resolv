import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupAnagraficheLicenziatario1774302000000 implements MigrationInterface {
  name = 'CreateCheckupAnagraficheLicenziatario1774302000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('checkup_anagrafiche_licenziatario');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE checkup_anagrafiche_licenziatario (
          id char(36) NOT NULL,
          studioId char(36) NOT NULL,
          titolo varchar(50) NULL,
          nome varchar(100) NOT NULL,
          cognome varchar(100) NOT NULL,
          email varchar(180) NULL,
          pec varchar(180) NULL,
          partitaIva varchar(50) NULL,
          codiceFiscale varchar(50) NULL,
          telefono varchar(50) NULL,
          indirizzo varchar(255) NULL,
          citta varchar(120) NULL,
          provincia varchar(80) NULL,
          attiva tinyint NOT NULL DEFAULT 1,
          createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX IDX_checkup_anagrafiche_studio (studioId),
          PRIMARY KEY (id),
          CONSTRAINT FK_checkup_anagrafiche_studio FOREIGN KEY (studioId) REFERENCES checkup_studios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }

    const hasUserColumn = await queryRunner.hasColumn('checkup_users', 'anagraficaId');
    if (!hasUserColumn) {
      await queryRunner.query(`ALTER TABLE checkup_users ADD anagraficaId char(36) NULL`);
      await queryRunner.query(`ALTER TABLE checkup_users ADD INDEX IDX_checkup_users_anagrafica (anagraficaId)`);
      await queryRunner.query(`
        ALTER TABLE checkup_users
        ADD CONSTRAINT FK_checkup_users_anagrafica
        FOREIGN KEY (anagraficaId) REFERENCES checkup_anagrafiche_licenziatario(id)
        ON DELETE SET NULL
      `);
    }

    const hasSublicenseColumn = await queryRunner.hasColumn('checkup_sublicenses', 'consultantAnagraficaId');
    if (!hasSublicenseColumn) {
      await queryRunner.query(`ALTER TABLE checkup_sublicenses ADD consultantAnagraficaId char(36) NULL`);
      await queryRunner.query(`ALTER TABLE checkup_sublicenses ADD INDEX IDX_checkup_sublicenses_consultant_anagrafica (consultantAnagraficaId)`);
      await queryRunner.query(`
        ALTER TABLE checkup_sublicenses
        ADD CONSTRAINT FK_checkup_sublicenses_consultant_anagrafica
        FOREIGN KEY (consultantAnagraficaId) REFERENCES checkup_anagrafiche_licenziatario(id)
        ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasSublicenseColumn = await queryRunner.hasColumn('checkup_sublicenses', 'consultantAnagraficaId');
    if (hasSublicenseColumn) {
      await queryRunner.query(`ALTER TABLE checkup_sublicenses DROP FOREIGN KEY FK_checkup_sublicenses_consultant_anagrafica`);
      await queryRunner.query(`ALTER TABLE checkup_sublicenses DROP INDEX IDX_checkup_sublicenses_consultant_anagrafica`);
      await queryRunner.query(`ALTER TABLE checkup_sublicenses DROP COLUMN consultantAnagraficaId`);
    }

    const hasUserColumn = await queryRunner.hasColumn('checkup_users', 'anagraficaId');
    if (hasUserColumn) {
      await queryRunner.query(`ALTER TABLE checkup_users DROP FOREIGN KEY FK_checkup_users_anagrafica`);
      await queryRunner.query(`ALTER TABLE checkup_users DROP INDEX IDX_checkup_users_anagrafica`);
      await queryRunner.query(`ALTER TABLE checkup_users DROP COLUMN anagraficaId`);
    }

    const hasTable = await queryRunner.hasTable('checkup_anagrafiche_licenziatario');
    if (hasTable) {
      await queryRunner.query(`DROP TABLE checkup_anagrafiche_licenziatario`);
    }
  }
}
