import { Test, TestingModule } from '@nestjs/testing';
import { PraticheController } from './pratiche.controller';
import { PraticheService } from './pratiche.service';
import type { CurrentUserData } from '../auth/current-user.decorator';

describe('PraticheController', () => {
  let controller: PraticheController;

  const mockPraticheService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    cambiaFase: jest.fn(),
    getTotaliPerFase: jest.fn(),
  };

  const mockUser: CurrentUserData = {
    id: 'user-123',
    email: 'test@example.com',
    nome: 'Test',
    cognome: 'User',
    ruolo: 'collaboratore',
    clienteId: null,
    studioId: 'studio-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PraticheController],
      providers: [
        {
          provide: PraticheService,
          useValue: mockPraticheService,
        },
      ],
    }).compile();

    controller = module.get<PraticheController>(PraticheController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
