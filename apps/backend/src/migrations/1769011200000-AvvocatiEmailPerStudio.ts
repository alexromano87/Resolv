import { MigrationInterface, QueryRunner } from "typeorm";

export class AvvocatiEmailPerStudio1769011200000 implements MigrationInterface {
    name = 'AvvocatiEmailPerStudio1769011200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`avvocati\` DROP INDEX \`IDX_avvocati_email\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_avvocati_studio_email\` ON \`avvocati\` (\`studioId\`, \`email\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_avvocati_studio_email\` ON \`avvocati\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_avvocati_email\` ON \`avvocati\` (\`email\`)`);
    }
}
