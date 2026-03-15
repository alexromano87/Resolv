import {
  IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString,
  Max, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MacroOverrideDto {
  @IsString()
  macroId: string;

  @IsIn(['questions', 'sections', 'integrity'])
  mode: 'questions' | 'sections' | 'integrity';

  @IsInt()
  @Min(1)
  limit: number;
}

/** Elementi ordinabili nella sezione centrale della copertina */
export type CoverCenterElement = 'kicker' | 'title-block' | 'detail' | 'features';
export type CoverElementType = 'logo' | 'text' | 'chip' | 'features' | 'company' | 'date' | 'consultant';

export class CoverElementDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsIn(['logo', 'text', 'chip', 'features', 'company', 'date', 'consultant'])
  type: CoverElementType;

  @IsBoolean()
  visible: boolean;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsInt()
  zIndex: number;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsNumber()
  fontSize: number;

  @IsIn(['normal', 'bold'])
  fontWeight: 'normal' | '500' | '600' | 'bold';

  @IsString()
  color: string;

  @IsIn(['left', 'center', 'right'])
  align: 'left' | 'center' | 'right';

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  borderColor?: string;

  @IsOptional()
  @IsNumber()
  borderWidth?: number;

  @IsOptional()
  @IsNumber()
  borderRadius?: number;

  @IsOptional()
  @IsNumber()
  opacity?: number;

  @IsOptional()
  @IsNumber()
  letterSpacing?: number;

  @IsOptional()
  @IsNumber()
  lineHeight?: number;

  @IsOptional()
  @IsBoolean()
  uppercase?: boolean;
}

export class PdfConfigDto {
  // ── Paginazione ────────────────────────────────────────────────────────────
  @IsInt()
  @Min(5)
  @Max(50)
  maxQuestionsPerPage: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MacroOverrideDto)
  macroOverrides: MacroOverrideDto[];

  // ── Stile ──────────────────────────────────────────────────────────────────
  @IsString()
  fontFamily: string;

  @IsNumber()
  bodyFontSize: number;

  @IsNumber()
  questionFontSize: number;

  @IsNumber()
  answerFontSize: number;

  @IsNumber()
  sectionHeaderFontSize: number;

  @IsNumber()
  borderWidth: number;

  // ── Elementi ───────────────────────────────────────────────────────────────
  @IsBoolean()
  showAsterisks: boolean;

  @IsBoolean()
  showUserNotes: boolean;

  @IsBoolean()
  showConsultantNotes: boolean;

  @IsBoolean()
  showDocuments: boolean;

  @IsBoolean()
  showIndex: boolean;

  // ── Macro header ───────────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  showMacroLetter: boolean;

  // ── Copertina — testi ──────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  coverTitle: string;

  @IsOptional()
  @IsString()
  coverSubtitle: string;

  @IsOptional()
  @IsString()
  coverKicker: string;

  @IsOptional()
  @IsString()
  coverHeading: string;

  @IsOptional()
  @IsString()
  coverDetail: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverFeatures: string[];

  @IsOptional()
  @IsString()
  coverChipText: string;

  @IsOptional()
  @IsString()
  coverFooterNote: string;

  // ── Copertina — visibilità ─────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  coverShowLogo: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowTitle: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowSubtitle: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowKicker: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowHeading: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowDetail: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowFeatures: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowChip: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowFooterNote: boolean;

  @IsOptional()
  @IsBoolean()
  coverShowConsultant: boolean;

  // ── Copertina — visibilità extra ───────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  coverShowDate: boolean;

  // ── Copertina — colori ─────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  coverBgStart: string;

  @IsOptional()
  @IsString()
  coverBgMid: string;

  @IsOptional()
  @IsString()
  coverBgEnd: string;

  @IsOptional()
  @IsString()
  coverAccentColor: string;

  @IsOptional()
  @IsString()
  coverHeadingColor: string;

  @IsOptional()
  @IsString()
  coverSubTextColor: string;

  // ── Copertina — allineamento ───────────────────────────────────────────────
  @IsOptional()
  @IsIn(['left', 'center', 'right'])
  coverTextAlign: 'left' | 'center' | 'right';

  // ── Copertina — dimensioni testi (px) ──────────────────────────────────────
  @IsOptional()
  @IsNumber()
  coverTitleFontSize: number;

  @IsOptional()
  @IsNumber()
  coverHeadingFontSize: number;

  @IsOptional()
  @IsNumber()
  coverKickerFontSize: number;

  @IsOptional()
  @IsNumber()
  coverDetailFontSize: number;

  @IsOptional()
  @IsNumber()
  coverFeaturesFontSize: number;

  // ── Copertina — font weight ────────────────────────────────────────────────
  @IsOptional()
  @IsIn(['normal', 'bold'])
  coverTitleFontWeight: 'normal' | 'bold';

  @IsOptional()
  @IsIn(['normal', 'bold'])
  coverHeadingFontWeight: 'normal' | 'bold';

  @IsOptional()
  @IsIn(['normal', 'bold'])
  coverKickerFontWeight: 'normal' | 'bold';

  @IsOptional()
  @IsIn(['normal', 'bold'])
  coverDetailFontWeight: 'normal' | 'bold';

  @IsOptional()
  @IsIn(['normal', 'bold'])
  coverSubtitleFontWeight: 'normal' | 'bold';

  // ── Copertina — dimensioni aggiuntive ──────────────────────────────────────
  @IsOptional()
  @IsNumber()
  coverSubtitleFontSize: number;

  @IsOptional()
  @IsNumber()
  coverChipFontSize: number;

  @IsOptional()
  @IsNumber()
  coverFooterNoteFontSize: number;

  // ── Copertina — posizione chip ─────────────────────────────────────────────
  @IsOptional()
  @IsIn(['top', 'center', 'footer'])
  coverChipPosition: 'top' | 'center' | 'footer';

  // ── Copertina — allineamento per elemento ──────────────────────────────────
  @IsOptional() @IsIn(['left', 'center', 'right']) coverTitleAlign: 'left' | 'center' | 'right';
  @IsOptional() @IsIn(['left', 'center', 'right']) coverSubtitleAlign: 'left' | 'center' | 'right';
  @IsOptional() @IsIn(['left', 'center', 'right']) coverKickerAlign: 'left' | 'center' | 'right';
  @IsOptional() @IsIn(['left', 'center', 'right']) coverHeadingAlign: 'left' | 'center' | 'right';
  @IsOptional() @IsIn(['left', 'center', 'right']) coverDetailAlign: 'left' | 'center' | 'right';
  @IsOptional() @IsIn(['left', 'center', 'right']) coverFeaturesAlign: 'left' | 'center' | 'right';
  @IsOptional() @IsIn(['left', 'center', 'right']) coverFooterNoteAlign: 'left' | 'center' | 'right';

  // ── Copertina — ordine elementi centrali ───────────────────────────────────
  @IsOptional()
  @IsArray()
  @IsIn(['kicker', 'title-block', 'detail', 'features'], { each: true })
  coverCenterOrder: CoverCenterElement[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverElementDto)
  coverElements: CoverElementDto[];

  // ── Footer ultima pagina ───────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  footerMainText: string;

  @IsOptional()
  @IsString()
  footerCopyrightText: string;

  @IsOptional()
  @IsBoolean()
  footerShowLogo: boolean;
}
