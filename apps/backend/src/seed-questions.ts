import { DataSource } from 'typeorm';
import { QuestionMacroArea } from './checkup/entities/question-macro-area.entity';
import { QuestionSection } from './checkup/entities/question-section.entity';
import { QuestionField } from './checkup/entities/question-field.entity';

// Import data - copy from preassessment.ts
import * as fs from 'fs';
import * as path from 'path';

async function seed() {
  // Read preassessment.ts file
  const preassessmentPath = path.join(__dirname, '../../checkup-frontend/src/data/preassessment.ts');
  const content = fs.readFileSync(preassessmentPath, 'utf-8');

  // Extract MACRO_AREAS
  const macroAreasMatch = content.match(/export const MACRO_AREAS[^=]*=\s*(\[[^\]]+\]);/s);
  if (!macroAreasMatch) {
    throw new Error('Could not find MACRO_AREAS');
  }

  const MACRO_AREAS = eval(macroAreasMatch[1]);

  // Extract SECTIONS - find the array
  const sectionsMatch = content.match(/export const SECTIONS[^=]*=\s*(\[[\s\S]+?\n\];)/);
  if (!sectionsMatch) {
    throw new Error('Could not find SECTIONS');
  }

  const SECTIONS = eval(sectionsMatch[1]);

  console.log(`Found ${MACRO_AREAS.length} macro areas and ${SECTIONS.length} sections`);

  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    username: process.env.DB_USER || 'rc_user',
    password: process.env.DB_PASSWORD || 'rc_pass',
    database: process.env.DB_NAME || 'resolv',
    entities: [QuestionMacroArea, QuestionSection, QuestionField],
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    console.log('🌱 Starting seed...\n');

    // Clear existing data
    await dataSource.query('DELETE FROM checkup_question_fields');
    await dataSource.query('DELETE FROM checkup_question_sections');
    await dataSource.query('DELETE FROM checkup_question_macro_areas');
    console.log('✅ Cleared existing data');

    // Seed Macro Areas
    const macroAreaRepo = dataSource.getRepository(QuestionMacroArea);
    const macroAreaMap = new Map<string, QuestionMacroArea>();

    for (let i = 0; i < MACRO_AREAS.length; i++) {
      const macro = MACRO_AREAS[i];
      const entity = macroAreaRepo.create({
        code: macro.id,
        label: macro.label,
        color: macro.color,
        sortOrder: i,
      });
      const saved = await macroAreaRepo.save(entity);
      macroAreaMap.set(macro.id, saved);
    }
    console.log(`✅ Seeded ${MACRO_AREAS.length} macro areas`);

    // Seed Sections
    const sectionRepo = dataSource.getRepository(QuestionSection);
    const sectionMap = new Map<string, QuestionSection>();

    for (let i = 0; i < SECTIONS.length; i++) {
      const section = SECTIONS[i];
      const macroArea = macroAreaMap.get(section.macro);
      if (!macroArea) {
        console.error(`❌ Macro area not found for section: ${section.id}`);
        continue;
      }

      const entity = sectionRepo.create({
        code: section.id,
        title: section.title,
        description: section.description || '',
        macroAreaId: macroArea.id,
        sortOrder: i,
      });
      const saved = await sectionRepo.save(entity);
      sectionMap.set(section.id, saved);
    }
    console.log(`✅ Seeded ${SECTIONS.length} sections`);

    // Seed Fields
    const fieldRepo = dataSource.getRepository(QuestionField);
    let totalFields = 0;

    for (const section of SECTIONS) {
      const sectionEntity = sectionMap.get(section.id);
      if (!sectionEntity) {
        console.error(`❌ Section not found: ${section.id}`);
        continue;
      }

      for (let i = 0; i < section.fields.length; i++) {
        const field = section.fields[i];
        const entity = fieldRepo.create({
          fieldId: field.id,
          label: field.label,
          type: field.type,
          options: field.options || null,
          required: field.required || false,
          help: field.help || null,
          sectionId: sectionEntity.id,
          sortOrder: i,
        });
        await fieldRepo.save(entity);
        totalFields++;
      }
    }
    console.log(`✅ Seeded ${totalFields} fields`);

    console.log('\n✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
