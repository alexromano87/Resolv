import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Studio } from '../studi/studio.entity';

const createUserQueryBuilder = (count: number) => {
  const builder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
  };
  return builder;
};

describe('UsersService - Licensing', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let studioRepo: jest.Mocked<Repository<Studio>>;

  const mockUserRepository = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const mockStudioRepository = () => ({
    findOne: jest.fn(),
    findByIds: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository() },
        { provide: getRepositoryToken(Studio), useValue: mockStudioRepository() },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    studioRepo = module.get(getRepositoryToken(Studio));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('blocks creation when max utenti is reached', async () => {
    const studioId = 'studio-1';
    studioRepo.findOne.mockResolvedValue({ id: studioId, maxUtenti: 1 } as Studio);
    userRepo.findOne.mockResolvedValue(null);
    userRepo.createQueryBuilder.mockReturnValue(createUserQueryBuilder(1) as any);

    await expect(
      service.create({
        email: 'user@example.com',
        password: 'password123',
        nome: 'Mario',
        cognome: 'Rossi',
        ruolo: 'collaboratore',
        studioId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks activation via toggleActive when max utenti is reached', async () => {
    const studioId = 'studio-1';
    studioRepo.findOne.mockResolvedValue({ id: studioId, maxUtenti: 1 } as Studio);
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      attivo: false,
      ruolo: 'collaboratore',
      studioId,
    } as User);
    userRepo.createQueryBuilder.mockReturnValue(createUserQueryBuilder(1) as any);

    await expect(service.toggleActive('user-1')).rejects.toThrow(BadRequestException);
  });

  it('blocks update when activating user beyond limit', async () => {
    const studioId = 'studio-1';
    studioRepo.findOne.mockResolvedValue({ id: studioId, maxUtenti: 1 } as Studio);
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      attivo: false,
      ruolo: 'collaboratore',
      studioId,
    } as User);
    userRepo.createQueryBuilder.mockReturnValue(createUserQueryBuilder(1) as any);

    await expect(
      service.update('user-1', { attivo: true }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks adding a studio for active user when limit is reached', async () => {
    const currentStudioId = 'studio-1';
    const newStudioId = 'studio-2';
    studioRepo.findOne.mockResolvedValue({ id: newStudioId, maxUtenti: 1 } as Studio);
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      attivo: true,
      ruolo: 'collaboratore',
      studi: [{ id: currentStudioId }],
    } as User);
    userRepo.createQueryBuilder.mockReturnValue(createUserQueryBuilder(1) as any);

    await expect(
      service.updateStudi('user-1', [currentStudioId, newStudioId]),
    ).rejects.toThrow(BadRequestException);
  });
});
