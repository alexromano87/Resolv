import { decryptField, encryptField } from './checkup-field-encryption';

function parseJsonValue<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isEncryptedPayload(value: string): boolean {
  try {
    decryptField(value);
    return true;
  } catch {
    return false;
  }
}

export function createEncryptedJsonTransformer<T>() {
  return {
    to(value: T | null): string | null {
      if (value == null) return null;
      return encryptField(JSON.stringify(value));
    },
    from(value: string | T | null): T | null {
      if (value == null) return null;
      if (typeof value === 'object') return value as T;
      if (typeof value !== 'string') return null;

      if (isEncryptedPayload(value)) {
        return parseJsonValue<T>(decryptField(value));
      }

      return parseJsonValue<T>(value);
    },
  };
}
