import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { CheckupPreassessmentRetentionService } from './checkup-preassessment-retention.service';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupPreassessmentDocument } from './checkup-preassessment-document.entity';

/** Mirror the service constant so tests can create files inside the expected dir. */
const UPLOAD_BASE = path.resolve(process.cwd(), 'uploads', 'checkup-preassessment');

/** Creates a real file inside UPLOAD_BASE. Returns the full path. */
function createUploadFile(filename: string): string {
  fs.mkdirSync(UPLOAD_BASE, { recursive: true });
  const filePath = path.join(UPLOAD_BASE, filename);
  fs.writeFileSync(filePath, Buffer.from('%PDF-1.4 retention test'));
  return filePath;
}

// Mock factories
const makeSelectQb = (ids: string[]) => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(ids.map((id) => ({ id }))),
});

const makeUpdateQb = (affected = 1) => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  whereInIds: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected }),
});

describe('CheckupPreassessmentRetentionService', () => {
  let service: CheckupPreassessmentRetentionService;
  let preassessmentRepo: { createQueryBuilder: jest.Mock };
  let documentRepo: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    const selectQb = makeSelectQb(['pa-1', 'pa-2']);
    const updateQb = makeUpdateQb(2);
    const docUpdateQb = makeUpdateQb(0);

    preassessmentRepo = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(selectQb)
        .mockReturnValueOnce(updateQb),
    };

    documentRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(docUpdateQb),
    };

    configService = {
      get: jest.fn().mockImplementation((_key: string, defaultVal: unknown) => defaultVal),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckupPreassessmentRetentionService,
        { provide: getRepositoryToken(CheckupPreassessment), useValue: preassessmentRepo },
        { provide: getRepositoryToken(CheckupPreassessmentDocument), useValue: documentRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(CheckupPreassessmentRetentionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('non fa nulla se non ci sono preassessment qualificanti', async () => {
    const emptyQb = makeSelectQb([]);
    // Replace the entire mock (not just the default) to flush any queued once-values
    preassessmentRepo.createQueryBuilder = jest.fn().mockReturnValue(emptyQb);

    await service.enforceRetentionPolicy();

    expect(documentRepo.find).not.toHaveBeenCalled();
  });

  it('interroga i documenti con gli id qualificanti', async () => {
    await service.enforceRetentionPolicy();

    expect(documentRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ attivo: true }),
      }),
    );
  });

  it('elimina fisicamente i file dentro la upload dir', async () => {
    const filename = `retention-test-${Date.now()}.pdf`;
    const docPath = createUploadFile(filename);

    const selectQb = makeSelectQb(['pa-1']);
    const updateQb = makeUpdateQb(1);
    const docUpdateQb = makeUpdateQb(1);

    preassessmentRepo.createQueryBuilder = jest.fn()
      .mockReturnValueOnce(selectQb)
      .mockReturnValueOnce(updateQb);

    documentRepo.find = jest.fn().mockResolvedValue([
      { id: 'doc-1', preassessmentId: 'pa-1', percorsoFile: docPath, attivo: true },
    ]);
    documentRepo.createQueryBuilder = jest.fn().mockReturnValue(docUpdateQb);

    await service.enforceRetentionPolicy();

    expect(fs.existsSync(docPath)).toBe(false);
  });

  it('salta file fuori dalla upload dir senza lanciare errori', async () => {
    const selectQb = makeSelectQb(['pa-1']);
    const updateQb = makeUpdateQb(1);
    const docUpdateQb = makeUpdateQb(0);

    preassessmentRepo.createQueryBuilder = jest.fn()
      .mockReturnValueOnce(selectQb)
      .mockReturnValueOnce(updateQb);

    documentRepo.find = jest.fn().mockResolvedValue([
      { id: 'doc-1', preassessmentId: 'pa-1', percorsoFile: '/etc/passwd', attivo: true },
    ]);
    documentRepo.createQueryBuilder = jest.fn().mockReturnValue(docUpdateQb);

    await expect(service.enforceRetentionPolicy()).resolves.not.toThrow();
  });

  it('non lancia errore se il file non esiste (ENOENT)', async () => {
    const missingPath = path.join(UPLOAD_BASE, `already-gone-${Date.now()}.pdf`);

    const selectQb = makeSelectQb(['pa-1']);
    const updateQb = makeUpdateQb(1);
    const docUpdateQb = makeUpdateQb(0);

    preassessmentRepo.createQueryBuilder = jest.fn()
      .mockReturnValueOnce(selectQb)
      .mockReturnValueOnce(updateQb);

    documentRepo.find = jest.fn().mockResolvedValue([
      { id: 'doc-1', preassessmentId: 'pa-1', percorsoFile: missingPath, attivo: true },
    ]);
    documentRepo.createQueryBuilder = jest.fn().mockReturnValue(docUpdateQb);

    await expect(service.enforceRetentionPolicy()).resolves.not.toThrow();
  });

  it('usa il default 365 giorni quando la variabile di configurazione non è impostata', async () => {
    const emptyQb = makeSelectQb([]);
    preassessmentRepo.createQueryBuilder = jest.fn().mockReturnValue(emptyQb);

    await service.enforceRetentionPolicy();

    expect(configService.get).toHaveBeenCalledWith('CHECKUP_PREASSESSMENT_RETENTION_DAYS', 365);
  });
});
