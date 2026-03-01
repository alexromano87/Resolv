import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;
  const superadminUser = {
    id: 'super-1',
    email: 'admin@resolv.legal',
    nome: 'Super',
    cognome: 'Admin',
    ruolo: 'superadmin',
    clienteId: null,
    studioId: null,
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    nome: 'Mario',
    cognome: 'Rossi',
    ruolo: 'collaboratore',
    attivo: true,
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createDto = {
        email: 'new@example.com',
        password: 'password123',
        nome: 'Giovanni',
        cognome: 'Bianchi',
        ruolo: 'collaboratore' as const,
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(superadminUser, createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockResult = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockUsersService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(superadminUser, undefined, undefined, undefined, '1', '10');

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(superadminUser, 'user-1');

      expect(service.findOne).toHaveBeenCalledWith('user-1', false);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne(superadminUser, 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateDto = { nome: 'Updated' };
      const updatedUser = { ...mockUser, ...updateDto };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(superadminUser, 'user-1', updateDto);

      expect(service.update).toHaveBeenCalledWith('user-1', updateDto);
      expect(result.nome).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(superadminUser, 'user-1');

      expect(service.remove).toHaveBeenCalledWith('user-1');
    });
  });
});
