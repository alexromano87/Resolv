import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupExportJobs1773002300000 implements MigrationInterface {
  name = 'AddCheckupExportJobs1773002300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`checkup_export_jobs\` (
        \`id\` varchar(36) NOT NULL,
        \`type\` enum ('pdf', 'zip') NOT NULL,
        \`status\` enum ('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'queued',
        \`requestedById\` varchar(36) NOT NULL,
        \`requestedByRole\` varchar(32) NOT NULL,
        \`requestedByStudioId\` varchar(36) NULL,
        \`requestedByClientId\` varchar(36) NULL,
        \`preassessmentId\` varchar(36) NULL,
        \`clientId\` varchar(36) NULL,
        \`payload\` longtext NULL,
        \`filename\` varchar(255) NULL,
        \`mimeType\` varchar(120) NULL,
        \`resultPath\` varchar(500) NULL,
        \`errorMessage\` varchar(500) NULL,
        \`attempts\` int NOT NULL DEFAULT 0,
        \`startedAt\` datetime NULL,
        \`completedAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_checkup_export_jobs_requestedById\` (\`requestedById\`),
        KEY \`IDX_checkup_export_jobs_status_createdAt\` (\`status\`, \`createdAt\`),
        KEY \`IDX_checkup_export_jobs_completedAt\` (\`completedAt\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `checkup_export_jobs`');
  }
}
