import { Test, TestingModule } from '@nestjs/testing';
import {
  CheckupPreassessmentValidationService,
  OWNER_EMAIL_BY_MACRO,
  OWNER_EMAIL_FIELDS,
} from './checkup-preassessment-validation.service';
import { QuestionManagementService } from '../services/question-management.service';

// ── Mock structure ─────────────────────────────────────────────────────────────

const mockStructure = [
  {
    code: 'a',
    label: 'Area A',
    sections: [
      {
        code: 'sec_a',
        fields: [
          { fieldId: 'field_a', required: true },
          { fieldId: 'field_a2', required: false },
        ],
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
  {
    code: 'k',
    label: 'Owner Area',
    sections: [
      {
        code: 'sec_k',
        fields: [{ fieldId: 'owner_a_email', required: true }],
      },
    ],
  },
];

const mockAllMacroAreas = [
  { code: 'a', label: 'Area A' },
  { code: 'b', label: 'Area B' },
  { code: 'k', label: 'Owner Area' },
];

function makeQMS(overrides: Record<string, jest.Mock> = {}) {
  return {
    getCompleteStructure: jest.fn().mockResolvedValue(mockStructure),
    getAllMacroAreas: jest.fn().mockResolvedValue(mockAllMacroAreas),
    ...overrides,
  };
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('CheckupPreassessmentValidationService', () => {
  let service: CheckupPreassessmentValidationService;
  let qms: ReturnType<typeof makeQMS>;

  beforeEach(async () => {
    qms = makeQMS();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckupPreassessmentValidationService,
        { provide: QuestionManagementService, useValue: qms },
      ],
    }).compile();

    service = module.get(CheckupPreassessmentValidationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── Costanti ────────────────────────────────────────────────────────────────

  describe('OWNER_EMAIL_BY_MACRO', () => {
    it('copre le aree a-j', () => {
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].forEach((k) =>
        expect(OWNER_EMAIL_BY_MACRO).toHaveProperty(k),
      );
    });

    it('ogni valore segue il pattern owner_X_email', () => {
      Object.entries(OWNER_EMAIL_BY_MACRO).forEach(([code, field]) => {
        expect(field).toBe(`owner_${code}_email`);
      });
    });
  });

  describe('OWNER_EMAIL_FIELDS', () => {
    it('è un Set che contiene tutti i valori di OWNER_EMAIL_BY_MACRO', () => {
      Object.values(OWNER_EMAIL_BY_MACRO).forEach((v) =>
        expect(OWNER_EMAIL_FIELDS.has(v)).toBe(true),
      );
    });

    it('non contiene valori estranei', () => {
      expect(OWNER_EMAIL_FIELDS.size).toBe(Object.keys(OWNER_EMAIL_BY_MACRO).length);
    });
  });

  // ── isOwnerMacroArea ────────────────────────────────────────────────────────

  describe('isOwnerMacroArea()', () => {
    it('restituisce true per code "k"', () => {
      expect(service.isOwnerMacroArea('k')).toBe(true);
    });

    it('restituisce true se la label contiene "owner" (case-insensitive)', () => {
      expect(service.isOwnerMacroArea('z', 'Owner Area')).toBe(true);
      expect(service.isOwnerMacroArea('z', 'OWNER')).toBe(true);
      expect(service.isOwnerMacroArea('z', 'super owner section')).toBe(true);
    });

    it('restituisce false per code "k" con label senza "owner" — code vince', () => {
      // code=k è sempre owner indipendentemente dalla label
      expect(service.isOwnerMacroArea('k', 'Normal Area')).toBe(true);
    });

    it('restituisce false per codici normali senza label owner', () => {
      expect(service.isOwnerMacroArea('a')).toBe(false);
      expect(service.isOwnerMacroArea('b', 'Area B')).toBe(false);
      expect(service.isOwnerMacroArea('z')).toBe(false);
    });
  });

  // ── isSuperOwner ────────────────────────────────────────────────────────────

  describe('isSuperOwner()', () => {
    it('restituisce true se ruolo=cliente e superOwner=true', () => {
      expect(service.isSuperOwner({ ruolo: 'cliente', superOwner: true } as any)).toBe(true);
    });

    it('restituisce false se superOwner è false', () => {
      expect(service.isSuperOwner({ ruolo: 'cliente', superOwner: false } as any)).toBe(false);
    });

    it('restituisce false se superOwner è assente', () => {
      expect(service.isSuperOwner({ ruolo: 'cliente' } as any)).toBe(false);
    });

    it('restituisce false se ruolo non è cliente', () => {
      expect(service.isSuperOwner({ ruolo: 'admin_studio', superOwner: true } as any)).toBe(false);
      expect(service.isSuperOwner({ ruolo: 'staff', superOwner: true } as any)).toBe(false);
    });
  });

  // ── isOwnerForMacro ─────────────────────────────────────────────────────────

  describe('isOwnerForMacro()', () => {
    const makeRecord = (ownerEmail: string) =>
      ({ data: { owner_a_email: ownerEmail } }) as any;

    it('restituisce true se email dell\'utente corrisponde al campo owner', () => {
      const record = makeRecord('owner@example.com');
      const user = { ruolo: 'cliente', email: 'owner@example.com' } as any;
      expect(service.isOwnerForMacro(record, user, 'a')).toBe(true);
    });

    it('confronto case-insensitive (email uppercase nel record)', () => {
      const record = makeRecord('OWNER@EXAMPLE.COM');
      const user = { ruolo: 'cliente', email: 'owner@example.com' } as any;
      expect(service.isOwnerForMacro(record, user, 'a')).toBe(true);
    });

    it('confronto case-insensitive (email uppercase nell\'utente)', () => {
      const record = makeRecord('owner@example.com');
      const user = { ruolo: 'cliente', email: 'OWNER@EXAMPLE.COM' } as any;
      expect(service.isOwnerForMacro(record, user, 'a')).toBe(true);
    });

    it('restituisce false se email non corrisponde', () => {
      const record = makeRecord('other@example.com');
      const user = { ruolo: 'cliente', email: 'owner@example.com' } as any;
      expect(service.isOwnerForMacro(record, user, 'a')).toBe(false);
    });

    it('restituisce false se ruolo non è cliente', () => {
      const record = makeRecord('admin@studio.it');
      const user = { ruolo: 'admin_studio', email: 'admin@studio.it' } as any;
      expect(service.isOwnerForMacro(record, user, 'a')).toBe(false);
    });

    it('restituisce false se macroId non esiste nella mappa OWNER_EMAIL_BY_MACRO', () => {
      const record = makeRecord('owner@example.com');
      const user = { ruolo: 'cliente', email: 'owner@example.com' } as any;
      expect(service.isOwnerForMacro(record, user, 'z')).toBe(false);
    });

    it('restituisce false se il campo owner email è vuoto', () => {
      const record = makeRecord('');
      const user = { ruolo: 'cliente', email: 'owner@example.com' } as any;
      expect(service.isOwnerForMacro(record, user, 'a')).toBe(false);
    });

    it('restituisce false se record.data è null', () => {
      const record = { data: null } as any;
      const user = { ruolo: 'cliente', email: 'owner@example.com' } as any;
      expect(service.isOwnerForMacro(record, user, 'a')).toBe(false);
    });
  });

  // ── normalizeMacroAssignments ────────────────────────────────────────────────

  describe('normalizeMacroAssignments()', () => {
    it('rimuove duplicati', () => {
      expect(service.normalizeMacroAssignments(['a', 'a', 'b'])).toEqual(['a', 'b']);
    });

    it('trimma gli spazi bianchi', () => {
      expect(service.normalizeMacroAssignments(['  a  ', ' b'])).toEqual(['a', 'b']);
    });

    it('rimuove le stringhe vuote', () => {
      expect(service.normalizeMacroAssignments(['a', '', 'b'])).toEqual(['a', 'b']);
    });

    it('gestisce null in modo sicuro', () => {
      expect(service.normalizeMacroAssignments(null as any)).toEqual([]);
    });

    it('gestisce undefined in modo sicuro', () => {
      expect(service.normalizeMacroAssignments(undefined)).toEqual([]);
    });

    it('gestisce array vuoto', () => {
      expect(service.normalizeMacroAssignments([])).toEqual([]);
    });
  });

  // ── mergeAllowedFieldValues ─────────────────────────────────────────────────

  describe('mergeAllowedFieldValues()', () => {
    const fieldToMacro = new Map([
      ['field_a', 'a'],
      ['field_b', 'b'],
    ]);

    it('restituisce undefined se incoming è undefined', () => {
      expect(
        service.mergeAllowedFieldValues({ field_a: 'old' }, undefined, fieldToMacro, new Set(['a'])),
      ).toBeUndefined();
    });

    it('restituisce incoming direttamente se allowedMacros è null', () => {
      const incoming = { field_a: 'new-a', field_b: 'new-b' };
      const result = service.mergeAllowedFieldValues({}, incoming, fieldToMacro, null);
      expect(result).toBe(incoming);
    });

    it('applica solo i campi appartenenti alle aree consentite', () => {
      const existing = { field_a: 'old-a', field_b: 'old-b' };
      const incoming = { field_a: 'new-a', field_b: 'new-b' };
      const result = service.mergeAllowedFieldValues(existing, incoming, fieldToMacro, new Set(['a']));
      expect(result).toEqual({ field_a: 'new-a', field_b: 'old-b' });
    });

    it('preserva i campi esistenti sconosciuti non presenti in fieldToMacro', () => {
      const existing = { field_x: 'x', field_a: 'old-a' };
      const incoming = { field_a: 'new-a' };
      const result = service.mergeAllowedFieldValues(existing, incoming, fieldToMacro, new Set(['a']));
      expect(result).toMatchObject({ field_x: 'x', field_a: 'new-a' });
    });

    it('scarta i campi incoming non presenti in fieldToMacro', () => {
      const existing = { field_a: 'old-a' };
      const incoming = { field_unknown: 'x' };
      const result = service.mergeAllowedFieldValues(existing, incoming, fieldToMacro, new Set(['a']));
      expect((result as any).field_unknown).toBeUndefined();
    });

    it('gestisce existing null', () => {
      const incoming = { field_a: 'new-a' };
      const result = service.mergeAllowedFieldValues(null, incoming, fieldToMacro, new Set(['a']));
      expect(result).toMatchObject({ field_a: 'new-a' });
    });
  });

  // ── applyFieldMeta ──────────────────────────────────────────────────────────

  describe('applyFieldMeta()', () => {
    const user = {
      id: 'u1',
      nome: 'Mario',
      cognome: 'Rossi',
      email: 'mario@example.com',
      ruolo: 'cliente',
    } as any;

    it('noop se entrambi nextData e nextNaFields sono undefined', () => {
      const record = { data: { field_a: 'v' }, naFields: {}, fieldMeta: {} } as any;
      service.applyFieldMeta(record, undefined, undefined, user);
      expect(record.fieldMeta).toEqual({});
    });

    it('aggiorna fieldMeta per campi con valore modificato', () => {
      const record = { data: { field_a: 'old' }, naFields: {}, fieldMeta: {} } as any;
      service.applyFieldMeta(record, { field_a: 'new' }, undefined, user);
      expect(record.fieldMeta.field_a).toMatchObject({
        updatedBy: { id: 'u1', name: 'Mario Rossi', ruolo: 'cliente' },
      });
      expect(typeof record.fieldMeta.field_a.updatedAt).toBe('string');
    });

    it('non aggiorna fieldMeta per campi invariati', () => {
      const record = { data: { field_a: 'same' }, naFields: {}, fieldMeta: {} } as any;
      service.applyFieldMeta(record, { field_a: 'same' }, undefined, user);
      expect(record.fieldMeta.field_a).toBeUndefined();
    });

    it('aggiorna fieldMeta se naFields cambia', () => {
      const record = { data: {}, naFields: { field_a: false }, fieldMeta: {} } as any;
      service.applyFieldMeta(record, undefined, { field_a: true }, user);
      expect(record.fieldMeta.field_a).toBeDefined();
    });

    it('usa email come fallback se nome/cognome sono vuoti', () => {
      const anonymousUser = { id: 'u2', nome: '', cognome: '', email: 'anon@example.com', ruolo: 'cliente' } as any;
      const record = { data: { field_a: 'old' }, naFields: {}, fieldMeta: {} } as any;
      service.applyFieldMeta(record, { field_a: 'new' }, undefined, anonymousUser);
      expect(record.fieldMeta.field_a.updatedBy.name).toBe('anon@example.com');
    });

    it('aggiorna fieldMeta per campi nuovi non presenti in data', () => {
      const record = { data: {}, naFields: {}, fieldMeta: {} } as any;
      service.applyFieldMeta(record, { field_new: 'value' }, undefined, user);
      expect(record.fieldMeta.field_new).toBeDefined();
    });
  });

  // ── getNonOwnerMacroCodes ────────────────────────────────────────────────────

  describe('getNonOwnerMacroCodes()', () => {
    it('esclude le aree owner (code=k o label contiene "owner")', async () => {
      const codes = await service.getNonOwnerMacroCodes('model-1');
      expect(codes).toContain('a');
      expect(codes).toContain('b');
      expect(codes).not.toContain('k');
    });

    it('chiama getAllMacroAreas con il modelId corretto', async () => {
      await service.getNonOwnerMacroCodes('model-42');
      expect(qms.getAllMacroAreas).toHaveBeenCalledWith('model-42');
    });

    it('restituisce array vuoto se tutte le aree sono owner', async () => {
      qms.getAllMacroAreas.mockResolvedValue([
        { code: 'k', label: 'Owner' },
        { code: 'z', label: 'Another Owner Area' },
      ]);
      const codes = await service.getNonOwnerMacroCodes('model-1');
      expect(codes).toEqual([]);
    });
  });

  // ── getSectionMetaByModel ───────────────────────────────────────────────────

  describe('getSectionMetaByModel()', () => {
    it('restituisce Map con metadati per ogni sezione', async () => {
      const map = await service.getSectionMetaByModel('model-1');
      expect(map.has('sec_a')).toBe(true);
      expect(map.has('sec_b')).toBe(true);
    });

    it('mappa correttamente macroId e campi da completare', async () => {
      const map = await service.getSectionMetaByModel('model-1');
      expect(map.get('sec_a')).toMatchObject({ macroId: 'a', requiredFields: ['field_a', 'field_a2'] });
      expect(map.get('sec_b')).toMatchObject({ macroId: 'b', requiredFields: ['field_b'] });
    });

    it('include anche i campi non required nei campi da completare', async () => {
      const map = await service.getSectionMetaByModel('model-1');
      const secA = map.get('sec_a')!;
      expect(secA.requiredFields).toContain('field_a2');
      expect(secA.requiredFields).toHaveLength(2);
    });

    it('chiama getCompleteStructure con il modelId corretto', async () => {
      await service.getSectionMetaByModel('model-99');
      expect(qms.getCompleteStructure).toHaveBeenCalledWith('model-99');
    });
  });

  // ── getStructureMetaByModel ─────────────────────────────────────────────────

  describe('getStructureMetaByModel()', () => {
    it('restituisce sectionMeta e fieldToMacro popolati', async () => {
      const { sectionMeta, fieldToMacro } = await service.getStructureMetaByModel('model-1');
      expect(sectionMeta.has('sec_a')).toBe(true);
      expect(fieldToMacro.get('field_a')).toBe('a');
      expect(fieldToMacro.get('field_b')).toBe('b');
    });

    it('mappa tutti i campi al loro macroId (inclusi non-required)', async () => {
      const { fieldToMacro } = await service.getStructureMetaByModel('model-1');
      expect(fieldToMacro.get('field_a2')).toBe('a'); // non-required ma mappato
    });

    it('popola sectionMeta con le stesse info di getSectionMetaByModel', async () => {
      const { sectionMeta } = await service.getStructureMetaByModel('model-1');
      expect(sectionMeta.get('sec_a')).toMatchObject({ macroId: 'a', requiredFields: ['field_a', 'field_a2'] });
    });

    it('chiama getCompleteStructure una sola volta', async () => {
      await service.getStructureMetaByModel('model-1');
      expect(qms.getCompleteStructure).toHaveBeenCalledTimes(1);
    });
  });
});
