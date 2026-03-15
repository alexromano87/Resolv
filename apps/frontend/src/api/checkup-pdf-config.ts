import { api, API_BASE_URL } from './config';

export interface MacroOverride {
  macroId: string;
  mode: 'questions' | 'sections' | 'integrity';
  limit: number;
}

export type CoverCenterElement = 'kicker' | 'title-block' | 'detail' | 'features';
export type CoverElementType = 'logo' | 'text' | 'chip' | 'features' | 'company' | 'date' | 'consultant';
export type CoverTextAlign = 'left' | 'center' | 'right';

export interface CoverElement {
  id: string;
  name: string;
  type: CoverElementType;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text?: string;
  items?: string[];
  fontFamily?: string;
  fontSize: number;
  fontWeight: 'normal' | '500' | '600' | 'bold';
  color: string;
  align: CoverTextAlign;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  letterSpacing?: number;
  lineHeight?: number;
  uppercase?: boolean;
}

export interface PdfConfig {
  maxQuestionsPerPage: number;
  macroOverrides: MacroOverride[];
  fontFamily: string;
  bodyFontSize: number;
  questionFontSize: number;
  answerFontSize: number;
  sectionHeaderFontSize: number;
  borderWidth: number;
  showAsterisks: boolean;
  showUserNotes: boolean;
  showConsultantNotes: boolean;
  showDocuments: boolean;
  showIndex: boolean;

  // Macro header
  showMacroLetter: boolean;

  // Copertina — testi
  coverTitle: string;
  coverSubtitle: string;
  coverKicker: string;
  coverHeading: string;
  coverDetail: string;
  coverFeatures: string[];
  coverChipText: string;
  coverFooterNote: string;

  // Copertina — visibilità
  coverShowLogo: boolean;
  coverShowTitle: boolean;
  coverShowSubtitle: boolean;
  coverShowKicker: boolean;
  coverShowHeading: boolean;
  coverShowDetail: boolean;
  coverShowFeatures: boolean;
  coverShowChip: boolean;
  coverShowFooterNote: boolean;
  coverShowConsultant: boolean;
  coverShowDate: boolean;

  // Copertina — colori
  coverBgStart: string;
  coverBgMid: string;
  coverBgEnd: string;
  coverAccentColor: string;
  coverHeadingColor: string;
  coverSubTextColor: string;

  // Copertina — allineamento
  coverTextAlign: 'left' | 'center' | 'right';

  // Copertina — dimensioni testi (px)
  coverTitleFontSize: number;
  coverHeadingFontSize: number;
  coverKickerFontSize: number;
  coverDetailFontSize: number;
  coverFeaturesFontSize: number;

  // Copertina — font weight
  coverTitleFontWeight: 'normal' | 'bold';
  coverHeadingFontWeight: 'normal' | 'bold';
  coverKickerFontWeight: 'normal' | 'bold';
  coverDetailFontWeight: 'normal' | 'bold';
  coverSubtitleFontWeight: 'normal' | 'bold';

  // Copertina — dimensioni aggiuntive
  coverSubtitleFontSize: number;
  coverChipFontSize: number;
  coverFooterNoteFontSize: number;

  // Copertina — posizione chip
  coverChipPosition: 'top' | 'center' | 'footer';

  // Copertina — allineamento per elemento (override del globale coverTextAlign)
  coverTitleAlign?: 'left' | 'center' | 'right';
  coverSubtitleAlign?: 'left' | 'center' | 'right';
  coverKickerAlign?: 'left' | 'center' | 'right';
  coverHeadingAlign?: 'left' | 'center' | 'right';
  coverDetailAlign?: 'left' | 'center' | 'right';
  coverFeaturesAlign?: 'left' | 'center' | 'right';
  coverFooterNoteAlign?: 'left' | 'center' | 'right';

  // Copertina — ordine elementi centrali
  coverCenterOrder: CoverCenterElement[];

  // Copertina — elementi gestibili singolarmente
  coverElements: CoverElement[];

  // Footer ultima pagina
  footerMainText: string;
  footerCopyrightText: string;
  footerShowLogo: boolean;
}

export interface PdfCoverPreviewContext {
  companyName: string;
  consultantName: string;
}

