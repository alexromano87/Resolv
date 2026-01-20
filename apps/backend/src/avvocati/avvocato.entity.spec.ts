import { Avvocato } from './avvocato.entity';

describe('Avvocato Entity', () => {
  let avvocato: Avvocato;

  beforeEach(() => {
    avvocato = new Avvocato();
    avvocato.id = 'avvocato-1';
    avvocato.nome = 'Mario';
    avvocato.cognome = 'Rossi';
    avvocato.email = 'avv.rossi@studio.it';
    avvocato.attivo = true;
  });

  describe('basic properties', () => {
    it('should have nome and cognome', () => {
      expect(avvocato.nome).toBe('Mario');
      expect(avvocato.cognome).toBe('Rossi');
    });

    it('should build full name', () => {
      const fullName = `${avvocato.nome} ${avvocato.cognome}`;
      expect(fullName).toBe('Mario Rossi');
    });

    it('should build formal name with title', () => {
      const formalName = `Avv. ${avvocato.nome} ${avvocato.cognome}`;
      expect(formalName).toBe('Avv. Mario Rossi');
    });
  });

  describe('contact information', () => {
    it('should have email', () => {
      expect(avvocato.email).toBe('avv.rossi@studio.it');
    });

    it('should store telefono', () => {
      avvocato.telefono = '3331234567';
      expect(avvocato.telefono).toBe('3331234567');
    });

    it('should allow optional telefono', () => {
      const newAvvocato = new Avvocato();
      expect(newAvvocato.telefono).toBeUndefined();
    });
  });

  describe('professional information', () => {
    it('should store numero iscrizione albo', () => {
      avvocato.numeroIscrizioneAlbo = 'A12345';
      expect(avvocato.numeroIscrizioneAlbo).toBe('A12345');
    });

    it('should store foro', () => {
      avvocato.foro = 'Milano';
      expect(avvocato.foro).toBe('Milano');
    });

    it('should allow optional professional data', () => {
      const newAvvocato = new Avvocato();
      expect(newAvvocato.numeroIscrizioneAlbo).toBeUndefined();
      expect(newAvvocato.foro).toBeUndefined();
    });
  });

  describe('access levels', () => {
    it('should set livello accesso pratiche to tutte', () => {
      avvocato.livelloAccessoPratiche = 'tutte';
      expect(avvocato.livelloAccessoPratiche).toBe('tutte');
    });

    it('should set livello accesso pratiche to assegnate', () => {
      avvocato.livelloAccessoPratiche = 'assegnate';
      expect(avvocato.livelloAccessoPratiche).toBe('assegnate');
    });

    it('should check if has full access', () => {
      avvocato.livelloAccessoPratiche = 'tutte';
      const hasFullAccess = avvocato.livelloAccessoPratiche === 'tutte';
      expect(hasFullAccess).toBe(true);
    });

    it('should check if has limited access', () => {
      avvocato.livelloAccessoPratiche = 'assegnate';
      const hasLimitedAccess = avvocato.livelloAccessoPratiche === 'assegnate';
      expect(hasLimitedAccess).toBe(true);
    });
  });

  describe('status', () => {
    it('should be attivo by default', () => {
      expect(avvocato.attivo).toBe(true);
    });

    it('should allow deactivation', () => {
      avvocato.attivo = false;
      expect(avvocato.attivo).toBe(false);
    });
  });

  describe('relationships', () => {
    it('should have studioId', () => {
      avvocato.studioId = 'studio-1';
      expect(avvocato.studioId).toBe('studio-1');
    });

    it('should allow null studioId', () => {
      avvocato.studioId = null;
      expect(avvocato.studioId).toBeNull();
    });
  });

  describe('timestamps', () => {
    it('should have createdAt', () => {
      avvocato.createdAt = new Date();
      expect(avvocato.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt', () => {
      avvocato.updatedAt = new Date();
      expect(avvocato.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('note', () => {
    it('should store note', () => {
      avvocato.note = 'Specializzato in diritto civile';
      expect(avvocato.note).toBe('Specializzato in diritto civile');
    });

    it('should allow empty note', () => {
      const newAvvocato = new Avvocato();
      expect(newAvvocato.note).toBeUndefined();
    });
  });

  describe('display helpers', () => {
    it('should create display string with all info', () => {
      avvocato.numeroIscrizioneAlbo = 'A12345';
      avvocato.foro = 'Milano';

      const display = `Avv. ${avvocato.nome} ${avvocato.cognome} - Foro di ${avvocato.foro}`;
      expect(display).toBe('Avv. Mario Rossi - Foro di Milano');
    });

    it('should create minimal display string', () => {
      const display = `${avvocato.nome} ${avvocato.cognome}`;
      expect(display).toBe('Mario Rossi');
    });
  });
});
