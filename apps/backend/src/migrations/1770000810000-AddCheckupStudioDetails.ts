import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupStudioDetails1770000810000 implements MigrationInterface {
  name = 'AddCheckupStudioDetails1770000810000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_studios
      ADD COLUMN tipo ENUM('licenziatario', 'cliente') NOT NULL DEFAULT 'licenziatario' AFTER nome,
      ADD COLUMN ragioneSociale VARCHAR(255) NULL AFTER tipo,
      ADD COLUMN partitaIva VARCHAR(50) NULL AFTER ragioneSociale,
      ADD COLUMN codiceFiscale VARCHAR(50) NULL AFTER partitaIva,
      ADD COLUMN indirizzo VARCHAR(255) NULL AFTER codiceFiscale,
      ADD COLUMN citta VARCHAR(120) NULL AFTER indirizzo,
      ADD COLUMN provincia VARCHAR(80) NULL AFTER citta,
      ADD COLUMN cap VARCHAR(20) NULL AFTER provincia,
      ADD COLUMN paese VARCHAR(80) NULL AFTER cap,
      ADD COLUMN email VARCHAR(120) NULL AFTER paese,
      ADD COLUMN telefono VARCHAR(50) NULL AFTER email,
      ADD COLUMN sitoWeb VARCHAR(120) NULL AFTER telefono,
      ADD COLUMN logoUrl VARCHAR(255) NULL AFTER sitoWeb,
      ADD COLUMN note TEXT NULL AFTER logoUrl
    `);

    await queryRunner.query(`UPDATE checkup_studios SET tipo = 'licenziatario' WHERE tipo IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_studios
      DROP COLUMN note,
      DROP COLUMN logoUrl,
      DROP COLUMN sitoWeb,
      DROP COLUMN telefono,
      DROP COLUMN email,
      DROP COLUMN paese,
      DROP COLUMN cap,
      DROP COLUMN provincia,
      DROP COLUMN citta,
      DROP COLUMN indirizzo,
      DROP COLUMN codiceFiscale,
      DROP COLUMN partitaIva,
      DROP COLUMN ragioneSociale,
      DROP COLUMN tipo
    `);
  }
}
