import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLogoToStudio1767380194534 implements MigrationInterface {
    name = 'AddLogoToStudio1767380194534'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`studi\` ADD \`logo\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`studi\` DROP COLUMN \`logo\``);
    }

}
