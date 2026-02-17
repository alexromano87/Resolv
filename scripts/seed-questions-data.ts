import { DataSource } from 'typeorm';
import { QuestionMacroArea } from '../apps/backend/src/checkup/entities/question-macro-area.entity';
import { QuestionSection } from '../apps/backend/src/checkup/entities/question-section.entity';
import { QuestionField } from '../apps/backend/src/checkup/entities/question-field.entity';
import { MACRO_AREAS, SECTIONS } from '../apps/checkup-frontend/src/data/preassessment';

async function seed() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER || 'rc_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'resolv_checkup',
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
