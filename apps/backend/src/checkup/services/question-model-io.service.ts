import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';
import { QuestionManagementService } from './question-management.service';
import {
  ImportMacroInput,
  ImportSectionInput,
  ImportFieldInput,
  ImportModelPayload,
  IMPORT_COLUMNS,
  COLUMN_HELP,
  SUPPORTED_FIELD_TYPES,
  OPTION_FIELD_TYPES,
} from '../common/question-model-structure';

export type ModelIoFormat = 'xlsx' | 'csv' | 'json';

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

const CONTENT_TYPES: Record<ModelIoFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

@Injectable()
export class QuestionModelIoService {
  constructor(private readonly qms: QuestionManagementService) {}

  // ==================== HELPERS ====================

  private boolToLabel(v: boolean | undefined, dflt: boolean): string {
    return (v ?? dflt) ? 'Sì' : 'No';
  }

  private parseBool(raw: unknown, dflt: boolean): boolean {
    if (raw === undefined || raw === null || raw === '') return dflt;
    const s = String(raw).trim().toLowerCase();
    if (['sì', 'si', 'true', '1', 'yes', 'x', 'vero'].includes(s)) return true;
    if (['no', 'false', '0', 'n', 'falso'].includes(s)) return false;
    return dflt;
  }

  private parseOptions(raw: unknown): string[] {
    if (!raw) return [];
    return String(raw)
      .split('|')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }

