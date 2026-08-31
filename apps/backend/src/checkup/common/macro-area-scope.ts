/**
 * Semantica dei codici di owner/assegnazione con granularità mista
 * (area intera vs singola sotto-area).
 *
 * Un codice è:
 *  - una MACRO area (es. 'a')  → copre tutte le sue sotto-aree;
 *  - una SOTTO-AREA (es. 'a_1') → copre solo se stessa.
 *
 * Tutte le operazioni (copertura, conflitto, esclusività) lavorano espandendo
 * ogni codice all'insieme delle sotto-aree "foglia" che rappresenta.
 */
export interface MacroAreaScope {
  /** codici sotto-area validi (es. 'a_1'). */
  sectionCodes: Set<string>;
  /** codice sotto-area → codice macro (es. 'a_1' → 'a'). */
  sectionToMacro: Map<string, string>;
  /** codice macro → elenco codici sotto-area (es. 'a' → ['a_1','a_2']). */
  macroToSections: Map<string, string[]>;
}

export function buildMacroAreaScope(
  sections: Array<{ code: string; macroCode: string }>,
): MacroAreaScope {
  const sectionCodes = new Set<string>();
  const sectionToMacro = new Map<string, string>();
  const macroToSections = new Map<string, string[]>();
  for (const s of sections) {
    sectionCodes.add(s.code);
    sectionToMacro.set(s.code, s.macroCode);
    const list = macroToSections.get(s.macroCode) || [];
    list.push(s.code);
    macroToSections.set(s.macroCode, list);
  }
  return { sectionCodes, sectionToMacro, macroToSections };
}

/** Espande un codice (macro o sotto-area) all'insieme delle sotto-aree foglia. */
export function leafSectionsOf(code: string, scope: MacroAreaScope): string[] {
  if (scope.sectionCodes.has(code)) return [code];
  const subs = scope.macroToSections.get(code);
  if (subs && subs.length) return subs;
  // Macro senza sotto-aree note: rappresenta se stessa come foglia.
  return [code];
}

function leafSet(codes: string[], scope: MacroAreaScope): Set<string> {
  const out = new Set<string>();
  for (const c of codes) for (const leaf of leafSectionsOf(c, scope)) out.add(leaf);
  return out;
}

/** Ogni owner deve essere coperto dalle assegnazioni (owner ⊆ assegnazioni, con nesting). */
export function ownersWithinAssignments(
  owners: string[],
  assignments: string[],
  scope: MacroAreaScope,
): boolean {
  if (owners.length === 0) return true;
  const assigned = leafSet(assignments, scope);
  return owners.every((o) => leafSectionsOf(o, scope).every((leaf) => assigned.has(leaf)));
}

/**
 * Esclusività dentro una stessa selezione: per una data area non si possono
 * indicare sia l'area intera sia una sua sotto-area.
 * Ritorna i codici macro in conflitto (vuoto se ok).
 */
export function exclusivityConflicts(codes: string[], scope: MacroAreaScope): string[] {
  const set = new Set(codes);
  const conflicts: string[] = [];
  for (const code of set) {
    if (scope.sectionCodes.has(code)) continue; // è una sotto-area
    // code è una macro: conflitto se è presente anche una sua sotto-area
    const subs = scope.macroToSections.get(code) || [];
    if (subs.some((s) => set.has(s))) conflicts.push(code);
  }
  return conflicts;
}

/** Due codici owner sono in conflitto se coprono sotto-aree in comune. */
export function ownerCodesConflict(a: string, b: string, scope: MacroAreaScope): boolean {
  const la = new Set(leafSectionsOf(a, scope));
  return leafSectionsOf(b, scope).some((leaf) => la.has(leaf));
}
