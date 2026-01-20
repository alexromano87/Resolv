import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudiService } from './studi.service';
import { Studio } from './studio.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { User } from '../users/user.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { BackupService } from './backup.service';

describe('StudiService', () => {
  let service: StudiService;
  let studioRepo: jest.Mocked<Repository<Studio>>;

  const mockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudiService,
        { provide: getRepositoryToken(Studio), useValue: mockRepository() },
        { provide: getRepositoryToken(Cliente), useValue: mockRepository() },
        { provide: getRepositoryToken(Debitore), useValue: mockRepository() },
        { provide: getRepositoryToken(User), useValue: mockRepository() },
        { provide: getRepositoryToken(Avvocato), useValue: mockRepository() },
        { provide: getRepositoryToken(Pratica), useValue: mockRepository() },
        { provide: BackupService, useValue: { createBackup: jest.fn() } },
      ],
    }).compile();

    service = module.get<StudiService>(StudiService);
    studioRepo = module.get(getRepositoryToken(Studio));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all studi including soft deleted', async () => {
      const studios = [
        { id: '1', nome: 'Studio A' },
        { id: '2', nome: 'Studio B' },
      ];
      studioRepo.find.mockResolvedValue(studios as Studio[]);

      const result = await service.findAll();

      expect(result).toEqual(studios);
      expect(studioRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          withDeleted: true,
        }),
      );
    });
  });

  describe('findAllActive', () => {
    it('should return only active studi', async () => {
      const activeStudios = [{ id: '1', nome: 'Studio A', attivo: true }];
      studioRepo.find.mockResolvedValue(activeStudios as Studio[]);

      const result = await service.findAllActive();

      expect(result).toEqual(activeStudios);
      expect(studioRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { attivo: true },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a studio by id', async () => {
      const studio = { id: '1', nome: 'Studio Test' };
      studioRepo.findOne.mockResolvedValue(studio as Studio);

      const result = await service.findOne('1');

      expect(result).toEqual(studio);
      expect(studioRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
        }),
      );
    });

    it('should throw NotFoundException when studio not found', async () => {
      studioRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new studio', async () => {
      const createDto = {
        nome: 'Nuovo Studio',
        ragioneSociale: 'Studio Test SRL',
        partitaIva: '12345678901',
        rappresentanteLegale: 'Mario Rossi',
        email: 'studio@example.com',
      };
      const studio = { id: '1', ...createDto };

      studioRepo.findOne.mockResolvedValue(null);
      studioRepo.create.mockReturnValue(studio as Studio);
      studioRepo.save.mockResolvedValue(studio as Studio);

      const result = await service.create(createDto);

      expect(result).toEqual(studio);
      expect(studioRepo.create).toHaveBeenCalledWith(createDto);
      expect(studioRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if studio name already exists', async () => {
      const createDto = { nome: 'Existing Studio' } as any;
      studioRepo.findOne.mockResolvedValue({ id: '1' } as Studio);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a studio', async () => {
      const updateDto = { nome: 'Updated Studio' };
      const existingStudio = { id: '1', nome: 'Old Studio' };
      const updatedStudio = { id: '1', nome: 'Updated Studio' };

      studioRepo.findOne
        .mockResolvedValueOnce(existingStudio as Studio)
        .mockResolvedValueOnce(null);
      studioRepo.save.mockResolvedValue(updatedStudio as Studio);

      const result = await service.update('1', updateDto);

      expect(result.nome).toBe('Updated Studio');
      expect(studioRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if new name already exists', async () => {
      const updateDto = { nome: 'Existing Name' };
      const studio = { id: '1', nome: 'Old Name' };

      studioRepo.findOne
        .mockResolvedValueOnce(studio as Studio)
        .mockResolvedValueOnce({ id: '2', nome: 'Existing Name' } as Studio);

      await expect(service.update('1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
