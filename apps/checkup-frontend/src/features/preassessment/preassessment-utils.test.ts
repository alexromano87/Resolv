import { describe, expect, it } from 'vitest';
import { buildPreassessmentCsv, formatNumberValue, normalizeNumberValue } from './preassessment-utils';

describe('preassessment-utils', () => {
  it('formatta i numeri con separatore migliaia italiano', () => {
    expect(normalizeNumberValue('10.000')).toBe('10000');
    expect(formatNumberValue('10000')).toBe('10.000');
    expect(formatNumberValue('1234567,89')).toBe('1.234.567,89');
  });

  it('scrive la nota di sezione su una riga dedicata in fondo alla sezione nel CSV', () => {
    const csv = buildPreassessmentCsv({
      sections: [
        {
          id: 'sec-1',
          macro: 'a',
          title: 'Sezione 1',
          description: '',
          fields: [
            { id: 'f-1', label: 'Campo 1', type: 'text', required: true },
          ],
        },
      ],
      macroAreas: [{ id: 'a', label: 'Macro A' }],
      data: { 'f-1': 'Valore 1' },
      notes: { 'sec-1': 'Nota finale sezione' },
      userFieldNotes: {},
      fieldNotes: {},
      naFields: {},
      excludeNA: false,
      includeConsultantNotes: false,
    });

    const rows = csv.trim().split('\n');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('"Campo 1"');
    expect(rows[1]).not.toContain('Nota finale sezione');
    expect(rows[2]).toContain('"Sezione 1"');
    expect(rows[2]).toContain('"Nota finale sezione"');
  });
});
