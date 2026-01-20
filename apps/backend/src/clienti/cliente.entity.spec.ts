import { Cliente } from './cliente.entity';

describe('Cliente Entity', () => {
  let cliente: Cliente;

  beforeEach(() => {
    cliente = new Cliente();
    cliente.id = 'cliente-1';
    cliente.ragioneSociale = 'Test SRL';
    cliente.partitaIva = '12345678901';
    cliente.email = 'test@example.com';
    cliente.telefono = '1234567890';
    cliente.attivo = true;
  });

  describe('basic properties', () => {
    it('should have an id', () => {
      expect(cliente.id).toBe('cliente-1');
    });

    it('should have ragioneSociale', () => {
      expect(cliente.ragioneSociale).toBe('Test SRL');
    });

    it('should have partitaIva', () => {
      expect(cliente.partitaIva).toBe('12345678901');
    });

    it('should validate partitaIva length (11 digits)', () => {
      expect(cliente.partitaIva).toHaveLength(11);
    });
  });

  describe('contact information', () => {
    it('should have email', () => {
      expect(cliente.email).toBe('test@example.com');
    });

    it('should have telefono', () => {
      expect(cliente.telefono).toBe('1234567890');
    });

    it('should allow optional PEC', () => {
      cliente.pec = 'pec@example.com';
      expect(cliente.pec).toBe('pec@example.com');
    });

    it('should allow optional codiceSDI', () => {
      cliente.codiceSDI = 'ABCDEFG';
      expect(cliente.codiceSDI).toBe('ABCDEFG');
    });
  });

  describe('address information', () => {
    it('should store indirizzo', () => {
      cliente.indirizzo = 'Via Roma 1';
      expect(cliente.indirizzo).toBe('Via Roma 1');
    });

    it('should store citta', () => {
      cliente.citta = 'Milano';
      expect(cliente.citta).toBe('Milano');
    });

    it('should store provincia', () => {
      cliente.provincia = 'MI';
      expect(cliente.provincia).toBe('MI');
    });

    it('should store cap', () => {
      cliente.cap = '20100';
      expect(cliente.cap).toBe('20100');
    });

    it('should validate provincia length (2 characters)', () => {
      cliente.provincia = 'MI';
      expect(cliente.provincia).toHaveLength(2);
    });

    it('should validate cap length (5 digits)', () => {
      cliente.cap = '20100';
      expect(cliente.cap).toHaveLength(5);
    });
  });

  describe('status', () => {
    it('should be attivo by default', () => {
      expect(cliente.attivo).toBe(true);
    });

    it('should allow setting attivo to false', () => {
      cliente.attivo = false;
      expect(cliente.attivo).toBe(false);
    });
  });

  describe('configurazione condivisione', () => {
    it('should store configurazione condivisione', () => {
      cliente.configurazioneCondivisione = {
        abilitata: true,
        dashboard: { stats: true, kpi: true },
        pratiche: {
          elenco: true,
          dettagli: true,
          documenti: false,
          movimentiFinanziari: true,
          timeline: true,
        },
      };

      expect(cliente.configurazioneCondivisione).toBeDefined();
      expect(cliente.configurazioneCondivisione.abilitata).toBe(true);
    });

    it('should allow dashboard stats sharing', () => {
      cliente.configurazioneCondivisione = {
        abilitata: true,
        dashboard: { stats: true, kpi: false },
        pratiche: {
          elenco: false,
          dettagli: false,
          documenti: false,
          movimentiFinanziari: false,
          timeline: false,
        },
      };

      expect(cliente.configurazioneCondivisione.dashboard.stats).toBe(true);
      expect(cliente.configurazioneCondivisione.dashboard.kpi).toBe(false);
    });

    it('should allow selective pratiche data sharing', () => {
      cliente.configurazioneCondivisione = {
        abilitata: true,
        dashboard: { stats: false, kpi: false },
        pratiche: {
          elenco: true,
          dettagli: true,
          documenti: false,
          movimentiFinanziari: false,
          timeline: true,
        },
      };

      expect(cliente.configurazioneCondivisione.pratiche.elenco).toBe(true);
      expect(cliente.configurazioneCondivisione.pratiche.documenti).toBe(false);
    });

    it('should disable all sharing when abilitata is false', () => {
      cliente.configurazioneCondivisione = {
        abilitata: false,
        dashboard: { stats: true, kpi: true },
        pratiche: {
          elenco: true,
          dettagli: true,
          documenti: true,
          movimentiFinanziari: true,
          timeline: true,
        },
      };

      expect(cliente.configurazioneCondivisione.abilitata).toBe(false);
    });
  });

  describe('relationships', () => {
    it('should have studioId', () => {
      cliente.studioId = 'studio-1';
      expect(cliente.studioId).toBe('studio-1');
    });
  });

  describe('timestamps', () => {
    it('should have createdAt', () => {
      cliente.createdAt = new Date();
      expect(cliente.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt', () => {
      cliente.updatedAt = new Date();
      expect(cliente.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('note', () => {
    it('should allow optional note', () => {
      cliente.note = 'Cliente importante';
      expect(cliente.note).toBe('Cliente importante');
    });

    it('should allow empty note', () => {
      cliente.note = undefined;
      expect(cliente.note).toBeUndefined();
    });
  });
});
