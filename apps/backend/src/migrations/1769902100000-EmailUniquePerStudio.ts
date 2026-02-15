import { MigrationInterface, QueryRunner } from "typeorm";

export class EmailUniquePerStudio1769902100000 implements MigrationInterface {
    name = 'EmailUniquePerStudio1769902100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `users` DROP INDEX `IDX_users_email`");
        await queryRunner.query("CREATE UNIQUE INDEX `IDX_users_email_studio` ON `users` (`email`, `studioId`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_users_email_studio` ON `users`");
        await queryRunner.query("CREATE UNIQUE INDEX `IDX_users_email` ON `users` (`email`)");
    }
}
