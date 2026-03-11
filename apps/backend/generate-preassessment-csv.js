/**
 * Script per generare l'export CSV del Pre-Assessment dal database.
 * Eseguire con: node generate-preassessment-csv.js
 *
 * Output: due file CSV sul Desktop
 *   - pre_assessment_export_YYYY-MM-DD.csv   → dati preassessment (un record per riga)
 *   - pre_assessment_opzioni_YYYY-MM-DD.csv  → opzioni disponibili per i campi select/multiselect
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── Configurazione ─────────────────────────────────────────────────────────
const DB = {
  host: '127.0.0.1',
  port: 3307,
  user: 'rc_user',
  password: 'rc_pass',
  database: 'resolv',
};
const ENCRYPTION_KEY = '51097fdaaa252b44c305f77ecc89afbab2e2161be91a92235ca520bb5ad43e39';
const DATE_STR = new Date().toISOString().slice(0, 10);
const OUTPUT_DATA    = path.join(os.homedir(), 'Desktop', `pre_assessment_export_${DATE_STR}.csv`);
const OUTPUT_OPTIONS = path.join(os.homedir(), 'Desktop', `pre_assessment_opzioni_${DATE_STR}.csv`);

// ─── Decryption (AES-256-GCM) ────────────────────────────────────────────────
const KEY_BUF = Buffer.from(ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

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

function parseEncryptedJson(raw) {
  if (!raw) return {};
  try { return JSON.parse(decryptField(raw)); }
  catch { try { return JSON.parse(raw); } catch { return {}; } }
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────
/**
 * Esegue l'escaping di un valore per CSV RFC 4180:
 * - racchiude tra virgolette se contiene virgola, virgolette o newline
 * - raddoppia le virgolette interne
 */
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Converte un array di valori in una riga CSV. */
function toCsvRow(values) {
  return values.map(csvEscape).join(',');
}

