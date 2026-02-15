import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupSublicenses1770000820000 implements MigrationInterface {
  name = 'CreateCheckupSublicenses1770000820000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_sublicenses (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        licenseId CHAR(36) NOT NULL,
        clienteStudioId CHAR(36) NOT NULL,
        numeroUtenze INT NOT NULL,
        attiva TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX UQ_checkup_sublicenses_license_cliente (licenseId, clienteStudioId),
        INDEX IDX_checkup_sublicenses_license (licenseId),
        INDEX IDX_checkup_sublicenses_cliente (clienteStudioId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_sublicenses_license FOREIGN KEY (licenseId) REFERENCES checkup_licenses(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_sublicenses_cliente FOREIGN KEY (clienteStudioId) REFERENCES checkup_studios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS checkup_sublicenses');
  }
}
