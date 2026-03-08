import { FieldSpec, SectionSpec } from '../../data/preassessment';

export const DOC_ICON_FIELDS = new Set([
  'd_accordi_partnership',
  'd_anticorruzione',
  'd_bilanci_infrannuali',
  'd_bilancio',
  'd_budget',
  'd_budget_odv',
  'd_business_plan',
  'd_certificazioni',
  'd_codice_etico',
  'd_contratti_appalti',
  'd_contratti_clienti',
  'd_contratti_fornitori',
  'd_contratti_outsourcing',
  'd_dashboard_kpi',
  'd_deleghe',
  'd_doc_backup',
  'd_dpia',
  'd_dr_it',
  'd_dvr',
  'd_mansionari',
  'd_matrice_poteri',
  'd_modello_231',
  'd_organigramma',
  'd_patti_parasociali',
  'd_piani_operativi',
  'd_piano_emergenza',
  'd_piano_industriale',
  'd_piano_marketing',
  'd_piano_tesoreria',
  'd_policy_nda',
  'd_policy_omaggi',
  'd_policy_smartworking',
  'd_policy_social',
  'd_polizze',
  'd_privacy',
  'd_procedura_breach',
  'd_procedure_operative',
  'd_procure',
  'd_registro_breach',
  'd_registro_whistleblowing',
  'd_sistema_disciplinare',
  'd_sostenibilita',
  'd_statuto',
  'd_verbali_assemblea',
  'd_verbali_cda',
  'd_verbali_odv',
  'd_visura',
  'd_whistleblowing',
]);

export const ASSETTI_ICON_FIELDS = new Set([
  'aa_cda',
  'aa_poteri_formalizzati',
  'aa_corrispondenza_delega',
  'aa_internal_audit',
  'aa_organo_controllo_srl',
  'aa_revisore_srl',
  'aa_piano_industriale',
  'aa_piani_operativi',
  'aa_funzioni_esterne',
  'aa_parti_correlate',
  'ac_sistema_integrato',
  'ac_esternalizzazione',
  'ac_esternalizzazione_tipo',
  'ac_trasferimento_dati',
  'ac_cadenza_aggiornamento',
  'ac_bilanci_infrannuali',
  'ac_bilanci_gestionali',
  'ac_analisi_bilancio',
  'ac_analisi_crisi',
  'ac_controllo_gestione',
  'ac_contabilita_analitica',
  'ac_kpi',
  'ac_budget_reporting',
  'ac_cadenza_reporting',
  'ac_aspetti_finanziari',
]);

export const OWNER_EMAIL_BY_MACRO: Record<string, string> = {
  a: 'owner_a_email',
  b: 'owner_b_email',
  c: 'owner_c_email',
  d: 'owner_d_email',
  e: 'owner_e_email',
  f: 'owner_f_email',
  g: 'owner_g_email',
  h: 'owner_h_email',
  i: 'owner_i_email',
  j: 'owner_j_email',
};

export const OWNER_FIELDS_BY_MACRO: Record<string, { name: string; role: string; email: string }> = {
  a: { name: 'owner_a_nome', role: 'owner_a_ruolo', email: 'owner_a_email' },
  b: { name: 'owner_b_nome', role: 'owner_b_ruolo', email: 'owner_b_email' },
  c: { name: 'owner_c_nome', role: 'owner_c_ruolo', email: 'owner_c_email' },
  d: { name: 'owner_d_nome', role: 'owner_d_ruolo', email: 'owner_d_email' },
  e: { name: 'owner_e_nome', role: 'owner_e_ruolo', email: 'owner_e_email' },
  f: { name: 'owner_f_nome', role: 'owner_f_ruolo', email: 'owner_f_email' },
  g: { name: 'owner_g_nome', role: 'owner_g_ruolo', email: 'owner_g_email' },
  h: { name: 'owner_h_nome', role: 'owner_h_ruolo', email: 'owner_h_email' },
  i: { name: 'owner_i_nome', role: 'owner_i_ruolo', email: 'owner_i_email' },
  j: { name: 'owner_j_nome', role: 'owner_j_ruolo', email: 'owner_j_email' },
};

export function getOptionLabel(field: FieldSpec, value: string) {
  if (!DOC_ICON_FIELDS.has(field.id)) return value;
  const lower = value.toLowerCase();
  if (lower.startsWith('disponibile')) return `✅ ${value}`;
  if (lower.startsWith('da reperire')) return `📋 ${value}`;
  if (lower.startsWith('non')) return `❌ ${value}`;
  return value;
}

