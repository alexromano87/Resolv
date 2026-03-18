import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupLoginConfig1773002900000 implements MigrationInterface {
  name = 'CreateCheckupLoginConfig1773002900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`checkup_login_config\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`config\` json NOT NULL,
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`updatedBy\` varchar(255) DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `checkup_login_config`');
  }
}