export const DEFAULT_PDF_CONFIG: PdfConfig = {
  maxQuestionsPerPage: 26,
  macroOverrides: [
    { macroId: 'e', mode: 'sections', limit: 3 },
    { macroId: '231_e', mode: 'sections', limit: 3 },
    { macroId: 'h', mode: 'integrity', limit: 26 },
    { macroId: '231_h', mode: 'integrity', limit: 26 },
  ],
  fontFamily: 'Noto Sans',
  bodyFontSize: 10,
  questionFontSize: 8,
  answerFontSize: 8,
  sectionHeaderFontSize: 9,
  borderWidth: 2,
  showAsterisks: false,
  showUserNotes: true,
  showConsultantNotes: true,
  showDocuments: true,
  showIndex: true,

  showMacroLetter: false,

  coverTitle: 'CHECKUP',
  coverSubtitle: 'Checkup Governance • Pre-Assessment',
  coverKicker: 'Report Riservato',
  coverHeading: 'Pre-Assessment Tool',
  coverDetail: 'Gestione professionale del checkup governance per studi legali e aziende. Un report strutturato per decisioni rapide e tracciabilità completa.',
  coverFeatures: [
    'Tracking completo e stato avanzamento in tempo reale',
    'Sicurezza, compliance e audit trail integrato',
    'Dashboard e report con KPI immediati',
    'Collaborazione studio-cliente con controllo accessi',
  ],
  coverChipText: 'v6.0',
  coverFooterNote: 'Documento ad uso interno e cliente',

  coverShowLogo: true,
  coverShowTitle: true,
  coverShowSubtitle: true,
  coverShowKicker: true,
  coverShowHeading: true,
  coverShowDetail: true,
  coverShowFeatures: true,
  coverShowChip: true,
  coverShowFooterNote: true,
  coverShowConsultant: true,
  coverShowDate: true,

  coverBgStart: '#1e3a8a',
  coverBgMid: '#1e40af',
  coverBgEnd: '#0f172a',
  coverAccentColor: '#22d3ee',
  coverHeadingColor: '#ffffff',
  coverSubTextColor: '#dbeafe',

  coverTextAlign: 'left' as const,

  coverTitleFontSize: 28,
  coverHeadingFontSize: 36,
  coverKickerFontSize: 12,
  coverDetailFontSize: 12,
  coverFeaturesFontSize: 11,

  coverTitleFontWeight: 'bold' as const,
  coverHeadingFontWeight: 'bold' as const,
  coverKickerFontWeight: 'normal' as const,
  coverDetailFontWeight: 'normal' as const,
  coverSubtitleFontWeight: 'normal' as const,

  coverSubtitleFontSize: 10,
  coverChipFontSize: 10,
  coverFooterNoteFontSize: 10,

  coverChipPosition: 'footer' as const,

  coverCenterOrder: ['kicker', 'title-block', 'detail', 'features'],
  coverElements: [],

  footerMainText: 'Software gestionale per studi legali e professionisti del settore creditizio',
  footerCopyrightText: 'Resolv. Tutti i diritti riservati.',
  footerShowLogo: true,
};

