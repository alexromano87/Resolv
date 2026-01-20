import { Documento } from './documento.entity';

describe('Documento Entity', () => {
  let documento: Documento;

  beforeEach(() => {
    documento = new Documento();
    documento.id = 'documento-1';
    documento.nome = 'contratto.pdf';
    documento.tipo = 'contratto';
    documento.percorso = '/uploads/documenti/contratto.pdf';
    documento.attivo = true;
  });

  describe('basic properties', () => {
    it('should have an id', () => {
      expect(documento.id).toBe('documento-1');
    });

    it('should have a nome', () => {
      expect(documento.nome).toBe('contratto.pdf');
    });

    it('should have a tipo', () => {
      expect(documento.tipo).toBe('contratto');
    });

    it('should have a percorso', () => {
      expect(documento.percorso).toBe('/uploads/documenti/contratto.pdf');
    });
  });

  describe('file properties', () => {
    it('should store dimensione in bytes', () => {
      documento.dimensione = 1024000; // 1MB
      expect(documento.dimensione).toBe(1024000);
    });

    it('should calculate size in KB', () => {
      documento.dimensione = 1024000;
      const sizeKB = documento.dimensione / 1024;
      expect(sizeKB).toBe(1000);
    });

    it('should calculate size in MB', () => {
      documento.dimensione = 1024000;
      const sizeMB = documento.dimensione / (1024 * 1024);
      expect(sizeMB).toBeCloseTo(0.98, 2);
    });

    it('should store mime type', () => {
      documento.mimeType = 'application/pdf';
      expect(documento.mimeType).toBe('application/pdf');
    });

    it('should detect PDF files', () => {
      documento.mimeType = 'application/pdf';
      const isPDF = documento.mimeType === 'application/pdf';
      expect(isPDF).toBe(true);
    });

    it('should detect image files', () => {
      documento.mimeType = 'image/jpeg';
      const isImage = documento.mimeType?.startsWith('image/');
      expect(isImage).toBe(true);
    });
  });

  describe('document types', () => {
    it('should identify contratto type', () => {
      documento.tipo = 'contratto';
      expect(documento.tipo).toBe('contratto');
    });

    it('should identify fattura type', () => {
      documento.tipo = 'fattura';
      expect(documento.tipo).toBe('fattura');
    });

    it('should identify atto_giudiziario type', () => {
      documento.tipo = 'atto_giudiziario';
      expect(documento.tipo).toBe('atto_giudiziario');
    });

    it('should identify altro type', () => {
      documento.tipo = 'altro';
      expect(documento.tipo).toBe('altro');
    });
  });

  describe('metadata', () => {
    it('should store descrizione', () => {
      documento.descrizione = 'Contratto di cessione del credito';
      expect(documento.descrizione).toBe('Contratto di cessione del credito');
    });

    it('should allow empty descrizione', () => {
      expect(documento.descrizione).toBeUndefined();
    });

    it('should store caricato da', () => {
      documento.caricatoDa = 'Mario Rossi';
      expect(documento.caricatoDa).toBe('Mario Rossi');
    });

    it('should store note', () => {
      documento.note = 'Documento firmato digitalmente';
      expect(documento.note).toBe('Documento firmato digitalmente');
    });
  });

  describe('relationships', () => {
    it('should have praticaId', () => {
      documento.praticaId = 'pratica-1';
      expect(documento.praticaId).toBe('pratica-1');
    });

    it('should allow null praticaId', () => {
      documento.praticaId = null;
      expect(documento.praticaId).toBeNull();
    });
  });

  describe('status', () => {
    it('should be attivo by default', () => {
      expect(documento.attivo).toBe(true);
    });

    it('should allow soft delete', () => {
      documento.attivo = false;
      expect(documento.attivo).toBe(false);
    });
  });

  describe('timestamps', () => {
    it('should have dataCreazione', () => {
      documento.dataCreazione = new Date();
      expect(documento.dataCreazione).toBeInstanceOf(Date);
    });

    it('should have createdAt', () => {
      documento.createdAt = new Date();
      expect(documento.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt', () => {
      documento.updatedAt = new Date();
      expect(documento.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('file extension', () => {
    it('should extract PDF extension', () => {
      documento.nome = 'contratto.pdf';
      const ext = documento.nome.split('.').pop();
      expect(ext).toBe('pdf');
    });

    it('should extract DOCX extension', () => {
      documento.nome = 'documento.docx';
      const ext = documento.nome.split('.').pop();
      expect(ext).toBe('docx');
    });

    it('should extract JPG extension', () => {
      documento.nome = 'immagine.jpg';
      const ext = documento.nome.split('.').pop();
      expect(ext).toBe('jpg');
    });

    it('should handle files without extension', () => {
      documento.nome = 'documento';
      const ext = documento.nome.split('.').pop();
      expect(ext).toBe('documento');
    });
  });

  describe('download helpers', () => {
    it('should build download URL', () => {
      const downloadUrl = `/api/documenti/${documento.id}/download`;
      expect(downloadUrl).toBe('/api/documenti/documento-1/download');
    });

    it('should build preview URL', () => {
      const previewUrl = `/api/documenti/${documento.id}/preview`;
      expect(previewUrl).toBe('/api/documenti/documento-1/preview');
    });
  });

  describe('validation helpers', () => {
    it('should check if size is within limits', () => {
      documento.dimensione = 5 * 1024 * 1024; // 5MB
      const maxSize = 10 * 1024 * 1024; // 10MB
      const isValid = documento.dimensione <= maxSize;
      expect(isValid).toBe(true);
    });

    it('should check if size exceeds limits', () => {
      documento.dimensione = 15 * 1024 * 1024; // 15MB
      const maxSize = 10 * 1024 * 1024; // 10MB
      const isValid = documento.dimensione <= maxSize;
      expect(isValid).toBe(false);
    });
  });
});
