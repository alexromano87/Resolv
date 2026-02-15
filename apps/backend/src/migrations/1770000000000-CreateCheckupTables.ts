import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckupTables1770000000000 implements MigrationInterface {
  name = 'CreateCheckupTables1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. checkup_users
    await queryRunner.query(`
      CREATE TABLE checkup_users (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        nome VARCHAR(100) NOT NULL,
        cognome VARCHAR(100) NOT NULL,
        telefono VARCHAR(30) NULL,
        ruolo ENUM('operatore', 'cliente') NOT NULL DEFAULT 'cliente',
        azienda VARCHAR(255) NULL,
        attivo TINYINT NOT NULL DEFAULT 1,
        mustChangePassword TINYINT NOT NULL DEFAULT 1,
        lastLogin DATETIME NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_checkup_users_email (email),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. checkup_templates
    await queryRunner.query(`
      CREATE TABLE checkup_templates (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        nome VARCHAR(255) NOT NULL,
        descrizione TEXT NULL,
        versione VARCHAR(20) NOT NULL DEFAULT '1.0',
        attivo TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. checkup_sections
    await queryRunner.query(`
      CREATE TABLE checkup_sections (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        templateId CHAR(36) NOT NULL,
        codice VARCHAR(10) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        descrizione TEXT NULL,
        ordine INT NOT NULL DEFAULT 0,
        attivo TINYINT NOT NULL DEFAULT 1,
        INDEX IDX_checkup_sections_templateId (templateId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_sections_template FOREIGN KEY (templateId) REFERENCES checkup_templates(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. checkup_questions
    await queryRunner.query(`
      CREATE TABLE checkup_questions (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        sectionId CHAR(36) NOT NULL,
        testo TEXT NOT NULL,
        tipo ENUM('text', 'yesno', 'choice', 'number', 'date') NOT NULL DEFAULT 'text',
        opzioni JSON NULL,
        ordine INT NOT NULL DEFAULT 0,
        obbligatoria TINYINT NOT NULL DEFAULT 0,
        accettaDocumenti TINYINT NOT NULL DEFAULT 0,
        parentQuestionId CHAR(36) NULL,
        parentConditionValue VARCHAR(255) NULL,
        attivo TINYINT NOT NULL DEFAULT 1,
        INDEX IDX_checkup_questions_sectionId (sectionId),
        INDEX IDX_checkup_questions_parentId (parentQuestionId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_questions_section FOREIGN KEY (sectionId) REFERENCES checkup_sections(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_questions_parent FOREIGN KEY (parentQuestionId) REFERENCES checkup_questions(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. checkup_questionnaires
    await queryRunner.query(`
      CREATE TABLE checkup_questionnaires (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        templateId CHAR(36) NOT NULL,
        clienteUserId CHAR(36) NOT NULL,
        assegnatoDaId CHAR(36) NULL,
        stato ENUM('bozza', 'in_compilazione', 'completato', 'revisionato') NOT NULL DEFAULT 'bozza',
        percentualeCompletamento INT NOT NULL DEFAULT 0,
        dataAssegnazione DATETIME NULL,
        dataCompletamento DATETIME NULL,
        note TEXT NULL,
        attivo TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_checkup_questionnaires_templateId (templateId),
        INDEX IDX_checkup_questionnaires_clienteUserId (clienteUserId),
        INDEX IDX_checkup_questionnaires_stato (stato),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_questionnaires_template FOREIGN KEY (templateId) REFERENCES checkup_templates(id) ON DELETE RESTRICT,
        CONSTRAINT FK_checkup_questionnaires_cliente FOREIGN KEY (clienteUserId) REFERENCES checkup_users(id) ON DELETE RESTRICT,
        CONSTRAINT FK_checkup_questionnaires_assegnato FOREIGN KEY (assegnatoDaId) REFERENCES checkup_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. checkup_answers
    await queryRunner.query(`
      CREATE TABLE checkup_answers (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        questionnaireId CHAR(36) NOT NULL,
        questionId CHAR(36) NOT NULL,
        valore TEXT NULL,
        richiesto TINYINT NOT NULL DEFAULT 0,
        evaso TINYINT NOT NULL DEFAULT 0,
        note TEXT NULL,
        updatedBy CHAR(36) NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_checkup_answers_unique (questionnaireId, questionId),
        INDEX IDX_checkup_answers_questionnaireId (questionnaireId),
        INDEX IDX_checkup_answers_questionId (questionId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_answers_questionnaire FOREIGN KEY (questionnaireId) REFERENCES checkup_questionnaires(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_answers_question FOREIGN KEY (questionId) REFERENCES checkup_questions(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_answers_updatedBy FOREIGN KEY (updatedBy) REFERENCES checkup_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. checkup_documents
    await queryRunner.query(`
      CREATE TABLE checkup_documents (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        questionnaireId CHAR(36) NOT NULL,
        answerId CHAR(36) NULL,
        sectionId CHAR(36) NULL,
        nome VARCHAR(255) NOT NULL,
        nomeOriginale VARCHAR(255) NOT NULL,
        percorsoFile VARCHAR(500) NOT NULL,
        estensione VARCHAR(50) NOT NULL,
        tipo ENUM('pdf', 'word', 'excel', 'immagine', 'csv', 'xml', 'altro') NOT NULL DEFAULT 'altro',
        dimensione BIGINT NOT NULL,
        caricatoDa CHAR(36) NULL,
        attivo TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_checkup_documents_questionnaireId (questionnaireId),
        INDEX IDX_checkup_documents_answerId (answerId),
        INDEX IDX_checkup_documents_sectionId (sectionId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_documents_questionnaire FOREIGN KEY (questionnaireId) REFERENCES checkup_questionnaires(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_documents_answer FOREIGN KEY (answerId) REFERENCES checkup_answers(id) ON DELETE SET NULL,
        CONSTRAINT FK_checkup_documents_section FOREIGN KEY (sectionId) REFERENCES checkup_sections(id) ON DELETE SET NULL,
        CONSTRAINT FK_checkup_documents_caricatoDa FOREIGN KEY (caricatoDa) REFERENCES checkup_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. checkup_chat_messages
    await queryRunner.query(`
      CREATE TABLE checkup_chat_messages (
        id CHAR(36) NOT NULL DEFAULT (UUID()),
        questionnaireId CHAR(36) NOT NULL,
        sectionId CHAR(36) NOT NULL,
        questionId CHAR(36) NULL,
        userId CHAR(36) NOT NULL,
        messaggio TEXT NOT NULL,
        letto TINYINT NOT NULL DEFAULT 0,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_checkup_chat_questionnaireId (questionnaireId),
        INDEX IDX_checkup_chat_sectionId (sectionId),
        INDEX IDX_checkup_chat_userId (userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_checkup_chat_questionnaire FOREIGN KEY (questionnaireId) REFERENCES checkup_questionnaires(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_chat_section FOREIGN KEY (sectionId) REFERENCES checkup_sections(id) ON DELETE CASCADE,
        CONSTRAINT FK_checkup_chat_question FOREIGN KEY (questionId) REFERENCES checkup_questions(id) ON DELETE SET NULL,
        CONSTRAINT FK_checkup_chat_user FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_documents`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_answers`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_questionnaires`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_questions`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_sections`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_templates`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkup_users`);
  }
}
