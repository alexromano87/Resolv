import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCheckupClientNomeNullable1773001900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`checkup_clients\` MODIFY COLUMN \`nome\` VARCHAR(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`checkup_clients\` SET \`nome\` = COALESCE(NULLIF(TRIM(\`ragioneSociale\`), ''), 'Cliente senza nome') WHERE \`nome\` IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`checkup_clients\` MODIFY COLUMN \`nome\` VARCHAR(255) NOT NULL`,
    );
  }
}
