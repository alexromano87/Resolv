import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { PdfConfigDto } from '../dto/pdf-config.dto';
import { CheckupPreassessmentDocument } from './checkup-preassessment-document.entity';
import { GeneratePreassessmentPdfDto } from './dto/generate-preassessment-pdf.dto';
import { CheckupPreassessmentRenderService } from './checkup-preassessment-render.service';
import { CheckupPreassessmentService } from './checkup-preassessment.service';
import { CheckupPdfConfigService } from '../pdf-config/checkup-pdf-config.service';
import { QuestionField } from '../entities/question-field.entity';
import { QuestionManagementService } from '../services/question-management.service';
import { CheckupPreassessmentValidationService } from './checkup-preassessment-validation.service';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupUser } from '../users/checkup-user.entity';

type ReportField = {
  id: string;
  label: string;
  required: boolean;
};

type ReportSection = {
  id: string;
  title: string;
  macroId: string;
  fields: ReportField[];
};

type ReportMacro = {
  id: string;
  label: string;
  color: string;
  sections: ReportSection[];
};

type SectionRowMetric = {
  field: ReportField;
  safeLabel: string;
  value: string;
  userNote: string;
  consultantNote: string;
  fieldDocs: CheckupPreassessmentDocument[];
  rowHeight: number;
};

type ReportPayload = {
  preassessment: any;
  client: CheckupClient;
  pdfConfig: PdfConfigDto;
  reportMacros: ReportMacro[];
  documents: CheckupPreassessmentDocument[];
  data: Record<string, string>;
  notes: Record<string, string>;
  userFieldNotes: Record<string, string>;
  fieldNotes: Record<string, string>;
  naFields: Record<string, boolean>;
  clientName: string;
  consultantName: string;
  logoUrl: string;
  superOwnerName: string;
  nowDate: Date;
  nowLabel: string;
  nowTime: string;
  excludeNA: boolean;
  includeConsultantNotes: boolean;
  totalReq: number;
  totalFilled: number;
  pct: number;
  docsByField: Record<string, CheckupPreassessmentDocument[]>;
  currentUser: CheckupCurrentUserData;
};

