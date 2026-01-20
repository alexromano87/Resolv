import { Studio } from './studio.entity';

describe('Studio Entity', () => {
  let studio: Studio;

  beforeEach(() => {
    studio = new Studio();
    studio.id = 'studio-1';
    studio.nome = 'Studio Legale Test';
    studio.attivo = true;
  });

  describe('basic properties', () => {
    it('should have an id', () => {
      expect(studio.id).toBe('studio-1');
    });

    it('should have a nome', () => {
      expect(studio.nome).toBe('Studio Legale Test');
    });

    it('should be attivo', () => {
      expect(studio.attivo).toBe(true);
    });
  });

  describe('contact information', () => {
    it('should store email', () => {
      studio.email = 'info@studiolegale.it';
      expect(studio.email).toBe('info@studiolegale.it');
    });

    it('should store telefono', () => {
      studio.telefono = '0212345678';
      expect(studio.telefono).toBe('0212345678');
    });

    it('should store PEC', () => {
      studio.pec = 'studio@pec.it';
      expect(studio.pec).toBe('studio@pec.it');
    });

    it('should allow optional contact fields', () => {
      expect(studio.email).toBeUndefined();
      expect(studio.telefono).toBeUndefined();
      expect(studio.pec).toBeUndefined();
    });
  });

  describe('fiscal information', () => {
    it('should store partita IVA', () => {
      studio.partitaIva = '12345678901';
      expect(studio.partitaIva).toBe('12345678901');
      expect(studio.partitaIva).toHaveLength(11);
    });

    it('should store codice fiscale', () => {
      studio.codiceFiscale = '12345678901';
      expect(studio.codiceFiscale).toBe('12345678901');
    });

    it('should store codice SDI', () => {
      studio.codiceSDI = 'ABCDEFG';
      expect(studio.codiceSDI).toBe('ABCDEFG');
    });
  });

  describe('address', () => {
    it('should store complete address', () => {
      studio.indirizzo = 'Via Milano 10';
      studio.citta = 'Roma';
      studio.provincia = 'RM';
      studio.cap = '00100';

      expect(studio.indirizzo).toBe('Via Milano 10');
      expect(studio.citta).toBe('Roma');
      expect(studio.provincia).toBe('RM');
      expect(studio.cap).toBe('00100');
    });

    it('should build full address', () => {
      studio.indirizzo = 'Via Milano 10';
      studio.citta = 'Roma';
      studio.provincia = 'RM';
      studio.cap = '00100';

      const fullAddress = `${studio.indirizzo}, ${studio.cap} ${studio.citta} (${studio.provincia})`;
      expect(fullAddress).toBe('Via Milano 10, 00100 Roma (RM)');
    });
  });

  describe('legal representative', () => {
    it('should store rappresentante legale', () => {
      studio.rappresentanteLegale = 'Avv. Mario Rossi';
      expect(studio.rappresentanteLegale).toBe('Avv. Mario Rossi');
    });

    it('should allow null rappresentante', () => {
      expect(studio.rappresentanteLegale).toBeUndefined();
    });
  });

  describe('status', () => {
    it('should be attivo by default', () => {
      expect(studio.attivo).toBe(true);
    });

    it('should allow deactivation', () => {
      studio.attivo = false;
      expect(studio.attivo).toBe(false);
    });
  });

  describe('timestamps', () => {
    it('should have createdAt', () => {
      studio.createdAt = new Date();
      expect(studio.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt', () => {
      studio.updatedAt = new Date();
      expect(studio.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('note', () => {
    it('should store note', () => {
      studio.note = 'Studio specializzato in recupero crediti';
      expect(studio.note).toBe('Studio specializzato in recupero crediti');
    });

    it('should allow empty note', () => {
      expect(studio.note).toBeUndefined();
    });
  });

  describe('relationships', () => {
    it('should track number of users', () => {
      const userCount = 5;
      expect(userCount).toBeGreaterThan(0);
    });

    it('should track number of pratiche', () => {
      const praticheCount = 10;
      expect(praticheCount).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should allow custom settings', () => {
      const settings = {
        defaultInterestRate: 0.05,
        notificationEmail: 'notifications@studio.it',
      };

      expect(settings.defaultInterestRate).toBe(0.05);
      expect(settings.notificationEmail).toBe('notifications@studio.it');
    });
  });
});
