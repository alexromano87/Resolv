import { Test, TestingModule } from '@nestjs/testing';
import { StudiController } from './studi.controller';
import { StudiService } from './studi.service';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';

describe('StudiController', () => {
  let controller: StudiController;
  let service: StudiService;

  const mockStudiService = {
    findAll: jest.fn(),
    findAllActive: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    permanentDelete: jest.fn(),
    restore: jest.fn(),
    toggleActive: jest.fn(),
    getStudioStats: jest.fn(),
    getOrphanedRecords: jest.fn(),
    assignOrphanedRecords: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudiController],
      providers: [
        {
          provide: StudiService,
          useValue: mockStudiService,
        },
      ],
    }).compile();

    controller = module.get<StudiController>(StudiController);
    service = module.get<StudiService>(StudiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all studi', async () => {
      const result = [{ id: '1', ragioneSociale: 'Studio Test' }];
      mockStudiService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findAllActive', () => {
    it('should return only active studi', async () => {
      const result = [{ id: '1', ragioneSociale: 'Studio Test', attivo: true }];
      mockStudiService.findAllActive.mockResolvedValue(result);

      expect(await controller.findAllActive()).toBe(result);
      expect(service.findAllActive).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a studio by id', async () => {
      const result = { id: '1', ragioneSociale: 'Studio Test' };
      mockStudiService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('1')).toBe(result);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('should create a new studio', async () => {
      const dto: CreateStudioDto = {
        ragioneSociale: 'Nuovo Studio',
        partitaIva: '12345678901',
        rappresentanteLegale: 'Mario Rossi',
        email: 'studio@example.com',
      };
      const result = { id: '1', ...dto };
      mockStudiService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toBe(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a studio', async () => {
      const dto: UpdateStudioDto = {
        ragioneSociale: 'Studio Aggiornato',
      };
      const result = { id: '1', ...dto };
      mockStudiService.update.mockResolvedValue(result);

      expect(await controller.update('1', dto)).toBe(result);
      expect(service.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('remove', () => {
    it('should soft delete a studio', async () => {
      const result = { success: true };
      mockStudiService.remove.mockResolvedValue(result);

      expect(await controller.remove('1')).toBe(result);
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('permanentDelete', () => {
    it('should permanently delete a studio', async () => {
      const result = { success: true };
      mockStudiService.permanentDelete.mockResolvedValue(result);

      expect(await controller.permanentDelete('1')).toBe(result);
      expect(service.permanentDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('restore', () => {
    it('should restore a soft deleted studio', async () => {
      const result = { success: true };
      mockStudiService.restore.mockResolvedValue(result);

      expect(await controller.restore('1')).toBe(result);
      expect(service.restore).toHaveBeenCalledWith('1');
    });
  });

  describe('toggleActive', () => {
    it('should toggle studio active status', async () => {
      const result = { id: '1', attivo: false };
      mockStudiService.toggleActive.mockResolvedValue(result);

      expect(await controller.toggleActive('1')).toBe(result);
      expect(service.toggleActive).toHaveBeenCalledWith('1');
    });
  });

  describe('getStudioStats', () => {
    it('should return studio statistics', async () => {
      const result = {
        totalePratiche: 10,
        praticheAttive: 5,
        totaleClienti: 3,
      };
      mockStudiService.getStudioStats.mockResolvedValue(result);

      expect(await controller.getStudioStats('1')).toBe(result);
      expect(service.getStudioStats).toHaveBeenCalledWith('1');
    });
  });

  describe('getOrphanedRecords', () => {
    it('should return orphaned records', async () => {
      const result = {
        pratiche: [],
        clienti: [],
        avvocati: [],
      };
      mockStudiService.getOrphanedRecords.mockResolvedValue(result);

      expect(await controller.getOrphanedRecords()).toBe(result);
      expect(service.getOrphanedRecords).toHaveBeenCalled();
    });
  });

  describe('assignOrphanedRecords', () => {
    it('should assign orphaned records to a studio', async () => {
      const dto = {
        entityType: 'pratica',
        recordIds: ['p1', 'p2'],
        studioId: 'studio-1',
      };
      const result = { success: true, updated: 2 };
      mockStudiService.assignOrphanedRecords.mockResolvedValue(result);

      expect(await controller.assignOrphanedRecords(dto)).toBe(result);
      expect(service.assignOrphanedRecords).toHaveBeenCalledWith(
        dto.entityType,
        dto.recordIds,
        dto.studioId,
      );
    });
  });
});
