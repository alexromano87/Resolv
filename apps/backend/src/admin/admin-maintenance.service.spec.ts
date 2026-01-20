import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminMaintenanceService } from './admin-maintenance.service';
import { Pratica } from '../pratiche/pratica.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Documento } from '../documenti/documento.entity';
import { Cartella } from '../cartelle/cartella.entity';
import { User } from '../users/user.entity';

describe('AdminMaintenanceService', () => {
  let service: AdminMaintenanceService;

  const mockRepository = () => ({
    count: jest.fn(),
    update: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMaintenanceService,
        { provide: getRepositoryToken(Pratica), useValue: mockRepository() },
        { provide: getRepositoryToken(Cliente), useValue: mockRepository() },
        { provide: getRepositoryToken(Debitore), useValue: mockRepository() },
        { provide: getRepositoryToken(Avvocato), useValue: mockRepository() },
        { provide: getRepositoryToken(MovimentoFinanziario), useValue: mockRepository() },
        { provide: getRepositoryToken(Alert), useValue: mockRepository() },
        { provide: getRepositoryToken(Ticket), useValue: mockRepository() },
        { provide: getRepositoryToken(Documento), useValue: mockRepository() },
        { provide: getRepositoryToken(Cartella), useValue: mockRepository() },
        { provide: getRepositoryToken(User), useValue: mockRepository() },
      ],
    }).compile();

    service = module.get<AdminMaintenanceService>(AdminMaintenanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrphanData', () => {
    it('should return orphan data counts', async () => {
      const result = await service.getOrphanData();

      expect(result).toHaveProperty('praticheSenzaStudio');
      expect(result).toHaveProperty('clientiSenzaStudio');
      expect(result).toHaveProperty('debitoriSenzaStudio');
    });
  });
});