  private slugify(raw: string): string {
    return (raw || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[àáâä]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'campo';
  }

  // ==================== EXPORT ====================

  async exportModel(modelId: string, format: ModelIoFormat): Promise<ExportResult> {
    const model = await this.qms.getModelById(modelId);
    const macroAreas = await this.qms.getCompleteStructure(modelId);
    const safeCode = (model.code || 'modello').replace(/[^a-zA-Z0-9_-]/g, '_');
    const base = `modello_${safeCode}`;

    if (format === 'json') {
      const payload: ImportModelPayload = {
        model: { code: model.code, label: model.label, description: model.description ?? null },
        macroAreas: macroAreas.map((m: any) => ({
          code: m.code,
          label: m.label,
          color: m.color,
          sections: (m.sections || []).map((s: any) => ({
            code: s.code,
            title: s.title,
            description: s.description ?? null,
            fields: (s.fields || []).map((f: any) => ({
              fieldId: f.fieldId,
              label: f.label,
              type: f.type,
              options: f.options ?? null,
              required: f.required,
              help: f.help ?? null,
              allowDocuments: f.allowDocuments,
              weight: f.weight,
            })),
          })),
        })),
      };
      return {
        buffer: Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'),
        filename: `${base}.json`,
        contentType: CONTENT_TYPES.json,
      };
    }

    const rows = this.flattenToRows(macroAreas);

    if (format === 'csv') {
      const sep = ';';
      const esc = (v: unknown) => {
        const s = v === undefined || v === null ? '' : String(v);
        return /["\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = IMPORT_COLUMNS.join(sep);
      const body = rows.map((r) => IMPORT_COLUMNS.map((c) => esc(r[c])).join(sep)).join('\n');
      return {
        buffer: Buffer.from(`﻿${header}\n${body}\n`, 'utf-8'),
        filename: `${base}.csv`,
        contentType: CONTENT_TYPES.csv,
      };
    }

    // xlsx
    const buffer = await this.buildXlsx(rows, `${model.label} (${model.code})`);
    return { buffer, filename: `${base}.xlsx`, contentType: CONTENT_TYPES.xlsx };
  }

  private flattenToRows(macroAreas: any[]): Record<string, string>[] {
    const rows: Record<string, string>[] = [];
    for (const m of macroAreas) {
      const sections = m.sections || [];
      if (sections.length === 0) {
        rows.push({ macro_code: m.code, macro_label: m.label, macro_color: m.color });
        continue;
      }
      for (const s of sections) {
        const fields = s.fields || [];
        if (fields.length === 0) {
          rows.push({
            macro_code: m.code, macro_label: m.label, macro_color: m.color,
            section_code: s.code, section_title: s.title, section_description: s.description ?? '',
          });
          continue;
        }
        for (const f of fields) {
          rows.push({
            macro_code: m.code,
            macro_label: m.label,
            macro_color: m.color,
            section_code: s.code,
            section_title: s.title,
            section_description: s.description ?? '',
            field_id: f.fieldId,
            field_label: f.label,
            field_type: f.type,
            field_options: Array.isArray(f.options) ? f.options.join('|') : '',
            field_required: this.boolToLabel(f.required, false),
            field_help: f.help ?? '',
            field_allow_documents: this.boolToLabel(f.allowDocuments, true),
            field_weight: f.weight !== undefined && f.weight !== null ? String(f.weight) : '1',
          });
        }
      }
    }
    return rows;
  }

  private async buildXlsx(rows: Record<string, string>[], title: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'RESOLV Checkup';
    wb.created = new Date();

    const ws = wb.addWorksheet('Campi');
    ws.columns = IMPORT_COLUMNS.map((c) => ({ header: c, key: c, width: Math.max(14, c.length + 2) }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    rows.forEach((r) => ws.addRow(r));
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: { row: 1, column: IMPORT_COLUMNS.length } };

    const info = wb.addWorksheet('Istruzioni');
    info.columns = [
      { header: 'Colonna', key: 'col', width: 24 },
      { header: 'Descrizione', key: 'desc', width: 100 },
    ];
    info.getRow(1).font = { bold: true };
    info.addRow({ col: 'MODELLO', desc: title });
    info.addRow({ col: '', desc: '' });
    IMPORT_COLUMNS.forEach((c) => info.addRow({ col: c, desc: COLUMN_HELP[c] }));
    info.addRow({ col: '', desc: '' });
    info.addRow({ col: 'NOTE', desc: "L'ordine delle righe determina l'ordine di macro aree, sezioni e campi. Righe con lo stesso macro_code/section_code appartengono alla stessa macro/sezione (label e colore presi dalla prima riga)." });

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
  }

  // ==================== TEMPLATE ====================

  async buildTemplate(format: ModelIoFormat): Promise<ExportResult> {
    const sample: ImportMacroInput[] = [
      {
        code: 'a',
        label: 'Identità e Struttura',
        color: '#2563eb',
        sections: [
          {
            code: 'a_1',
            title: 'Dati anagrafici',
            description: 'Informazioni societarie di base',
            fields: [
              { fieldId: 'ragione_sociale', label: 'Ragione sociale', type: 'text', required: true, allowDocuments: false, weight: 1 },
              { fieldId: 'forma_giuridica', label: 'Forma giuridica', type: 'select', options: ['SRL', 'SPA', 'SAS', 'Altro'], required: true, weight: 1 },
              { fieldId: 'ha_cda', label: 'È presente un CdA?', type: 'radio', options: ['Sì', 'No', 'Non applicabile'], help: 'Consiglio di Amministrazione', weight: 1 },
            ],
          },
        ],
      },
      {
        code: 'b',
        label: 'Governance',
        color: '#7c3aed',
        sections: [
          {
            code: 'b_1',
            title: 'Procure e Deleghe',
            fields: [
              { fieldId: 'deleghe_formalizzate', label: 'Le deleghe sono formalizzate?', type: 'radio', options: ['Sì', 'No'], required: true, weight: 2 },
            ],
          },
        ],
      },
    ];

    if (format === 'json') {
      const payload: ImportModelPayload = {
        model: { code: 'NUOVO_MODELLO', label: 'Nuovo modello', description: 'Descrizione del modello' },
        macroAreas: sample,
      };
      return {
        buffer: Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'),
        filename: 'template_modello_checkup.json',
        contentType: CONTENT_TYPES.json,
      };
    }

    const rows = this.flattenToRows(sample.map((m) => ({ ...m, sections: m.sections })));

    if (format === 'csv') {
      const sep = ';';
      const esc = (v: unknown) => {
        const s = v === undefined || v === null ? '' : String(v);
        return /["\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = IMPORT_COLUMNS.join(sep);
      const body = rows.map((r) => IMPORT_COLUMNS.map((c) => esc(r[c])).join(sep)).join('\n');
      return {
        buffer: Buffer.from(`﻿${header}\n${body}\n`, 'utf-8'),
        filename: 'template_modello_checkup.csv',
        contentType: CONTENT_TYPES.csv,
      };
    }

    const buffer = await this.buildXlsx(rows, 'Template modello di questionario');
    return { buffer, filename: 'template_modello_checkup.xlsx', contentType: CONTENT_TYPES.xlsx };
  }

  // ==================== IMPORT ====================

  async importModel(
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    meta: { code: string; label: string; description?: string | null },
  ) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File mancante o vuoto.');
    }
    const name = (file.originalname || '').toLowerCase();
    let parsed: { payloadMeta?: Partial<ImportModelPayload['model']>; macroAreas: ImportMacroInput[] };

    if (name.endsWith('.json')) {
      parsed = this.parseJson(file.buffer);
    } else if (name.endsWith('.csv')) {
      parsed = { macroAreas: this.parseTabular(this.readCsvRows(file.buffer)) };
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      parsed = { macroAreas: await this.parseXlsx(file.buffer) };
    } else {
      throw new BadRequestException('Formato file non supportato. Usa .xlsx, .csv o .json.');
    }

    this.validateStructure(parsed.macroAreas);

    const resolvedMeta = {
      code: (meta.code || parsed.payloadMeta?.code || '').trim(),
      label: (meta.label || parsed.payloadMeta?.label || '').trim(),
      description: meta.description ?? parsed.payloadMeta?.description ?? null,
    };
    if (!resolvedMeta.code) throw new BadRequestException('Codice modello obbligatorio.');
    if (!resolvedMeta.label) throw new BadRequestException('Nome modello obbligatorio.');

    return this.qms.createModelFromStructure(resolvedMeta, parsed.macroAreas);
  }

  private parseJson(buffer: Buffer): { payloadMeta?: Partial<ImportModelPayload['model']>; macroAreas: ImportMacroInput[] } {
    let raw: any;
    try {
      raw = JSON.parse(buffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('JSON non valido.');
    }
    // Accetta sia { model, macroAreas } sia direttamente l'array di macro aree.
    const macroAreas = Array.isArray(raw) ? raw : raw.macroAreas;
    if (!Array.isArray(macroAreas)) {
      throw new BadRequestException('JSON: atteso un array "macroAreas" (o un array di macro aree in radice).');
    }
    const normalized: ImportMacroInput[] = macroAreas.map((m: any) => ({
      code: String(m.code ?? '').trim(),
      label: String(m.label ?? '').trim(),
      color: m.color ?? null,
      sections: (m.sections || []).map((s: any) => ({
        code: String(s.code ?? '').trim(),
        title: String(s.title ?? '').trim(),
        description: s.description ?? null,
        fields: (s.fields || []).map((f: any) => ({
          fieldId: String(f.fieldId ?? f.field_id ?? '').trim(),
          label: String(f.label ?? '').trim(),
          type: String(f.type ?? '').trim(),
          options: Array.isArray(f.options) ? f.options.map((o: any) => String(o)) : this.parseOptions(f.options),
          required: this.parseBool(f.required, false),
          help: f.help ?? null,
          allowDocuments: this.parseBool(f.allowDocuments ?? f.allow_documents, true),
          weight: f.weight !== undefined && f.weight !== null ? Number(f.weight) : 1,
        })),
      })),
    }));
    return { payloadMeta: Array.isArray(raw) ? undefined : raw.model, macroAreas: normalized };
  }

  private readCsvRows(buffer: Buffer): Record<string, string>[] {
    let content = buffer.toString('utf-8');
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    const delimiter = content.split('\n')[0].includes(';') ? ';' : ',';
    try {
      return parseCsv(content, {
        columns: true,
        delimiter,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];
    } catch (e: any) {
      throw new BadRequestException(`CSV non valido: ${e?.message || 'formato non riconosciuto'}.`);
    }
  }

  private async parseXlsx(buffer: Buffer): Promise<ImportMacroInput[]> {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer as any);
    } catch {
      throw new BadRequestException('File Excel non leggibile.');
    }
    const ws = wb.getWorksheet('Campi') || wb.worksheets[0];
    if (!ws) throw new BadRequestException('Foglio Excel vuoto.');

    const headerRow = ws.getRow(1);
    const headerMap: Record<number, string> = {};
    headerRow.eachCell((cell, col) => {
      headerMap[col] = String(cell.value ?? '').trim();
    });
    if (!Object.values(headerMap).includes('macro_code')) {
      throw new BadRequestException('Intestazioni mancanti: la prima riga deve contenere i nomi delle colonne (es. macro_code, section_code, field_id...).');
    }

    const rows: Record<string, string>[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, string> = {};
      let hasValue = false;
      row.eachCell((cell, col) => {
        const key = headerMap[col];
        if (!key) return;
        let val: any = cell.value;
        if (val && typeof val === 'object' && 'text' in val) val = (val as any).text;
        if (val && typeof val === 'object' && 'result' in val) val = (val as any).result;
        const s = val === undefined || val === null ? '' : String(val).trim();
        if (s) hasValue = true;
        obj[key] = s;
      });
      if (hasValue) rows.push(obj);
    });

    return this.parseTabular(rows);
  }

  /** Converte righe tabellari (header→valore) nella struttura macro→sezioni→campi. */
  private parseTabular(rows: Record<string, string>[]): ImportMacroInput[] {
    if (!rows.length) throw new BadRequestException('Il file non contiene righe dati.');

    const macroMap = new Map<string, ImportMacroInput>();
    const sectionMap = new Map<string, ImportSectionInput>();
    const errors: string[] = [];

    rows.forEach((r, idx) => {
      const line = idx + 2; // +1 header, +1 base-1
      const macroCode = (r.macro_code || '').trim();
      const sectionCode = (r.section_code || '').trim();
      if (!macroCode) {
        errors.push(`Riga ${line}: "macro_code" mancante.`);
        return;
      }

      let macro = macroMap.get(macroCode);
      if (!macro) {
        const label = (r.macro_label || '').trim();
        if (!label) errors.push(`Riga ${line}: "macro_label" obbligatorio alla prima riga della macro "${macroCode}".`);
        macro = { code: macroCode, label: label || macroCode, color: (r.macro_color || '').trim() || null, sections: [] };
        macroMap.set(macroCode, macro);
      }

      if (!sectionCode) return; // riga di sola macro area (senza sezioni/campi)

      const sKey = `${macroCode}::${sectionCode}`;
      let section = sectionMap.get(sKey);
      if (!section) {
        const title = (r.section_title || '').trim();
        if (!title) errors.push(`Riga ${line}: "section_title" obbligatorio alla prima riga della sezione "${sectionCode}".`);
        section = { code: sectionCode, title: title || sectionCode, description: (r.section_description || '').trim() || null, fields: [] };
        sectionMap.set(sKey, section);
        macro.sections.push(section);
      }

      const rawFieldId = (r.field_id || '').trim();
      const fieldLabel = (r.field_label || '').trim();
      const fieldType = (r.field_type || '').trim().toLowerCase();
      if (!rawFieldId && !fieldLabel && !fieldType) return; // riga di sola sezione

      if (!fieldLabel) {
        errors.push(`Riga ${line}: "field_label" mancante.`);
        return;
      }
      if (!fieldType) {
        errors.push(`Riga ${line}: "field_type" mancante.`);
        return;
      }
      if (!SUPPORTED_FIELD_TYPES.includes(fieldType)) {
        errors.push(`Riga ${line}: tipo campo "${fieldType}" non valido. Ammessi: ${SUPPORTED_FIELD_TYPES.join(', ')}.`);
        return;
      }
      const options = this.parseOptions(r.field_options);
      if (OPTION_FIELD_TYPES.includes(fieldType) && options.length === 0) {
        errors.push(`Riga ${line}: il tipo "${fieldType}" richiede "field_options" (valori separati da "|").`);
        return;
      }

      const field: ImportFieldInput = {
        fieldId: rawFieldId || this.slugify(fieldLabel),
        label: fieldLabel,
        type: fieldType,
        options: options.length ? options : null,
        required: this.parseBool(r.field_required, false),
        help: (r.field_help || '').trim() || null,
        allowDocuments: this.parseBool(r.field_allow_documents, true),
        weight: r.field_weight ? Number(r.field_weight) || 1 : 1,
      };
      section.fields.push(field);
    });

    if (errors.length) {
      throw new BadRequestException(`Errori nel file (${errors.length}): ${errors.slice(0, 20).join(' ')}`);
    }
    return Array.from(macroMap.values());
  }

  private validateStructure(macroAreas: ImportMacroInput[]) {
    if (!macroAreas || macroAreas.length === 0) {
      throw new BadRequestException('Il modello deve contenere almeno una macro area.');
    }
    const errors: string[] = [];
    const macroCodes = new Set<string>();
    const sectionCodes = new Set<string>();

    macroAreas.forEach((m) => {
      if (!m.code) errors.push('Macro area senza codice.');
      if (!m.label) errors.push(`Macro area "${m.code}" senza nome.`);
      if (macroCodes.has(m.code)) errors.push(`Codice macro area duplicato: "${m.code}".`);
      macroCodes.add(m.code);
      if (!m.sections || m.sections.length === 0) {
        errors.push(`La macro area "${m.code}" non ha sezioni.`);
      }
      (m.sections || []).forEach((s) => {
        if (!s.code) errors.push(`Sezione senza codice nella macro "${m.code}".`);
        if (sectionCodes.has(s.code)) errors.push(`Codice sezione duplicato: "${s.code}".`);
        sectionCodes.add(s.code);
        if (!s.title) errors.push(`Sezione "${s.code}" senza titolo.`);
        (s.fields || []).forEach((f) => {
          if (!f.label) errors.push(`Campo senza etichetta nella sezione "${s.code}".`);
          if (!SUPPORTED_FIELD_TYPES.includes(f.type)) {
            errors.push(`Campo "${f.label}" (sezione "${s.code}"): tipo "${f.type}" non valido.`);
          }
          if (OPTION_FIELD_TYPES.includes(f.type) && (!f.options || f.options.length === 0)) {
            errors.push(`Campo "${f.label}" (sezione "${s.code}"): il tipo "${f.type}" richiede opzioni.`);
          }
        });
      });
    });

    if (errors.length) {
      throw new BadRequestException(`Struttura non valida (${errors.length}): ${errors.slice(0, 20).join(' ')}`);
    }
  }
}
