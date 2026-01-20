import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Pratica } from '../pratiche/pratica.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Studio } from '../studi/studio.entity';
import { User } from '../users/user.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { Documento } from '../documenti/documento.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('DashboardService', () => {
  let service: DashboardService;
  let clienteRepo: jest.Mocked<Repository<Cliente>>;
  const samplePratica = {
    id: 'p1',
    cliente: { ragioneSociale: 'Cliente Uno' },
    debitore: { ragioneSociale: 'Debitore Uno' },
    faseId: 'fase-001',
    aperta: true,
    esito: 'positivo',
    capitale: 1000,
    importoRecuperatoCapitale: 500,
    anticipazioni: 0,
    importoRecuperatoAnticipazioni: 0,
    compensiLegali: 100,
    compensiLiquidati: 50,
    interessi: 50,
    interessiRecuperati: 25,
    dataAffidamento: new Date('2024-01-01'),
    dataChiusura: null,
    riferimentoCredito: 'R-1',
    storico: [
      { faseId: 'fase-001', faseCodice: 'fase-start', faseNome: 'Apertura', dataInizio: '2024-01-01' },
    ],
    opposizione: { dataEsito: '2024-02-01', esito: 'rigetto', note: 'Rigetto' },
    pignoramento: { dataNotifica: '2024-03-01', tipo: 'immobiliare' },
  } as Pratica;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Pratica), useValue: mockRepository() },
        { provide: getRepositoryToken(Cliente), useValue: mockRepository() },
        { provide: getRepositoryToken(Studio), useValue: mockRepository() },
        { provide: getRepositoryToken(User), useValue: mockRepository() },
        { provide: getRepositoryToken(Debitore), useValue: mockRepository() },
        { provide: getRepositoryToken(Avvocato), useValue: mockRepository() },
        { provide: getRepositoryToken(Documento), useValue: mockRepository() },
        { provide: getRepositoryToken(MovimentoFinanziario), useValue: mockRepository() },
        { provide: getRepositoryToken(Alert), useValue: mockRepository() },
        { provide: getRepositoryToken(Ticket), useValue: mockRepository() },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    clienteRepo = module.get(getRepositoryToken(Cliente));

    jest.spyOn(service, 'getStats').mockResolvedValue({
      numeroPratiche: 1,
      praticheAperte: 1,
      praticheChiuse: 0,
      praticheChiusePositive: 0,
      praticheChiuseNegative: 0,
      alertAttivi: 0,
      ticketsAperti: 0,
      capitaleAffidato: 1000,
      interessiAffidati: 50,
      anticipazioniAffidate: 0,
      compensiAffidati: 100,
      capitaleRecuperato: 500,
      interessiRecuperati: 25,
      anticipazioniRecuperate: 0,
      compensiRecuperati: 50,
      capitaleDaRecuperare: 500,
      percentualeRecuperoCapitale: 50,
      percentualeRecuperoInteressi: 50,
      percentualeRecuperoAnticipazioni: 0,
      percentualeRecuperoCompensi: 50,
      percentualeCapitaleDaRecuperare: 50,
    });
    jest.spyOn(service, 'getKPI').mockResolvedValue({
      totalePraticheAffidate: 1,
      totalePraticheChiuse: 0,
      percentualeChiusura: 0,
      esitoNegativo: 0,
      esitoPositivo: 0,
      esitoPositivoParziale: 0,
      esitoPositivoTotale: 0,
      recuperoCapitale: { totale: 500, parziale: 0, completo: 0 },
      recuperoInteressi: { totale: 25, parziale: 0, completo: 0 },
      recuperoCompensi: { totale: 50, parziale: 0, completo: 0 },
    });
  });

  it('restituisce correttamente le sezioni condivise', async () => {
    clienteRepo.findOne.mockResolvedValue({
      id: 'c1',
      ragioneSociale: 'Cliente Uno',
      configurazioneCondivisione: {
        abilitata: true,
        dashboard: { stats: true, kpi: true },
        pratiche: {
          elenco: true,
          dettagli: true,
          documenti: true,
          movimentiFinanziari: true,
          timeline: true,
        },
      },
    } as Cliente);

    service['praticheRepository'].find.mockResolvedValue([samplePratica]);
    service['documentiRepository'].find.mockResolvedValue([
      {
        id: 'doc1',
        nome: 'Documento',
        descrizione: 'Desc',
        tipo: 'pdf',
        praticaId: 'p1',
        dataCreazione: new Date(),
        caricatoDa: 'Studio',
      },
    ]);
    service['movimentiRepository'].find.mockResolvedValue([
      {
        id: 'mov1',
        tipo: 'recupero_capitale',
        importo: 500,
        data: new Date(),
        praticaId: 'p1',
        oggetto: 'Pagamento',
      },
    ]);

    const result = await service.getDashboardCondivisa('c1');
    expect(result.pratiche).toHaveLength(1);
    expect(result.documenti).toHaveLength(1);
    expect(result.movimentiFinanziari).toHaveLength(1);
    expect(result.timeline).toHaveLength(3);
  });

  it('restituisce solo le statistiche quando la condivisione pratica è disabilitata', async () => {
    clienteRepo.findOne.mockResolvedValue({
      id: 'c2',
      ragioneSociale: 'Cliente Due',
      configurazioneCondivisione: {
        abilitata: true,
        dashboard: { stats: true, kpi: true },
        pratiche: {
          elenco: false,
          dettagli: false,
          documenti: false,
          movimentiFinanziari: false,
          timeline: false,
        },
      },
    } as Cliente);

    service['praticheRepository'].find.mockResolvedValue([]);
    service['documentiRepository'].find.mockResolvedValue([]);
    service['movimentiRepository'].find.mockResolvedValue([]);

    const result = await service.getDashboardCondivisa('c2');
    expect(result.pratiche).toBeUndefined();
    expect(result.documenti).toBeUndefined();
    expect(result.movimentiFinanziari).toBeUndefined();
    expect(result.timeline).toBeUndefined();
    expect(result.stats).toBeDefined();
    expect(result.kpi).toBeDefined();
  });
});
