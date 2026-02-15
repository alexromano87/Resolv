import { MigrationInterface, QueryRunner } from 'typeorm';

type JsonRecord = Record<string, string>;

type LegacyFieldConfig = {
  label: string;
  sectionId: string;
};

const SECTION_MAP: Record<string, string> = {
  anagrafica: 'a_1',
  gruppo: 'a_2',
  organi_sociali: 'b_1',
  procure_deleghe: 'b_3',
  conflitto_interessi: 'b_4',
  struttura_org: 'c_1',
  dipendenti: 'c_2',
  collaboratori: 'c_3',
  modello_231: 'd_1',
  anticorruzione: 'd_2',
  whistleblowing: 'd_3',
  privacy: 'd_4',
  sicurezza_lavoro: 'd_6',
  certificazioni: 'd_7',
  ambiente_esg: 'd_7b',
  risk_management: 'e_1',
  assicurazioni: 'e_2',
  contenzioso: 'e_3',
  contrattualistica: 'f_1',
  proprieta_intellettuale: 'f_2',
  checklist_doc: 'h_1',
  assetti_adeguati: 'g_3',
};

const FIELD_RENAMES: Record<string, string[]> = {
  d_procedure: ['d_procedure_operative'],
  d_contratti: ['d_contratti_fornitori', 'd_contratti_clienti'],
};

const LEGACY_FIELDS: Record<string, LegacyFieldConfig> = {
  assetto_org: { label: 'Assetto organizzativo formalizzato?', sectionId: 'g_3' },
  assetto_amm: { label: 'Assetto amministrativo formalizzato?', sectionId: 'g_4' },
  assetto_contabile: { label: 'Assetto contabile adeguato?', sectionId: 'g_5' },
  crisi_rilevazione: { label: 'Strumenti rilevazione crisi?', sectionId: 'g_5' },
  crisi_indicatori: { label: 'Monitoraggio DSCR?', sectionId: 'g_5' },
  piano_tesoreria: { label: 'Piano tesoreria?', sectionId: 'g_5' },
  budget: { label: 'Budget annuale?', sectionId: 'g_5' },
  business_plan: { label: 'Business plan?', sectionId: 'g_4' },
  reporting: { label: 'Reporting verso CdA?', sectionId: 'g_4' },
  reporting_dettaglio: { label: 'Dettaglio reporting', sectionId: 'g_4' },
  valutazione_2086: { label: 'Valutazione adeguatezza assetti?', sectionId: 'g_4' },
};

const isNonEmpty = (value?: string | null) => typeof value === 'string' && value.trim().length > 0;

const parseJson = (value: unknown): JsonRecord => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as JsonRecord;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value as JsonRecord;
  return {};
};

const appendNote = (notes: JsonRecord, sectionId: string, text: string) => {
  if (!isNonEmpty(text)) return;
  const existing = notes[sectionId];
  if (!existing) {
    notes[sectionId] = text;
    return;
  }
  if (existing.includes(text)) return;
  notes[sectionId] = `${existing}\n\n${text}`;
};

export class MigrateCheckupPreassessmentToV71770000700000 implements MigrationInterface {
  name = 'MigrateCheckupPreassessmentToV71770000700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: string; data: unknown; notes: unknown; fieldNotes: unknown }> =
      await queryRunner.query('SELECT id, data, notes, fieldNotes FROM checkup_preassessments');

    for (const row of rows) {
      const data = parseJson(row.data);
      const notes = parseJson(row.notes);
      const fieldNotes = parseJson(row.fieldNotes);

      const newData: JsonRecord = { ...data };
      const newFieldNotes: JsonRecord = { ...fieldNotes };
      const newNotes: JsonRecord = {};

      for (const [sectionId, note] of Object.entries(notes)) {
        if (!isNonEmpty(note)) continue;
        const mapped = SECTION_MAP[sectionId] || sectionId;
        appendNote(newNotes, mapped, mapped === sectionId ? note : `Nota migrata da ${sectionId}: ${note}`);
      }

      for (const [oldId, targets] of Object.entries(FIELD_RENAMES)) {
        const value = data[oldId];
        const note = fieldNotes[oldId];
        targets.forEach((targetId) => {
          if (isNonEmpty(value) && !isNonEmpty(newData[targetId])) {
            newData[targetId] = value;
          }
          if (isNonEmpty(note) && !isNonEmpty(newFieldNotes[targetId])) {
            newFieldNotes[targetId] = note;
          }
        });
      }

      for (const [legacyId, config] of Object.entries(LEGACY_FIELDS)) {
        const value = data[legacyId];
        const note = fieldNotes[legacyId];
        if (isNonEmpty(value)) {
          appendNote(newNotes, config.sectionId, `Dato migrato (${config.label}): ${value}`);
        }
        if (isNonEmpty(note)) {
          appendNote(newNotes, config.sectionId, `Nota migrata (${config.label}): ${note}`);
        }
      }

      await queryRunner.query(
        'UPDATE checkup_preassessments SET data = ?, notes = ?, fieldNotes = ? WHERE id = ?',
        [JSON.stringify(newData), JSON.stringify(newNotes), JSON.stringify(newFieldNotes), row.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Non revertibile: migrazione dati one-way.
    void queryRunner;
  }
}
