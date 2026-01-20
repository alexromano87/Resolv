import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFatturazioneFields1767528795609 implements MigrationInterface {
    name = 'AddFatturazioneFields1767528795609'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`movimenti_finanziari\` ADD \`daFatturare\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`movimenti_finanziari\` ADD \`giaFatturato\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`movimenti_finanziari\` DROP COLUMN \`giaFatturato\``);
        await queryRunner.query(`ALTER TABLE \`movimenti_finanziari\` DROP COLUMN \`daFatturare\``);
    }

}
