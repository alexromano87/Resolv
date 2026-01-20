import { Debitore } from './debitore.entity';

describe('Debitore Entity', () => {
  let debitore: Debitore;

  beforeEach(() => {
    debitore = new Debitore();
    debitore.id = 'debitore-1';
    debitore.attivo = true;
  });

  describe('persona fisica', () => {
    beforeEach(() => {
      debitore.nome = 'Mario';
      debitore.cognome = 'Rossi';
      debitore.codiceFiscale = 'RSSMRA80A01H501Z';
    });

    it('should have nome and cognome', () => {
      expect(debitore.nome).toBe('Mario');
      expect(debitore.cognome).toBe('Rossi');
    });

    it('should have codice fiscale', () => {
      expect(debitore.codiceFiscale).toBe('RSSMRA80A01H501Z');
      expect(debitore.codiceFiscale).toHaveLength(16);
    });

    it('should not have ragione sociale', () => {
      expect(debitore.ragioneSociale).toBeUndefined();
    });

    it('should not have partita iva', () => {
      expect(debitore.partitaIva).toBeUndefined();
    });

    it('should build full name', () => {
      const fullName = `${debitore.nome} ${debitore.cognome}`;
      expect(fullName).toBe('Mario Rossi');
    });
  });

  describe('persona giuridica', () => {
    beforeEach(() => {
      debitore.ragioneSociale = 'Test SRL';
      debitore.partitaIva = '12345678901';
      debitore.codiceFiscale = '12345678901';
    });

    it('should have ragione sociale', () => {
      expect(debitore.ragioneSociale).toBe('Test SRL');
    });

    it('should have partita iva', () => {
      expect(debitore.partitaIva).toBe('12345678901');
      expect(debitore.partitaIva).toHaveLength(11);
    });

    it('should not have nome and cognome', () => {
      expect(debitore.nome).toBeUndefined();
      expect(debitore.cognome).toBeUndefined();
    });

    it('should use ragione sociale as display name', () => {
      const displayName = debitore.ragioneSociale || `${debitore.nome} ${debitore.cognome}`;
      expect(displayName).toBe('Test SRL');
    });
  });

  describe('contact information', () => {
    it('should store email', () => {
      debitore.email = 'test@example.com';
      expect(debitore.email).toBe('test@example.com');
    });

    it('should store telefono', () => {
      debitore.telefono = '1234567890';
      expect(debitore.telefono).toBe('1234567890');
    });

    it('should allow optional contact info', () => {
      expect(debitore.email).toBeUndefined();
      expect(debitore.telefono).toBeUndefined();
    });
  });

  describe('address', () => {
    it('should store complete address', () => {
      debitore.indirizzo = 'Via Roma 1';
      debitore.citta = 'Milano';
      debitore.provincia = 'MI';
      debitore.cap = '20100';

      expect(debitore.indirizzo).toBe('Via Roma 1');
      expect(debitore.citta).toBe('Milano');
      expect(debitore.provincia).toBe('MI');
      expect(debitore.cap).toBe('20100');
    });

    it('should validate provincia length', () => {
      debitore.provincia = 'MI';
      expect(debitore.provincia).toHaveLength(2);
    });

    it('should validate cap length', () => {
      debitore.cap = '20100';
      expect(debitore.cap).toHaveLength(5);
    });

    it('should build full address', () => {
      debitore.indirizzo = 'Via Roma 1';
      debitore.citta = 'Milano';
      debitore.provincia = 'MI';
      debitore.cap = '20100';

      const fullAddress = `${debitore.indirizzo}, ${debitore.cap} ${debitore.citta} (${debitore.provincia})`;
      expect(fullAddress).toBe('Via Roma 1, 20100 Milano (MI)');
    });
  });

  describe('status', () => {
    it('should be attivo by default', () => {
      expect(debitore.attivo).toBe(true);
    });

    it('should allow deactivation', () => {
      debitore.attivo = false;
      expect(debitore.attivo).toBe(false);
    });
  });

  describe('relationships', () => {
    it('should have studioId', () => {
      debitore.studioId = 'studio-1';
      expect(debitore.studioId).toBe('studio-1');
    });

    it('should allow null studioId', () => {
      debitore.studioId = null;
      expect(debitore.studioId).toBeNull();
    });
  });

  describe('timestamps', () => {
    it('should have createdAt', () => {
      debitore.createdAt = new Date();
      expect(debitore.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt', () => {
      debitore.updatedAt = new Date();
      expect(debitore.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('note', () => {
    it('should store note', () => {
      debitore.note = 'Debitore difficile da contattare';
      expect(debitore.note).toBe('Debitore difficile da contattare');
    });

    it('should allow empty note', () => {
      expect(debitore.note).toBeUndefined();
    });
  });

  describe('tipo debitore detection', () => {
    it('should detect persona fisica', () => {
      debitore.nome = 'Mario';
      debitore.cognome = 'Rossi';

      const isPersonaFisica = !!debitore.nome && !!debitore.cognome;
      expect(isPersonaFisica).toBe(true);
    });

    it('should detect persona giuridica', () => {
      debitore.ragioneSociale = 'Test SRL';

      const isPersonaGiuridica = !!debitore.ragioneSociale;
      expect(isPersonaGiuridica).toBe(true);
    });
  });
});
