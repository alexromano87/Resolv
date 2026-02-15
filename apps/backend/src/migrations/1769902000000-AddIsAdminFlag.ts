import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAdminFlag1769902000000 implements MigrationInterface {
    name = 'AddIsAdminFlag1769902000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const [cols]: any = await queryRunner.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'isAdmin'",
        );
        if (!cols || (Array.isArray(cols) ? cols.length === 0 : !cols.COLUMN_NAME)) {
            await queryRunner.query("ALTER TABLE `users` ADD COLUMN `isAdmin` tinyint NOT NULL DEFAULT 0");
        }
        await queryRunner.query("UPDATE `users` SET `isAdmin` = 1 WHERE `ruolo` = 'admin'");
        await queryRunner.query(
            "UPDATE `users` SET `ruolo` = CASE WHEN `studioId` IS NOT NULL THEN 'titolare_studio' ELSE 'collaboratore' END WHERE `ruolo` = 'admin'",
        );
        await queryRunner.query("ALTER TABLE `users` MODIFY `ruolo` enum('superuser','titolare_studio','avvocato','collaboratore','segreteria','cliente') NOT NULL DEFAULT 'collaboratore'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` MODIFY `ruolo` enum('superuser','admin','titolare_studio','avvocato','collaboratore','segreteria','cliente') NOT NULL DEFAULT 'collaboratore'");
        await queryRunner.query("UPDATE `users` SET `ruolo` = 'admin' WHERE `isAdmin` = 1");
        await queryRunner.query("ALTER TABLE `users` DROP COLUMN `isAdmin`");
    }
}
