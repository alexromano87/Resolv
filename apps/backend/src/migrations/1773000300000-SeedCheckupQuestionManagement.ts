import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

type QuestionData = {
  macroAreas: Array<{ id: string; label: string; color: string }>;
  sections: Array<{
    id: string;
    title: string;
    description?: string;
    macro: string;
    fields: Array<{
      id: string;
      label: string;
      type: string;
      options?: string[] | null;
      required?: boolean;
      help?: string | null;
    }>;
  }>;
};

export class SeedCheckupQuestionManagement1773000300000 implements MigrationInterface {
  name = 'SeedCheckupQuestionManagement1773000300000';

  private loadData(): QuestionData {
    const dataPath = path.join(process.cwd(), 'src', 'checkup', 'data', 'preassessment-questions.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Question data file not found: ${dataPath}`);
    }
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const data = this.loadData();

    await queryRunner.query('DELETE FROM checkup_question_fields');
    await queryRunner.query('DELETE FROM checkup_question_sections');
    await queryRunner.query('DELETE FROM checkup_question_macro_areas');

    for (let i = 0; i < data.macroAreas.length; i++) {
      const macro = data.macroAreas[i];
      await queryRunner.query(
        'INSERT INTO checkup_question_macro_areas (code, label, color, sortOrder) VALUES (?, ?, ?, ?)',
        [macro.id, macro.label, macro.color, i],
      );
    }

    const macroRows: Array<{ id: number; code: string }> = await queryRunner.query(
      'SELECT id, code FROM checkup_question_macro_areas',
    );
    const macroMap = new Map(macroRows.map((row) => [row.code, row.id]));

    for (let i = 0; i < data.sections.length; i++) {
      const section = data.sections[i];
      const macroAreaId = macroMap.get(section.macro);
      if (!macroAreaId) {
        continue;
      }
      await queryRunner.query(
        'INSERT INTO checkup_question_sections (code, title, description, macroAreaId, sortOrder) VALUES (?, ?, ?, ?, ?)',
        [section.id, section.title, section.description || '', macroAreaId, i],
      );
    }

    const sectionRows: Array<{ id: number; code: string }> = await queryRunner.query(
      'SELECT id, code FROM checkup_question_sections',
    );
    const sectionMap = new Map(sectionRows.map((row) => [row.code, row.id]));

    for (const section of data.sections) {
      const sectionId = sectionMap.get(section.id);
      if (!sectionId) continue;
      for (let i = 0; i < section.fields.length; i++) {
        const field = section.fields[i];
        await queryRunner.query(
          'INSERT INTO checkup_question_fields (fieldId, label, type, options, required, help, sectionId, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            field.id,
            field.label,
            field.type,
            field.options ? JSON.stringify(field.options) : null,
            field.required ? 1 : 0,
            field.help || null,
            sectionId,
            i,
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM checkup_question_fields');
    await queryRunner.query('DELETE FROM checkup_question_sections');
    await queryRunner.query('DELETE FROM checkup_question_macro_areas');
  }
}
