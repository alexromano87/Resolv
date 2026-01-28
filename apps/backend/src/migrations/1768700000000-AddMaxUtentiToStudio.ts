import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMaxUtentiToStudio1768700000000 implements MigrationInterface {
    name = 'AddMaxUtentiToStudio1768700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `studi` ADD `maxUtenti` int NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `studi` DROP COLUMN `maxUtenti`");
    }

}