export const DEFAULT_COVER_ELEMENTS: CoverElement[] = [
  { id: 'logo', name: 'Logo', type: 'logo', visible: true, x: 4, y: 4, width: 18, height: 8, zIndex: 20, fontSize: 12, fontWeight: 'normal', color: '#ffffff', align: 'left', opacity: 1, borderRadius: 2 },
  { id: 'title', name: 'Titolo app', type: 'text', visible: true, x: 25, y: 4.5, width: 36, height: 4, zIndex: 21, text: 'CHECKUP', fontSize: 28, fontWeight: 'bold', color: '#eef2ff', align: 'left', opacity: 1, letterSpacing: 0.02, lineHeight: 1.15 },
  { id: 'subtitle', name: 'Sottotitolo', type: 'text', visible: true, x: 25, y: 9.3, width: 42, height: 3.5, zIndex: 21, text: 'Checkup Governance • Pre-Assessment', fontSize: 10, fontWeight: 'normal', color: '#dbeafe', align: 'left', opacity: 0.85, lineHeight: 1.3 },
  { id: 'chip', name: 'Badge versione', type: 'chip', visible: true, x: 78, y: 5, width: 13, height: 4, zIndex: 22, text: 'v6.0', fontSize: 10, fontWeight: 'bold', color: '#ffffff', align: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderRadius: 999, opacity: 1, letterSpacing: 0.04, lineHeight: 1.2 },
  { id: 'kicker', name: 'Etichetta', type: 'text', visible: true, x: 8, y: 22, width: 34, height: 3.5, zIndex: 15, text: 'Report Riservato', fontSize: 12, fontWeight: 'normal', color: '#cbd5f5', align: 'left', opacity: 0.8, letterSpacing: 0.28, lineHeight: 1.2, uppercase: true },
  { id: 'heading', name: 'Titolo principale', type: 'text', visible: true, x: 8, y: 29, width: 58, height: 8, zIndex: 15, text: 'Pre-Assessment Tool', fontSize: 36, fontWeight: 'bold', color: '#ffffff', align: 'left', opacity: 1, lineHeight: 1.12 },
  { id: 'company', name: 'Azienda', type: 'company', visible: true, x: 8, y: 38.5, width: 58, height: 4, zIndex: 15, fontSize: 18, fontWeight: 'normal', color: '#dbeafe', align: 'left', opacity: 1, lineHeight: 1.25 },
  { id: 'date', name: 'Data generazione', type: 'date', visible: true, x: 8, y: 43, width: 50, height: 3.5, zIndex: 15, fontSize: 12, fontWeight: 'normal', color: '#c7d2fe', align: 'left', opacity: 1, lineHeight: 1.2 },
  { id: 'detail', name: 'Testo descrittivo', type: 'text', visible: true, x: 8, y: 50, width: 58, height: 11, zIndex: 15, text: 'Gestione professionale del checkup governance per studi legali e aziende. Un report strutturato per decisioni rapide e tracciabilità completa.', fontSize: 12, fontWeight: 'normal', color: '#dbeafe', align: 'left', opacity: 1, lineHeight: 1.65 },
  { id: 'features', name: 'Bullet point', type: 'features', visible: true, x: 8, y: 64, width: 72, height: 16, zIndex: 15, items: ['Tracking completo e stato avanzamento in tempo reale', 'Sicurezza, compliance e audit trail integrato', 'Dashboard e report con KPI immediati', 'Collaborazione studio-cliente con controllo accessi'], fontSize: 11, fontWeight: 'normal', color: '#e2e8f0', align: 'left', opacity: 1, lineHeight: 1.45 },
  { id: 'footer-note', name: 'Nota footer copertina', type: 'text', visible: true, x: 8, y: 93.5, width: 40, height: 3, zIndex: 12, text: 'Documento ad uso interno e cliente', fontSize: 10, fontWeight: 'normal', color: '#cbd5f5', align: 'left', opacity: 1, lineHeight: 1.2 },
  { id: 'consultant', name: 'Consulente', type: 'consultant', visible: true, x: 60, y: 93.5, width: 30, height: 3, zIndex: 12, fontSize: 11, fontWeight: 'normal', color: 'rgba(255,255,255,0.65)', align: 'right', opacity: 1, lineHeight: 1.2 },
];

DEFAULT_PDF_CONFIG.coverElements = cloneDefaultCoverElements();


export function cloneDefaultCoverElements(): CoverElement[] {
  return DEFAULT_COVER_ELEMENTS.map((element) => ({
    ...element,
    items: element.items ? [...element.items] : undefined,
  }));
}

