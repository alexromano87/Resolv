import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { QuestionModel } from '../entities/question-model.entity';
import { QuestionMacroArea } from '../entities/question-macro-area.entity';
import { QuestionSection } from '../entities/question-section.entity';
import { QuestionField } from '../entities/question-field.entity';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

interface FieldColumn {
  fieldId: string;
  label: string;
  type: string;
  options: string[] | null;
  macroLabel: string;
  macroColor: string;
  macroCode: string;
  sectionTitle: string;
  sectionCode: string;
}

interface FieldValidation {
  formulae: string[];
  isMultiselect: boolean;
}

/** Converte numero colonna (1-based) in lettera Excel: 1→A, 27→AA, ecc. */
function colNumToLetter(n: number): string {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

@Injectable()
export class CheckupPreassessmentExcelExportService {
  constructor(
    @InjectRepository(CheckupPreassessment)
    private readonly preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupClient)
    private readonly clientRepository: Repository<CheckupClient>,
    @InjectRepository(CheckupLicense)
    private readonly licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private readonly sublicenseRepository: Repository<CheckupSublicense>,
    @InjectRepository(QuestionModel)
    private readonly modelRepository: Repository<QuestionModel>,
    @InjectRepository(QuestionMacroArea)
    private readonly macroAreaRepository: Repository<QuestionMacroArea>,
    @InjectRepository(QuestionSection)
    private readonly sectionRepository: Repository<QuestionSection>,
    @InjectRepository(QuestionField)
    private readonly fieldRepository: Repository<QuestionField>,
  ) {}

  async generateExcel(user: CheckupCurrentUserData): Promise<Buffer> {
    if (!user.studioId) {
      throw new ForbiddenException('Solo lo studio può esportare i dati');
    }

    // 1. Carica tutti i clienti dello studio
    const license = await this.licenseRepository.findOne({ where: { studioId: user.studioId } });
    if (!license) return this.buildEmptyWorkbook();

    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, attiva: true, clientId: Not(IsNull()) },
    });
    const clientIds = sublicenses.map((s) => s.clientId!).filter(Boolean);
    if (clientIds.length === 0) return this.buildEmptyWorkbook();

    const clients = await this.clientRepository.find({
      where: { id: In(clientIds), attivo: true },
      order: { ragioneSociale: 'ASC', nome: 'ASC' },
    });

    const clientMap = new Map(clients.map((c) => [c.id, c]));

    // 2. Carica le preassessment (solo versione più recente)
    const preassessments = await this.preassessmentRepository.find({
      where: clients.map((c) => ({ clientId: c.id, isLatest: true })),
    });

    // 3. Individua il modello da usare
    const modelIds = [...new Set(sublicenses.map((s) => s.modelId).filter(Boolean))] as string[];
    let model: QuestionModel | null = null;
    if (modelIds.length > 0) model = await this.modelRepository.findOne({ where: { id: modelIds[0] } });
    if (!model) model = await this.modelRepository.findOne({ where: { status: 'published' } });
    if (!model) model = await this.modelRepository.findOne({ order: { createdAt: 'ASC' } });

    // 4. Carica la struttura del modello con opzioni
    const fieldColumns: FieldColumn[] = [];
    if (model) {
      const macroAreas = await this.macroAreaRepository.find({
        where: { modelId: model.id },
        order: { sortOrder: 'ASC' },
      });

      for (const macro of macroAreas) {
        const sections = await this.sectionRepository.find({
          where: { macroAreaId: macro.id },
          order: { sortOrder: 'ASC' },
        });
        for (const section of sections) {
          const fields = await this.fieldRepository.find({
            where: { sectionId: section.id },
            order: { sortOrder: 'ASC' },
          });
          for (const field of fields) {
            fieldColumns.push({
              fieldId: field.fieldId,
              label: field.label,
              type: field.type,
              options: Array.isArray(field.options) ? field.options : null,
              macroLabel: macro.label,
              macroColor: macro.color,
              macroCode: macro.code,
              sectionTitle: section.title,
              sectionCode: section.code,
            });
          }
        }
      }
    }

    // 5. Costruisce il workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Resolv Checkup';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Pre-Assessment', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    const metaHeaders = [
      'ID Preassessment', 'Ragione Sociale', 'Denominazione', 'P.IVA', 'Codice Fiscale',
      'Città', 'Provincia', 'Email', 'Telefono',
      'Stato', 'Versione', 'Studio Può Modificare',
      'Validazione Finale Da', 'Data Validazione Finale',
      'Data Creazione', 'Data Completamento', 'Ultima Modifica',
    ];
    const totalCols = metaHeaders.length + fieldColumns.length;

    // ── Riga 1: macro aree ─────────────────────────────────────────────────────
    const row1Values: string[] = ['Dati Anagrafici & Stato', ...Array(metaHeaders.length - 1).fill('')];
    const macroGroups: { label: string; color: string; start: number; count: number }[] = [];
    for (let i = 0; i < fieldColumns.length; i++) {
      const fc = fieldColumns[i];
      const last = macroGroups[macroGroups.length - 1];
      if (last && last.label === fc.macroLabel) { last.count++; row1Values.push(''); }
      else { macroGroups.push({ label: fc.macroLabel, color: fc.macroColor, start: metaHeaders.length + i, count: 1 }); row1Values.push(fc.macroLabel); }
    }
    ws.addRow(row1Values);

    // ── Riga 2: sezioni ────────────────────────────────────────────────────────
    const row2Values: string[] = ['', ...Array(metaHeaders.length - 1).fill('')];
    const sectionGroups: { key: string; title: string; start: number; count: number }[] = [];
    for (let i = 0; i < fieldColumns.length; i++) {
      const fc = fieldColumns[i];
      const last = sectionGroups[sectionGroups.length - 1];
      const key = `${fc.macroCode}__${fc.sectionCode}`;
      if (last && last.key === key) { last.count++; row2Values.push(''); }
      else { sectionGroups.push({ key, title: fc.sectionTitle, start: metaHeaders.length + i, count: 1 }); row2Values.push(fc.sectionTitle); }
    }
    ws.addRow(row2Values);

    // ── Riga 3: etichette campo ────────────────────────────────────────────────
    ws.addRow([...metaHeaders, ...fieldColumns.map((fc) => fc.label)]);

    // ── Merge ──────────────────────────────────────────────────────────────────
    ws.mergeCells(1, 1, 1, metaHeaders.length);
    for (const g of macroGroups) { if (g.count > 1) ws.mergeCells(1, g.start + 1, 1, g.start + g.count); }
    ws.mergeCells(2, 1, 2, metaHeaders.length);
    for (const g of sectionGroups) { if (g.count > 1) ws.mergeCells(2, g.start + 1, 2, g.start + g.count); }

    // ── Stili ──────────────────────────────────────────────────────────────────
    const align: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const borderStyle: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFD1D5DB' } };
    const borderAll = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

    const r1 = ws.getRow(1); r1.height = 26;
    const r2 = ws.getRow(2); r2.height = 22;
    const r3 = ws.getRow(3); r3.height = 40;

    for (let col = 1; col <= totalCols; col++) {
      const fc = col > metaHeaders.length ? fieldColumns[col - metaHeaders.length - 1] : null;
      const hex = fc ? (fc.macroColor || '#6B7280').replace('#', '') : null;

      const c1 = r1.getCell(col);
      c1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      c1.alignment = align; c1.border = borderAll;
      c1.fill = hex ? { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } }
                    : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };

      const c2 = r2.getCell(col);
      c2.font = { bold: true, color: { argb: 'FF374151' }, size: 9 };
      c2.alignment = align; c2.border = borderAll;
      c2.fill = hex ? { type: 'pattern', pattern: 'solid', fgColor: { argb: `40${hex}` } }
                    : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

      const c3 = r3.getCell(col);
      c3.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: fc ? 8 : 9 };
      c3.alignment = { ...align, horizontal: 'left' }; c3.border = borderAll;
      c3.fill = hex ? { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } }
                    : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };

      // Nota sui campi multiselect
      if (fc && fc.type === 'multiselect' && fc.options && fc.options.length > 0) {
        c3.note = {
          texts: [
            { font: { bold: true, size: 9 }, text: 'MULTISELECT\n' },
            { font: { size: 9 }, text: 'Più valori possibili separati da virgola.\n\nOpzioni:\n• ' + fc.options.join('\n• ') },
          ],
        } as ExcelJS.Comment;
      }
    }

    // ── Foglio ListeOpzioni (nascosto) per liste con >255 caratteri ─────────
    const listSheet = workbook.addWorksheet('ListeOpzioni');
    listSheet.state = 'hidden';
    let listSheetCol = 1;

    const fieldValidation: (FieldValidation | null)[] = fieldColumns.map((fc) => {
      if (!fc.options || fc.options.length === 0) return null;
      const isMultiselect = fc.type === 'multiselect';
      const inline = fc.options.join(',');
      if (inline.length <= 255) {
        return { formulae: [`"${inline}"`], isMultiselect };
      }
      // Lista lunga → foglio nascosto
      for (let r = 0; r < fc.options.length; r++) {
        listSheet.getCell(r + 1, listSheetCol).value = fc.options[r];
      }
      const colLetter = colNumToLetter(listSheetCol);
      const range = `ListeOpzioni!$${colLetter}$1:$${colLetter}$${fc.options.length}`;
      listSheetCol++;
      return { formulae: [range], isMultiselect };
    });

    // ── Righe dati ─────────────────────────────────────────────────────────────
    const altFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    const dataFont: Partial<ExcelJS.Font> = { size: 9 };
    const firstDataRow = 4;

    for (let idx = 0; idx < preassessments.length; idx++) {
      const pre = preassessments[idx];
      const client = clientMap.get(pre.clientId);
      const data: Record<string, string> = pre.data || {};
      const naFields: Record<string, boolean> = pre.naFields || {};

      const rowValues: (string | number | Date | null)[] = [
        pre.id,
        client?.ragioneSociale || client?.nome || '',
        client?.ragioneSociale || '',
        client?.partitaIva || '',
        client?.codiceFiscale || '',
        client?.citta || '',
        client?.provincia || '',
        client?.email || '',
        client?.telefono || '',
        pre.status === 'concluso' ? 'Concluso' : 'In corso',
        pre.version,
        pre.studioCanEdit ? 'Sì' : 'No',
        pre.finalValidation?.by?.name || '',
        pre.finalValidation?.at ? new Date(pre.finalValidation.at) : null,
        pre.createdAt || null,
        pre.completedAt || null,
        pre.updatedAt || null,
      ];

      for (let fi = 0; fi < fieldColumns.length; fi++) {
        const fc = fieldColumns[fi];
        if (naFields[fc.fieldId]) {
          rowValues.push('N/A');
        } else {
          const val = data[fc.fieldId];
          if (val === undefined || val === null || val === '') rowValues.push('');
          else if (Array.isArray(val)) rowValues.push((val as string[]).join(', '));
          else rowValues.push(String(val));
        }
      }

      const dataRow = ws.addRow([]);
      dataRow.height = 18;
      rowValues.forEach((val, i) => { dataRow.getCell(i + 1).value = (val ?? null) as ExcelJS.CellValue; });

      for (let col = 1; col <= totalCols; col++) {
        const cell = dataRow.getCell(col);
        cell.font = dataFont;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = borderAll;
        if (idx % 2 === 1) cell.fill = altFill;

        // Validazione dropdown sulle celle campo
        if (col > metaHeaders.length) {
          const fv = fieldValidation[col - metaHeaders.length - 1];
          if (fv) {
            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: fv.formulae,
              showErrorMessage: !fv.isMultiselect,
              errorTitle: 'Valore non valido',
              error: 'Seleziona un valore dalla lista.',
            };
          }
        }
      }

      // Formato date (colonne 14–17)
      for (const ci of [14, 15, 16, 17]) {
        const cell = dataRow.getCell(ci);
        if (cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy hh:mm';
      }
    }

    // ── Validazione righe buffer future (200 righe dopo i dati) ───────────────
    const lastDataRow = firstDataRow + preassessments.length - 1;
    for (let rowIdx = lastDataRow + 1; rowIdx <= lastDataRow + 200; rowIdx++) {
      for (let fi = 0; fi < fieldColumns.length; fi++) {
        const fv = fieldValidation[fi];
        if (!fv) continue;
        const cell = ws.getRow(rowIdx).getCell(metaHeaders.length + fi + 1);
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: fv.formulae,
          showErrorMessage: !fv.isMultiselect,
          errorTitle: 'Valore non valido',
          error: 'Seleziona un valore dalla lista.',
        };
      }
    }

    // ── Larghezze colonne ──────────────────────────────────────────────────────
    const metaWidths = [38, 28, 22, 16, 16, 14, 12, 26, 14, 12, 8, 14, 22, 20, 18, 18, 18];
    metaWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    for (let i = 0; i < fieldColumns.length; i++) ws.getColumn(metaHeaders.length + i + 1).width = 24;

    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: totalCols } };

    // ── Foglio Legenda ─────────────────────────────────────────────────────────
    if (fieldColumns.length > 0) {
      const legendWs = workbook.addWorksheet('Legenda Campi');
      legendWs.addRow(['Macro Area', 'Codice Macro', 'Sezione', 'Codice Sezione', 'Field ID', 'Etichetta Campo', 'Tipo', 'Opzioni']);
      const lh = legendWs.getRow(1);
      lh.height = 22;
      lh.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      lh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      for (let i = 1; i <= 8; i++) {
        lh.getCell(i).alignment = { vertical: 'middle', horizontal: 'center' };
        lh.getCell(i).border = borderAll;
      }

      for (const fc of fieldColumns) {
        const hex = (fc.macroColor || '#6B7280').replace('#', '');
        const r = legendWs.addRow([
          fc.macroLabel, fc.macroCode, fc.sectionTitle, fc.sectionCode,
          fc.fieldId, fc.label, fc.type,
          fc.options ? fc.options.join(' | ') : '',
        ]);
        r.font = { size: 9 };
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `40${hex}` } };
        for (let i = 1; i <= 8; i++) r.getCell(i).border = borderAll;
      }

      [28, 14, 35, 16, 32, 45, 12, 60].forEach((w, i) => { legendWs.getColumn(i + 1).width = w; });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('it-IT'); } catch { return dateStr; }
  }

  private async buildEmptyWorkbook(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Pre-Assessment').addRow(['Nessun dato disponibile']);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
