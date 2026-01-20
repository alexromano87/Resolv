import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCollaboratoriFieldsToUsers1768000000000 implements MigrationInterface {
    name = 'AddCollaboratoriFieldsToUsers1768000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`codiceFiscale\` varchar(16) NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`livelloAccessoPratiche\` varchar(20) NOT NULL DEFAULT 'solo_proprie'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`livelloPermessi\` varchar(20) NOT NULL DEFAULT 'modifica'`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`note\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`note\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`livelloPermessi\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`livelloAccessoPratiche\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`codiceFiscale\``);
    }
}
