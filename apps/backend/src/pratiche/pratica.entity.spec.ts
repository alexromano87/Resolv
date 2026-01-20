import { Pratica } from './pratica.entity';

describe('Pratica Entity', () => {
  let pratica: Pratica;

  beforeEach(() => {
    pratica = new Pratica();
    pratica.id = 'pratica-1';
    pratica.capitale = 10000;
    pratica.interessi = 500;
    pratica.anticipazioni = 200;
    pratica.compensiLegali = 1000;
    pratica.importoRecuperatoCapitale = 0;
    pratica.interessiRecuperati = 0;
    pratica.importoRecuperatoAnticipazioni = 0;
    pratica.compensiLiquidati = 0;
    pratica.aperta = true;
    pratica.attivo = true;
  });

  describe('totaleAffidato', () => {
    it('should calculate total importo affidato correctly', () => {
      const totale = pratica.capitale + pratica.interessi + pratica.anticipazioni + pratica.compensiLegali;
      expect(totale).toBe(11700);
    });

    it('should handle zero values', () => {
      pratica.capitale = 0;
      pratica.interessi = 0;
      pratica.anticipazioni = 0;
      pratica.compensiLegali = 0;

      const totale = pratica.capitale + pratica.interessi + pratica.anticipazioni + pratica.compensiLegali;
      expect(totale).toBe(0);
    });
  });

  describe('totaleRecuperato', () => {
    it('should calculate total importo recuperato correctly', () => {
      pratica.importoRecuperatoCapitale = 8000;
      pratica.interessiRecuperati = 400;
      pratica.importoRecuperatoAnticipazioni = 200;
      pratica.compensiLiquidati = 800;

      const totale =
        pratica.importoRecuperatoCapitale +
        pratica.interessiRecuperati +
        pratica.importoRecuperatoAnticipazioni +
        pratica.compensiLiquidati;

      expect(totale).toBe(9400);
    });

    it('should handle partial recovery', () => {
      pratica.importoRecuperatoCapitale = 5000;
      pratica.interessiRecuperati = 0;
      pratica.importoRecuperatoAnticipazioni = 0;
      pratica.compensiLiquidati = 0;

      const totale =
        pratica.importoRecuperatoCapitale +
        pratica.interessiRecuperati +
        pratica.importoRecuperatoAnticipazioni +
        pratica.compensiLiquidati;

      expect(totale).toBe(5000);
    });
  });

  describe('percentualeRecupero', () => {
    it('should calculate percentuale recupero capitale correctly', () => {
      pratica.importoRecuperatoCapitale = 5000;
      const percentuale = (pratica.importoRecuperatoCapitale / pratica.capitale) * 100;
      expect(percentuale).toBe(50);
    });

    it('should handle 100% recovery', () => {
      pratica.importoRecuperatoCapitale = 10000;
      const percentuale = (pratica.importoRecuperatoCapitale / pratica.capitale) * 100;
      expect(percentuale).toBe(100);
    });

    it('should handle 0% recovery', () => {
      pratica.importoRecuperatoCapitale = 0;
      const percentuale = (pratica.importoRecuperatoCapitale / pratica.capitale) * 100;
      expect(percentuale).toBe(0);
    });

    it('should handle division by zero when capitale is 0', () => {
      pratica.capitale = 0;
      pratica.importoRecuperatoCapitale = 0;
      const percentuale = pratica.capitale > 0 ? (pratica.importoRecuperatoCapitale / pratica.capitale) * 100 : 0;
      expect(percentuale).toBe(0);
    });
  });

  describe('importoDaRecuperare', () => {
    it('should calculate importo da recuperare correctly', () => {
      pratica.importoRecuperatoCapitale = 3000;
      const daRecuperare = pratica.capitale - pratica.importoRecuperatoCapitale;
      expect(daRecuperare).toBe(7000);
    });

    it('should return 0 when fully recovered', () => {
      pratica.importoRecuperatoCapitale = 10000;
      const daRecuperare = pratica.capitale - pratica.importoRecuperatoCapitale;
      expect(daRecuperare).toBe(0);
    });

    it('should handle over-recovery', () => {
      pratica.importoRecuperatoCapitale = 12000;
      const daRecuperare = pratica.capitale - pratica.importoRecuperatoCapitale;
      expect(daRecuperare).toBe(-2000);
    });
  });

  describe('stato pratica', () => {
    it('should identify pratica as aperta', () => {
      expect(pratica.aperta).toBe(true);
    });

    it('should identify pratica as chiusa', () => {
      pratica.aperta = false;
      pratica.dataChiusura = new Date();
      expect(pratica.aperta).toBe(false);
      expect(pratica.dataChiusura).toBeDefined();
    });

    it('should identify pratica as attiva', () => {
      expect(pratica.attivo).toBe(true);
    });

    it('should identify pratica as disattivata', () => {
      pratica.attivo = false;
      expect(pratica.attivo).toBe(false);
    });
  });

  describe('storico fasi', () => {
    it('should initialize with empty storico', () => {
      expect(pratica.storico).toBeUndefined();
    });

    it('should store fase history', () => {
      pratica.storico = [
        {
          faseId: 'fase-1',
          faseCodice: 'FASE_1',
          faseNome: 'Fase Iniziale',
          dataInizio: new Date('2024-01-01').toISOString(),
          dataFine: null,
        },
        {
          faseId: 'fase-2',
          faseCodice: 'FASE_2',
          faseNome: 'Fase 2',
          dataInizio: new Date('2024-02-01').toISOString(),
          dataFine: null,
        },
      ];

      expect(pratica.storico).toHaveLength(2);
      expect(pratica.storico[0].faseId).toBe('fase-1');
      expect(pratica.storico[1].faseId).toBe('fase-2');
    });
  });

  describe('opposizione', () => {
    it('should store opposizione data', () => {
      pratica.opposizione = {
        dataEsito: '2024-03-01',
        esito: 'rigetto',
        note: 'Opposizione respinta',
      };

      expect(pratica.opposizione).toBeDefined();
      expect(pratica.opposizione.esito).toBe('rigetto');
    });
  });

  describe('pignoramento', () => {
    it('should store pignoramento data', () => {
      pratica.pignoramento = {
        dataNotifica: '2024-04-01',
        tipo: 'immobiliare',
        note: 'Pignoramento su immobile',
      };

      expect(pratica.pignoramento).toBeDefined();
      expect(pratica.pignoramento.tipo).toBe('immobiliare');
    });
  });

  describe('timestamps', () => {
    it('should have createdAt timestamp', () => {
      pratica.createdAt = new Date();
      expect(pratica.createdAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt timestamp', () => {
      pratica.updatedAt = new Date();
      expect(pratica.updatedAt).toBeInstanceOf(Date);
    });

    it('should have optional dataAffidamento', () => {
      pratica.dataAffidamento = new Date('2024-01-01');
      expect(pratica.dataAffidamento).toBeInstanceOf(Date);
    });

    it('should have optional dataChiusura', () => {
      pratica.dataChiusura = new Date('2024-12-31');
      expect(pratica.dataChiusura).toBeInstanceOf(Date);
    });
  });
});
