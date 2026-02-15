import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCheckupAdmin1770000200000 implements MigrationInterface {
  name = 'SeedCheckupAdmin1770000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Password: CheckupAdmin2024! (bcrypt hash)
    const hash = '$2b$10$kUal7kfXGPc3m48x7hSph.uWODQFPstyxCqQZ3Aw.IHdyee06sUem';

    await queryRunner.query(`
      INSERT INTO checkup_users (id, email, password, nome, cognome, ruolo, attivo, mustChangePassword, createdAt, updatedAt)
      VALUES (UUID(), 'admin@checkup.local', '${hash}', 'Admin', 'Checkup', 'operatore', 1, 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE id = id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM checkup_users WHERE email = 'admin@checkup.local'`,
    );
  }
}
