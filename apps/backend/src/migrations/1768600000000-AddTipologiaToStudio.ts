import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTipologiaToStudio1768600000000 implements MigrationInterface {
    name = 'AddTipologiaToStudio1768600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "ALTER TABLE `studi` ADD `tipologia` enum('individuale','associato','societa_tra_professionisti') NOT NULL DEFAULT 'individuale'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `studi` DROP COLUMN `tipologia`");
    }

}