export function getAssettiOptionLabel(field: FieldSpec, value: string) {
  if (!ASSETTI_ICON_FIELDS.has(field.id)) return value;
  switch (value) {
    case 'Sì':
      return `✔︎ ${value}`;
    case 'No':
      return `✖︎ ${value}`;
    case 'Non applicabile':
      return `— ${value}`;
    case 'Totale':
      return `■ ${value}`;
    case 'Parziale':
      return `▢ ${value}`;
    case 'Fax':
      return `📠 ${value}`;
    case 'Email':
      return `✉️ ${value}`;
    case 'Condivisione di un sistema informativo':
      return `🔗 ${value}`;
    case 'Altro':
      return `⋯ ${value}`;
    case 'Mensile':
    case 'Trimestrale':
    case 'Quadrimestrale':
    case 'Semestrale':
    case 'Annuale':
      return `🗓 ${value}`;
    default:
      return value;
  }
}

export function getOptions(field: FieldSpec) {
  if (field.type !== 'select') return [];
  return [...(field.options || [])];
}

export function getInitialData(sectionsData: SectionSpec[]) {
  const init: Record<string, string> = {};
  sectionsData.forEach((section) => section.fields.forEach((field) => { init[field.id] = ''; }));
  return init;
}

export function getInitialNaFields(sectionsData: SectionSpec[]) {
  const init: Record<string, boolean> = {};
  sectionsData.forEach((section) => section.fields.forEach((field) => { init[field.id] = false; }));
  return init;
}

export function getOwnerInfo(data: Record<string, string> | null | undefined, macroId: string) {
  if (!data) return null;
  const fields = OWNER_FIELDS_BY_MACRO[macroId];
  if (!fields) return null;
  const name = (data[fields.name] || '').trim();
  const role = (data[fields.role] || '').trim();
  const email = (data[fields.email] || '').trim();
  if (!name && !role && !email) return null;
  const primary = name || email || '—';
  const secondary = email && email !== primary ? email : '';
  return { name, role, email, primary, secondary };
}

export function normalizeNumberValue(raw: string) {
  if (!raw) return '';
  const cleaned = raw.replace(/\s+/g, '').replace(/\./g, '').replace(/[^0-9,-]/g, '');
  const hasNegative = cleaned.startsWith('-');
  const unsigned = cleaned.replace(/-/g, '');
  const parts = unsigned.split(',');
  const integerPart = parts[0] || '';
  const decimalPart = parts.slice(1).join('');
  return `${hasNegative ? '-' : ''}${integerPart}${decimalPart ? `,${decimalPart}` : ''}`;
}

export function formatNumberValue(raw: string) {
  const normalized = normalizeNumberValue(raw);
  if (!normalized) return '';
  const isNegative = normalized.startsWith('-');
  const unsigned = isNegative ? normalized.slice(1) : normalized;
  const [integerPart, decimalPart] = unsigned.split(',');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-' : ''}${formattedInteger}${decimalPart !== undefined ? `,${decimalPart}` : ''}`;
}

type BuildCsvArgs = {
  sections: SectionSpec[];
  macroAreas: Array<{ id: string; label: string }>;
  data: Record<string, string>;
  notes: Record<string, string>;
  userFieldNotes: Record<string, string>;
  fieldNotes: Record<string, string>;
  naFields: Record<string, boolean>;
  excludeNA: boolean;
  includeConsultantNotes: boolean;
};

export function buildPreassessmentCsv({
  sections,
  macroAreas,
  data,
  notes,
  userFieldNotes,
  fieldNotes,
  naFields,
  excludeNA,
  includeConsultantNotes,
}: BuildCsvArgs) {
  let csv = 'Macro Area;Sezione;Campo;Obbligatorio;Valore;Nota utente';
  if (includeConsultantNotes) csv += ';Nota consulente';
  csv += ';Note sezione\n';

  sections.forEach((section) => {
    const macroLabel = macroAreas.find((macro) => macro.id === section.macro)?.label || '';
    const rows = section.fields.filter((field) => !(excludeNA && naFields[field.id]));

    rows.forEach((field) => {
      const isNA = !!naFields[field.id];
      const rawValue = isNA ? 'N/A' : (data[field.id] || '');
      const value = rawValue.includes('||') ? rawValue.split('||').join(', ') : rawValue;
      let row = `"${macroLabel}";"${section.title}";"${field.label}";"${field.required ? 'Sì' : 'No'}";"${value.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      row += `;"${(isNA ? '' : (userFieldNotes[field.id] || '')).replace(/"/g, '""')}"`;
      if (includeConsultantNotes) {
        row += `;"${(isNA ? '' : (fieldNotes[field.id] || '')).replace(/"/g, '""')}"`;
      }
      row += ';"' + '' + '"\n';
      csv += row;
    });

    const sectionNote = (notes[section.id] || '').replace(/"/g, '""');
    if (sectionNote || rows.length === 0) {
      let noteRow = `"${macroLabel}";"${section.title}";"";"";"";""`;
      if (includeConsultantNotes) noteRow += ';"' + '' + '"';
      noteRow += `;"${sectionNote}"\n`;
      csv += noteRow;
    }
  });

  return `\uFEFF${csv}`;
}
