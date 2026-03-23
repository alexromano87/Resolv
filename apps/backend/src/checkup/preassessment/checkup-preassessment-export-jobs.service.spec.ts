import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { CheckupPreassessmentExportJobsService } from './checkup-preassessment-export-jobs.service';
import { CheckupPreassessmentExportJob } from './checkup-preassessment-export-job.entity';
import { CheckupPreassessmentDocumentsService } from './checkup-preassessment-documents.service';
import { CheckupPreassessmentPdfTemplateService } from './checkup-preassessment-pdf-template.service';

describe('CheckupPreassessmentExportJobsService', () => {
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const documentsService = {
    getZipPreview: jest.fn(),
    createZipBuffer: jest.fn(),
  };

  const pdfTemplateService = {
    buildReportHtml: jest.fn().mockResolvedValue('<html></html>'),
    createPdfBuffer: jest.fn(),
  };

  let service: CheckupPreassessmentExportJobsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CheckupPreassessmentExportJobsService,
        { provide: getRepositoryToken(CheckupPreassessmentExportJob), useValue: repo },
        { provide: CheckupPreassessmentDocumentsService, useValue: documentsService },
        { provide: CheckupPreassessmentPdfTemplateService, useValue: pdfTemplateService },
      ],
    }).compile();

    service = module.get(CheckupPreassessmentExportJobsService);
    jest.spyOn<any, any>(service as any, 'scheduleProcessing').mockImplementation(() => undefined);
  });

  it('crea un job PDF in coda', async () => {
    const createdAt = new Date('2026-03-08T10:00:00.000Z');
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => ({ id: 'job-1', createdAt, completedAt: null, errorMessage: null, ...value }));

    const result = await service.createPdfJob({
      preassessmentId: 'pa-1',
      excludeNA: true,
      includeConsultantNotes: true,
    }, {
      id: 'user-1',
      ruolo: 'admin_studio',
      studioId: 'studio-1',
      clientId: null,
    } as any);

    expect(pdfTemplateService.buildReportHtml).toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'pdf',
      status: 'queued',
      requestedById: 'user-1',
      preassessmentId: 'pa-1',
    }));
    expect(result).toEqual(expect.objectContaining({ id: 'job-1', type: 'pdf', status: 'queued' }));
  });

  it('blocca il download se il job non e ancora completato', async () => {
    repo.findOne.mockResolvedValue({
      id: 'job-2',
      requestedById: 'user-1',
      status: 'processing',
      resultPath: null,
      filename: 'report.pdf',
      mimeType: 'application/pdf',
    });

    await expect(service.getJobFile('job-2', { id: 'user-1' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
