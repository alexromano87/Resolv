import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { validateMagicBytes } from './checkup-file-utils';

/** Writes a temporary file and returns its path. */
function writeTmpFile(content: Buffer, ext = '.tmp'): string {
  const filePath = path.join(os.tmpdir(), `file-utils-test-${Date.now()}${ext}`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function cleanupFiles(...paths: string[]) {
  paths.forEach((p) => {
    try { fs.unlinkSync(p); } catch { /* ignore */ }
  });
}

describe('validateMagicBytes', () => {
  it('accetta un PDF con magic bytes corretti', async () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF-1.4
    const filePath = writeTmpFile(buf, '.pdf');
    try {
      expect(await validateMagicBytes(filePath, 'application/pdf')).toBe(true);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('rifiuta un file con estensione pdf ma contenuto non-PDF', async () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
    const filePath = writeTmpFile(buf, '.pdf');
    try {
      expect(await validateMagicBytes(filePath, 'application/pdf')).toBe(false);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('accetta un JPEG con magic bytes corretti', async () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    const filePath = writeTmpFile(buf, '.jpg');
    try {
      expect(await validateMagicBytes(filePath, 'image/jpeg')).toBe(true);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('accetta un PNG con magic bytes corretti', async () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const filePath = writeTmpFile(buf, '.png');
    try {
      expect(await validateMagicBytes(filePath, 'image/png')).toBe(true);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('accetta un file Office OpenXML (DOCX/XLSX) con header PK', async () => {
    const buf = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // PK ZIP header
    const filePath = writeTmpFile(buf, '.xlsx');
    try {
      expect(await validateMagicBytes(filePath, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('rifiuta un MIME type sconosciuto', async () => {
    const buf = Buffer.from('hello world');
    const filePath = writeTmpFile(buf, '.xyz');
    try {
      expect(await validateMagicBytes(filePath, 'application/x-unknown')).toBe(false);
    } finally {
      cleanupFiles(filePath);
    }
  });

  // ── text/csv and text/plain — binary content detection ──────────────────

  it('accetta un CSV con contenuto testuale puro', async () => {
    const csvContent = 'nome,cognome,eta\nMario,Rossi,40\nLuigi,Verdi,35\n';
    const filePath = writeTmpFile(Buffer.from(csvContent, 'utf8'), '.csv');
    try {
      expect(await validateMagicBytes(filePath, 'text/csv')).toBe(true);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('accetta un file plain text', async () => {
    const textContent = 'Questo è un documento di testo semplice.\nSi trova su due righe.\n';
    const filePath = writeTmpFile(Buffer.from(textContent, 'utf8'), '.txt');
    try {
      expect(await validateMagicBytes(filePath, 'text/plain')).toBe(true);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('rifiuta un file binario dichiarato come text/csv', async () => {
    // Create a buffer with lots of null bytes (binary content)
    const binaryBuf = Buffer.alloc(256, 0x00); // all null bytes
    binaryBuf.write('fake csv header,col2\n', 0, 'ascii');
    const filePath = writeTmpFile(binaryBuf, '.csv');
    try {
      expect(await validateMagicBytes(filePath, 'text/csv')).toBe(false);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('rifiuta un file con header PDF rinominato come .csv', async () => {
    const pdfHeaderBuf = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
      0x0A, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, // binary continuation
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const filePath = writeTmpFile(pdfHeaderBuf, '.csv');
    try {
      expect(await validateMagicBytes(filePath, 'text/csv')).toBe(false);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('accetta un CSV vuoto', async () => {
    const filePath = writeTmpFile(Buffer.alloc(0), '.csv');
    try {
      expect(await validateMagicBytes(filePath, 'text/csv')).toBe(true);
    } finally {
      cleanupFiles(filePath);
    }
  });

  it('accetta un CSV con caratteri UTF-8 italiani', async () => {
    const csv = 'ragione_sociale,importo\nAzienda Società Srl,€ 10.000,00\n';
    const filePath = writeTmpFile(Buffer.from(csv, 'utf8'), '.csv');
    try {
      expect(await validateMagicBytes(filePath, 'text/csv')).toBe(true);
    } finally {
      cleanupFiles(filePath);
    }
  });
});
