import { Test, TestingModule } from '@nestjs/testing';
import { FasiController } from './fasi.controller';
import { FasiService } from './fasi.service';

describe('FasiController', () => {
  let controller: FasiController;
  let service: FasiService;

  const mockFasiService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FasiController],
      providers: [
        {
          provide: FasiService,
          useValue: mockFasiService,
        },
      ],
    }).compile();

    controller = module.get<FasiController>(FasiController);
    service = module.get<FasiService>(FasiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all fasi', async () => {
      const result = [
        { id: '1', nome: 'Fase 1', ordine: 1 },
        { id: '2', nome: 'Fase 2', ordine: 2 },
      ];
      mockFasiService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single fase', async () => {
      const result = { id: '1', nome: 'Fase 1', ordine: 1 };
      mockFasiService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('1')).toBe(result);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });
});