@Injectable()
export class CheckupPreassessmentPdfTemplateService {
  constructor(
    private readonly preassessmentService: CheckupPreassessmentService,
    private readonly renderService: CheckupPreassessmentRenderService,
    private readonly pdfConfigService: CheckupPdfConfigService,
    private readonly questionManagementService: QuestionManagementService,
    private readonly validationService: CheckupPreassessmentValidationService,
    @InjectRepository(CheckupPreassessmentDocument)
    private readonly documentRepository: Repository<CheckupPreassessmentDocument>,
    @InjectRepository(CheckupClient)
    private readonly clientRepository: Repository<CheckupClient>,
    @InjectRepository(CheckupSublicense)
    private readonly sublicenseRepository: Repository<CheckupSublicense>,
    @InjectRepository(CheckupLicense)
    private readonly licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupStudio)
    private readonly studioRepository: Repository<CheckupStudio>,
    @InjectRepository(CheckupUser)
    private readonly userRepository: Repository<CheckupUser>,
  ) {}

  async createPdfBuffer(
    dto: GeneratePreassessmentPdfDto,
    currentUser: CheckupCurrentUserData,
  ): Promise<{ pdf: Buffer; filename: string; clientId: string; preassessmentId: string }> {
    const payload = await this.buildReportPayload(dto, currentUser);
    const pdf = await this.renderNativePdf(payload);
    return {
      pdf,
      filename: this.buildFilename(payload.client),
      clientId: payload.client.id,
      preassessmentId: dto.preassessmentId,
    };
  }

  async buildReportHtml(
    dto: GeneratePreassessmentPdfDto,
    currentUser: CheckupCurrentUserData,
  ): Promise<string> {
    const {
      preassessment,
      client,
      pdfConfig,
      reportMacros,
      data,
      notes,
      userFieldNotes,
      fieldNotes,
      naFields,
      clientName,
      consultantName,
      logoUrl,
      nowLabel,
      nowTime,
      excludeNA,
      includeConsultantNotes,
      totalReq,
      totalFilled,
      pct,
      docsByField,
      currentUser: payloadCurrentUser,
    } = await this.buildReportPayload(dto, currentUser);

    const sanitize = (value?: string) => (value || '').replace(/[✅✔️✔🟢🟩]/g, '').trim();
    const escapeHtml = (value?: string) => (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const cssColor = (value?: string, fallback = 'transparent') => (value && value.trim() ? value : fallback);

    const coverElementHtml = (pdfConfig.coverElements ?? [])
      .filter((element) => element.visible)
      .map((element) => {
        const justify = element.align === 'center' ? 'center' : element.align === 'right' ? 'flex-end' : 'flex-start';
        const baseStyle = [
          `left:${element.x}%`,
          `top:${element.y}%`,
          `width:${element.width}%`,
          `min-height:${element.height}%`,
          `z-index:${element.zIndex}`,
          `justify-content:${justify}`,
          `text-align:${element.align}`,
          `color:${cssColor(element.color, '#ffffff')}`,
          `font-family:${escapeHtml(element.fontFamily || pdfConfig.fontFamily || 'Noto Sans')}`,
          `font-size:${element.fontSize}px`,
          `font-weight:${escapeHtml(String(element.fontWeight || 'normal'))}`,
          `opacity:${element.opacity ?? 1}`,
          `line-height:${element.lineHeight ?? 1.3}`,
          `letter-spacing:${element.letterSpacing ?? 0}em`,
          `background:${cssColor(element.backgroundColor)}`,
          `border:${element.borderWidth ? `${element.borderWidth}px solid ${cssColor(element.borderColor, 'transparent')}` : 'none'}`,
          `border-radius:${element.borderRadius ?? 0}px`,
          `text-transform:${element.uppercase ? 'uppercase' : 'none'}`,
        ].join(';');

        let innerHtml = '';
        if (element.type === 'logo') {
          innerHtml = logoUrl ? `<img src="${logoUrl}" alt="Logo" class="cover-element-logo" />` : '<div class="cover-element-logo-placeholder"></div>';
        } else if (element.type === 'company') {
          innerHtml = escapeHtml(clientName);
        } else if (element.type === 'date') {
          innerHtml = escapeHtml(`Generato il ${nowLabel} · ${nowTime}`);
        } else if (element.type === 'consultant') {
          innerHtml = escapeHtml(`Consulente: ${consultantName}`);
        } else if (element.type === 'features') {
          innerHtml = `<div class="cover-element-features">${(element.items ?? []).map((item) => `<div class="cover-element-feature"><span class="dot"></span><span>${escapeHtml(item)}</span></div>`).join('')}</div>`;
        } else {
          innerHtml = escapeHtml(element.text || '');
        }

        return `<div class="cover-element cover-element--${element.type}" style="${baseStyle}">${innerHtml}</div>`;
      })
      .join('');

    const sectionsByMacro = reportMacros.map((macro) => ({
      macro: macro.label,
      color: macro.color,
      code: macro.id,
      sections: macro.sections,
    })).filter((group) => group.sections.length > 0);

    const allIdxSections: { num: number; title: string; color: string; macroLabel: string }[] = [];
    let idxNum = 1;
    sectionsByMacro.forEach((group) => {
      group.sections.forEach((section) => {
        allIdxSections.push({ num: idxNum, title: section.title, color: group.color, macroLabel: group.macro });
        idxNum += 1;
      });
    });
    const ownerSections = allIdxSections.filter((section) => section.macroLabel.toLowerCase().includes('owner'));
    const normalSections = allIdxSections.filter((section) => !section.macroLabel.toLowerCase().includes('owner'));
    const normalGroups: { macroLabel: string; color: string; items: typeof allIdxSections }[] = [];
    normalSections.forEach((section) => {
      const last = normalGroups[normalGroups.length - 1];
      if (last && last.macroLabel === section.macroLabel) last.items.push(section);
      else normalGroups.push({ macroLabel: section.macroLabel, color: section.color, items: [section] });
    });
    const midpoint = Math.ceil(normalSections.length / 2);
    let running = 0;
    let splitAt = normalGroups.length;
    for (let i = 0; i < normalGroups.length; i += 1) {
      running += normalGroups[i].items.length;
      if (running >= midpoint) {
        splitAt = i + 1;
        break;
      }
    }
    const idxCols = [
      normalGroups.slice(0, splitAt).flatMap((group) => group.items),
      normalGroups.slice(splitAt).flatMap((group) => group.items),
      ownerSections,
    ];

    const indexHtml = pdfConfig.showIndex
      ? `<div class="index-page" style="margin: 0; flex: 1;"><div class="index-title">Indice</div><div class="index-cols">
          ${idxCols.map((colSections) => {
            let curMacro = '';
            let colHtml = '<div class="index-col">';
            colSections.forEach((section) => {
              if (section.macroLabel !== curMacro) {
                if (curMacro) colHtml += '</div>';
                colHtml += `<div class="index-group"><div class="index-group-title" style="color:${section.color};">${escapeHtml(section.macroLabel)}</div>`;
                curMacro = section.macroLabel;
              }
              colHtml += `<div class="index-item">${section.num}. ${escapeHtml(section.title)}</div>`;
            });
            if (curMacro) colHtml += '</div>';
            colHtml += '</div>';
            return colHtml;
          }).join('')}
        </div></div>`
      : '';

    const activeMacros = sectionsByMacro.map((group, macroIndex) => {
      const sectionBlocks = group.sections.map((section, sectionIndex) => {
        const fields = section.fields.filter((field) => !(excludeNA && naFields[field.id]));
        if (!fields.length) return '';
        const rows = fields.map((field) => {
          const isNA = !!naFields[field.id];
          const rawValue = isNA ? 'N/A' : sanitize(data[field.id]);
          const value = rawValue.includes('||') ? rawValue.split('||').join(', ') : rawValue;
          const safeLabel = pdfConfig.showAsterisks ? field.label : field.label.replace(/\s*\*+\s*$/g, '');
          const userNote = pdfConfig.showUserNotes && !isNA ? sanitize(userFieldNotes[field.id]) : '';
          const consultantNote = includeConsultantNotes && pdfConfig.showConsultantNotes && !isNA ? sanitize(fieldNotes[field.id]) : '';
          const sectionDocs = pdfConfig.showDocuments ? docsByField[field.id] || [] : [];
          const answerHtml = value ? escapeHtml(value).replace(/\n/g, '<br>') : '<span class="empty-val">—</span>';
          return `
            <tr>
              <td class="question-cell">${escapeHtml(safeLabel)}</td>
              <td class="answer-cell">
                <div class="answer-body">${answerHtml}</div>
                ${userNote ? `<div class="answer-note user-note"><span class="note-lbl">Nota:</span>${escapeHtml(userNote).replace(/\n/g, '<br>')}</div>` : ''}
                ${consultantNote ? `<div class="answer-note consultant-note"><span class="note-lbl">Consulente:</span>${escapeHtml(consultantNote).replace(/\n/g, '<br>')}</div>` : ''}
                ${sectionDocs.length > 0 ? `<div class="answer-docs"><div class="doc-title">Documenti allegati</div>${sectionDocs.map((doc) => `<div class="doc-item">${escapeHtml(doc.nomeOriginale)}</div>`).join('')}</div>` : ''}
              </td>
            </tr>
          `;
        }).join('');
        const sectionNote = sanitize(notes[section.id]);
        return `
          <section class="report-section" id="section-${escapeHtml(section.id)}">
            <div class="section-heading">
              <span class="section-index">${macroIndex + 1}.${sectionIndex + 1}</span>
              <div>
                <div class="section-kicker">${escapeHtml(this.formatMacroTitle(group.code, group.macro))}</div>
                <h2>${escapeHtml(section.title)}</h2>
              </div>
            </div>
            <table class="qa-table">
              <thead>
                <tr>
                  <th>Domanda</th>
                  <th>Risposta</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            ${sectionNote ? `<div class="section-note"><span class="note-lbl">Nota sezione:</span>${escapeHtml(sectionNote).replace(/\n/g, '<br>')}</div>` : ''}
          </section>
        `;
      }).join('');

      if (!sectionBlocks) return '';

      return `
        <div class="pdf-page content-page${macroIndex === sectionsByMacro.length - 1 ? ' last' : ''}">
          <div class="report-sheet">
            <header class="report-header">
              <div class="report-header-meta">
                <div class="eyebrow">Pre-Assessment</div>
                <h1>${escapeHtml(this.formatMacroTitle(group.code, group.macro))}</h1>
              </div>
              <div class="report-header-side">
                <div class="report-meta-label">Cliente</div>
                <div class="report-meta-value">${escapeHtml(clientName)}</div>
              </div>
            </header>
            <div class="report-body">${sectionBlocks}</div>
          </div>
        </div>`;
    }).join('');

    const finalSummary = preassessment.finalValidation || currentUser.superOwner
      ? `
        <section class="final-summary">
          <div class="final-summary-title">Validazione finale</div>
          <div class="final-summary-grid">
            <div><div class="meta-label">Super-owner</div><div class="meta-value">${escapeHtml(preassessment.finalValidation?.by?.name || `${payloadCurrentUser.nome || ''} ${payloadCurrentUser.cognome || ''}`.trim() || 'Non disponibile')}</div></div>
            <div><div class="meta-label">Ruolo</div><div class="meta-value">${escapeHtml(preassessment.finalValidation?.by?.ruolo || 'Super-owner')}</div></div>
            <div><div class="meta-label">Stato checkup</div><div class="meta-value">${escapeHtml(preassessment.finalValidation ? 'Chiuso e validato' : 'In lavorazione')}</div></div>
            <div><div class="meta-label">Data validazione</div><div class="meta-value">${escapeHtml(preassessment.finalValidation?.at ? new Date(preassessment.finalValidation.at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')}</div></div>
          </div>
        </section>`
      : '';

    return `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
      :root {
        --q-font-size: ${pdfConfig.questionFontSize}pt;
        --a-font-size: ${pdfConfig.answerFontSize}pt;
        --sh-font-size: ${pdfConfig.sectionHeaderFontSize}pt;
        --body-font: '${pdfConfig.fontFamily}', system-ui, Helvetica, Arial, sans-serif;
        --cv-bg: linear-gradient(135deg, ${pdfConfig.coverBgStart ?? '#1e3a8a'} 0%, ${pdfConfig.coverBgMid ?? '#1e40af'} 45%, ${pdfConfig.coverBgEnd ?? '#0f172a'} 100%);
      }
      @page { size: A4; margin: 18mm 14mm 18mm 14mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { height: auto; }
      body {
        font-family: var(--body-font); background: #ffffff; color: #1c2738; font-size: 11pt; line-height: 1.5;
      }
      .pdf-page {
        page-break-after: always; break-after: page;
      }
      .pdf-page.last { page-break-after: auto; break-after: auto; }
      .cover-page { width: 182mm; height: 261mm; margin: 0 auto; page-break-after: always; }
      .cover {
        height: 100%; width: 100%; padding: 40px 36px; border-radius: 18px; color: #eef2ff; background: var(--cv-bg);
        border: 1px solid rgba(255,255,255,0.12); display: flex; flex-direction: column; position: relative; overflow: hidden;
      }
      .cover-content { position: relative; z-index: 1; display: block; flex: 1; width: 100%; height: 100%; }
      .cover-element { position: absolute; display: flex; align-items: flex-start; white-space: pre-wrap; overflow: hidden; }
      .cover-element-logo { width: 100%; height: 100%; object-fit: contain; }
      .cover-element-logo-placeholder { width: 100%; height: 100%; border-radius: 8px; background: rgba(255,255,255,0.24); }
      .cover-element-features { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; width: 100%; }
      .cover-element-feature { display: flex; gap: 8px; align-items: flex-start; }
      .cover-element-feature .dot { width: 8px; height: 8px; border-radius: 999px; background: #22d3ee; margin-top: 5px; flex: none; }
      .intro-page { page-break-after: always; }
      .report-sheet {
        min-height: 257mm; border: 1px solid #d9e2f0; border-radius: 14px; overflow: hidden; background: #ffffff;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
      }
      .report-header {
        display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
        padding: 18px 22px 16px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
      }
      .eyebrow { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; margin-bottom: 6px; font-weight: 700; }
      .report-header h1 { font-size: 24px; line-height: 1.15; color: #0f172a; margin: 0; }
      .report-header-side { min-width: 180px; text-align: right; }
      .report-meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em; color: #94a3b8; margin-bottom: 4px; }
      .report-meta-value { font-size: 12px; font-weight: 700; color: #0f172a; }
      .report-body { padding: 20px 22px 24px; }
      .summary { margin: 14px 0 10px; padding: 14px 16px; border-radius: 12px; background: #f8fbff; border: 1px solid #dbe6f5; }
      .summary-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
      .summary-item { background:#fff; border:1px solid #e6ebf5; border-radius:10px; padding:12px; }
      .summary-item .label { font-size:10px; color:#64748b; text-transform: uppercase; letter-spacing:0.08em; }
      .summary-item .value { font-size:16px; font-weight:700; color:#0f172a; margin-top:6px; word-break: break-word; }
      .client-summary { margin: 14px 0 10px; padding: 14px 16px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; }
      .client-summary h3 { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; margin-bottom: 10px; }
      .client-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 18px; }
      .client-item .label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
      .client-item .value { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 4px; word-break: break-word; }
      .index-page { margin-top: 14px; padding: 18px 16px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; }
      .index-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
      .index-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 16px; align-items: start; }
      .index-col { display: flex; flex-direction: column; }
      .index-group { margin-bottom: 10px; }
      .index-group-title { font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
      .index-item { font-size: 10px; color: #1f2937; padding: 2px 0 2px 9px; border-left: 2px solid #e2e8f0; margin-bottom: 3px; line-height: 1.4; }
      .content-page { page-break-after: always; }
      .content-page.last { page-break-after: auto; }
      .report-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 18px; }
      .section-heading { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
      .section-index {
        width: 34px; height: 34px; flex: none; border-radius: 999px; background: #eaf1ff; color: #1d4ed8;
        display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
      }
      .section-kicker { font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em; color: #64748b; margin-bottom: 4px; }
      .section-heading h2 { font-size: var(--sh-font-size); line-height: 1.25; color: #0f172a; }
      .qa-table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
      .qa-table thead th {
        text-align: left; padding: 9px 12px; background: #f8fafc; color: #475569; font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em;
        border-bottom: 1px solid #e2e8f0;
      }
      .qa-table thead th:first-child { width: 43%; border-right: 1px solid #e2e8f0; }
      .qa-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
      .qa-table tbody td { vertical-align: top; padding: 10px 12px; border-bottom: 1px solid #eef2f7; }
      .qa-table tbody tr:last-child td { border-bottom: none; }
      .qa-table tbody td:first-child { border-right: 1px solid #eef2f7; }
      .question-cell { font-size: var(--q-font-size); color: #334155; line-height: 1.45; }
      .answer-cell { font-size: var(--a-font-size); color: #0f172a; line-height: 1.5; }
      .answer-body { white-space: pre-wrap; word-break: break-word; }
      .empty-val { color: #94a3b8; font-style: italic; }
      .answer-note { font-size: 9px; font-style: italic; margin-top: 6px; padding-left: 8px; line-height: 1.35; border-left: 2px solid #e2e8f0; }
      .answer-note .note-lbl { font-weight: 700; margin-right: 3px; }
      .user-note { color: #475569; }
      .consultant-note { color: #1e40af; border-left-color: #c7d2fe; }
      .answer-docs { margin-top: 8px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 9.5px; color: #475569; }
      .answer-docs .doc-title { font-weight: 700; margin-bottom: 3px; color: #334155; }
      .answer-docs .doc-item { padding: 2px 0; }
      .section-note { margin-top: 8px; padding: 8px 10px; background: #fff9db; border: 1px solid #fde68a; border-radius: 8px; font-size: 9.5px; color: #713f12; }
      .section-note .note-lbl { font-weight: 700; margin-right: 4px; }
      .final-summary { margin: 14px 0 0; padding: 14px 16px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; }
      .final-summary-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
      .final-summary-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; }
      .meta-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
      .meta-value { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 4px; word-break: break-word; }
    </style></head><body>
      <div class="pdf-page cover-page">
        <div class="cover">
          <div class="cover-content">${coverElementHtml}</div>
        </div>
      </div>
      <div class="pdf-page intro-page">
        <div class="report-sheet">
          <header class="report-header">
            <div class="report-header-meta">
              <div class="eyebrow">Report di sintesi</div>
              <h1>Pre-Assessment</h1>
            </div>
            <div class="report-header-side">
              <div class="report-meta-label">Cliente</div>
              <div class="report-meta-value">${escapeHtml(clientName)}</div>
            </div>
          </header>
          <div class="report-body">
            <div class="client-summary" style="margin: 0;">
              <h3>Cliente</h3>
              <div class="client-grid">
                <div class="client-item"><div class="label">Ragione sociale</div><div class="value">${escapeHtml(clientName)}</div></div>
                <div class="client-item"><div class="label">Consulente</div><div class="value">${escapeHtml(consultantName || '-')}</div></div>
                <div class="client-item"><div class="label">Email</div><div class="value">${escapeHtml(client.email || '-')}</div></div>
                <div class="client-item"><div class="label">Codice fiscale / Partita IVA</div><div class="value">${escapeHtml(client.partitaIva || client.codiceFiscale || '-')}</div></div>
                <div class="client-item"><div class="label">Sede legale</div><div class="value">${escapeHtml(this.buildAddress(client))}</div></div>
                <div class="client-item"><div class="label">Generato il</div><div class="value">${escapeHtml(`${nowLabel} · ${nowTime}`)}</div></div>
              </div>
            </div>
            <div class="summary" style="margin: 0;">
              <div class="summary-grid">
                <div class="summary-item"><div class="label">Sezioni</div><div class="value">${reportMacros.flatMap((macro) => macro.sections).length}</div></div>
                <div class="summary-item"><div class="label">Campi obbligatori</div><div class="value">${totalReq}</div></div>
                <div class="summary-item"><div class="label">Compilati</div><div class="value">${totalFilled}/${totalReq} (${pct}%)</div></div>
              </div>
            </div>
            ${indexHtml}
            ${finalSummary}
          </div>
        </div>
      </div>
      ${activeMacros}
    </body></html>`;
  }

  private async resolveModelAndStudio(clientId: string) {
    const sublicense = await this.sublicenseRepository.findOne({ where: { clientId, attiva: true } });
    if (!sublicense) {
      throw new NotFoundException('Sublicenza non trovata per il cliente');
    }
    const license = await this.licenseRepository.findOne({ where: { id: sublicense.licenseId } });
    const modelId = sublicense.modelId || null;
    if (!modelId) {
      throw new NotFoundException('Modello non associato alla sublicenza');
    }
    const studio = license?.studioId
      ? await this.studioRepository.findOne({ where: { id: license.studioId } })
      : null;
    return {
      modelId,
      studioName: studio?.ragioneSociale || studio?.nome || '',
      studioLogoUrl: studio?.logoUrl || '',
    };
  }

  private buildAddress(client: CheckupClient) {
    const parts = [client.indirizzo, client.cap, client.citta, client.provincia, client.paese]
      .map((value) => (value || '').trim())
      .filter(Boolean);
    return parts.join(', ') || '-';
  }

  private buildFilename(client: CheckupClient) {
    const base = (client.ragioneSociale || client.nome || 'cliente')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `report_${base || 'cliente'}_${dd}${mm}${yyyy}.pdf`;
  }

  private formatMacroTitle(code: string, label: string) {
    return `${code.toUpperCase()} - ${label}`;
  }

  private escapeHtmlStatic(value?: string) {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async buildReportPayload(
    dto: GeneratePreassessmentPdfDto,
    currentUser: CheckupCurrentUserData,
  ): Promise<ReportPayload> {
    const { preassessment, client } = await this.preassessmentService.getPreassessmentForReport(dto.preassessmentId, currentUser);
    const pdfConfig = await this.pdfConfigService.getConfig();
    const modelInfo = await this.resolveModelAndStudio(client.id);
    const structure = await this.questionManagementService.getCompleteStructure(modelInfo.modelId);
    const documents = await this.documentRepository.find({
      where: { preassessmentId: preassessment.id, attivo: true },
      order: { createdAt: 'ASC' },
    });

    const reportMacros: ReportMacro[] = structure.map((macro) => ({
      id: macro.code,
      label: macro.label,
      color: macro.color,
      sections: (macro.sections || []).map((section) => ({
        id: section.code,
        title: section.title,
        macroId: macro.code,
        fields: (section.fields || []).map((field: QuestionField) => ({
          id: field.fieldId,
          label: field.label,
          required: field.required,
        })),
      })),
    }));

    const nowDate = new Date();
    const nowLabel = nowDate.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    const nowTime = nowDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const excludeNA = dto.excludeNA ?? true;
    const includeConsultantNotes = dto.includeConsultantNotes ?? true;
    const data = preassessment.data || {};
    const notes = preassessment.notes || {};
    const userFieldNotes = preassessment.userFieldNotes || {};
    const fieldNotes = preassessment.fieldNotes || {};
    const naFields = preassessment.naFields || {};
    const clientName = client.ragioneSociale || client.nome || 'Società non specificata';
    const consultantName = modelInfo.studioName || 'Studio non specificato';
    const logoUrl = this.getResolvLogoDataUri();
    const superOwner = await this.userRepository.findOne({
      where: { clientId: client.id, attivo: true, superOwner: true },
      order: { updatedAt: 'DESC' },
    });
    const superOwnerName = superOwner ? `${superOwner.nome || ''} ${superOwner.cognome || ''}`.trim() || superOwner.email : 'Non disponibile';

    const nonOwnerRequiredFields = reportMacros
      .filter((macro) => !this.validationService.isOwnerMacroArea(macro.id, macro.label))
      .flatMap((macro) => macro.sections)
      .flatMap((section) => section.fields)
      .filter((field) => field.required);
    const visibleRequiredFields = excludeNA
      ? nonOwnerRequiredFields.filter((field) => !naFields[field.id])
      : nonOwnerRequiredFields;
    const totalReq = visibleRequiredFields.length;
    const totalFilled = visibleRequiredFields.filter((field) => {
      const value = (data[field.id] || '').trim();
      return !!value || !!naFields[field.id];
    }).length;
    const pct = totalReq > 0 ? Math.round((totalFilled / totalReq) * 100) : 0;

    const docsByField = documents.reduce<Record<string, CheckupPreassessmentDocument[]>>((acc, doc) => {
      acc[doc.fieldId] ||= [];
      acc[doc.fieldId].push(doc);
      return acc;
    }, {});

    return {
      preassessment,
      client,
      pdfConfig,
      reportMacros,
      documents,
      data,
      notes,
      userFieldNotes,
      fieldNotes,
      naFields,
      clientName,
      consultantName,
      logoUrl,
      superOwnerName,
      nowDate,
      nowLabel,
      nowTime,
      excludeNA,
      includeConsultantNotes,
      totalReq,
      totalFilled,
      pct,
      docsByField,
      currentUser,
    };
  }

  private async renderNativePdf(payload: ReportPayload): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 44,
      bufferPages: true,
      autoFirstPage: false,
      info: {
        Title: `Report Pre-Assessment - ${payload.clientName}`,
        Author: payload.consultantName,
        Subject: 'Report Pre-Assessment',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const sectionsForIndex: Array<{ macroLabel: string; title: string; color: string; page: number }> = [];

    this.drawNativeCover(doc, payload);
    this.drawNativeIntro(doc, payload);
    doc.addPage();
    const tocPageIndex = doc.bufferedPageRange().count - 1;
    this.drawTocPlaceholder(doc);

    payload.reportMacros.forEach((macro) => {
      const visibleSections = macro.sections.filter((section) => section.fields.some((field) => !(payload.excludeNA && payload.naFields[field.id])));
      if (!visibleSections.length) return;
      doc.addPage();
      this.drawMacroPageHeader(doc, payload, macro);
      visibleSections.forEach((section) => {
        sectionsForIndex.push({
          macroLabel: this.formatMacroTitle(macro.id, macro.label),
          title: section.title,
          color: macro.color,
          page: doc.bufferedPageRange().start + doc.bufferedPageRange().count,
        });
        this.drawSectionNative(doc, payload, macro, section);
      });
    });

    doc.addPage();
    this.drawNativeFinalPage(doc, payload);
    this.trimTrailingBlankPages(doc);

    const finalRange = doc.bufferedPageRange();
    const lastPageIndex = finalRange.start + finalRange.count - 1;
    for (let pageIndex = finalRange.start; pageIndex <= lastPageIndex; pageIndex += 1) {
      if (pageIndex === lastPageIndex) continue;
      doc.switchToPage(pageIndex);
      this.drawPageNumber(doc, pageIndex + 1, finalRange.count);
    }
    doc.switchToPage(lastPageIndex);
    this.drawFooter(doc, payload, lastPageIndex + 1, finalRange.count);
    doc.switchToPage(tocPageIndex);
    this.drawNativeToc(doc, payload, sectionsForIndex);
    this.trimTrailingBlankPages(doc);

    doc.end();
    return await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  private drawNativeCover(doc: any, payload: ReportPayload) {
    doc.addPage();
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftPad = 60;
    const rightPad = 60;
    const gradient = doc.linearGradient(0, 0, pageWidth, pageHeight);
    gradient.stop(0, payload.pdfConfig.coverBgStart || '#1e3a8a').stop(0.5, payload.pdfConfig.coverBgMid || '#1e40af').stop(1, payload.pdfConfig.coverBgEnd || '#0f172a');
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill(gradient);
    doc.restore();

    const title = this.getCoverText(payload.pdfConfig, 'title', 'Pre-Assessment');
    const subtitle = this.getCoverText(payload.pdfConfig, 'subtitle', 'Questionario strutturato per la profilazione governance, compliance, risk e documentazione.');
    const company = payload.clientName;
    const consultant = `Consulente: ${payload.consultantName}`;
    if (payload.logoUrl?.startsWith('data:')) {
      try {
        const base64 = payload.logoUrl.split(',')[1] || payload.logoUrl;
        doc.image(Buffer.from(base64, 'base64'), leftPad, 56, { fit: [180, 72], align: 'left', valign: 'center' });
      } catch {}
    }
    doc.fillColor('#e2e8f0').fontSize(12).font('Helvetica-Bold').text(this.getCoverText(payload.pdfConfig, 'kicker', 'CHECKUP'), leftPad, 156, {
      width: pageWidth - leftPad - rightPad,
    });
    doc.fillColor('#ffffff').fontSize(34).font('Helvetica-Bold').text(title, leftPad, 196, {
      width: pageWidth - leftPad - rightPad,
    });
    doc.fillColor('#dbeafe').fontSize(16).font('Helvetica').text(subtitle, leftPad, 252, {
      width: pageWidth - leftPad - rightPad - 35,
    });
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text(company, leftPad, pageHeight - 170, { width: 300 });
    doc.fillColor('#cbd5e1').fontSize(10).font('Helvetica').text(`${payload.nowLabel} · ${payload.nowTime}`, leftPad, pageHeight - 142);
    doc.fillColor('#cbd5e1').fontSize(10).font('Helvetica').text(consultant, leftPad, pageHeight - 56, {
      width: pageWidth - leftPad - rightPad,
      align: 'right',
    });
  }

  private drawNativeIntro(doc: any, payload: ReportPayload) {
    doc.addPage();
    this.drawPageShell(doc, 'Riepilogo del pre-assessment', payload.clientName);
    let y = 114;
    y = this.drawInfoCard(doc, 54, y, 487, 128, 'Cliente', [
      ['Ragione sociale', payload.clientName],
      ['Consulente', payload.consultantName || '-'],
      ['Email', payload.client.email || '-'],
      ['Codice fiscale / Partita IVA', payload.client.partitaIva || payload.client.codiceFiscale || '-'],
      ['Sede legale', this.buildAddress(payload.client)],
      ['Generato il', `${payload.nowLabel} · ${payload.nowTime}`],
    ]);
    y += 16;
    y = this.drawInfoCard(doc, 54, y, 487, 94, 'Riepilogo', [
      ['Sezioni', String(payload.reportMacros.flatMap((macro) => macro.sections).length)],
      ['Campi obbligatori', String(payload.totalReq)],
      ['Compilati', `${payload.totalFilled}/${payload.totalReq} (${payload.pct}%)`],
    ], 3);
    if (payload.preassessment.finalValidation || payload.currentUser.superOwner) {
      y += 16;
      this.drawInfoCard(doc, 54, y, 487, 88, 'Validazione finale', [
        ['Super-owner', payload.preassessment.finalValidation?.by?.name || payload.superOwnerName],
        ['Stato checkup', payload.preassessment.finalValidation ? 'Chiuso e validato' : 'In lavorazione'],
        ['Data validazione', payload.preassessment.finalValidation?.at ? new Date(payload.preassessment.finalValidation.at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'],
      ], 2);
    }
  }

  private drawTocPlaceholder(doc: any) {
    this.drawPageShell(doc, 'Indice', 'Sommario del documento');
  }

  private drawNativeToc(doc: any, payload: ReportPayload, sections: Array<{ macroLabel: string; title: string; color: string; page: number }>) {
    this.drawPageShell(doc, 'Indice', 'Sommario del documento');
    let y = 120;
    const colWidth = 155;
    const startX = 54;
    let col = 0;
    let currentMacro = '';
    sections.forEach((section) => {
      if (y > 730) {
        col += 1;
        y = 120;
      }
      const x = startX + (col % 3) * (colWidth + 12);
      if (section.macroLabel !== currentMacro) {
        currentMacro = section.macroLabel;
        doc.fillColor(section.color).font('Helvetica-Bold').fontSize(9).text(currentMacro.toUpperCase(), x, y, { width: colWidth });
        y += 14;
      }
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9.5).text(section.title, x, y, { width: colWidth - 22 });
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(9.5).text(String(section.page), x + colWidth - 18, y, { width: 18, align: 'right' });
      y += Math.max(16, doc.heightOfString(section.title, { width: colWidth - 22, align: 'left' }) + 6);
    });
  }

  private drawMacroPageHeader(doc: any, payload: ReportPayload, macro: ReportMacro) {
    this.drawPageShell(doc, this.formatMacroTitle(macro.id, macro.label), payload.clientName);
  }

  private drawNativeFinalPage(doc: any, payload: ReportPayload) {
    this.drawPageShell(doc, 'Validazione finale', payload.clientName);
    let y = 126;
    y = this.drawInfoCard(doc, 54, y, 487, 110, 'Super-owner', [
      ['Nominativo', payload.preassessment.finalValidation?.by?.name || payload.superOwnerName],
      ['Ruolo', payload.preassessment.finalValidation?.by?.ruolo || 'Super-owner'],
      ['Stato checkup', payload.preassessment.finalValidation ? 'Chiuso e validato' : 'In lavorazione'],
      ['Data validazione', payload.preassessment.finalValidation?.at ? new Date(payload.preassessment.finalValidation.at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'],
    ], 2);
    y += 18;
    this.drawInfoCard(doc, 54, y, 487, 92, 'Riferimenti', [
      ['Cliente', payload.clientName],
      ['Consulente', payload.consultantName || '-'],
      ['Generato il', `${payload.nowLabel} · ${payload.nowTime}`],
      ['Completamento', `${payload.totalFilled}/${payload.totalReq} (${payload.pct}%)`],
    ], 2);
  }

  private drawSectionNative(doc: any, payload: ReportPayload, macro: ReportMacro, section: ReportSection) {
    const startX = 54;
    const bodyWidth = 487;
    const questionWidth = 200;
    const answerWidth = bodyWidth - questionWidth;
    const borderColor = this.resolveMacroColor(macro);
    const sectionCode = this.formatSectionCode(section.id, macro.id);

    const visibleFields = section.fields.filter((field) => !(payload.excludeNA && payload.naFields[field.id]));
    const rowMetrics: SectionRowMetric[] = visibleFields.map((field) => {
      const isNA = !!payload.naFields[field.id];
      const rawValue = isNA ? 'N/A' : ((payload.data[field.id] || '').trim().replace(/[✅✔️✔🟢🟩]/g, ''));
      const value = rawValue.includes('||') ? rawValue.split('||').join(', ') : rawValue;
      const safeLabel = payload.pdfConfig.showAsterisks ? field.label : field.label.replace(/\s*\*+\s*$/g, '');
      const userNote = payload.pdfConfig.showUserNotes && !isNA ? (payload.userFieldNotes[field.id] || '').trim() : '';
      const consultantNote = payload.includeConsultantNotes && payload.pdfConfig.showConsultantNotes && !isNA ? (payload.fieldNotes[field.id] || '').trim() : '';
      const fieldDocs = payload.pdfConfig.showDocuments ? payload.docsByField[field.id] || [] : [];

      doc.font('Helvetica').fontSize(payload.pdfConfig.questionFontSize);
      const questionHeight = doc.heightOfString(safeLabel, { width: questionWidth - 24 });
      doc.font('Helvetica').fontSize(payload.pdfConfig.answerFontSize);
      let answerTextHeight = doc.heightOfString(value || '—', { width: answerWidth - 24 });
      doc.font('Helvetica-Oblique').fontSize(9);
      if (userNote) answerTextHeight += doc.heightOfString(`Nota: ${userNote}`, { width: answerWidth - 36 }) + 8;
      if (consultantNote) answerTextHeight += doc.heightOfString(`Consulente: ${consultantNote}`, { width: answerWidth - 36 }) + 8;
      doc.font('Helvetica').fontSize(8.5);
      if (fieldDocs.length) answerTextHeight += 18 + fieldDocs.reduce((sum, d) => sum + doc.heightOfString(d.nomeOriginale, { width: answerWidth - 40 }) + 2, 0);
      return {
        field,
        safeLabel,
        value,
        userNote,
        consultantNote,
        fieldDocs,
        rowHeight: Math.max(questionHeight, answerTextHeight) + 20,
      };
    });

    const sectionNote = (payload.notes[section.id] || '').trim();
    const macroHeaderHeight = 26;
    const sectionTitleHeight = 34;
    const tableHeaderHeight = 24;
    doc.font('Helvetica').fontSize(10);
    const noteBlockHeight = sectionNote ? Math.max(40, doc.heightOfString(sectionNote, { width: bodyWidth - 118 }) + 20) : 0;
    const availableHeight = () => 760 - doc.y;

    let rowIndex = 0;
    let firstChunk = true;
    while (rowIndex < rowMetrics.length || (firstChunk && rowMetrics.length === 0)) {
      const headerReserve = macroHeaderHeight + sectionTitleHeight + tableHeaderHeight + 10;
      if (availableHeight() < headerReserve + 40) {
        doc.addPage();
        this.drawMacroPageHeader(doc, payload, macro);
      }

      const chunkTop = doc.y;
      let chunkRowsHeight = 0;
      const chunkRows: SectionRowMetric[] = [];
      while (rowIndex < rowMetrics.length) {
        const row = rowMetrics[rowIndex];
        const future = macroHeaderHeight + sectionTitleHeight + tableHeaderHeight + chunkRowsHeight + row.rowHeight + 14;
        const reserveForNote = rowIndex === rowMetrics.length - 1 ? noteBlockHeight : 0;
        if (chunkRows.length > 0 && chunkTop + future + reserveForNote > 760) break;
        if (chunkRows.length === 0 && chunkTop + future + reserveForNote > 760) {
          chunkRows.push(row);
          chunkRowsHeight += row.rowHeight;
          rowIndex += 1;
          break;
        }
        chunkRows.push(row);
        chunkRowsHeight += row.rowHeight;
        rowIndex += 1;
      }

      const hasSectionNote = rowIndex >= rowMetrics.length && !!sectionNote;
      const contentHeight = macroHeaderHeight + sectionTitleHeight + tableHeaderHeight + chunkRowsHeight + (hasSectionNote ? noteBlockHeight + 8 : 0) + 8;

      doc.save();
      doc.roundedRect(startX, chunkTop, bodyWidth, contentHeight, 10).lineWidth(1).strokeColor(borderColor).stroke();
      doc.roundedRect(startX, chunkTop, bodyWidth, macroHeaderHeight, 10).fillAndStroke(borderColor, borderColor);
      doc.restore();

      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text(this.formatMacroTitle(macro.id, macro.label).toUpperCase(), startX + 20, chunkTop + 9, {
        width: bodyWidth - 40,
        characterSpacing: 1.2,
      });

      let cursorY = chunkTop + macroHeaderHeight;
      doc.save();
      doc.roundedRect(startX + 1, cursorY, bodyWidth - 2, sectionTitleHeight, 0).fill('#ffffff');
      doc.restore();
      const sectionTitle = this.stripSectionCodePrefix(section.title, sectionCode);
      doc.fillColor(borderColor).font('Helvetica-Bold').fontSize(15).text(`${sectionCode} ${sectionTitle}`, startX + 14, cursorY + 10, {
        width: bodyWidth - 28,
      });
      cursorY += sectionTitleHeight;
      doc.roundedRect(startX + 1, cursorY, bodyWidth - 2, tableHeaderHeight, 0).fill('#f8fafc');
      doc.fillColor(borderColor).font('Helvetica-Bold').fontSize(9).text('DOMANDE', startX + 12, cursorY + 8, {
        width: questionWidth - 24,
        characterSpacing: 1.2,
      });
      doc.text('RISPOSTE', startX + questionWidth + 12, cursorY + 8, {
        width: answerWidth - 24,
        characterSpacing: 1.2,
      });
      cursorY += tableHeaderHeight;

      chunkRows.forEach((row, index) => {
        const top = cursorY;
        const isLastVisibleRow = index === chunkRows.length - 1 && !hasSectionNote;
        doc.save();
        doc.moveTo(startX + questionWidth, top).lineTo(startX + questionWidth, top + row.rowHeight).strokeColor('#e2e8f0').stroke();
        if (!isLastVisibleRow) {
          doc.moveTo(startX, top + row.rowHeight).lineTo(startX + bodyWidth, top + row.rowHeight).strokeColor('#eef2f7').stroke();
        }
        doc.restore();

        doc.fillColor('#334155').font('Helvetica').fontSize(payload.pdfConfig.questionFontSize).text(row.safeLabel, startX + 12, top + 10, {
          width: questionWidth - 24,
          height: row.rowHeight - 20,
        });
        let answerY = top + 10;
        doc.fillColor('#0f172a').font('Helvetica').fontSize(payload.pdfConfig.answerFontSize).text(row.value || '—', startX + questionWidth + 12, answerY, {
          width: answerWidth - 24,
          height: row.rowHeight - 20,
        });
        answerY += doc.heightOfString(row.value || '—', { width: answerWidth - 24 }) + 6;
        if (row.userNote) {
          doc.save();
          doc.moveTo(startX + questionWidth + 12, answerY + 1).lineTo(startX + questionWidth + 12, answerY + 13).strokeColor('#cbd5e1').stroke();
          doc.restore();
          doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(9).text(`Nota: ${row.userNote}`, startX + questionWidth + 20, answerY, {
            width: answerWidth - 32,
            height: Math.max(18, row.rowHeight - (answerY - top) - 10),
          });
          answerY += doc.heightOfString(`Nota: ${row.userNote}`, { width: answerWidth - 32 }) + 4;
        }
        if (row.consultantNote) {
          doc.save();
          doc.moveTo(startX + questionWidth + 12, answerY + 1).lineTo(startX + questionWidth + 12, answerY + 13).strokeColor('#93c5fd').stroke();
          doc.restore();
          doc.fillColor('#1d4ed8').font('Helvetica-Oblique').fontSize(9).text(`Consulente: ${row.consultantNote}`, startX + questionWidth + 20, answerY, {
            width: answerWidth - 32,
            height: Math.max(18, row.rowHeight - (answerY - top) - 10),
          });
          answerY += doc.heightOfString(`Consulente: ${row.consultantNote}`, { width: answerWidth - 32 }) + 4;
        }
        if (row.fieldDocs.length) {
          doc.roundedRect(startX + questionWidth + 12, answerY, answerWidth - 24, 18 + row.fieldDocs.length * 12, 6).fill('#f8fafc').stroke('#e2e8f0');
          doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text('Documenti allegati', startX + questionWidth + 20, answerY + 6, { width: answerWidth - 40 });
          let docsY = answerY + 18;
          row.fieldDocs.forEach((file) => {
            doc.fillColor('#475569').font('Helvetica').fontSize(8.5).text(file.nomeOriginale, startX + questionWidth + 20, docsY, { width: answerWidth - 40 });
            docsY += doc.heightOfString(file.nomeOriginale, { width: answerWidth - 40 }) + 2;
          });
        }
        cursorY = top + row.rowHeight;
      });

      if (hasSectionNote) {
        doc.roundedRect(startX + 10, cursorY + 8, bodyWidth - 20, noteBlockHeight - 8, 8).fill('#fff9db').stroke('#fde68a');
        doc.fillColor('#713f12').font('Helvetica-Bold').fontSize(9).text('Nota sezione:', startX + 22, cursorY + 18);
        doc.font('Helvetica').text(sectionNote, startX + 86, cursorY + 18, { width: bodyWidth - 118 });
        cursorY += noteBlockHeight;
      }

      doc.y = chunkTop + contentHeight + 14;
      firstChunk = false;
    }
  }

  private drawPageShell(doc: any, title: string, rightLabel: string) {
    doc.roundedRect(44, 44, 507, 754, 14).fill('#ffffff').stroke('#d9e2f0');
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text('Pre-Assessment', 64, 64, { characterSpacing: 1.2 });
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22).text(title, 64, 80, { width: 320 });
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(9).text(rightLabel, 394, 64, { width: 137, align: 'right' });
    doc.moveTo(64, 112).lineTo(531, 112).strokeColor('#e2e8f0').stroke();
    doc.y = 120;
  }

  private drawInfoCard(doc: any, x: number, y: number, w: number, h: number, title: string, rows: Array<[string, string]>, columns = 2) {
    doc.roundedRect(x, y, w, h, 10).fill('#ffffff').stroke('#e2e8f0');
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(9).text(title.toUpperCase(), x + 14, y + 12, { characterSpacing: 1 });
    const colWidth = (w - 28 - (columns - 1) * 18) / columns;
    rows.forEach((row, index) => {
      const col = index % columns;
      const line = Math.floor(index / columns);
      const rx = x + 14 + col * (colWidth + 18);
      const ry = y + 34 + line * 34;
      doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8).text(row[0], rx, ry, { width: colWidth });
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10.5).text(row[1], rx, ry + 10, { width: colWidth });
    });
    return y + h;
  }

  private drawFooter(doc: any, payload: ReportPayload, pageNumber: number, totalPages: number) {
    const footerX = 0;
    const footerH = 66;
    const footerW = doc.page.width;
    const footerY = doc.page.height - footerH;
    const year = payload.nowDate.getFullYear();
    const footerMainText = (payload.pdfConfig.footerMainText || 'Software gestionale per studi legali e professionisti del settore creditizio').trim();
    const footerCopyrightText = (payload.pdfConfig.footerCopyrightText || 'Resolv. Tutti i diritti riservati.').trim();
    const footerMainLines = this.wrapFooterText(doc, footerMainText, 300, 8.6, 2);
    const showLogo = payload.pdfConfig.footerShowLogo !== false;
    const textStartX = showLogo ? footerX + 214 : footerX + 54;
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.save();
    const gradient = doc.linearGradient(footerX, footerY, footerX + footerW, footerY + footerH);
    gradient.stop(0, '#10233f').stop(1, '#183f68');
    doc.rect(footerX, footerY, footerW, footerH).fill(gradient);

    if (showLogo && payload.logoUrl?.startsWith('data:')) {
      try {
        const base64 = payload.logoUrl.split(',')[1] || payload.logoUrl;
        doc.image(Buffer.from(base64, 'base64'), footerX + 54, footerY + 20, { fit: [104, 28], align: 'left', valign: 'center' });
      } catch {}
    }

    doc.fillColor('#f8fafc').font('Helvetica').fontSize(8.6);
    footerMainLines.forEach((line, index) => {
      doc.text(line, textStartX, footerY + 13 + index * 12, {
        width: 300,
        lineBreak: false,
      });
    });
    doc.fillColor('#e2e8f0').fontSize(8.6).text(`Report generato il ${payload.nowLabel}`, textStartX, footerY + 41, {
      width: 260,
      lineBreak: false,
    });
    doc.fillColor('#cbd5e1').fontSize(7.8).text(`© ${year} ${footerCopyrightText}`, textStartX, footerY + 53, {
      width: 260,
      lineBreak: false,
    });
    doc.fillColor('#dbeafe').font('Helvetica-Bold').fontSize(8.5).text(`${pageNumber} / ${totalPages}`, footerX + footerW - 64, footerY + 22, {
      width: 42,
      align: 'right',
      lineBreak: false,
    });
    doc.restore();
    doc.page.margins.bottom = originalBottomMargin;
  }

  private wrapFooterText(doc: any, text: string, width: number, fontSize: number, maxLines: number) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    doc.font('Helvetica').fontSize(fontSize);
    const lines: string[] = [];
    let wordIndex = 0;
    let current = '';
    while (wordIndex < words.length) {
      const word = words[wordIndex];
      const candidate = current ? `${current} ${word}` : word;
      if (doc.widthOfString(candidate) <= width || !current) {
        current = candidate;
        wordIndex += 1;
        continue;
      }
      lines.push(current);
      current = word;
      wordIndex += 1;
      if (lines.length === maxLines - 1) break;
    }
    const tail = [current, ...words.slice(wordIndex)].filter(Boolean).join(' ').trim();
    if (tail) lines.push(tail);
    const clamped = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
      let last = clamped[maxLines - 1];
      while (last.length > 0 && doc.widthOfString(`${last}...`) > width) {
        last = last.slice(0, -1).trimEnd();
      }
      clamped[maxLines - 1] = `${last}...`;
    }
    return clamped;
  }

  private drawPageNumber(doc: any, pageNumber: number, totalPages: number) {
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.save();
    doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(8.5).text(`${pageNumber} / ${totalPages}`, 498, 786, {
      width: 34,
      align: 'right',
      lineBreak: false,
    });
    doc.restore();
    doc.page.margins.bottom = originalBottomMargin;
  }

  private getCoverText(config: PdfConfigDto, type: string, fallback: string) {
    const element = (config.coverElements || []).find((entry) => entry.type === type && entry.visible);
    if (!element) return fallback;
    if (type === 'features') return fallback;
    return element.text || fallback;
  }

  private formatSectionCode(sectionId: string, macroCode: string) {
    const normalized = (sectionId || '').replace(/_/g, '.').replace(/-/g, '.');
    const match = normalized.match(/([A-Z])\D*(\d+(?:\.\d+)*)/i);
    if (match) return `${match[1].toUpperCase()}.${match[2]}`;
    const macro = (macroCode || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return `${macro || 'S'}.1`;
  }

  private stripSectionCodePrefix(title: string, sectionCode: string) {
    const cleanTitle = (title || '').trim();
    const escapedCode = sectionCode.replace('.', '\\.?');
    return cleanTitle.replace(new RegExp(`^${escapedCode}\\s*[-–—:]?\\s*`, 'i'), '').trim() || cleanTitle;
  }

  private resolveMacroColor(macro: ReportMacro) {
    const normalized = (macro.id || '').replace(/[^a-z]/gi, '').toLowerCase();
    const fallbackByCode: Record<string, string> = {
      a: '#3b82f6',
      b: '#7c3aed',
      c: '#0891b2',
      d: '#d97706',
      e: '#e11d48',
      f: '#dc2626',
      g: '#059669',
      h: '#7c3aed',
      i: '#2563eb',
      j: '#f59e0b',
      k: '#8b5cf6',
    };
    return fallbackByCode[normalized] || macro.color || '#3b82f6';
  }

  private trimTrailingBlankPages(doc: any) {
    while (Array.isArray(doc._pageBuffer) && doc._pageBuffer.length > 1) {
      const lastPage = doc._pageBuffer[doc._pageBuffer.length - 1];
      const contentLength = lastPage?.content?.uncompressedLength ?? 0;
      if (contentLength > 40) break;
      doc._pageBuffer.pop();
      doc.page = doc._pageBuffer[doc._pageBuffer.length - 1];
    }
  }

  private getResolvLogoDataUri() {
    const candidates = [
      join(process.cwd(), 'src', 'assets', 'logo_resolv.png'),
      join(process.cwd(), '..', 'checkup-frontend', 'public', 'logo_resolv.png'),
      join(process.cwd(), '..', 'frontend', 'public', 'logo_resolv.png'),
      join(process.cwd(), '..', '..', 'website', 'public', 'logo_resolv.png'),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        const buffer = readFileSync(filePath);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    }
    return '';
  }
}
