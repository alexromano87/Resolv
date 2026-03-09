import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CheckupPreassessmentDocumentsService } from './checkup-preassessment-documents.service';
import { CheckupPreassessmentDocument } from './checkup-preassessment-document.entity';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { QuestionManagementService } from '../services/question-management.service';

const mockRepository = () => ({
  create: jest.fn((entity) => entity),
  save: jest.fn(async (entity) => ({ id: 'doc-1', ...entity })),
  findOne: jest.fn(),
});

describe('CheckupPreassessmentDocumentsService', () => {
  let service: CheckupPreassessmentDocumentsService;
  let documentRepo: ReturnType<typeof mockRepository>;
  let sublicenseRepo: ReturnType<typeof mockRepository>;
  let licenseRepo: ReturnType<typeof mockRepository>;
  let preassessmentService: { getPreassessmentForDocuments: jest.Mock };
  let questionManagementService: { getCompleteStructure: jest.Mock };
  let tempFilePath: string;

  const baseUser = {
    id: 'u-1',
    ruolo: 'cliente',
    clientId: 'c-1',
  } as any;

  const basePreassessment = {
    id: 'p-1',
    clientId: 'c-1',
    studioCanEdit: true,
  };

  beforeEach(async () => {
    // Create a real temp file so SHA-256 computation has something to read
    tempFilePath = path.join(os.tmpdir(), `doc-svc-test-${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, Buffer.from('%PDF-1.4 test content'));

    documentRepo = mockRepository();
    sublicenseRepo = mockRepository();
    licenseRepo = mockRepository();
    preassessmentService = {
      getPreassessmentForDocuments: jest.fn(),
    };
    questionManagementService = {
      getCompleteStructure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckupPreassessmentDocumentsService,
        { provide: getRepositoryToken(CheckupPreassessmentDocument), useValue: documentRepo },
        { provide: getRepositoryToken(CheckupSublicense), useValue: sublicenseRepo },
        { provide: getRepositoryToken(CheckupLicense), useValue: licenseRepo },
        { provide: CheckupPreassessmentService, useValue: preassessmentService },
        { provide: QuestionManagementService, useValue: questionManagementService },
      ],
    }).compile();

    service = module.get(CheckupPreassessmentDocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
  });

  it('nega upload se allowDocuments è false', async () => {
    preassessmentService.getPreassessmentForDocuments.mockResolvedValue({
      preassessment: basePreassessment,
      client: { id: basePreassessment.clientId },
      allowDocuments: false,
    });

    await expect(
      service.upload('p-1', { ...getFileMock(tempFilePath) }, baseUser, 'field-1', 'section-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(documentRepo.save).not.toHaveBeenCalled();
  });

  it('permette upload quando allowDocuments è true', async () => {
    preassessmentService.getPreassessmentForDocuments.mockResolvedValue({
      preassessment: basePreassessment,
      client: { id: basePreassessment.clientId },
      allowDocuments: true,
    });

    const result = await service.upload('p-1', getFileMock(tempFilePath), baseUser, 'field-1', 'section-1');

    expect(documentRepo.create).toHaveBeenCalled();
    expect(documentRepo.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'doc-1',
      preassessmentId: 'p-1',
      fieldId: 'field-1',
      sectionId: 'section-1',
      nomeOriginale: 'test.pdf',
    });
  });

  it('include sha256 nel documento salvato', async () => {
    preassessmentService.getPreassessmentForDocuments.mockResolvedValue({
      preassessment: basePreassessment,
      client: { id: basePreassessment.clientId },
      allowDocuments: true,
    });

    const result = await service.upload('p-1', getFileMock(tempFilePath), baseUser, 'field-1', 'section-1');

    expect(result.sha256).toBeDefined();
    expect(typeof result.sha256).toBe('string');
    // SHA-256 hex digest is exactly 64 characters
    expect(result.sha256).toHaveLength(64);
  });

  it('procede con sha256=null se il file non esiste', async () => {
    preassessmentService.getPreassessmentForDocuments.mockResolvedValue({
      preassessment: basePreassessment,
      client: { id: basePreassessment.clientId },
      allowDocuments: true,
    });

    const missingFileMock = {
      originalname: 'test.pdf',
      filename: 'test.pdf',
      path: '/tmp/non-existent-file-abc123.pdf',
      size: 123,
      buffer: Buffer.from('file'),
    } as any;

    // Should not throw even if file is missing — sha256 falls back to null
    const result = await service.upload('p-1', missingFileMock, baseUser, 'field-1', 'section-1');
    expect(result.sha256).toBeNull();
  });
});

function getFileMock(filePath: string) {
  return {
    originalname: 'test.pdf',
    filename: path.basename(filePath),
    path: filePath,
    size: fs.statSync(filePath).size,
    buffer: Buffer.from('file'),
  } as any;
}
