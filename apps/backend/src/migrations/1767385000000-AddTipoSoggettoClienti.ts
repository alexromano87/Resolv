import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTipoSoggettoClienti1767385000000 implements MigrationInterface {
    name = 'AddTipoSoggettoClienti1767385000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clienti\` ADD \`tipoSoggetto\` varchar(20) NOT NULL DEFAULT 'persona_giuridica'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clienti\` DROP COLUMN \`tipoSoggetto\``);
    }

}
