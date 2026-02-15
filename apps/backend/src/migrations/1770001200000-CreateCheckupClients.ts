import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupClients1770001200000 implements MigrationInterface {
  name = 'CreateCheckupClients1770001200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_clients (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        nome VARCHAR(255) NOT NULL,
        ragioneSociale VARCHAR(255) NULL,
        partitaIva VARCHAR(50) NULL,
        codiceFiscale VARCHAR(50) NULL,
        indirizzo VARCHAR(255) NULL,
        citta VARCHAR(120) NULL,
        provincia VARCHAR(80) NULL,
        cap VARCHAR(20) NULL,
        paese VARCHAR(80) NULL,
        email VARCHAR(120) NULL,
        telefono VARCHAR(50) NULL,
        sitoWeb VARCHAR(120) NULL,
        logoUrl VARCHAR(255) NULL,
        note TEXT NULL,
        attivo TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_checkup_clients_nome (nome),
        INDEX IDX_checkup_clients_codice (codiceFiscale)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        ADD COLUMN clientId CHAR(36) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        ADD INDEX IDX_checkup_sublicenses_client (clientId)
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        ADD CONSTRAINT FK_checkup_sublicenses_client FOREIGN KEY (clientId)
        REFERENCES checkup_clients(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_checkup_sublicenses_license_client ON checkup_sublicenses (licenseId, clientId)
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
        ADD COLUMN clientId CHAR(36) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_users
        ADD INDEX IDX_checkup_users_client (clientId)
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_users
        ADD CONSTRAINT FK_checkup_users_client FOREIGN KEY (clientId)
        REFERENCES checkup_clients(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      INSERT INTO checkup_clients (
        id, nome, ragioneSociale, partitaIva, codiceFiscale, indirizzo, citta,
        provincia, cap, paese, email, telefono, sitoWeb, logoUrl, note, attivo, createdAt, updatedAt
      )
      SELECT
        id, nome, ragioneSociale, partitaIva, codiceFiscale, indirizzo, citta,
        provincia, cap, paese, email, telefono, sitoWeb, logoUrl, note, attivo, createdAt, updatedAt
      FROM checkup_studios
      WHERE tipo = 'cliente'
    `);

    await queryRunner.query(`
      UPDATE checkup_sublicenses
      SET clientId = clienteStudioId
      WHERE clienteStudioId IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE checkup_users u
      INNER JOIN checkup_studios s ON u.studioId = s.id AND s.tipo = 'cliente'
      SET u.clientId = u.studioId
    `);

    await queryRunner.query(`
      UPDATE checkup_users u
      INNER JOIN checkup_studios s ON u.studioId = s.id AND s.tipo = 'cliente'
      SET u.studioId = NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_users
        DROP FOREIGN KEY FK_checkup_users_client
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_users
        DROP INDEX IDX_checkup_users_client
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_users
        DROP COLUMN clientId
    `);

    await queryRunner.query(`
      DROP INDEX UQ_checkup_sublicenses_license_client ON checkup_sublicenses
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        DROP FOREIGN KEY FK_checkup_sublicenses_client
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        DROP INDEX IDX_checkup_sublicenses_client
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_sublicenses
        DROP COLUMN clientId
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS checkup_clients
    `);
  }
}
