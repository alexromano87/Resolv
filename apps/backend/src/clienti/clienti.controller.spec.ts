import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ClientiController } from './clienti.controller';
import { ClientiService } from './clienti.service';
import { ClientiDebitoriService } from '../relazioni/clienti-debitori.service';
import type { CurrentUserData } from '../auth/current-user.decorator';

describe('ClientiController', () => {
  let controller: ClientiController;
  let service: ClientiService;
  let clientiDebitoriService: ClientiDebitoriService;

  const mockClientiService = {
    findAllForUser: jest.fn(),
    findOne: jest.fn(),
    canAccessCliente: jest.fn(),
    countPraticheCollegate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  const mockClientiDebitoriService = {};

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

  const clienteUser: CurrentUserData = {
    id: 'cliente-1',
    email: 'cliente@example.com',
    nome: 'Cliente',
    cognome: 'Test',
    ruolo: 'cliente',
    clienteId: 'cliente-123',
    studioId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientiController],
      providers: [
        {
          provide: ClientiService,
          useValue: mockClientiService,
        },
        {
          provide: ClientiDebitoriService,
          useValue: mockClientiDebitoriService,
        },
      ],
    }).compile();

    controller = module.get<ClientiController>(ClientiController);
    service = module.get<ClientiService>(ClientiService);
    clientiDebitoriService = module.get<ClientiDebitoriService>(ClientiDebitoriService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all clienti for user', async () => {
      const result = [{ id: '1', ragioneSociale: 'Cliente Test' }];
      mockClientiService.findAllForUser.mockResolvedValue(result);

      expect(await controller.findAll(adminUser)).toBe(result);
      expect(service.findAllForUser).toHaveBeenCalledWith(adminUser, false, {
        page: undefined,
        limit: undefined,
      });
    });

    it('should include inactive when requested', async () => {
      const result = [{ id: '1', ragioneSociale: 'Cliente Test', attivo: false }];
      mockClientiService.findAllForUser.mockResolvedValue(result);

      await controller.findAll(adminUser, 'true');

      expect(service.findAllForUser).toHaveBeenCalledWith(adminUser, true, {
        page: undefined,
        limit: undefined,
      });
    });

    it('should apply pagination', async () => {
      const result = [{ id: '1' }];
      mockClientiService.findAllForUser.mockResolvedValue(result);

      await controller.findAll(adminUser, undefined, '2', '10');

      expect(service.findAllForUser).toHaveBeenCalledWith(adminUser, false, {
        page: 2,
        limit: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return cliente when user has access', async () => {
      const result = { id: '1', ragioneSociale: 'Cliente Test' };
      mockClientiService.canAccessCliente.mockResolvedValue(true);
      mockClientiService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(adminUser, '1')).toBe(result);
      expect(service.canAccessCliente).toHaveBeenCalledWith(adminUser, '1');
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException when user cannot access', async () => {
      mockClientiService.canAccessCliente.mockResolvedValue(false);

      await expect(controller.findOne(clienteUser, '1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getPraticheCount', () => {
    it('should return pratiche count when user has access', async () => {
      mockClientiService.canAccessCliente.mockResolvedValue(true);
      mockClientiService.countPraticheCollegate.mockResolvedValue(5);

      const result = await controller.getPraticheCount(adminUser, '1');

      expect(result).toEqual({ count: 5 });
      expect(service.canAccessCliente).toHaveBeenCalledWith(adminUser, '1');
      expect(service.countPraticheCollegate).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException when user cannot access', async () => {
      mockClientiService.canAccessCliente.mockResolvedValue(false);

      await expect(controller.getPraticheCount(clienteUser, '1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      ragioneSociale: 'Nuovo Cliente',
      partitaIva: '12345678901',
    };

    it('should allow admin to create cliente', async () => {
      const result = { id: '1', ...createDto };
      mockClientiService.create.mockResolvedValue(result);

      expect(await controller.create(adminUser, createDto)).toBe(result);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should allow titolare_studio to create and auto-assign studioId', async () => {
      const result = { id: '1', ...createDto };
      mockClientiService.create.mockResolvedValue(result);

      const dto = { ...createDto };
      await controller.create(studioUser, dto);

      expect(dto.studioId).toBe('studio-123');
      expect(service.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for cliente', () => {
      expect(() => controller.create(clienteUser, createDto)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateDto = { ragioneSociale: 'Cliente Aggiornato' };

    it('should allow admin to update cliente', async () => {
      const result = { id: '1', ...updateDto };
      mockClientiService.update.mockResolvedValue(result);

      expect(await controller.update(adminUser, '1', updateDto)).toBe(result);
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
    });

    it('should throw ForbiddenException for cliente', () => {
      expect(() => controller.update(clienteUser, '1', updateDto)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deactivate', () => {
    it('should allow admin to deactivate cliente', async () => {
      const result = { success: true };
      mockClientiService.deactivate.mockResolvedValue(result);

      expect(await controller.deactivate(adminUser, '1')).toBe(result);
      expect(service.deactivate).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException for cliente', () => {
      expect(() => controller.deactivate(clienteUser, '1')).toThrow(
        ForbiddenException,
      );
    });
  });
});
