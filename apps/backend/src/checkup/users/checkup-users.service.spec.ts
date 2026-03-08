import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CheckupUsersService } from './checkup-users.service';
import { CheckupUser } from './checkup-user.entity';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupMailService } from '../mail/checkup-mail.service';
import { CheckupPreassessment } from '../preassessment/checkup-preassessment.entity';
import { QuestionManagementService } from '../services/question-management.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  create: jest.fn((entity) => entity),
  save: jest.fn(async (entity) => ({ id: 'user-1', ...entity })),
});

describe('CheckupUsersService', () => {
  let service: CheckupUsersService;
  let userRepository: ReturnType<typeof mockRepository>;
  let studioRepository: ReturnType<typeof mockRepository>;
  let clientRepository: ReturnType<typeof mockRepository>;
  let licenseRepository: ReturnType<typeof mockRepository>;
  let sublicenseRepository: ReturnType<typeof mockRepository>;
  let preassessmentRepository: ReturnType<typeof mockRepository>;
  let mailService: { sendMail: jest.Mock };
  let questionManagementService: { getAllMacroAreas: jest.Mock };

  const currentUser = {
    id: 'admin-1',
    ruolo: 'admin_studio',
    studioId: 'studio-1',
    email: 'admin@example.com',
  } as any;

  beforeEach(async () => {
    userRepository = mockRepository();
    studioRepository = mockRepository();
    clientRepository = mockRepository();
    licenseRepository = mockRepository();
    sublicenseRepository = mockRepository();
    preassessmentRepository = mockRepository();
    mailService = { sendMail: jest.fn() };
    questionManagementService = {
      getAllMacroAreas: jest.fn().mockResolvedValue([
        { code: 'a', label: 'Area A' },
        { code: 'b', label: 'Area B' },
        { code: 'k', label: 'Owner' },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckupUsersService,
        { provide: getRepositoryToken(CheckupUser), useValue: userRepository },
        { provide: getRepositoryToken(CheckupStudio), useValue: studioRepository },
        { provide: getRepositoryToken(CheckupClient), useValue: clientRepository },
        { provide: getRepositoryToken(CheckupLicense), useValue: licenseRepository },
        { provide: getRepositoryToken(CheckupSublicense), useValue: sublicenseRepository },
        { provide: getRepositoryToken(CheckupPreassessment), useValue: preassessmentRepository },
        { provide: CheckupMailService, useValue: mailService },
        { provide: QuestionManagementService, useValue: questionManagementService },
      ],
    }).compile();

    service = module.get(CheckupUsersService);

    userRepository.findOne.mockResolvedValue(null);
    userRepository.find.mockResolvedValue([]);
    userRepository.count.mockResolvedValue(0);
    studioRepository.findOne.mockResolvedValue({ id: 'studio-1', tipo: 'licenziatario' });
    clientRepository.findOne.mockResolvedValue({ id: 'client-1', attivo: true });
    sublicenseRepository.findOne.mockResolvedValue({
      id: 'sub-1',
      clientId: 'client-1',
      licenseId: 'lic-1',
      numeroUtenze: 5,
      license: { studioId: 'studio-1' },
    });
    licenseRepository.findOne.mockResolvedValue({
      id: 'lic-1',
      studioId: 'studio-1',
      modelId: 'model-1',
      model: { id: 'model-1' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows creating a client user without owner and with explicit macro assignments', async () => {
    const result = await service.create({
      email: 'cliente@example.com',
      password: 'Password123!',
      nome: 'Mario',
      cognome: 'Rossi',
      ruolo: 'cliente',
      clientId: 'client-1',
      sublicenseId: 'sub-1',
      macroAreaAssignments: ['a', 'b'],
      macroAreaOwner: [],
    }, currentUser);

    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
    expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      ruolo: 'cliente',
      clientId: 'client-1',
      sublicenseId: 'sub-1',
      macroAreaAssignments: ['a', 'b'],
      macroAreaOwner: [],
    }));
    expect(result).toMatchObject({
      email: 'cliente@example.com',
      macroAreaAssignments: ['a', 'b'],
      macroAreaOwner: [],
    });
  });

  it('rejects owner macro areas outside the assigned macro areas', async () => {
    await expect(service.create({
      email: 'cliente@example.com',
      password: 'Password123!',
      nome: 'Mario',
      cognome: 'Rossi',
      ruolo: 'cliente',
      clientId: 'client-1',
      sublicenseId: 'sub-1',
      macroAreaAssignments: ['a'],
      macroAreaOwner: ['b'],
    }, currentUser)).rejects.toBeInstanceOf(ConflictException);

    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate owners on the same macro area for the same client', async () => {
    userRepository.find.mockResolvedValue([
      {
        id: 'user-existing',
        clientId: 'client-1',
        attivo: true,
        nome: 'Giulia',
        cognome: 'Bianchi',
        email: 'giulia@example.com',
        macroAreaOwner: ['a'],
      },
    ]);

    await expect(service.create({
      email: 'cliente@example.com',
      password: 'Password123!',
      nome: 'Mario',
      cognome: 'Rossi',
      ruolo: 'cliente',
      clientId: 'client-1',
      sublicenseId: 'sub-1',
      macroAreaAssignments: ['a'],
      macroAreaOwner: ['a'],
    }, currentUser)).rejects.toThrow(
      'La macro area "Area A" risulta gia assegnata come owner a Giulia Bianchi.',
    );

    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a second active super-owner for the same client', async () => {
    userRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'user-super-owner',
        clientId: 'client-1',
        attivo: true,
        superOwner: true,
        nome: 'Laura',
        cognome: 'Verdi',
        email: 'laura@example.com',
      });

    await expect(service.create({
      email: 'cliente@example.com',
      password: 'Password123!',
      nome: 'Mario',
      cognome: 'Rossi',
      ruolo: 'cliente',
      clientId: 'client-1',
      sublicenseId: 'sub-1',
      macroAreaAssignments: ['a', 'b'],
      macroAreaOwner: [],
      superOwner: true,
    }, currentUser)).rejects.toThrow(
      'Esiste gia un Super-owner attivo per questo cliente: Laura Verdi.',
    );
  });
});
