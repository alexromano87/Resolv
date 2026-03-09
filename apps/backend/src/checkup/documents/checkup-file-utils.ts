import * as fs from 'fs';

/**
 * Number of bytes to sample when checking text files for binary content.
 * 8 KB is enough to catch most binary blobs disguised as text.
 */
const TEXT_SAMPLE_BYTES = 8192;

/**
 * Maximum fraction of non-printable control bytes tolerated in a text file.
 * Values above this threshold indicate binary content.
 * We allow up to 3% to tolerate exotic but valid UTF-8 sequences.
 */
const MAX_BINARY_BYTE_RATIO = 0.03;

/**
 * Maps declared MIME types to their expected magic byte signatures.
 * Each entry is an array of possible valid signatures for that MIME type.
 *
 * We read only the first 8 bytes — sufficient for all supported formats.
 * text/csv and text/plain use a dedicated binary-content check (see below).
 */
const MAGIC_BYTE_MAP: Record<string, Array<number[]> | null> = {
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

  // CSV / plain text: null = use binary-content heuristic check instead
  'text/csv': null,
  'text/plain': null,
};

function startsWith(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

/**
 * Checks whether a file declared as text (CSV or plain text) actually contains
 * printable text data, rejecting binary files that were renamed with a .csv/.txt extension.
 *
 * We read up to TEXT_SAMPLE_BYTES bytes and count bytes that are:
 *   - null (0x00) — always binary
 *   - C0 control codes (0x01–0x08, 0x0B, 0x0C, 0x0E–0x1F) — not expected in text
 *
 * Legitimate tabs (0x09), newlines (0x0A), carriage returns (0x0D),
 * DEL (0x7F), and all high-byte UTF-8 sequences are allowed.
 *
 * @returns `true` if the file appears to be text, `false` if it looks binary.
 */
async function isTextContent(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(TEXT_SAMPLE_BYTES);
      const bytesRead = fs.readSync(fd, buffer, 0, TEXT_SAMPLE_BYTES, 0);

      if (bytesRead === 0) {
        resolve(true); // empty file is fine
        return;
      }

      let binaryCount = 0;
      for (let i = 0; i < bytesRead; i++) {
        const b = buffer[i];
        // Strict binary indicators: null byte or non-printable C0 controls
        // (excluding HT=0x09, LF=0x0A, CR=0x0D which are valid in text)
        if (b === 0x00 || (b < 0x09) || (b === 0x0B) || (b === 0x0C) || (b >= 0x0E && b <= 0x1F)) {
          binaryCount++;
        }
      }

      const ratio = binaryCount / bytesRead;
      resolve(ratio <= MAX_BINARY_BYTE_RATIO);
    } catch {
      resolve(false);
    } finally {
      fs.closeSync(fd);
    }
  });
}

/**
 * Validates that the actual file content (magic bytes / content heuristics)
 * matches the declared MIME type.
 *
 * @returns `true` if the file content is consistent with the declared MIME type.
 *          `false` if the content does NOT match — caller should delete the file and reject.
 */
export async function validateMagicBytes(filePath: string, declaredMime: string): Promise<boolean> {
  const signatures = MAGIC_BYTE_MAP[declaredMime];

  // Unknown MIME type → reject by default (not in allowlist)
  if (signatures === undefined) return false;

  // text/csv and text/plain: use binary-content heuristic instead of magic bytes
  if (signatures === null) return isTextContent(filePath);

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
