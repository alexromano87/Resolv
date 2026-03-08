import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
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

  const fileMock = {
    originalname: 'test.pdf',
    filename: 'test.pdf',
    path: '/tmp/test.pdf',
    size: 123,
    buffer: Buffer.from('file'),
  } as any;

  beforeEach(async () => {
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
  });

  it('nega upload se allowDocuments è false', async () => {
    preassessmentService.getPreassessmentForDocuments.mockResolvedValue({
      preassessment: basePreassessment,
      client: { id: basePreassessment.clientId },
      allowDocuments: false,
    });

    await expect(
      service.upload('p-1', fileMock, baseUser, 'field-1', 'section-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(documentRepo.save).not.toHaveBeenCalled();
  });

  it('permette upload quando allowDocuments è true', async () => {
    preassessmentService.getPreassessmentForDocuments.mockResolvedValue({
      preassessment: basePreassessment,
      client: { id: basePreassessment.clientId },
      allowDocuments: true,
    });

    const result = await service.upload('p-1', fileMock, baseUser, 'field-1', 'section-1');

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
});
