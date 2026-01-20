import { MovimentoFinanziario } from './movimento-finanziario.entity';

describe('MovimentoFinanziario Entity', () => {
  let movimento: MovimentoFinanziario;

  beforeEach(() => {
    movimento = new MovimentoFinanziario();
    movimento.id = 'movimento-1';
    movimento.tipo = 'recupero_capitale';
    movimento.importo = 5000;
    movimento.data = new Date('2024-01-15');
  });

  describe('basic properties', () => {
    it('should have an id', () => {
      expect(movimento.id).toBe('movimento-1');
    });

    it('should have a tipo', () => {
      expect(movimento.tipo).toBe('recupero_capitale');
    });

    it('should have an importo', () => {
      expect(movimento.importo).toBe(5000);
    });

    it('should have a data', () => {
      expect(movimento.data).toBeInstanceOf(Date);
    });
  });

  describe('movement types', () => {
    it('should identify recupero_capitale', () => {
      movimento.tipo = 'recupero_capitale';
      expect(movimento.tipo).toBe('recupero_capitale');
    });

    it('should identify recupero_interessi', () => {
      movimento.tipo = 'recupero_interessi';
      expect(movimento.tipo).toBe('recupero_interessi');
    });

    it('should identify recupero_anticipazioni', () => {
      movimento.tipo = 'recupero_anticipazioni';
      expect(movimento.tipo).toBe('recupero_anticipazioni');
    });

    it('should identify pagamento_compensi', () => {
      movimento.tipo = 'pagamento_compensi';
      expect(movimento.tipo).toBe('pagamento_compensi');
    });

    it('should identify spesa', () => {
      movimento.tipo = 'spesa';
      expect(movimento.tipo).toBe('spesa');
    });

    it('should identify altro', () => {
      movimento.tipo = 'altro';
      expect(movimento.tipo).toBe('altro');
    });
  });

  describe('importo calculations', () => {
    it('should store positive amounts', () => {
      movimento.importo = 1000;
      expect(movimento.importo).toBeGreaterThan(0);
    });

    it('should handle decimal amounts', () => {
      movimento.importo = 1234.56;
      expect(movimento.importo).toBe(1234.56);
    });

    it('should format to 2 decimal places', () => {
      movimento.importo = 1234.567;
      const formatted = Number(movimento.importo.toFixed(2));
      expect(formatted).toBe(1234.57);
    });

    it('should calculate percentage of total', () => {
      movimento.importo = 2500;
      const totale = 10000;
      const percentuale = (movimento.importo / totale) * 100;
      expect(percentuale).toBe(25);
    });
  });

  describe('metadata', () => {
    it('should store oggetto', () => {
      movimento.oggetto = 'Pagamento primo acconto';
      expect(movimento.oggetto).toBe('Pagamento primo acconto');
    });

    it('should store note', () => {
      movimento.note = 'Bonifico bancario';
      expect(movimento.note).toBe('Bonifico bancario');
    });

    it('should allow empty metadata', () => {
      expect(movimento.oggetto).toBeUndefined();
      expect(movimento.note).toBeUndefined();
    });
  });

  describe('payment method', () => {
    it('should store modalita pagamento', () => {
      movimento.modalitaPagamento = 'bonifico';
      expect(movimento.modalitaPagamento).toBe('bonifico');
    });

    it('should identify different payment methods', () => {
      const methods = ['bonifico', 'assegno', 'contanti', 'carta', 'altro'];
      methods.forEach(method => {
        movimento.modalitaPagamento = method;
        expect(movimento.modalitaPagamento).toBe(method);
      });
    });
  });

  describe('relationships', () => {
    it('should have praticaId', () => {
      movimento.praticaId = 'pratica-1';
      expect(movimento.praticaId).toBe('pratica-1');
    });

    it('should allow null praticaId', () => {
      movimento.praticaId = null;
      expect(movimento.praticaId).toBeNull();
    });
  });

  describe('timestamps', () => {
    it('should have createdAt', () => {
      movimento.createdAt = new Date();
      expect(movimento.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt', () => {
      movimento.updatedAt = new Date();
      expect(movimento.updatedAt).toBeInstanceOf(Date);
    });

    it('should track when movement occurred', () => {
      const movementDate = new Date('2024-01-15');
      movimento.data = movementDate;
      expect(movimento.data.getFullYear()).toBe(2024);
      expect(movimento.data.getMonth()).toBe(0); // January
      expect(movimento.data.getDate()).toBe(15);
    });
  });

  describe('classification helpers', () => {
    it('should identify income movements', () => {
      const incomeTypes = ['recupero_capitale', 'recupero_interessi', 'recupero_anticipazioni', 'pagamento_compensi'];
      incomeTypes.forEach(type => {
        movimento.tipo = type;
        const isIncome = incomeTypes.includes(movimento.tipo);
        expect(isIncome).toBe(true);
      });
    });

    it('should identify expense movements', () => {
      movimento.tipo = 'spesa';
      const isExpense = movimento.tipo === 'spesa';
      expect(isExpense).toBe(true);
    });

    it('should check if is recovery', () => {
      movimento.tipo = 'recupero_capitale';
      const isRecovery = movimento.tipo.startsWith('recupero_');
      expect(isRecovery).toBe(true);
    });
  });

  describe('display helpers', () => {
    it('should format currency', () => {
      movimento.importo = 1234.56;
      const formatted = new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(movimento.importo);
      expect(formatted).toContain('1234,56');
      expect(formatted).toContain('€');
    });

    it('should format date', () => {
      movimento.data = new Date('2024-01-15');
      const formatted = movimento.data.toLocaleDateString('it-IT');
      expect(formatted).toBe('15/01/2024');
    });

    it('should create display string', () => {
      movimento.tipo = 'recupero_capitale';
      movimento.importo = 5000;
      movimento.data = new Date('2024-01-15');

      const display = `${movimento.tipo}: €${movimento.importo}`;
      expect(display).toBe('recupero_capitale: €5000');
    });
  });
});