/** Formatta una data in formato italiano. */
function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Connessione al database...');
  const conn = await mysql.createConnection(DB);

  try {
    // 1. Modello
    const [models] = await conn.execute(
      `SELECT id, code, label FROM checkup_question_models WHERE status = 'published' LIMIT 1`
    );
    let modelId;
    if (models.length > 0) {
      modelId = models[0].id;
      console.log(`Modello trovato: ${models[0].label} (${models[0].code})`);
    } else {
      const [all] = await conn.execute(
        `SELECT id, code, label FROM checkup_question_models ORDER BY createdAt ASC LIMIT 1`
      );
      if (all.length === 0) throw new Error('Nessun modello trovato nel database');
      modelId = all[0].id;
      console.log(`Modello (fallback): ${all[0].label} (${all[0].code})`);
    }

    // 2. Struttura del modello con opzioni
    const [macroAreas] = await conn.execute(
      `SELECT id, code, label FROM checkup_question_macro_areas WHERE modelId = ? ORDER BY sortOrder ASC`,
      [modelId]
    );

    const fieldColumns = [];
    for (const macro of macroAreas) {
      const [sections] = await conn.execute(
        `SELECT id, code, title FROM checkup_question_sections WHERE macroAreaId = ? ORDER BY sortOrder ASC`,
        [macro.id]
      );
      for (const section of sections) {
        const [fields] = await conn.execute(
          `SELECT fieldId, label, type, options FROM checkup_question_fields WHERE sectionId = ? ORDER BY sortOrder ASC`,
          [section.id]
        );
        for (const field of fields) {
          let options = null;
          if (Array.isArray(field.options)) {
            options = field.options;
          } else if (field.options) {
            try { options = JSON.parse(field.options); } catch { /* skip */ }
          }
          fieldColumns.push({
            fieldId:      field.fieldId,
            label:        field.label,
            type:         field.type,
            options:      Array.isArray(options) ? options : null,
            macroLabel:   macro.label,
            macroCode:    macro.code,
            sectionTitle: section.title,
            sectionCode:  section.code,
          });
        }
      }
    }
    console.log(`Struttura modello: ${macroAreas.length} macro aree, ${fieldColumns.length} campi`);

    // 3. Preassessment
    const [preassessments] = await conn.execute(
      `SELECT p.id, p.clientId, p.status, p.version, p.studioCanEdit, p.data, p.naFields,
              p.finalValidation, p.completedAt, p.createdAt, p.updatedAt
       FROM checkup_preassessments p
       WHERE p.isLatest = 1 AND p.deletedAt IS NULL
       ORDER BY p.createdAt ASC`
    );
    console.log(`Preassessment trovate: ${preassessments.length}`);

    // 4. Clienti
    const clientIds = [...new Set(preassessments.map(p => p.clientId))];
    const clientMap = new Map();
    if (clientIds.length > 0) {
      const placeholders = clientIds.map(() => '?').join(',');
      const [clients] = await conn.execute(
        `SELECT id, nome, ragioneSociale, partitaIva, codiceFiscale, citta, provincia, email, telefono
         FROM checkup_clients WHERE id IN (${placeholders})`,
        clientIds
      );
      clients.forEach(c => clientMap.set(c.id, c));
    }

    // ─── 5. CSV principale ────────────────────────────────────────────────────
    const lines = [];

    // BOM UTF-8 per compatibilità con Excel su Windows
    const BOM = '\uFEFF';

    // Riga di intestazione: metadati + "MacroArea > Sezione > Etichetta" per ogni campo
    const metaHeaders = [
      'ID Preassessment', 'Ragione Sociale', 'Denominazione', 'P.IVA', 'Codice Fiscale',
      'Città', 'Provincia', 'Email', 'Telefono',
      'Stato', 'Versione', 'Studio Può Modificare',
      'Validazione Finale Da', 'Data Validazione Finale',
      'Data Creazione', 'Data Completamento', 'Ultima Modifica',
    ];

    const fieldHeaders = fieldColumns.map(fc => {
      // Header composto per mantenere la gerarchia nel CSV
      const suffix = fc.type === 'select' ? ' [select]' : fc.type === 'multiselect' ? ' [multiselect]' : '';
      return `${fc.macroLabel} > ${fc.sectionTitle} > ${fc.label}${suffix}`;
    });

    lines.push(toCsvRow([...metaHeaders, ...fieldHeaders]));

    // Righe dati
    for (const pre of preassessments) {
      const client = clientMap.get(pre.clientId) || {};
      const data = parseEncryptedJson(pre.data);
      const naFields = parseEncryptedJson(pre.naFields);
      let fv = null;
      try { fv = parseEncryptedJson(pre.finalValidation); } catch {}

      const row = [
        pre.id,
        client.ragioneSociale || '',
        client.nome || '',
        client.partitaIva || '',
        client.codiceFiscale || '',
        client.citta || '',
        client.provincia || '',
        client.email || '',
        client.telefono || '',
        pre.status === 'concluso' ? 'Concluso' : 'In corso',
        pre.version,
        pre.studioCanEdit ? 'Sì' : 'No',
        fv?.by?.name || '',
        fv?.at ? formatDate(new Date(fv.at)) : '',
        pre.createdAt ? formatDate(new Date(pre.createdAt)) : '',
        pre.completedAt ? formatDate(new Date(pre.completedAt)) : '',
        pre.updatedAt ? formatDate(new Date(pre.updatedAt)) : '',
      ];

      for (const fc of fieldColumns) {
        if (naFields[fc.fieldId]) {
          row.push('N/A');
        } else {
          const val = data[fc.fieldId];
          if (val === undefined || val === null || val === '') {
            row.push('');
          } else if (Array.isArray(val)) {
            row.push(val.join('; '));   // punto e virgola per i multiselect (evita conflitti col separatore CSV)
          } else {
            row.push(String(val));
          }
        }
      }

      lines.push(toCsvRow(row));
    }

    fs.writeFileSync(OUTPUT_DATA, BOM + lines.join('\r\n'), 'utf8');
    console.log(`\n✅ CSV dati salvato: ${OUTPUT_DATA}`);
    console.log(`   Righe dati: ${preassessments.length}`);
    console.log(`   Colonne: ${metaHeaders.length + fieldColumns.length}`);

    // ─── 6. CSV opzioni ───────────────────────────────────────────────────────
    // Secondo file con le opzioni disponibili per ogni campo select/multiselect
    const optLines = [];
    optLines.push(toCsvRow(['Macro Area', 'Codice Macro', 'Sezione', 'Codice Sezione', 'Field ID', 'Etichetta Campo', 'Tipo', 'Opzione']));

    let optCount = 0;
    for (const fc of fieldColumns) {
      if (!fc.options || fc.options.length === 0) continue;
      for (const opt of fc.options) {
        optLines.push(toCsvRow([
          fc.macroLabel, fc.macroCode,
          fc.sectionTitle, fc.sectionCode,
          fc.fieldId, fc.label, fc.type,
          opt,
        ]));
        optCount++;
      }
    }

    fs.writeFileSync(OUTPUT_OPTIONS, BOM + optLines.join('\r\n'), 'utf8');
    console.log(`\n✅ CSV opzioni salvato: ${OUTPUT_OPTIONS}`);
    console.log(`   Righe opzioni: ${optCount}`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('Errore:', err.message);
  process.exit(1);
});
