import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedQuestionData1771264109003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Macro Areas
    await queryRunner.query(`
      INSERT IGNORE INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (1, 'a', 'Identità e Struttura', '#6366f1', 0, NOW(), NOW())
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (2, 'b', 'Governance', '#8b5cf6', 1, NOW(), NOW())
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (3, 'c', 'Organizzazione', '#0ea5e9', 2, NOW(), NOW())
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (4, 'd', 'Compliance e Controlli', '#f59e0b', 3, NOW(), NOW())
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (5, 'e', 'Risk Management', '#ef4444', 4, NOW(), NOW())
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (6, 'f', 'Rapporti Esterni', '#10b981', 5, NOW(), NOW())
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (7, 'g', 'Adeguati Assetti', '#7c3aed', 6, NOW(), NOW())
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (8, 'h', 'Documentazione', '#64748b', 7, NOW(), NOW())
    `);

    // Insert Sections


    // Insert Fields

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM checkup_question_fields`);
    await queryRunner.query(`DELETE FROM checkup_question_sections`);
    await queryRunner.query(`DELETE FROM checkup_question_macro_areas`);
  }
}
