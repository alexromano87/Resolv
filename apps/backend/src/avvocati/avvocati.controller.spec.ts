import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AvvocatiController } from './avvocati.controller';
import { AvvocatiService } from './avvocati.service';
import { CreateAvvocatoDto } from './create-avvocato.dto';
import { UpdateAvvocatoDto } from './update-avvocato.dto';
import type { CurrentUserData } from '../auth/current-user.decorator';

describe('AvvocatiController', () => {
  let controller: AvvocatiController;
  let service: AvvocatiService;

  const mockAvvocatiService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    reactivate: jest.fn(),
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

  const titolareUser: CurrentUserData = {
    id: 'titolare-1',
    email: 'titolare@example.com',
    nome: 'Titolare',
    cognome: 'Studio',
    ruolo: 'titolare_studio',
    clienteId: null,
    studioId: 'studio-1',
  };

  const clienteUser: CurrentUserData = {
    id: 'cliente-1',
    email: 'cliente@example.com',
    nome: 'Cliente',
    cognome: 'Test',
    ruolo: 'cliente',
    clienteId: 'cliente-1',
    studioId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvvocatiController],
      providers: [
        {
          provide: AvvocatiService,
          useValue: mockAvvocatiService,
        },
      ],
    }).compile();

    controller = module.get<AvvocatiController>(AvvocatiController);
    service = module.get<AvvocatiService>(AvvocatiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateAvvocatoDto = {
      nome: 'Avv',
      cognome: 'Test',
      email: 'avvocato@example.com',
      numeroAlbo: '12345',
    };

    it('should allow admin to create avvocato', async () => {
      const result = { id: '1', ...createDto };
      mockAvvocatiService.create.mockResolvedValue(result);

      expect(await controller.create(adminUser, createDto)).toBe(result);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should allow titolare_studio to create avvocato', async () => {
      const result = { id: '1', ...createDto };
      mockAvvocatiService.create.mockResolvedValue(result);

      const dto = { ...createDto };
      await controller.create(titolareUser, dto);

      expect(dto.studioId).toBe('studio-1');
      expect(service.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for cliente', () => {
      expect(() => controller.create(clienteUser, createDto)).toThrow(
        ForbiddenException,
      );
      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all avvocati for admin', async () => {
      const result = [{ id: '1', nome: 'Avv', cognome: 'Test' }];
      mockAvvocatiService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(adminUser, false, '1', '10')).toBe(result);
      expect(service.findAll).toHaveBeenCalledWith(false, undefined, {
        page: 1,
        limit: 10,
      });
    });

    it('should filter by studioId for titolare_studio', async () => {
      const result = [{ id: '1', nome: 'Avv', cognome: 'Test' }];
      mockAvvocatiService.findAll.mockResolvedValue(result);

      await controller.findAll(titolareUser, false);

      expect(service.findAll).toHaveBeenCalledWith(false, 'studio-1', {
        page: undefined,
        limit: undefined,
      });
    });

    it('should throw ForbiddenException for cliente', () => {
      expect(() => controller.findAll(clienteUser, false)).toThrow(
        ForbiddenException,
      );
      expect(service.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single avvocato', async () => {
      const result = { id: '1', nome: 'Avv', cognome: 'Test' };
      mockAvvocatiService.findOne.mockResolvedValue(result);

      expect(await controller.findOne('1')).toBe(result);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    const updateDto: UpdateAvvocatoDto = {
      nome: 'Avv Updated',
    };

    it('should allow admin to update avvocato', async () => {
      const result = { id: '1', ...updateDto };
      mockAvvocatiService.update.mockResolvedValue(result);

      expect(await controller.update(adminUser, '1', updateDto)).toBe(result);
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
    });

    it('should allow titolare_studio to update avvocato', async () => {
      const result = { id: '1', ...updateDto };
      mockAvvocatiService.update.mockResolvedValue(result);

      expect(await controller.update(titolareUser, '1', updateDto)).toBe(result);
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
    });

    it('should throw ForbiddenException for cliente', () => {
      expect(() => controller.update(clienteUser, '1', updateDto)).toThrow(
        ForbiddenException,
      );
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should allow admin to deactivate avvocato', async () => {
      const result = { success: true };
      mockAvvocatiService.deactivate.mockResolvedValue(result);

      expect(await controller.deactivate(adminUser, '1')).toBe(result);
      expect(service.deactivate).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException for cliente', () => {
      expect(() => controller.deactivate(clienteUser, '1')).toThrow(
        ForbiddenException,
      );
      expect(service.deactivate).not.toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('should allow admin to reactivate avvocato', async () => {
      const result = { success: true };
      mockAvvocatiService.reactivate.mockResolvedValue(result);

      expect(await controller.reactivate(adminUser, '1')).toBe(result);
      expect(service.reactivate).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException for cliente', () => {
      expect(() => controller.reactivate(clienteUser, '1')).toThrow(
        ForbiddenException,
      );
      expect(service.reactivate).not.toHaveBeenCalled();
    });
  });
});
