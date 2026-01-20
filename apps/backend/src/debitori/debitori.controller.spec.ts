import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DebitoriController } from './debitori.controller';
import { DebitoriService } from './debitori.service';
import { ClientiDebitoriService } from '../relazioni/clienti-debitori.service';
import type { CurrentUserData } from '../auth/current-user.decorator';

describe('DebitoriController', () => {
  let controller: DebitoriController;
  let service: DebitoriService;

  const mockDebitoriService = {
    findAllForUser: jest.fn(),
    findAllWithClientiCountForUser: jest.fn(),
    findOne: jest.fn(),
    canAccessDebitore: jest.fn(),
    countPraticheCollegate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  const mockClientiDebitoriService = {
    getClientiByDebitore: jest.fn(),
  };

  const adminUser: CurrentUserData = {
    id: 'admin-1',
    email: 'admin@example.com',
    nome: 'Admin',
    cognome: 'User',
    ruolo: 'admin',
    clienteId: null,
    studioId: null,
  };

  const studioUser: CurrentUserData = {
    id: 'studio-1',
    email: 'studio@example.com',
    nome: 'Studio',
    cognome: 'User',
    ruolo: 'titolare_studio',
    clienteId: null,
    studioId: 'studio-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebitoriController],
      providers: [
        {
          provide: DebitoriService,
          useValue: mockDebitoriService,
        },
        {
          provide: ClientiDebitoriService,
          useValue: mockClientiDebitoriService,
        },
      ],
    }).compile();

    controller = module.get<DebitoriController>(DebitoriController);
    service = module.get<DebitoriService>(DebitoriService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all debitori', async () => {
      const result = [{ id: '1', ragioneSociale: 'Debitore Test' }];
      mockDebitoriService.findAllForUser.mockResolvedValue(result);

      expect(await controller.findAll(adminUser)).toBe(result);
      expect(service.findAllForUser).toHaveBeenCalledWith(adminUser, false, {
        page: undefined,
        limit: undefined,
      });
    });

    it('should return debitori with clienti count when requested', async () => {
      const result = [{ id: '1', ragioneSociale: 'Debitore Test', clientiCount: 3 }];
      mockDebitoriService.findAllWithClientiCountForUser.mockResolvedValue(result);

      await controller.findAll(adminUser, undefined, 'true');

      expect(service.findAllWithClientiCountForUser).toHaveBeenCalledWith(
        adminUser,
        false,
        {
          page: undefined,
          limit: undefined,
        },
      );
    });
  });

  describe('findOne', () => {
    it('should return debitore when user has access', async () => {
      const result = { id: '1', ragioneSociale: 'Debitore Test' };
      mockDebitoriService.canAccessDebitore.mockResolvedValue(true);
      mockDebitoriService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(adminUser, '1')).toBe(result);
      expect(service.canAccessDebitore).toHaveBeenCalledWith(adminUser, '1');
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException when user cannot access', async () => {
      mockDebitoriService.canAccessDebitore.mockResolvedValue(false);

      await expect(controller.findOne(adminUser, '1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getClientiForDebitore', () => {
    it('should return clienti ids when user has access', async () => {
      mockDebitoriService.canAccessDebitore.mockResolvedValue(true);
      mockClientiDebitoriService.getClientiByDebitore.mockResolvedValue([
        'c1',
        'c2',
        'c3',
      ]);

      const result = await controller.getClientiForDebitore(adminUser, '1');

      expect(result).toEqual({ clientiIds: ['c1', 'c2', 'c3'] });
    });

    it('should throw ForbiddenException when user cannot access', async () => {
      mockDebitoriService.canAccessDebitore.mockResolvedValue(false);

      await expect(controller.getClientiForDebitore(adminUser, '1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getPraticheCount', () => {
    it('should return pratiche count when user has access', async () => {
      mockDebitoriService.canAccessDebitore.mockResolvedValue(true);
      mockDebitoriService.countPraticheCollegate.mockResolvedValue(5);

      const result = await controller.getPraticheCount(adminUser, '1');

      expect(result).toEqual({ count: 5 });
    });

    it('should throw ForbiddenException when user cannot access', async () => {
      mockDebitoriService.canAccessDebitore.mockResolvedValue(false);

      await expect(controller.getPraticheCount(adminUser, '1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      ragioneSociale: 'Nuovo Debitore',
      codiceFiscale: 'ABCDEF12G34H567I',
    };

    it('should allow admin to create debitore', async () => {
      const result = { id: '1', ...createDto };
      mockDebitoriService.create.mockResolvedValue(result);

      expect(await controller.create(adminUser, createDto)).toBe(result);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should auto-assign studioId for studio users', async () => {
      const result = { id: '1', ...createDto };
      mockDebitoriService.create.mockResolvedValue(result);

      const dto = { ...createDto };
      await controller.create(studioUser, dto);

      expect(dto.studioId).toBe('studio-123');
    });
  });
});
