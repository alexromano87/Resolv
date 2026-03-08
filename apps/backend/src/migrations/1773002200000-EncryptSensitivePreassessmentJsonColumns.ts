import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

type Row = {
  id: string;
  data: unknown;
  notes: unknown;
  fieldNotes: unknown;
  userFieldNotes: unknown;
  naFields: unknown;
  macroValidations: unknown;
  sectionValidations: unknown;
  fieldMeta: unknown;
  finalValidation: unknown;
};

const JSON_COLUMNS = [
  'data',
  'notes',
  'fieldNotes',
  'userFieldNotes',
  'naFields',
  'macroValidations',
  'sectionValidations',
  'fieldMeta',
  'finalValidation',
] as const;

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const hex = process.env.CHECKUP_BACKUP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, 'hex');
}

function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptField(ciphertext: string): string {
  const key = getEncryptionKey();
  if (!key) return ciphertext;

  const buf = Buffer.from(ciphertext, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext length');
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

function normalizeJsonPayload(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value !== 'string') return JSON.stringify(value);

  try {
    const decrypted = decryptField(value);
    JSON.parse(decrypted);
    return value;
  } catch {
    // value is not an encrypted JSON payload, continue
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      try {
        const decrypted = decryptField(parsed);
        JSON.parse(decrypted);
        return parsed;
      } catch {
        return JSON.stringify(parsed);
      }
    }
    return JSON.stringify(parsed);
  } catch {
    return JSON.stringify(value);
  }
}

function isAlreadyEncrypted(value: string): boolean {
  try {
    const decrypted = decryptField(value);
    JSON.parse(decrypted);
    return true;
  } catch {
    return false;
  }
}

export class EncryptSensitivePreassessmentJsonColumns1773002200000 implements MigrationInterface {
  name = 'EncryptSensitivePreassessmentJsonColumns1773002200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      `SELECT id, data, notes, fieldNotes, userFieldNotes, naFields, macroValidations, sectionValidations, fieldMeta, finalValidation FROM checkup_preassessments`,
    ) as Row[];

    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      MODIFY data longtext NULL,
      MODIFY notes longtext NULL,
      MODIFY fieldNotes longtext NULL,
      MODIFY userFieldNotes longtext NULL,
      MODIFY naFields longtext NULL,
      MODIFY macroValidations longtext NULL,
      MODIFY sectionValidations longtext NULL,
      MODIFY fieldMeta longtext NULL,
      MODIFY finalValidation longtext NULL
    `);

    for (const row of rows) {
      const updates: string[] = [];
      const params: Array<string | null> = [];

      for (const column of JSON_COLUMNS) {
        const normalized = normalizeJsonPayload(row[column]);
        const nextValue = normalized == null
          ? null
          : isAlreadyEncrypted(normalized)
            ? normalized
            : encryptField(normalized);
        updates.push(`\`${column}\` = ?`);
        params.push(nextValue);
      }

      params.push(row.id);
      await queryRunner.query(
        `UPDATE checkup_preassessments SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      `SELECT id, data, notes, fieldNotes, userFieldNotes, naFields, macroValidations, sectionValidations, fieldMeta, finalValidation FROM checkup_preassessments`,
    ) as Row[];

    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      MODIFY data json NULL,
      MODIFY notes json NULL,
      MODIFY fieldNotes json NULL,
      MODIFY userFieldNotes json NULL,
      MODIFY naFields json NULL,
      MODIFY macroValidations json NULL,
      MODIFY sectionValidations json NULL,
      MODIFY fieldMeta json NULL,
      MODIFY finalValidation json NULL
    `);

    for (const row of rows) {
      const setClauses: string[] = [];
      const params: Array<string | null> = [];

      for (const column of JSON_COLUMNS) {
        const current = row[column];
        if (current == null) {
          setClauses.push(`\`${column}\` = NULL`);
          continue;
        }
        let jsonText = normalizeJsonPayload(current);
        if (jsonText && isAlreadyEncrypted(jsonText)) {
          jsonText = decryptField(jsonText);
        }
        setClauses.push(`\`${column}\` = CAST(? AS JSON)`);
        params.push(jsonText);
      }

      params.push(row.id);
      await queryRunner.query(
        `UPDATE checkup_preassessments SET ${setClauses.join(', ')} WHERE id = ?`,
        params,
      );
    }
  }
}
