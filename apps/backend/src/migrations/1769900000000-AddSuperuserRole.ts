import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuperuserRole1769900000000 implements MigrationInterface {
    name = 'AddSuperuserRole1769900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "ALTER TABLE `users` MODIFY `ruolo` enum('superuser','admin','titolare_studio','avvocato','collaboratore','segreteria','cliente') NOT NULL DEFAULT 'collaboratore'"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            "ALTER TABLE `users` MODIFY `ruolo` enum('admin','titolare_studio','avvocato','collaboratore','segreteria','cliente') NOT NULL DEFAULT 'collaboratore'"
        );
    }
}
