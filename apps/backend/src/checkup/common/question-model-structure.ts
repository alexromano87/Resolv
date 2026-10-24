/**
 * Struttura normalizzata di un modello di questionario usata per
 * import/export file (Excel, CSV, JSON). Rispecchia la gerarchia:
 * Modello → Macro aree → Sezioni → Campi.
 */

export interface ImportFieldInput {
  fieldId: string;
  label: string;
  type: string;
  options?: string[] | null;
  required?: boolean;
  help?: string | null;
  allowDocuments?: boolean;
  weight?: number;
}

export interface ImportSectionInput {
  code: string;
  title: string;
  description?: string | null;
  fields: ImportFieldInput[];
}

export interface ImportMacroInput {
  code: string;
  label: string;
  color?: string | null;
  sections: ImportSectionInput[];
}

export interface ImportModelPayload {
  model: { code: string; label: string; description?: string | null };
  macroAreas: ImportMacroInput[];
}

/** Palette di default per le macro aree prive di colore nel file. */
export const DEFAULT_MACRO_COLORS = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#db2777', '#4f46e5', '#65a30d', '#ea580c',
  '#0d9488', '#9333ea',
];

/** Tipi di campo supportati dal questionario. */
export const SUPPORTED_FIELD_TYPES = [
  'text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'number',
];

/** Tipi che richiedono una lista di opzioni. */
export const OPTION_FIELD_TYPES = ['select', 'radio', 'checkbox'];

/**
 * Colonne del formato tabellare (Excel/CSV), una riga per campo.
 * L'ordine delle righe determina l'ordinamento di macro/sezioni/campi.
 */
export const IMPORT_COLUMNS = [
  'macro_code',
  'macro_label',
  'macro_color',
  'section_code',
  'section_title',
  'section_description',
  'field_id',
  'field_label',
  'field_type',
  'field_options',
  'field_required',
  'field_help',
  'field_allow_documents',
  'field_weight',
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/** Descrizione human-readable di ogni colonna, mostrata come istruzioni. */
export const COLUMN_HELP: Record<ImportColumn, string> = {
  macro_code: 'Codice macro area (es. a). Obbligatorio. Righe con lo stesso codice appartengono alla stessa macro area.',
  macro_label: 'Nome della macro area (es. Identità e Struttura). Obbligatorio alla prima riga della macro.',
  macro_color: 'Colore HEX della macro (es. #2563eb). Opzionale: se vuoto viene assegnato automaticamente.',
  section_code: 'Codice sezione (es. a_1). Obbligatorio. Righe con lo stesso codice appartengono alla stessa sezione.',
  section_title: 'Titolo della sezione. Obbligatorio alla prima riga della sezione.',
  section_description: 'Descrizione della sezione. Opzionale.',
  field_id: 'Identificativo del campo (es. ragione_sociale). Obbligatorio per le righe campo.',
  field_label: 'Etichetta del campo mostrata nel questionario. Obbligatoria per le righe campo.',
  field_type: `Tipo di campo. Valori ammessi: ${SUPPORTED_FIELD_TYPES.join(', ')}.`,
  field_options: `Opzioni separate da "|" (es. Sì|No|Non applicabile). Obbligatorio per i tipi: ${OPTION_FIELD_TYPES.join(', ')}.`,
  field_required: 'Campo obbligatorio: Sì/No (default No).',
  field_help: 'Testo di aiuto mostrato con il "?". Opzionale.',
  field_allow_documents: 'Consente allegati: Sì/No (default Sì).',
  field_weight: 'Peso del campo per il calcolo del progresso (numero, default 1).',
};
