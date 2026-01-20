import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FasiService } from './fasi.service';
import * as fasiConstants from './fasi.constants';

// Mock the constants
jest.mock('./fasi.constants', () => ({
  FASI: [
    { id: '1', nome: 'Fase 1', codice: 'FASE_1', ordine: 1, isFaseChiusura: false },
    { id: '2', nome: 'Fase 2', codice: 'FASE_2', ordine: 2, isFaseChiusura: false },
    { id: '3', nome: 'Fase Chiusura', codice: 'FASE_CHIUSURA', ordine: 3, isFaseChiusura: true },
  ],
  FASE_DEFAULT_ID: '1',
  getFaseById: jest.fn((id: string) => {
    const fasi = [
      { id: '1', nome: 'Fase 1', codice: 'FASE_1', ordine: 1, isFaseChiusura: false },
      { id: '2', nome: 'Fase 2', codice: 'FASE_2', ordine: 2, isFaseChiusura: false },
      { id: '3', nome: 'Fase Chiusura', codice: 'FASE_CHIUSURA', ordine: 3, isFaseChiusura: true },
    ];
    return fasi.find(f => f.id === id);
  }),
  getFaseByCodice: jest.fn((codice: string) => {
    const fasi = [
      { id: '1', nome: 'Fase 1', codice: 'FASE_1', ordine: 1, isFaseChiusura: false },
      { id: '2', nome: 'Fase 2', codice: 'FASE_2', ordine: 2, isFaseChiusura: false },
      { id: '3', nome: 'Fase Chiusura', codice: 'FASE_CHIUSURA', ordine: 3, isFaseChiusura: true },
    ];
    return fasi.find(f => f.codice === codice);
  }),
}));

describe('FasiService', () => {
  let service: FasiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FasiService],
    }).compile();

    service = module.get<FasiService>(FasiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all fasi sorted by ordine', () => {
      const result = service.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].ordine).toBeLessThanOrEqual(result[1].ordine);
      expect(result[1].ordine).toBeLessThanOrEqual(result[2].ordine);
    });
  });

  describe('findOne', () => {
    it('should return a fase by id', () => {
      const result = service.findOne('1');

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.nome).toBe('Fase 1');
    });

    it('should throw NotFoundException for invalid id', () => {
      expect(() => service.findOne('invalid-id')).toThrow(NotFoundException);
    });
  });

  describe('findByCodice', () => {
    it('should return a fase by codice', () => {
      const result = service.findByCodice('FASE_1');

      expect(result).toBeDefined();
      expect(result?.codice).toBe('FASE_1');
    });

    it('should return undefined for invalid codice', () => {
      const result = service.findByCodice('INVALID_CODE');

      expect(result).toBeUndefined();
    });
  });

  describe('getDefaultFase', () => {
    it('should return the default fase', () => {
      const result = service.getDefaultFase();

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
    });
  });

  describe('getDefaultFaseId', () => {
    it('should return the default fase id', () => {
      const result = service.getDefaultFaseId();

      expect(result).toBe('1');
    });
  });

  describe('isFaseChiusura', () => {
    it('should return true for chiusura fase', () => {
      const result = service.isFaseChiusura('3');

      expect(result).toBe(true);
    });

    it('should return false for non-chiusura fase', () => {
      const result = service.isFaseChiusura('1');

      expect(result).toBe(false);
    });

    it('should return false for invalid fase id', () => {
      const result = service.isFaseChiusura('invalid-id');

      expect(result).toBe(false);
    });
  });
});
