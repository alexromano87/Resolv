import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupLicenses1770000800000 implements MigrationInterface {
  name = 'CreateCheckupLicenses1770000800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_licenses (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        studioId CHAR(36) NOT NULL,
        intestatario VARCHAR(255) NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        numeroUtenze INT NOT NULL,
        numeroSottolicenze INT NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX UQ_checkup_licenses_studio (studioId),
        INDEX IDX_checkup_licenses_studio (studioId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_licenses_studio FOREIGN KEY (studioId) REFERENCES checkup_studios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_licenses`);
  }
}
