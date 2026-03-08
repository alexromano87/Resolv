import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { QuestionManagementService } from '../services/question-management.service';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { CheckupPreassessmentNotificationsService } from './checkup-preassessment-notifications.service';
import { CheckupPreassessmentRenderService } from './checkup-preassessment-render.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((entity) => entity),
  save: jest.fn(async (entity) => entity),
});

describe('CheckupPreassessmentService', () => {
  let service: CheckupPreassessmentService;
  let preassessmentRepository: ReturnType<typeof mockRepository>;
  let userRepository: ReturnType<typeof mockRepository>;
  let licenseRepository: ReturnType<typeof mockRepository>;
  let sublicenseRepository: ReturnType<typeof mockRepository>;
  let clientRepository: ReturnType<typeof mockRepository>;
  let questionManagementService: { getCompleteStructure: jest.Mock; getAllMacroAreas: jest.Mock };
  let notificationsService: { notifyCompletion: jest.Mock; notifyFinalValidation: jest.Mock };

  const baseUser = {
    id: 'user-1',
    ruolo: 'cliente',
    clientId: 'client-1',
    email: 'owner@example.com',
    nome: 'Mario',
    cognome: 'Rossi',
    macroAreaAssignments: ['a'],
  } as any;

  const baseRecord = {
    id: 'pre-1',
    userId: 'user-1',
    clientId: 'client-1',
    data: {
      owner_a_email: 'owner@example.com',
      field_a: 'old-a',
      field_b: 'old-b',
    },
    notes: {},
    fieldNotes: {},
    userFieldNotes: {
      field_a: 'note-a',
      field_b: 'note-b',
    },
    naFields: {
      field_a: false,
      field_b: false,
    },
    macroValidations: {},
    sectionValidations: {},
    finalValidation: null,
    studioCanEdit: false,
    status: 'in_progress',
    completedAt: null,
    completedById: null,
    version: 1,
    parentId: null,
    isLatest: true,
    fieldMeta: {},
  } as any;

  beforeEach(async () => {
    preassessmentRepository = mockRepository();
    userRepository = mockRepository();
    licenseRepository = mockRepository();
    sublicenseRepository = mockRepository();
    clientRepository = mockRepository();
    questionManagementService = {
      getCompleteStructure: jest.fn().mockResolvedValue([
        {
          code: 'a',
          label: 'Area A',
          sections: [
            {
              code: 'sec_a',
              fields: [{ fieldId: 'field_a', required: true }],
            },
          ],
        },
        {
          code: 'b',
          label: 'Area B',
          sections: [
            {
              code: 'sec_b',
              fields: [{ fieldId: 'field_b', required: true }],
            },
          ],
        },
      ]),
      getAllMacroAreas: jest.fn().mockResolvedValue([
        { code: 'a', label: 'Area A' },
        { code: 'b', label: 'Area B' },
      ]),
    };
    notificationsService = {
      notifyCompletion: jest.fn().mockResolvedValue(undefined),
      notifyFinalValidation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckupPreassessmentService,
        { provide: getRepositoryToken(CheckupPreassessment), useValue: preassessmentRepository },
        { provide: getRepositoryToken(CheckupUser), useValue: userRepository },
        { provide: getRepositoryToken(CheckupLicense), useValue: licenseRepository },
        { provide: getRepositoryToken(CheckupSublicense), useValue: sublicenseRepository },
        { provide: getRepositoryToken(CheckupClient), useValue: clientRepository },
        { provide: QuestionManagementService, useValue: questionManagementService },
        { provide: CheckupAuditLogService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        { provide: CheckupPreassessmentNotificationsService, useValue: notificationsService },
        { provide: CheckupPreassessmentRenderService, useValue: { renderHtmlToPdf: jest.fn() } },
      ],
    }).compile();

    service = module.get(CheckupPreassessmentService);

    clientRepository.findOne.mockResolvedValue({ id: 'client-1', attivo: true });
    preassessmentRepository.findOne.mockResolvedValue({ ...baseRecord });
    sublicenseRepository.findOne.mockResolvedValue({ id: 'sub-1', licenseId: 'lic-1', clientId: 'client-1', attiva: true });
    licenseRepository.findOne.mockResolvedValue({ id: 'lic-1', modelId: 'model-1', studioId: 'studio-1' });
    userRepository.find.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('preserves data and notes outside the assigned macro areas during client updates', async () => {
    const result = await service.update(baseUser, {
      data: {
        owner_a_email: 'malicious@example.com',
        field_a: 'new-a',
        field_b: 'malicious-b',
      },
      userFieldNotes: {
        field_a: 'new-note-a',
        field_b: 'malicious-note-b',
      },
      naFields: {
        field_a: true,
        field_b: true,
      },
    });

    expect(result.data).toMatchObject({
      owner_a_email: 'owner@example.com',
      field_a: 'new-a',
      field_b: 'old-b',
    });
    expect(result.userFieldNotes).toMatchObject({
      field_a: 'new-note-a',
      field_b: 'note-b',
    });
    expect(result.naFields).toMatchObject({
      field_a: true,
      field_b: false,
    });
  });

  it('rejects macro validations outside the assigned macro areas', async () => {
    await expect(service.update(baseUser, {
      macroValidations: {
        b: {
          by: { id: 'user-1', name: 'Mario Rossi', ruolo: 'cliente' },
          at: '2026-03-07T12:00:00.000Z',
        },
      },
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects macro validations for assigned areas when the user is not the owner', async () => {
    preassessmentRepository.findOne.mockResolvedValue({
      ...baseRecord,
      data: {
        ...baseRecord.data,
        owner_a_email: 'other-owner@example.com',
      },
    });

    await expect(service.update(baseUser, {
      macroValidations: {
        a: {
          by: { id: 'user-1', name: 'Mario Rossi', ruolo: 'cliente' },
          at: '2026-03-07T12:00:00.000Z',
        },
      },
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows final validation by the super-owner when all areas and sections are validated', async () => {
    preassessmentRepository.findOne.mockResolvedValue({
      ...baseRecord,
      macroAreaAssignments: ['a'],
      macroValidations: {
        a: { by: { id: 'user-1', name: 'Mario Rossi', ruolo: 'cliente' }, at: '2026-03-07T12:00:00.000Z' },
        b: { by: { id: 'user-2', name: 'Giulia Bianchi', ruolo: 'cliente' }, at: '2026-03-07T12:01:00.000Z' },
      },
      sectionValidations: {
        sec_a: { by: { id: 'user-1', name: 'Mario Rossi', ruolo: 'cliente' }, at: '2026-03-07T12:00:00.000Z' },
        sec_b: { by: { id: 'user-2', name: 'Giulia Bianchi', ruolo: 'cliente' }, at: '2026-03-07T12:01:00.000Z' },
      },
      status: 'concluso',
    });
    clientRepository.findOne.mockResolvedValue({ id: 'client-1', nome: 'Cliente Demo', ragioneSociale: 'Cliente Demo' });
    userRepository.find.mockResolvedValue([{ id: 'admin-1', email: 'admin@studio.it', ruolo: 'admin_studio', attivo: true }]);

    const result = await service.finalValidate({
      ...baseUser,
      superOwner: true,
      macroAreaAssignments: ['a', 'b'],
    } as any);

    expect(result.finalValidation).toEqual(expect.objectContaining({
      by: expect.objectContaining({ id: 'user-1', name: 'Mario Rossi' }),
    }));
    expect(notificationsService.notifyFinalValidation).toHaveBeenCalled();
  });

  it('rejects final validation when the user is not a super-owner', async () => {
    await expect(service.finalValidate(baseUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects final validation if not all sections are validated', async () => {
    preassessmentRepository.findOne.mockResolvedValue({
      ...baseRecord,
      macroValidations: {
        a: { by: { id: 'user-1', name: 'Mario Rossi', ruolo: 'cliente' }, at: '2026-03-07T12:00:00.000Z' },
        b: { by: { id: 'user-2', name: 'Giulia Bianchi', ruolo: 'cliente' }, at: '2026-03-07T12:01:00.000Z' },
      },
      sectionValidations: {
        sec_a: { by: { id: 'user-1', name: 'Mario Rossi', ruolo: 'cliente' }, at: '2026-03-07T12:00:00.000Z' },
      },
    });

    await expect(service.finalValidate({
      ...baseUser,
      superOwner: true,
      macroAreaAssignments: ['a', 'b'],
    } as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
