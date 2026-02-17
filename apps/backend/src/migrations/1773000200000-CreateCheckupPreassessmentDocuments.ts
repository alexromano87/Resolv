import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupPreassessmentDocuments1773000200000 implements MigrationInterface {
  name = 'CreateCheckupPreassessmentDocuments1773000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('checkup_preassessment_documents');
    if (exists) return;

    await queryRunner.query(`
      CREATE TABLE checkup_preassessment_documents (
        id CHAR(36) NOT NULL,
        preassessmentId CHAR(36) NOT NULL,
        fieldId VARCHAR(255) NOT NULL,
        sectionId VARCHAR(255) NULL,
        nome VARCHAR(255) NOT NULL,
        nomeOriginale VARCHAR(255) NOT NULL,
        percorsoFile VARCHAR(500) NOT NULL,
        estensione VARCHAR(50) NOT NULL,
        tipo ENUM('pdf','word','excel','immagine','csv','xml','altro') NOT NULL DEFAULT 'altro',
        dimensione BIGINT NOT NULL,
        caricatoDa CHAR(36) NULL,
        attivo TINYINT(1) NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_checkup_preassessment_documents_preassessment (preassessmentId),
        INDEX IDX_checkup_preassessment_documents_field (fieldId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_preassessment_documents
      ADD CONSTRAINT FK_checkup_preassessment_documents_preassessment
        FOREIGN KEY (preassessmentId) REFERENCES checkup_preassessments(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_preassessment_documents
      ADD CONSTRAINT FK_checkup_preassessment_documents_user
        FOREIGN KEY (caricatoDa) REFERENCES checkup_users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('checkup_preassessment_documents');
    if (!exists) return;

    await queryRunner.query(`
      ALTER TABLE checkup_preassessment_documents
      DROP FOREIGN KEY FK_checkup_preassessment_documents_preassessment
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_preassessment_documents
      DROP FOREIGN KEY FK_checkup_preassessment_documents_user
    `);
    await queryRunner.query(`
      DROP TABLE checkup_preassessment_documents
    `);
  }
}
