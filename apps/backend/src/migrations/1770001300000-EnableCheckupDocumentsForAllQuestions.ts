import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableCheckupDocumentsForAllQuestions1770001300000 implements MigrationInterface {
  name = 'EnableCheckupDocumentsForAllQuestions1770001300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE checkup_questions
      SET accettaDocumenti = 1
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_questions
      MODIFY accettaDocumenti TINYINT NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_questions
      MODIFY accettaDocumenti TINYINT NOT NULL DEFAULT 0
    `);
  }
}
