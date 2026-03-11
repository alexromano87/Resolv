/**
 * Script per importare un file Excel Pre-Assessment nel database.
 *
 * Uso:
 *   node import-preassessment-excel.js <percorso-file.xlsx> [--dry-run]
 *
 * Opzioni:
 *   --dry-run   Simula l'import senza scrivere nulla nel database
 *
 * Esempio:
 *   node import-preassessment-excel.js ~/Desktop/pre_assessment_export_2026-03-10.xlsx
 *   node import-preassessment-excel.js ~/Desktop/pre_assessment_export_2026-03-10.xlsx --dry-run
 */
const mysql = require('mysql2/promise');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ─── Configurazione ─────────────────────────────────────────────────────────
const DB = {
  host: '127.0.0.1',
  port: 3307,
  user: 'rc_user',
  password: 'rc_pass',
  database: 'resolv',
};
const ENCRYPTION_KEY = '51097fdaaa252b44c305f77ecc89afbab2e2161be91a92235ca520bb5ad43e39';
const KEY_VERSION = '1'; // CHECKUP_BACKUP_ENCRYPTION_KEY_VERSION

// Numero di colonne metadata prima delle colonne campo
const META_COLS = 17;
const SHEET_DATA = 'Pre-Assessment';
const SHEET_LEGEND = 'Legenda Campi';

// ─── Crittografia AES-256-GCM ────────────────────────────────────────────────
const KEY_BUF = Buffer.from(ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function encryptField(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY_BUF, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64');
  return `v${KEY_VERSION}:${payload}`;
}

function decryptField(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  let payload = ciphertext;
  const m = /^v(\d+):(.+)$/.exec(ciphertext);
  if (m) payload = m[2];
  try {
    const buf = Buffer.from(payload, 'base64');
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) return ciphertext;
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const enc = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_BUF, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(enc).toString('utf8') + decipher.final('utf8');
  } catch {
    return ciphertext;
  }
}

function encryptJson(obj) {
  if (obj === null || obj === undefined) return null;
  return encryptField(JSON.stringify(obj));
}

