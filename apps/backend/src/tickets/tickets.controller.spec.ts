import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import type { CurrentUserData } from '../auth/current-user.decorator';

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: TicketsService;

  const mockTicketsService = {
    createForUser: jest.fn(),
    findAllForUser: jest.fn(),
    findAllByPraticaForUser: jest.fn(),
    findAllByStatoForUser: jest.fn(),
    findOneForUser: jest.fn(),
    update: jest.fn(),
    addMessage: jest.fn(),
    changeStatus: jest.fn(),
  };

  const mockUser: CurrentUserData = {
    id: 'user-123',
    email: 'test@example.com',
    nome: 'Test',
    cognome: 'User',
    ruolo: 'cliente',
    clienteId: 'cliente-123',
    studioId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new ticket', async () => {
      const dto = {
        praticaId: 'p-1',
        oggetto: 'Test Ticket',
        descrizione: 'Test Description',
      };
      const result = { id: 't-1', ...dto };
      mockTicketsService.createForUser.mockResolvedValue(result);

      expect(await controller.create(mockUser, dto)).toBe(result);
      expect(service.createForUser).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('findAll', () => {
    it('should return all tickets for user', async () => {
      const result = [{ id: 't-1', oggetto: 'Test' }];
      mockTicketsService.findAllForUser.mockResolvedValue(result);

      expect(await controller.findAll(mockUser)).toBe(result);
      expect(service.findAllForUser).toHaveBeenCalled();
    });
  });

  describe('findAllByPratica', () => {
    it('should return tickets by pratica', async () => {
      const result = [{ id: 't-1', praticaId: 'p-1' }];
      mockTicketsService.findAllByPraticaForUser.mockResolvedValue(result);

      await controller.findAllByPratica(mockUser, 'p-1');

      expect(service.findAllByPraticaForUser).toHaveBeenCalled();
    });
  });

  describe('findAllByStato', () => {
    it('should return tickets by stato', async () => {
      const result = [{ id: 't-1', stato: 'aperto' }];
      mockTicketsService.findAllByStatoForUser.mockResolvedValue(result);

      await controller.findAllByStato(mockUser, 'aperto');

      expect(service.findAllByStatoForUser).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single ticket', async () => {
      const result = { id: 't-1', oggetto: 'Test' };
      mockTicketsService.findOneForUser.mockResolvedValue(result);

      expect(await controller.findOne(mockUser, 't-1')).toBe(result);
      expect(service.findOneForUser).toHaveBeenCalledWith('t-1', mockUser);
    });
  });
});
