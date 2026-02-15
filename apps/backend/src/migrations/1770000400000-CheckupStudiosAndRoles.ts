import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckupStudiosAndRoles1770000400000 implements MigrationInterface {
  name = 'CheckupStudiosAndRoles1770000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE checkup_studios (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        nome VARCHAR(255) NOT NULL,
        attivo TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`ALTER TABLE checkup_users ADD COLUMN studioId CHAR(36) NULL AFTER ruolo`);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      MODIFY COLUMN ruolo ENUM('operatore', 'cliente', 'admin_studio', 'segreteria', 'collaboratore') NOT NULL DEFAULT 'cliente'
    `);

    await queryRunner.query(`UPDATE checkup_users SET ruolo = 'admin_studio' WHERE ruolo = 'operatore'`);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      MODIFY COLUMN ruolo ENUM('admin_studio', 'segreteria', 'collaboratore', 'cliente') NOT NULL DEFAULT 'cliente'
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_users
      ADD CONSTRAINT FK_checkup_users_studio FOREIGN KEY (studioId) REFERENCES checkup_studios(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      ADD COLUMN studioCanEdit TINYINT NOT NULL DEFAULT 0
    `);

    // Create default studio and attach existing users
    await queryRunner.query(`
      INSERT INTO checkup_studios (id, nome, attivo, createdAt, updatedAt)
      VALUES (UUID(), 'Studio Resolv', 1, NOW(6), NOW(6))
    `);

    const studioRow = await queryRunner.query(`SELECT id FROM checkup_studios ORDER BY createdAt ASC LIMIT 1`);
    const studioId = studioRow?.[0]?.id;
    if (studioId) {
      await queryRunner.query(`UPDATE checkup_users SET studioId = ? WHERE studioId IS NULL`, [studioId]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE checkup_preassessments DROP COLUMN studioCanEdit`);
    await queryRunner.query(`ALTER TABLE checkup_users DROP FOREIGN KEY FK_checkup_users_studio`);
    await queryRunner.query(`ALTER TABLE checkup_users DROP COLUMN studioId`);
    await queryRunner.query(`
      ALTER TABLE checkup_users
      MODIFY COLUMN ruolo ENUM('operatore', 'cliente') NOT NULL DEFAULT 'cliente'
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_studios`);
  }
}
