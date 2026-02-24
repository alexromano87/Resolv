import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupFieldAllowDocuments1773000600000 implements MigrationInterface {
  name = 'AddCheckupFieldAllowDocuments1773000600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('checkup_question_fields', 'allowDocuments');
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_fields
        ADD COLUMN allowDocuments TINYINT(1) NOT NULL DEFAULT 1
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('checkup_question_fields', 'allowDocuments');
    if (hasColumn) {
      await queryRunner.query(`
        ALTER TABLE checkup_question_fields
        DROP COLUMN allowDocuments
      `);
    }
  }
}
