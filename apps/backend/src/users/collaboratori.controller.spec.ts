import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { CollaboratoriController } from './collaboratori.controller';
import { UsersService } from './users.service';
import type { CurrentUserData } from '../auth/current-user.decorator';

describe('CollaboratoriController', () => {
  let controller: CollaboratoriController;
  let service: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    toggleActive: jest.fn(),
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
      controllers: [CollaboratoriController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<CollaboratoriController>(CollaboratoriController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all collaboratori for admin', async () => {
      const result = [{ id: '1', email: 'collab@example.com', ruolo: 'collaboratore' }];
      mockUsersService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(adminUser)).toBe(result);
      expect(service.findAll).toHaveBeenCalledWith(
        { ruolo: 'collaboratore', attivo: true },
        { page: undefined, limit: undefined },
      );
    });

    it('should filter by studioId for titolare_studio', async () => {
      const result = [{ id: '1', email: 'collab@example.com' }];
      mockUsersService.findAll.mockResolvedValue(result);

      await controller.findAll(titolareUser);

      expect(service.findAll).toHaveBeenCalledWith(
        { ruolo: 'collaboratore', studioId: 'studio-123', attivo: true },
        { page: undefined, limit: undefined },
      );
    });

    it('should include inactive when requested', async () => {
      const result = [{ id: '1', attivo: false }];
      mockUsersService.findAll.mockResolvedValue(result);

      await controller.findAll(adminUser, true);

      expect(service.findAll).toHaveBeenCalledWith(
        { ruolo: 'collaboratore' },
        { page: undefined, limit: undefined },
      );
    });

    it('should throw ForbiddenException for cliente', async () => {
      await expect(controller.findAll(clienteUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return empty array for non-admin without studioId', async () => {
      const userWithoutStudio = { ...titolareUser, studioId: null };

      const result = await controller.findAll(userWithoutStudio);

      expect(result).toEqual([]);
      expect(service.findAll).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto = {
      email: 'new@example.com',
      nome: 'Nuovo',
      cognome: 'Collaboratore',
      password: 'password123',
    };

    it('should allow admin to create collaboratore', async () => {
      const result = { id: '1', ...createDto };
      mockUsersService.create.mockResolvedValue(result);

      await controller.create(adminUser, createDto);

      expect(service.create).toHaveBeenCalled();
    });

    it('should auto-assign studioId for titolare_studio', async () => {
      const result = { id: '1', ...createDto };
      mockUsersService.create.mockResolvedValue(result);

      const dto = { ...createDto };
      delete dto.password;
      await controller.create(titolareUser, dto);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studioId: 'studio-123',
        }),
      );
    });

    it('should throw ForbiddenException for cliente', async () => {
      await expect(controller.create(clienteUser, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException for admin without password', async () => {
      const dtoWithoutPassword = { ...createDto };
      delete dtoWithoutPassword.password;

      await expect(controller.create(adminUser, dtoWithoutPassword)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException for titolare without studioId', async () => {
      const userWithoutStudio = { ...titolareUser, studioId: null };

      await expect(controller.create(userWithoutStudio, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
