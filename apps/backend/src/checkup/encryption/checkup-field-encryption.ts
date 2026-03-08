/**
 * AES-256-GCM field-level encryption for sensitive pre-assessment data.
 *
 * Uses CHECKUP_BACKUP_ENCRYPTION_KEY (64 hex chars = 32 bytes) from env.
 * If the key is absent or invalid, data is stored in plaintext (opt-in encryption).
 *
 * Wire format (Base64): IV(16 bytes) | AuthTag(16 bytes) | Ciphertext
 */
import * as crypto from 'crypto';

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const hex = process.env.CHECKUP_BACKUP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, 'hex');
}

export function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext; // encryption disabled — store plaintext

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptField(ciphertext: string): string {
  const key = getEncryptionKey();
  if (!key) return ciphertext; // encryption disabled

  const buf = Buffer.from(ciphertext, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) throw new Error('Invalid ciphertext length');

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
