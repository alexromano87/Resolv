#!/usr/bin/env node
/**
 * Script to generate a TypeORM migration from preassessment.ts data
 *
 * Usage: node scripts/generate-questions-migration.js
 */

const fs = require('fs');
const path = require('path');

// Read and parse the preassessment.ts file
const preassessmentPath = path.join(__dirname, '../apps/checkup-frontend/src/data/preassessment.ts');
const content = fs.readFileSync(preassessmentPath, 'utf-8');

// Extract MACRO_AREAS
const macroAreasMatch = content.match(/export const MACRO_AREAS[^=]*=\s*(\[[^\]]+\])/s);
if (!macroAreasMatch) {
  console.error('Could not find MACRO_AREAS in preassessment.ts');
  process.exit(1);
}

// Extract SECTIONS - need to find the full array
const sectionsStart = content.indexOf('export const SECTIONS');
const sectionsArrayStart = content.indexOf('[', sectionsStart);
let bracketCount = 0;
let sectionsArrayEnd = sectionsArrayStart;
let inString = false;
let stringChar = null;

for (let i = sectionsArrayStart; i < content.length; i++) {
  const char = content[i];
  const prevChar = i > 0 ? content[i - 1] : '';

  // Handle string boundaries
  if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
    if (!inString) {
      inString = true;
      stringChar = char;
    } else if (char === stringChar) {
      inString = false;
      stringChar = null;
    }
  }

  if (!inString) {
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;

    if (bracketCount === 0 && char === ']') {
      sectionsArrayEnd = i + 1;
      break;
    }
  }
}

const sectionsText = content.substring(sectionsArrayStart, sectionsArrayEnd);

// Parse using eval (safe since we control the source)
let MACRO_AREAS, SECTIONS;
try {
  eval('MACRO_AREAS = ' + macroAreasMatch[1]);
  eval('SECTIONS = ' + sectionsText);
} catch (err) {
  console.error('Error parsing data:', err);
  process.exit(1);
}

// Generate timestamp for migration filename
const timestamp = Date.now();
const migrationName = `SeedQuestionData${timestamp}`;
const migrationFilename = `${timestamp}-SeedQuestionData.ts`;

// Helper to escape strings for SQL
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

// Generate migration content
const migrationContent = `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${migrationName} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Macro Areas
${MACRO_AREAS.map((macro, idx) => `    await queryRunner.query(\`
      INSERT INTO checkup_question_macro_areas (id, code, label, color, sortOrder, createdAt, updatedAt)
      VALUES (${idx + 1}, ${escapeSql(macro.id)}, ${escapeSql(macro.label)}, ${escapeSql(macro.color)}, ${idx}, NOW(), NOW())
    \`);`).join('\n')}

    // Insert Sections
${SECTIONS.map((section, idx) => {
  const macroIndex = MACRO_AREAS.findIndex(m => m.id === section.macro) + 1;
  return `    await queryRunner.query(\`
      INSERT INTO checkup_question_sections (id, code, title, description, macroAreaId, sortOrder, createdAt, updatedAt)
      VALUES (${idx + 1}, ${escapeSql(section.id)}, ${escapeSql(section.title)}, ${escapeSql(section.description || '')}, ${macroIndex}, ${idx}, NOW(), NOW())
    \`);`;
}).join('\n')}

    // Insert Fields
${SECTIONS.flatMap((section, sectionIdx) => {
  return section.fields.map((field, fieldIdx) => {
    const options = field.options ? JSON.stringify(field.options).replace(/"/g, '\\"') : null;
    return `    await queryRunner.query(\`
      INSERT INTO checkup_question_fields (fieldId, label, type, options, required, help, sectionId, sortOrder, createdAt, updatedAt)
      VALUES (${escapeSql(field.id)}, ${escapeSql(field.label)}, ${escapeSql(field.type)}, ${options ? "'" + options + "'" : 'NULL'}, ${field.required ? 1 : 0}, ${escapeSql(field.help || null)}, ${sectionIdx + 1}, ${fieldIdx}, NOW(), NOW())
    \`);`;
  });
}).join('\n')}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(\`DELETE FROM checkup_question_fields\`);
    await queryRunner.query(\`DELETE FROM checkup_question_sections\`);
    await queryRunner.query(\`DELETE FROM checkup_question_macro_areas\`);
  }
}
`;

// Write migration file
const migrationsDir = path.join(__dirname, '../apps/backend/src/migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const migrationPath = path.join(migrationsDir, migrationFilename);
fs.writeFileSync(migrationPath, migrationContent);

console.log(`✅ Migration generated successfully:`);
console.log(`   ${migrationPath}`);
console.log(``);
console.log(`📊 Stats:`);
console.log(`   - Macro Areas: ${MACRO_AREAS.length}`);
console.log(`   - Sections: ${SECTIONS.length}`);
console.log(`   - Fields: ${SECTIONS.reduce((sum, s) => sum + s.fields.length, 0)}`);
console.log(``);
console.log(`To run the migration:`);
console.log(`   npm run migration:run --prefix apps/backend`);
