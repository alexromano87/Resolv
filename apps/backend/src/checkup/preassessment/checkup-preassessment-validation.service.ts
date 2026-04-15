import { Injectable } from '@nestjs/common';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { QuestionManagementService } from '../services/question-management.service';

/**
 * Maps macro-area codes to the corresponding "owner email" field key stored
 * inside CheckupPreassessment.data.  Only areas listed here have an owner.
 */
export const OWNER_EMAIL_BY_MACRO: Readonly<Record<string, string>> = {
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

/** Set of all owner-email field keys, derived from OWNER_EMAIL_BY_MACRO. */
export const OWNER_EMAIL_FIELDS: ReadonlySet<string> = new Set(Object.values(OWNER_EMAIL_BY_MACRO));

export interface SectionMeta {
  macroId: string;
  /**
   * Question fields that must be answered before validation.
   * N/A is handled separately and counts as a valid answer.
   */
  requiredFields: string[];
}

export interface StructureMeta {
  sectionMeta: Map<string, SectionMeta>;
  fieldToMacro: Map<string, string>;
}

@Injectable()
export class CheckupPreassessmentValidationService {
  constructor(private readonly questionManagementService: QuestionManagementService) {}

  // ── Pure classification helpers ────────────────────────────────────────────

  /**
   * Returns true when the given macro-area code/label represents an "owner"
   * area (macro k or any area whose label contains "owner").
   */
  isOwnerMacroArea(code: string, label?: string | null): boolean {
    if (code === 'k') return true;
    if (label && label.toLowerCase().includes('owner')) return true;
    return false;
  }

  /**
   * Returns true when the current user is the designated super-owner
   * (cliente with superOwner flag set).
   */
  isSuperOwner(user: CheckupCurrentUserData): boolean {
    return user.ruolo === 'cliente' && Boolean(user.superOwner);
  }

  /**
   * Returns true when the current user is the assigned owner for the given
   * macro area (their email matches the owner email stored in the record).
   */
  isOwnerForMacro(record: CheckupPreassessment, user: CheckupCurrentUserData, macroId: string): boolean {
    if (user.ruolo !== 'cliente') return false;
    const field = OWNER_EMAIL_BY_MACRO[macroId];
    if (!field) return false;
    const ownerEmail = (record.data?.[field] || '').trim().toLowerCase();
    return ownerEmail !== '' && ownerEmail === user.email.toLowerCase();
  }

  // ── Array/set utilities ────────────────────────────────────────────────────

  /**
   * Normalises macro-area assignment strings: trims whitespace, deduplicates,
   * and removes empty entries.
   */
  normalizeMacroAssignments(assignments?: string[] | null): string[] {
    return Array.from(
      new Set(
        (assignments || [])
          .map((v) => v?.trim())
          .filter((v): v is string => Boolean(v)),
      ),
    );
  }

  /**
   * Merges field values from `incoming` into `existing`, but only for fields
   * that belong to an allowed macro area.  If `allowedMacros` is null, all
   * fields are allowed (no restriction).
   */
  mergeAllowedFieldValues<T extends string | boolean>(
    existing: Record<string, T> | null | undefined,
    incoming: Record<string, T> | undefined,
    fieldToMacro: Map<string, string>,
    allowedMacros: Set<string> | null,
  ): Record<string, T> | undefined {
    if (incoming === undefined) return undefined;
    if (!allowedMacros) return incoming;

    const merged = { ...(existing || {}) };
    Object.entries(incoming).forEach(([fieldId, value]) => {
      const macroId = fieldToMacro.get(fieldId);
      if (macroId && allowedMacros.has(macroId)) {
        merged[fieldId] = value;
      }
    });
    return merged;
  }

  // ── Field-level metadata tracking ─────────────────────────────────────────

  /**
   * Updates `record.fieldMeta` to record which user changed which field and
   * when.  Only fields that actually changed (value or N/A status) are
   * updated.
   */
  applyFieldMeta(
    record: CheckupPreassessment,
    nextData: Record<string, string> | undefined,
    nextNaFields: Record<string, boolean> | undefined,
    currentUser: CheckupCurrentUserData,
  ): void {
    if (!nextData && !nextNaFields) return;
    const prev = record.data || {};
    const prevNA = record.naFields || {};
    const meta = record.fieldMeta || {};
    const nowIso = new Date().toISOString();
    const name = `${currentUser.nome} ${currentUser.cognome}`.trim() || currentUser.email;

    const keys = new Set<string>([
      ...Object.keys(prev),
      ...Object.keys(prevNA),
      ...Object.keys(nextData || {}),
      ...Object.keys(nextNaFields || {}),
    ]);

    keys.forEach((key) => {
      const prevVal = prev[key] ?? '';
      const nextVal = nextData ? (nextData[key] ?? '') : prevVal;
      const prevNa = Boolean(prevNA[key]);
      const nextNa = nextNaFields ? Boolean(nextNaFields[key]) : prevNa;
      if (prevVal !== nextVal || prevNa !== nextNa) {
        meta[key] = {
          updatedAt: nowIso,
          updatedBy: {
            id: currentUser.id,
            name,
            ruolo: currentUser.ruolo,
          },
        };
      }
    });

    record.fieldMeta = meta;
  }

  // ── Higher-level domain helpers ───────────────────────────────────────────

  /**
   * Returns the list of macro-area codes that can be validated by the client
   * (i.e. all areas that are NOT owner-only areas).
   */
  async getNonOwnerMacroCodes(modelId: string): Promise<string[]> {
    const macroAreas = await this.questionManagementService.getAllMacroAreas(modelId);
    return macroAreas
      .filter((m) => !this.isOwnerMacroArea(m.code, m.label))
      .map((m) => m.code);
  }

  // ── Structure lookups ──────────────────────────────────────────────────────

  /**
   * Returns a map from section code → macro and question fields to complete.
   */
  async getSectionMetaByModel(modelId: string): Promise<Map<string, SectionMeta>> {
    const structure = await this.questionManagementService.getCompleteStructure(modelId);
    const map = new Map<string, SectionMeta>();
    structure.forEach((macro) => {
      (macro.sections || []).forEach((section) => {
        map.set(section.code, {
          macroId: macro.code,
          requiredFields: (section.fields || []).map((f) => f.fieldId),
        });
      });
    });
    return map;
  }

  /**
   * Returns both the section→macro map and the field→macro map for the given
   * question model.
   */
  async getStructureMetaByModel(modelId: string): Promise<StructureMeta> {
    const structure = await this.questionManagementService.getCompleteStructure(modelId);
    const sectionMeta = new Map<string, SectionMeta>();
    const fieldToMacro = new Map<string, string>();

    structure.forEach((macro) => {
      (macro.sections || []).forEach((section) => {
        sectionMeta.set(section.code, {
          macroId: macro.code,
          requiredFields: (section.fields || []).map((f) => f.fieldId),
        });
        (section.fields || []).forEach((field) => {
          fieldToMacro.set(field.fieldId, macro.code);
        });
      });
    });

    return { sectionMeta, fieldToMacro };
  }
}