export function materializeCoverElements(config: Partial<PdfConfig>): CoverElement[] {
  if (config.coverElements?.length) {
    const defaultById = new Map(cloneDefaultCoverElements().map((element) => [element.id, element]));
    return config.coverElements.map((element) => ({
      ...(defaultById.get(element.id) ?? {}),
      ...element,
      items: element.items ? [...element.items] : undefined,
    })).sort((a, b) => a.zIndex - b.zIndex);
  }

  const base = cloneDefaultCoverElements().map((element) => ({
    ...element,
    items: element.items ? [...element.items] : undefined,
  }));
  const alignFallback = config.coverTextAlign ?? 'left';
  const byId = new Map(base.map((element) => [element.id, element]));
  const chip = byId.get('chip');
  const footerNote = byId.get('footer-note');
  const title = byId.get('title');
  const subtitle = byId.get('subtitle');
  const kicker = byId.get('kicker');
  const heading = byId.get('heading');
  const detail = byId.get('detail');
  const features = byId.get('features');
  const consultant = byId.get('consultant');
  const date = byId.get('date');
  const logo = byId.get('logo');

  if (logo) logo.visible = config.coverShowLogo ?? logo.visible;
  if (title) {
    title.text = config.coverTitle ?? title.text;
    title.visible = config.coverShowTitle ?? title.visible;
    title.fontSize = config.coverTitleFontSize ?? title.fontSize;
    title.fontWeight = config.coverTitleFontWeight ?? title.fontWeight;
    title.align = config.coverTitleAlign ?? alignFallback;
  }
  if (subtitle) {
    subtitle.text = config.coverSubtitle ?? subtitle.text;
    subtitle.visible = config.coverShowSubtitle ?? subtitle.visible;
    subtitle.fontSize = config.coverSubtitleFontSize ?? subtitle.fontSize;
    subtitle.fontWeight = config.coverSubtitleFontWeight ?? subtitle.fontWeight;
    subtitle.align = config.coverSubtitleAlign ?? alignFallback;
  }
  if (kicker) {
    kicker.text = config.coverKicker ?? kicker.text;
    kicker.visible = config.coverShowKicker ?? kicker.visible;
    kicker.fontSize = config.coverKickerFontSize ?? kicker.fontSize;
    kicker.fontWeight = config.coverKickerFontWeight ?? kicker.fontWeight;
    kicker.align = config.coverKickerAlign ?? alignFallback;
  }
  if (heading) {
    heading.text = config.coverHeading ?? heading.text;
    heading.visible = config.coverShowHeading ?? heading.visible;
    heading.fontSize = config.coverHeadingFontSize ?? heading.fontSize;
    heading.fontWeight = config.coverHeadingFontWeight ?? heading.fontWeight;
    heading.align = config.coverHeadingAlign ?? alignFallback;
    heading.color = config.coverHeadingColor ?? heading.color;
  }
  if (detail) {
    detail.text = config.coverDetail ?? detail.text;
    detail.visible = config.coverShowDetail ?? detail.visible;
    detail.fontSize = config.coverDetailFontSize ?? detail.fontSize;
    detail.fontWeight = config.coverDetailFontWeight ?? detail.fontWeight;
    detail.align = config.coverDetailAlign ?? alignFallback;
    detail.color = config.coverSubTextColor ?? detail.color;
  }
  if (features) {
    features.items = config.coverFeatures?.length ? [...config.coverFeatures] : (features.items ?? []);
    features.visible = config.coverShowFeatures ?? features.visible;
    features.fontSize = config.coverFeaturesFontSize ?? features.fontSize;
    features.align = config.coverFeaturesAlign ?? alignFallback;
  }
  if (chip) {
    chip.text = config.coverChipText ?? chip.text;
    chip.visible = config.coverShowChip ?? chip.visible;
    chip.fontSize = config.coverChipFontSize ?? chip.fontSize;
    if ((config.coverChipPosition ?? 'footer') === 'top') {
      chip.x = 78; chip.y = 5;
    } else if ((config.coverChipPosition ?? 'footer') === 'center') {
      chip.x = 8; chip.y = 18;
    } else {
      chip.x = 8; chip.y = 92.5;
      if (footerNote) {
        footerNote.x = 24;
        footerNote.width = 32;
      }
    }
  }
  if (footerNote) {
    footerNote.text = config.coverFooterNote ?? footerNote.text;
    footerNote.visible = config.coverShowFooterNote ?? footerNote.visible;
    footerNote.fontSize = config.coverFooterNoteFontSize ?? footerNote.fontSize;
    footerNote.align = config.coverFooterNoteAlign ?? alignFallback;
  }
  if (consultant) {
    consultant.visible = config.coverShowConsultant ?? consultant.visible;
  }
  if (date) {
    date.visible = config.coverShowDate ?? date.visible;
  }

  return base.sort((a, b) => a.zIndex - b.zIndex);
}

export const checkupPdfConfigApi = {
  getConfig: (): Promise<PdfConfig> =>
    api.get<PdfConfig>('/admin/checkup/pdf-config'),

  getPreviewContext: (): Promise<PdfCoverPreviewContext> =>
    api.get<PdfCoverPreviewContext>('/admin/checkup/pdf-config/preview-context'),

  updateConfig: (config: PdfConfig): Promise<PdfConfig> =>
    api.put<PdfConfig>('/admin/checkup/pdf-config', config),

  /** Genera PDF di anteprima — il frontend manda l'HTML generato localmente */
  previewPdf: async (html: string): Promise<Blob> => {
    const token = localStorage.getItem('auth_token') || '';
    const response = await fetch(`${API_BASE_URL}/admin/checkup/pdf-config/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ html }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Errore generazione anteprima' }));
      throw new Error(err.message || `Errore ${response.status}`);
    }
    return response.blob();
  },
};
