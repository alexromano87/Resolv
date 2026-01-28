import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatoDaToAlerts1768500000000 implements MigrationInterface {
    name = 'AddCreatoDaToAlerts1768500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`alerts\` ADD \`creatoDa\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`alerts\` DROP COLUMN \`creatoDa\``);
    }
}
