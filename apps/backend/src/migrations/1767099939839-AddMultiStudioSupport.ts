import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMultiStudioSupport1767099939839 implements MigrationInterface {
    name = 'AddMultiStudioSupport1767099939839'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_studi\` (\`userId\` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, \`studioId\` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, INDEX \`IDX_de0fe6736baea88a67e3b9cc83\` (\`userId\`), INDEX \`IDX_a1c507b94f02d38c9d0d73c505\` (\`studioId\`), PRIMARY KEY (\`userId\`, \`studioId\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`currentStudioId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user_studi\` ADD CONSTRAINT \`FK_de0fe6736baea88a67e3b9cc83a\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`user_studi\` ADD CONSTRAINT \`FK_a1c507b94f02d38c9d0d73c5055\` FOREIGN KEY (\`studioId\`) REFERENCES \`studi\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_studi\` DROP FOREIGN KEY \`FK_a1c507b94f02d38c9d0d73c5055\``);
        await queryRunner.query(`ALTER TABLE \`user_studi\` DROP FOREIGN KEY \`FK_de0fe6736baea88a67e3b9cc83a\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`currentStudioId\``);
        await queryRunner.query(`DROP INDEX \`IDX_a1c507b94f02d38c9d0d73c505\` ON \`user_studi\``);
        await queryRunner.query(`DROP INDEX \`IDX_de0fe6736baea88a67e3b9cc83\` ON \`user_studi\``);
        await queryRunner.query(`DROP TABLE \`user_studi\``);
    }

}
