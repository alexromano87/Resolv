/**
 * AES-256-GCM field-level encryption for sensitive pre-assessment data.
 *
 * Uses CHECKUP_BACKUP_ENCRYPTION_KEY (64 hex chars = 32 bytes) from env.
 *
 * [L-01] La chiave è OBBLIGATORIA in produzione. Se assente o malformata il
 * modulo lancia un errore al bootstrap (fail-fast) per evitare che dati
 * sensibili vengano scritti in chiaro nel DB senza che nessuno se ne accorga.
 *
 * [I-01] Key-versioning: il wire format include un identificatore di versione
 * per supportare la rotazione della chiave senza re-encryption sincrona.
 *
 *   Wire format (nuovo): "v{KID}:" + Base64(IV[16] | AuthTag[16] | Ciphertext)
 *   Wire format (legacy):           Base64(IV[16] | AuthTag[16] | Ciphertext)
 *
 * Come ruotare la chiave:
 *   1. Impostare CHECKUP_BACKUP_ENCRYPTION_KEY_PREV = valore attuale della chiave
 *   2. Impostare CHECKUP_BACKUP_ENCRYPTION_KEY      = nuova chiave (64 hex char)
 *   3. Aumentare CHECKUP_BACKUP_ENCRYPTION_KEY_VERSION di 1
 *   I dati esistenti vengono decifrati con la chiave precedente; i nuovi con quella corrente.
 */
import * as crypto from 'crypto';

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

interface KeyEntry {
  id: string;
  key: Buffer;
}

interface KeyConfig {
  current: KeyEntry;
  previous: KeyEntry | null;
}

/** Cache lazy della configurazione chiavi (undefined = non ancora inizializzata). */
let _keyConfig: KeyConfig | null | undefined = undefined;

function loadKeyConfig(): KeyConfig | null {
  const hex = process.env.CHECKUP_BACKUP_ENCRYPTION_KEY;
  const version = process.env.CHECKUP_BACKUP_ENCRYPTION_KEY_VERSION || '1';
  const hexPrev = process.env.CHECKUP_BACKUP_ENCRYPTION_KEY_PREV;

  if (!hex) {
    // [L-01] In produzione la chiave è obbligatoria — fail-fast
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: CHECKUP_BACKUP_ENCRYPTION_KEY non impostata. ' +
        'I dati pre-assessment non possono essere cifrati in produzione. Avvio interrotto.',
      );
    }
    // In sviluppo/test: warning visibile + modalità plaintext
    console.warn(
      '\n[checkup-field-encryption] ⚠️  ATTENZIONE: CHECKUP_BACKUP_ENCRYPTION_KEY non configurata.\n' +
      '  I campi sensibili vengono salvati in CHIARO nel database.\n' +
      '  Questa modalità è consentita SOLO in sviluppo/test. Configurare la variabile prima del deploy.\n',
    );
    return null;
  }

  if (hex.length !== 64) {
    throw new Error(
      `FATAL: CHECKUP_BACKUP_ENCRYPTION_KEY deve essere esattamente 64 caratteri esadecimali (32 byte). ` +
      `Lunghezza attuale: ${hex.length}.`,
    );
  }

  const current: KeyEntry = { id: version, key: Buffer.from(hex, 'hex') };

  let previous: KeyEntry | null = null;
  if (hexPrev) {
    if (hexPrev.length !== 64) {
      throw new Error(
        'FATAL: CHECKUP_BACKUP_ENCRYPTION_KEY_PREV deve essere esattamente 64 caratteri esadecimali.',
      );
    }
    // La versione precedente è sempre current-1
    const prevVersion = String(Math.max(0, Number(version) - 1));
    previous = { id: prevVersion, key: Buffer.from(hexPrev, 'hex') };
  }

  return { current, previous };
}

/** Restituisce la configurazione chiavi con lazy-init + caching per evitare letture ripetute dell'env. */
function getKeyConfig(): KeyConfig | null {
  if (_keyConfig === undefined) {
    _keyConfig = loadKeyConfig();
  }
  return _keyConfig;
}

/** [I-01] Cifra plaintext con la chiave corrente. Wire format: "v{kid}:{base64}". */
export function encryptField(plaintext: string): string {
  const config = getKeyConfig();
  // [L-01] Nessuna chiave configurata (solo dev/test) → plaintext pass-through
  if (!config) return plaintext;

  const { id: kid, key } = config.current;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64');
  // [I-01] Prefisso versione per supportare future rotazioni di chiave
  return `v${kid}:${payload}`;
}

/** [I-01] Decifra ciphertext — supporta sia il nuovo formato versionato che il legacy. */
export function decryptField(ciphertext: string): string {
  const config = getKeyConfig();

  // ── Formato versionato: "v{kid}:{base64}" ────────────────────────────────
  const versionedMatch = /^v(\d+):(.+)$/.exec(ciphertext);
  if (versionedMatch) {
    const kid = versionedMatch[1];
    const payload = versionedMatch[2];

    if (!config) {
      throw new Error(
        'Impossibile decifrare: CHECKUP_BACKUP_ENCRYPTION_KEY non configurata.',
      );
    }

    // Seleziona la chiave corretta in base al kid
    let keyBuf: Buffer;
    if (kid === config.current.id) {
      keyBuf = config.current.key;
    } else if (config.previous && kid === config.previous.id) {
      keyBuf = config.previous.key;
    } else {
      throw new Error(
        `Chiave di versione "${kid}" non trovata. ` +
        `Verificare CHECKUP_BACKUP_ENCRYPTION_KEY_PREV e CHECKUP_BACKUP_ENCRYPTION_KEY_VERSION.`,
      );
    }

    return decryptPayload(payload, keyBuf);
  }

  // ── Formato legacy (dati precedenti all'introduzione del versioning) ──────
  // [I-01] Backward compatibility: decifra con la chiave corrente
  if (!config) return ciphertext; // plaintext pass-through (dev/test senza chiave)
  return decryptPayload(ciphertext, config.current.key);
}

/** Decifra un payload Base64 raw (IV | AuthTag | Ciphertext) con la chiave fornita. */
function decryptPayload(base64Payload: string, key: Buffer): string {
  const buf = Buffer.from(base64Payload, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Lunghezza ciphertext non valida (troppo corto).');
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
