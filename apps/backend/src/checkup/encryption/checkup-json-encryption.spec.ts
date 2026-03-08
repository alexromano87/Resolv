import { createEncryptedJsonTransformer } from './checkup-json-encryption';

describe('createEncryptedJsonTransformer', () => {
  const originalKey = process.env.CHECKUP_BACKUP_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.CHECKUP_BACKUP_ENCRYPTION_KEY = originalKey;
  });

  it('serializza e deserializza un oggetto in plaintext se la chiave non è configurata', () => {
    delete process.env.CHECKUP_BACKUP_ENCRYPTION_KEY;
    const transformer = createEncryptedJsonTransformer<Record<string, string>>();
    const payload = { a: '1', b: '2' };

    const stored = transformer.to(payload);
    expect(stored).toBe(JSON.stringify(payload));
    expect(transformer.from(stored)).toEqual(payload);
  });

  it('serializza e deserializza un oggetto cifrato se la chiave è configurata', () => {
    process.env.CHECKUP_BACKUP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const transformer = createEncryptedJsonTransformer<Record<string, string>>();
    const payload = { alpha: 'beta' };

    const stored = transformer.to(payload);
    expect(stored).not.toBe(JSON.stringify(payload));
    expect(transformer.from(stored)).toEqual(payload);
  });
});
