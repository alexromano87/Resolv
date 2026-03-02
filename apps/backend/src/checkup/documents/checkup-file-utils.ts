import * as fs from 'fs';

/**
 * Maps declared MIME types to their expected magic byte signatures.
 * Each entry is an array of possible valid signatures for that MIME type.
 *
 * We read only the first 8 bytes — sufficient for all supported formats.
 */
const MAGIC_BYTE_MAP: Record<string, Array<number[]>> = {
  // PDF: %PDF
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],

  // Office Open XML (docx, xlsx, pptx) and legacy ZIP-based: PK header
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B]],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B]],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [[0x50, 0x4B]],

  // Legacy Office (doc, xls, ppt): Compound Document header D0 CF 11 E0
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]],
  'application/vnd.ms-excel': [[0xD0, 0xCF, 0x11, 0xE0]],
  'application/vnd.ms-powerpoint': [[0xD0, 0xCF, 0x11, 0xE0]],

  // JPEG: FF D8 FF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],

  // GIF: GIF87a or GIF89a
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],

  // XML: <?xml or BOM + <?xml
  'application/xml': [
    [0x3C, 0x3F, 0x78, 0x6D, 0x6C], // <?xml (UTF-8)
    [0xEF, 0xBB, 0xBF],              // UTF-8 BOM
    [0xFE, 0xFF],                    // UTF-16 BE BOM
    [0xFF, 0xFE],                    // UTF-16 LE BOM
  ],
  'text/xml': [
    [0x3C, 0x3F, 0x78, 0x6D, 0x6C],
    [0xEF, 0xBB, 0xBF],
    [0xFE, 0xFF],
    [0xFF, 0xFE],
  ],

  // CSV / plain text: no magic bytes — accepted on MIME trust
  'text/csv': [],
  'text/plain': [],
};

function startsWith(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

/**
 * Validates that the actual file content (magic bytes) matches the declared MIME type.
 *
 * @returns `true` if the file content is consistent with the declared MIME type.
 *          `false` if the content does NOT match — caller should delete the file and reject.
 */
export async function validateMagicBytes(filePath: string, declaredMime: string): Promise<boolean> {
  const signatures = MAGIC_BYTE_MAP[declaredMime];

  // Unknown MIME type → reject by default (not in allowlist)
  if (signatures === undefined) return false;

  // MIME types with no magic bytes (CSV, plain text) → accept on MIME declaration
  if (signatures.length === 0) return true;

  const HEADER_SIZE = 8;
  const buffer = Buffer.alloc(HEADER_SIZE);

  return new Promise((resolve) => {
    const fd = fs.openSync(filePath, 'r');
    try {
      const bytesRead = fs.readSync(fd, buffer, 0, HEADER_SIZE, 0);
      if (bytesRead < 2) {
        resolve(false); // file too small
        return;
      }
      const valid = signatures.some((sig) => startsWith(buffer, sig));
      resolve(valid);
    } catch {
      resolve(false);
    } finally {
      fs.closeSync(fd);
    }
  });
}
