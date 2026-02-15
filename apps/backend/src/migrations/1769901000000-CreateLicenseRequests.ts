import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLicenseRequests1769901000000 implements MigrationInterface {
    name = 'CreateLicenseRequests1769901000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const exists = await queryRunner.hasTable('license_requests');
        if (exists) {
            return;
        }
        await queryRunner.query(`
            CREATE TABLE \`license_requests\` (
              \`id\` varchar(36) NOT NULL,
              \`plan\` enum('starter','professional','enterprise') NOT NULL,
              \`billingCycle\` enum('monthly','annual') NOT NULL,
              \`status\` enum('pending','provisioned','rejected') NOT NULL DEFAULT 'pending',
              \`studioNome\` varchar(255) NOT NULL,
              \`studioTipologia\` varchar(40) NOT NULL,
              \`studioMaxUtenti\` int NULL,
              \`studioRagioneSociale\` varchar(255) NULL,
              \`studioPartitaIva\` varchar(50) NULL,
              \`studioCodiceFiscale\` varchar(50) NULL,
              \`studioIndirizzo\` varchar(255) NULL,
              \`studioCitta\` varchar(80) NULL,
              \`studioCap\` varchar(20) NULL,
              \`studioProvincia\` varchar(30) NULL,
              \`studioTelefono\` varchar(30) NULL,
              \`studioEmail\` varchar(255) NULL,
              \`studioPec\` varchar(255) NULL,
              \`adminEmail\` varchar(255) NOT NULL,
              \`adminNome\` varchar(255) NOT NULL,
              \`adminCognome\` varchar(255) NOT NULL,
              \`adminTelefono\` varchar(30) NULL,
              \`adminCodiceFiscale\` varchar(50) NULL,
              \`note\` varchar(500) NULL,
              \`provisionedStudioId\` varchar(36) NULL,
              \`provisionedAdminUserId\` varchar(36) NULL,
              \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
              \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
              PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`license_requests\``);
    }
}
