import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupPreassessmentValidationService } from './checkup-preassessment-validation.service';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { CheckupPreassessmentNotificationsService } from './checkup-preassessment-notifications.service';
import { CheckupPreassessmentRenderService } from './checkup-preassessment-render.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((entity) => entity),
  save: jest.fn(async (entity) => entity),
});

/**
 * Creates a mock ValidationService that delegates pure logic to the real
 * implementation while allowing structure-lookup methods to be overridden.
 */
function makeValidationServiceMock(structureOverrides: {
  getCompleteStructure?: jest.Mock;
  getAllMacroAreas?: jest.Mock;
} = {}) {
  // Import the real class for pure-logic methods
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CheckupPreassessmentValidationService: RealVS } = require('./checkup-preassessment-validation.service');

  const real = new RealVS({
    getCompleteStructure: structureOverrides.getCompleteStructure ?? jest.fn().mockResolvedValue([
      {
        code: 'a', label: 'Area A',
        sections: [{ code: 'sec_a', fields: [{ fieldId: 'field_a', required: true }] }],
      },
      {
        code: 'b', label: 'Area B',
        sections: [{ code: 'sec_b', fields: [{ fieldId: 'field_b', required: true }] }],
      },
    ]),
    getAllMacroAreas: structureOverrides.getAllMacroAreas ?? jest.fn().mockResolvedValue([
      { code: 'a', label: 'Area A' },
      { code: 'b', label: 'Area B' },
    ]),
  });

  return real as CheckupPreassessmentValidationService;
}

describe('CheckupPreassessmentService', () => {
  let service: CheckupPreassessmentService;
  let preassessmentRepository: ReturnType<typeof mockRepository>;
  let userRepository: ReturnType<typeof mockRepository>;
  let licenseRepository: ReturnType<typeof mockRepository>;
  let sublicenseRepository: ReturnType<typeof mockRepository>;
  let clientRepository: ReturnType<typeof mockRepository>;
  let notificationsService: { notifyCompletion: jest.Mock; notifyFinalValidation: jest.Mock };
  let validationService: CheckupPreassessmentValidationService;
  let mockQueryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  };

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
    notificationsService = {
      notifyCompletion: jest.fn().mockResolvedValue(undefined),
      notifyFinalValidation: jest.fn().mockResolvedValue(undefined),
    };
    validationService = makeValidationServiceMock();

    // QueryRunner mock — used by complete() and finalValidate() transactions
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn().mockResolvedValue({ ...baseRecord }),
        save: jest.fn().mockImplementation(async (entity: any) => entity),
        create: jest.fn((_: any, data: any) => data),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckupPreassessmentService,
        { provide: getRepositoryToken(CheckupPreassessment), useValue: preassessmentRepository },
        { provide: getRepositoryToken(CheckupUser), useValue: userRepository },
        { provide: getRepositoryToken(CheckupLicense), useValue: licenseRepository },
        { provide: getRepositoryToken(CheckupSublicense), useValue: sublicenseRepository },
        { provide: getRepositoryToken(CheckupClient), useValue: clientRepository },
        { provide: CheckupAuditLogService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        { provide: CheckupPreassessmentNotificationsService, useValue: notificationsService },
        { provide: CheckupPreassessmentRenderService, useValue: { renderHtmlToPdf: jest.fn() } },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) } },
        { provide: CheckupPreassessmentValidationService, useValue: validationService },
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

  it('allows final validation by the super-owner when all relevant sections are validated', async () => {
    // finalValidate() ora usa queryRunner.manager.findOne (transazione con write lock)
    mockQueryRunner.manager.findOne.mockResolvedValue({
      ...baseRecord,
      macroAreaAssignments: ['a'],
      sectionValidations: {
        sec_a: { by: { id: 'user-1', name: 'Mario Rossi', ruolo: 'cliente' }, at: '2026-03-07T12:00:00.000Z' },
        sec_b: { by: { id: 'user-2', name: 'Giulia Bianchi', ruolo: 'cliente' }, at: '2026-03-07T12:01:00.000Z' },
      },
      status: 'in_progress',
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
    // finalValidate() ora usa queryRunner.manager.findOne (transazione con write lock)
    mockQueryRunner.manager.findOne.mockResolvedValue({
      ...baseRecord,
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

  it('allows the super-owner to reopen a checkup already closed', async () => {
    mockQueryRunner.manager.findOne.mockResolvedValue({
      ...baseRecord,
      status: 'concluso',
      finalValidation: {
        by: { id: 'user-1', name: 'Mario Rossi', ruolo: 'cliente' },
        at: '2026-03-07T12:00:00.000Z',
      },
      completedAt: new Date('2026-03-07T12:00:00.000Z'),
      completedById: 'user-1',
    });

    const result = await service.reopenFinalValidation({
      ...baseUser,
      superOwner: true,
    } as any);

    expect(result.status).toBe('in_progress');
    expect(result.finalValidation).toBeNull();
    expect(result.completedAt).toBeNull();
    expect(result.completedById).toBeNull();
  });
});