// ─── Estrai testo da cella ExcelJS ───────────────────────────────────────────
function extractCellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return extractCellText(value.result);
    if ('richText' in value) return value.richText.map(r => r.text).join('').trim();
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
  }
  return String(value).trim();
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!filePath) {
    console.error('Uso: node import-preassessment-excel.js <percorso-file.xlsx> [--dry-run]');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath.replace(/^~/, process.env.HOME || ''));
  if (!fs.existsSync(absolutePath)) {
    console.error(`File non trovato: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`📂 File: ${absolutePath}`);
  if (dryRun) console.log('⚠️  Modalità DRY-RUN: nessuna modifica verrà salvata nel database\n');

  // 1. Leggi il workbook
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(absolutePath);

  // 2. Leggi il foglio Legenda per ottenere fieldId in ordine posizionale
  const legendWs = workbook.getWorksheet(SHEET_LEGEND);
  if (!legendWs) {
    console.error(`Foglio "${SHEET_LEGEND}" non trovato nel file.`);
    process.exit(1);
  }

  const fieldIdByPosition = []; // indice 0 = colonna 18 nel foglio dati
  legendWs.eachRow((row, rowNum) => {
    if (rowNum < 2) return;
    const fieldId = extractCellText(row.getCell(5).value);
    if (fieldId) fieldIdByPosition.push(fieldId);
  });

  if (fieldIdByPosition.length === 0) {
    console.error('Foglio Legenda vuoto o malformato.');
    process.exit(1);
  }
  console.log(`📋 Campi nel modello: ${fieldIdByPosition.length}`);

  // 3. Leggi il foglio Pre-Assessment
  const dataWs = workbook.getWorksheet(SHEET_DATA);
  if (!dataWs) {
    console.error(`Foglio "${SHEET_DATA}" non trovato.`);
    process.exit(1);
  }

  // Raccogli tutte le righe dati (da riga 4 in poi)
  const rows = [];
  dataWs.eachRow((row, rowNum) => {
    if (rowNum < 4) return;
    const id = extractCellText(row.getCell(1).value);
    if (id) rows.push({ rowNum, id, row });
  });

  if (rows.length === 0) {
    console.log('Nessuna riga dati trovata (file vuoto o contiene solo intestazioni).');
    process.exit(0);
  }
  console.log(`📊 Righe dati trovate: ${rows.length}\n`);

  // 4. Connessione al DB
  console.log('🔌 Connessione al database...');
  const conn = await mysql.createConnection(DB);

  try {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const { rowNum, id, row } of rows) {
      // Carica la preassessment dal DB
      const [records] = await conn.execute(
        'SELECT id, clientId, data, naFields, status FROM checkup_preassessments WHERE id = ? AND isLatest = 1 AND deletedAt IS NULL',
        [id]
      );

      if (records.length === 0) {
        errors.push({ row: rowNum, id, reason: 'Non trovata nel DB o non è la versione più recente' });
        continue;
      }

      const pre = records[0];

      // Decifratura dati esistenti
      let existingData = {};
      let existingNaFields = {};
      try {
        if (pre.data) existingData = JSON.parse(decryptField(pre.data));
      } catch { /* usa {} */ }
      try {
        if (pre.naFields) existingNaFields = JSON.parse(decryptField(pre.naFields));
      } catch { /* usa {} */ }

      // Costruisce i nuovi oggetti
      const newData = { ...existingData };
      const newNaFields = { ...existingNaFields };
      let changedFields = 0;

      for (let i = 0; i < fieldIdByPosition.length; i++) {
        const fieldId = fieldIdByPosition[i];
        const cellValue = extractCellText(row.getCell(META_COLS + i + 1).value);

        if (cellValue === 'N/A') {
          if (!newNaFields[fieldId]) { newNaFields[fieldId] = true; changedFields++; }
          if (newData[fieldId] !== undefined) { delete newData[fieldId]; changedFields++; }
        } else if (cellValue === '') {
          if (newData[fieldId] !== undefined) { delete newData[fieldId]; changedFields++; }
          if (newNaFields[fieldId]) { delete newNaFields[fieldId]; changedFields++; }
        } else {
          if (newData[fieldId] !== cellValue) { newData[fieldId] = cellValue; changedFields++; }
          if (newNaFields[fieldId]) { delete newNaFields[fieldId]; changedFields++; }
        }
      }

      if (changedFields === 0) {
        console.log(`  ↷ Riga ${rowNum} [${id.slice(0, 8)}...] — nessuna modifica, saltata`);
        skipped++;
        continue;
      }

      // Cifra e salva
      const encData = encryptJson(newData);
      const encNaFields = encryptJson(newNaFields);

      if (!dryRun) {
        await conn.execute(
          'UPDATE checkup_preassessments SET data = ?, naFields = ?, updatedAt = NOW() WHERE id = ?',
          [encData, encNaFields, id]
        );
      }

      console.log(`  ✓ Riga ${rowNum} [${id.slice(0, 8)}...] — ${changedFields} campi aggiornati${dryRun ? ' (dry-run)' : ''}`);
      imported++;
    }

    // ── Riepilogo ────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────');
    console.log(`✅ Importate:  ${imported}`);
    console.log(`⏭  Saltate:    ${skipped}`);
    console.log(`❌ Errori:     ${errors.length}`);
    if (errors.length > 0) {
      console.log('\nDettaglio errori:');
      errors.forEach(e => console.log(`  Riga ${e.row} [${e.id.slice(0,8)}...]: ${e.reason}`));
    }
    if (dryRun) {
      console.log('\n⚠️  DRY-RUN: nessuna modifica è stata salvata nel database.');
    }

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('Errore fatale:', err.message);
  process.exit(1);
});
