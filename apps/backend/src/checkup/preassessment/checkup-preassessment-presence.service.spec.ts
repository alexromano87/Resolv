import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CheckupPreassessmentPresenceService } from './checkup-preassessment-presence.service';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import type { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<CheckupCurrentUserData> = {}): CheckupCurrentUserData => ({
  id: 'user-1',
  email: 'test@example.com',
  nome: 'Mario',
  cognome: 'Rossi',
  ruolo: 'admin_studio',
  studioId: 'studio-1',
  clientId: undefined,
  ...overrides,
} as CheckupCurrentUserData);

const makePreassessment = (overrides: Partial<CheckupPreassessment> = {}): CheckupPreassessment =>
  ({ id: 'pa-1', clientId: 'client-1', studioCanEdit: true, ...overrides } as CheckupPreassessment);

const makeClient = (overrides: Partial<CheckupClient> = {}): CheckupClient =>
  ({ id: 'client-1', ...overrides } as CheckupClient);

const makeLicense = (overrides = {}) => ({ id: 'license-1', ...overrides });
const makeSublicense = (overrides = {}) => ({ id: 'sub-1', licenseId: 'license-1', clientId: 'client-1', attiva: true, ...overrides });

// ── Test suite ────────────────────────────────────────────────────────────────

describe('CheckupPreassessmentPresenceService', () => {
  let service: CheckupPreassessmentPresenceService;

  let preassessmentRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let clientRepo: { findOne: jest.Mock };
  let licenseRepo: { findOne: jest.Mock };
  let sublicenseRepo: { findOne: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    preassessmentRepo = { findOne: jest.fn(), find: jest.fn() };
    clientRepo = { findOne: jest.fn() };
    licenseRepo = { findOne: jest.fn() };
    sublicenseRepo = { findOne: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckupPreassessmentPresenceService,
        { provide: getRepositoryToken(CheckupPreassessment), useValue: preassessmentRepo },
        { provide: getRepositoryToken(CheckupClient), useValue: clientRepo },
        { provide: getRepositoryToken(CheckupLicense), useValue: licenseRepo },
        { provide: getRepositoryToken(CheckupSublicense), useValue: sublicenseRepo },
      ],
    }).compile();

    service = module.get(CheckupPreassessmentPresenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── setPresenceActive ────────────────────────────────────────────────────────

  describe('setPresenceActive', () => {
    it('imposta la presenza per un utente staff autorizzato', async () => {
      const user = makeUser({ ruolo: 'admin_studio', studioId: 'studio-1' });
      const pa = makePreassessment({ studioCanEdit: true });
      preassessmentRepo.findOne.mockResolvedValue(pa);
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      const result = await service.setPresenceActive('pa-1', 'field-1', user);

      expect(result).toEqual({ ok: true });
    });

    it('imposta la presenza per il cliente proprietario', async () => {
      const user = makeUser({ ruolo: 'cliente', clientId: 'client-1', studioId: undefined });
      const pa = makePreassessment({ clientId: 'client-1', studioCanEdit: false });
      preassessmentRepo.findOne.mockResolvedValue(pa);
      clientRepo.findOne.mockResolvedValue(makeClient());

      const result = await service.setPresenceActive('pa-1', 'field-1', user);

      expect(result).toEqual({ ok: true });
    });

    it('lancia ForbiddenException se lo studio non può modificare e non è il proprietario', async () => {
      const user = makeUser({ ruolo: 'admin_studio', studioId: 'studio-1', clientId: undefined });
      const pa = makePreassessment({ studioCanEdit: false, clientId: 'client-1' });
      preassessmentRepo.findOne.mockResolvedValue(pa);
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      await expect(service.setPresenceActive('pa-1', 'field-1', user))
        .rejects.toThrow(ForbiddenException);
    });

    it('lancia ForbiddenException se il campo è già in uso da un altro utente', async () => {
      const user1 = makeUser({ id: 'user-1', ruolo: 'admin_studio', studioId: 'studio-1' });
      const user2 = makeUser({ id: 'user-2', ruolo: 'admin_studio', studioId: 'studio-1' });
      const pa = makePreassessment({ studioCanEdit: true });

      preassessmentRepo.findOne.mockResolvedValue(pa);
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      // user1 acquisisce il campo
      await service.setPresenceActive('pa-1', 'field-lock', user1);

      // user2 tenta di acquisire lo stesso campo (non ancora scaduto)
      await expect(service.setPresenceActive('pa-1', 'field-lock', user2))
        .rejects.toThrow(ForbiddenException);
    });

    it('consente a un secondo utente di acquisire un campo scaduto', async () => {
      const user1 = makeUser({ id: 'user-1', ruolo: 'admin_studio', studioId: 'studio-1' });
      const user2 = makeUser({ id: 'user-2', ruolo: 'admin_studio', studioId: 'studio-1' });
      const pa = makePreassessment({ studioCanEdit: true });

      preassessmentRepo.findOne.mockResolvedValue(pa);
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      // Simuliamo un campo con presenza già scaduta inserendola direttamente nella mappa interna
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const presenceMap = new Map([['expired-field', { userId: 'user-1', name: 'Mario Rossi', expiresAt: Date.now() - 1000 }]]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', presenceMap);

      const result = await service.setPresenceActive('pa-1', 'expired-field', user2);
      expect(result).toEqual({ ok: true });
    });

    it('lancia NotFoundException se il preassessment non esiste', async () => {
      preassessmentRepo.findOne.mockResolvedValue(null);

      await expect(service.setPresenceActive('missing', 'field-1', makeUser()))
        .rejects.toThrow(NotFoundException);
    });

    it('lancia NotFoundException se il client non esiste', async () => {
      preassessmentRepo.findOne.mockResolvedValue(makePreassessment());
      clientRepo.findOne.mockResolvedValue(null);

      await expect(service.setPresenceActive('pa-1', 'field-1', makeUser()))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── setPresenceInactive ──────────────────────────────────────────────────────

  describe('setPresenceInactive', () => {
    it('rimuove la presenza del proprio utente', async () => {
      const user = makeUser({ id: 'user-1', ruolo: 'admin_studio', studioId: 'studio-1' });
      const pa = makePreassessment({ studioCanEdit: true });

      preassessmentRepo.findOne.mockResolvedValue(pa);
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      // Inserisci presenza direttamente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const presenceMap = new Map([['field-1', { userId: 'user-1', name: 'Mario Rossi', expiresAt: Date.now() + 30000 }]]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', presenceMap);

      const result = await service.setPresenceInactive('pa-1', 'field-1', user);
      expect(result).toEqual({ ok: true });

      // La presenza deve essere rimossa
      const presence = await service.getPresence('pa-1', user);
      expect(presence.fields).toHaveLength(0);
    });

    it('non rimuove la presenza di un altro utente', async () => {
      const user2 = makeUser({ id: 'user-2', ruolo: 'admin_studio', studioId: 'studio-1' });

      preassessmentRepo.findOne.mockResolvedValue(makePreassessment());
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      // La presenza appartiene a user-1
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const presenceMap = new Map([['field-1', { userId: 'user-1', name: 'Mario Rossi', expiresAt: Date.now() + 30000 }]]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', presenceMap);

      await service.setPresenceInactive('pa-1', 'field-1', user2);

      // La presenza di user-1 NON deve essere rimossa
      expect(presenceMap.has('field-1')).toBe(true);
    });
  });

  // ── getPresence ──────────────────────────────────────────────────────────────

  describe('getPresence', () => {
    it('restituisce array vuoto se nessuna presenza attiva', async () => {
      const user = makeUser();
      preassessmentRepo.findOne.mockResolvedValue(makePreassessment());
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      const result = await service.getPresence('pa-1', user);

      expect(result).toEqual({ fields: [] });
    });

    it('restituisce i campi con presenza attiva', async () => {
      const user = makeUser({ ruolo: 'admin_studio', studioId: 'studio-1' });
      preassessmentRepo.findOne.mockResolvedValue(makePreassessment({ studioCanEdit: true }));
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      await service.setPresenceActive('pa-1', 'field-A', user);

      const result = await service.getPresence('pa-1', user);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0]).toMatchObject({ fieldId: 'field-A', userId: 'user-1' });
    });

    it('rimuove automaticamente le presenze scadute', async () => {
      const user = makeUser();
      preassessmentRepo.findOne.mockResolvedValue(makePreassessment());
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(makeSublicense());

      // Inserisce presenza già scaduta
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const presenceMap = new Map([['old-field', { userId: 'user-1', name: 'Test', expiresAt: Date.now() - 5000 }]]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', presenceMap);

      const result = await service.getPresence('pa-1', user);

      expect(result.fields).toHaveLength(0);
    });
  });

  // ── getOnline ────────────────────────────────────────────────────────────────

  describe('getOnline', () => {
    it('restituisce array vuoto se nessuna presenza attiva', async () => {
      const user = makeUser();
      const result = await service.getOnline(user);
      expect(result).toEqual({ preassessmentIds: [] });
    });

    it('restituisce gli id dei preassessment attivi per lo staff', async () => {
      const user = makeUser({ ruolo: 'admin_studio', studioId: 'studio-1' });

      // Inserisci presenza attiva
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', new Map([
        ['f1', { userId: 'user-1', name: 'A', expiresAt: Date.now() + 30000 }],
      ]));

      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.find.mockResolvedValue([makeSublicense()]);
      preassessmentRepo.find.mockResolvedValue([{ id: 'pa-1', clientId: 'client-1' }]);

      const result = await service.getOnline(user);

      expect(result.preassessmentIds).toContain('pa-1');
    });

    it('restituisce array vuoto per staff senza licenza', async () => {
      const user = makeUser({ ruolo: 'admin_studio', studioId: 'studio-1' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', new Map([
        ['f1', { userId: 'user-1', name: 'A', expiresAt: Date.now() + 30000 }],
      ]));

      licenseRepo.findOne.mockResolvedValue(null);

      const result = await service.getOnline(user);

      expect(result.preassessmentIds).toHaveLength(0);
    });

    it('per un cliente restituisce solo il suo preassessment', async () => {
      const user = makeUser({ ruolo: 'cliente', clientId: 'client-1', studioId: undefined });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', new Map([
        ['f1', { userId: 'user-1', name: 'A', expiresAt: Date.now() + 30000 }],
      ]));

      preassessmentRepo.findOne.mockResolvedValue({ id: 'pa-1', clientId: 'client-1' });

      const result = await service.getOnline(user);

      expect(result.preassessmentIds).toContain('pa-1');
    });

    it('per un cliente senza clientId restituisce array vuoto', async () => {
      const user = makeUser({ ruolo: 'cliente', clientId: undefined, studioId: undefined });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', new Map([
        ['f1', { userId: 'user-1', name: 'A', expiresAt: Date.now() + 30000 }],
      ]));

      const result = await service.getOnline(user);

      expect(result.preassessmentIds).toHaveLength(0);
    });
  });

  // ── cleanupAllPresence ───────────────────────────────────────────────────────

  describe('cleanupAllPresence', () => {
    it('rimuove solo le presenze scadute', () => {
      const now = Date.now();
      const presenceMap = new Map([
        ['active-field', { userId: 'u1', name: 'A', expiresAt: now + 30000 }],
        ['expired-field', { userId: 'u2', name: 'B', expiresAt: now - 1000 }],
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-1', presenceMap);

      service.cleanupAllPresence();

      expect(presenceMap.has('active-field')).toBe(true);
      expect(presenceMap.has('expired-field')).toBe(false);
    });

    it('rimuove la mappa di un preassessment se tutti i campi sono scaduti', () => {
      const now = Date.now();
      const presenceMap = new Map([
        ['f1', { userId: 'u1', name: 'A', expiresAt: now - 1000 }],
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-orphan', presenceMap);

      service.cleanupAllPresence();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).presenceByPreassessment.has('pa-orphan')).toBe(false);
    });

    it('non rimuove nulla se tutte le presenze sono attive', () => {
      const now = Date.now();
      const presenceMap = new Map([
        ['f1', { userId: 'u1', name: 'A', expiresAt: now + 30000 }],
        ['f2', { userId: 'u2', name: 'B', expiresAt: now + 30000 }],
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).presenceByPreassessment.set('pa-full', presenceMap);

      service.cleanupAllPresence();

      expect(presenceMap.size).toBe(2);
    });
  });

  // ── access control ───────────────────────────────────────────────────────────

  describe('checkAccess', () => {
    it('consente accesso al cliente che possiede il clientId', async () => {
      const user = makeUser({ ruolo: 'cliente', clientId: 'client-1', studioId: undefined });
      preassessmentRepo.findOne.mockResolvedValue(makePreassessment({ studioCanEdit: false }));
      clientRepo.findOne.mockResolvedValue(makeClient());

      // setPresenceActive è il modo più diretto per testare checkAccessByPreassessmentId
      // Il cliente può modificare il proprio preassessment
      const result = await service.setPresenceActive('pa-1', 'f', user);
      expect(result).toEqual({ ok: true });
    });

    it('lancia ForbiddenException per uno staff senza licenza attiva per il cliente', async () => {
      const user = makeUser({ ruolo: 'admin_studio', studioId: 'studio-1', clientId: undefined });
      preassessmentRepo.findOne.mockResolvedValue(makePreassessment({ studioCanEdit: true }));
      clientRepo.findOne.mockResolvedValue(makeClient());
      licenseRepo.findOne.mockResolvedValue(makeLicense());
      sublicenseRepo.findOne.mockResolvedValue(null); // nessuna sublicenza attiva

      await expect(service.setPresenceActive('pa-1', 'f', user))
        .rejects.toThrow(ForbiddenException);
    });

    it('lancia ForbiddenException per utente senza studioId né clientId corrispondente', async () => {
      const user = makeUser({ ruolo: 'admin_studio', studioId: undefined, clientId: 'other' });
      preassessmentRepo.findOne.mockResolvedValue(makePreassessment({ clientId: 'client-1' }));
      clientRepo.findOne.mockResolvedValue(makeClient());

      await expect(service.getPresence('pa-1', user))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
