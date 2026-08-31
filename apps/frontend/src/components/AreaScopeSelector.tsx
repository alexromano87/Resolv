import { useState } from 'react';

export interface MacroAreaNode {
  code: string;
  label: string;
  sections?: { code: string; title: string }[];
}

interface Props {
  macroAreas: MacroAreaNode[];
  assignments: string[];
  owner: string[];
  /** Se true l'assegnazione è "tutte le aree": si sceglie solo l'owner. */
  assignAll: boolean;
  disabled?: boolean;
  onChange: (next: { assignments: string[]; owner: string[] }) => void;
}

/**
 * Selettore a checkbox per assegnazione ("può lavorare") e owner, con granularità
 * mista (area intera vs singola sotto-area) ed esclusività: per una stessa area o
 * l'area intera o le sue sotto-aree. Le sotto-aree si aprono/chiudono con ▸/▾.
 */
export function AreaScopeSelector({ macroAreas, assignments, owner, assignAll, disabled, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const aSet = new Set(assignments);
  const oSet = new Set(owner);
  const secs = (m: MacroAreaNode) => m.sections ?? [];

  const toggleExpand = (key: string) =>
    setExpanded((e) => {
      const n = new Set(e);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const emit = (a: Set<string>, o: Set<string>) => onChange({ assignments: Array.from(a), owner: Array.from(o) });

  // ── Assegnazione ───────────────────────────────────────────────────────────
  const toggleMacroAssign = (m: MacroAreaNode, checked: boolean) => {
    const a = new Set(aSet);
    const o = new Set(oSet);
    secs(m).forEach((s) => {
      a.delete(s.code);
      o.delete(s.code);
    });
    if (checked) a.add(m.code);
    else {
      a.delete(m.code);
      o.delete(m.code);
    }
    emit(a, o);
  };
  const toggleSubAssign = (m: MacroAreaNode, code: string, checked: boolean) => {
    const a = new Set(aSet);
    const o = new Set(oSet);
    a.delete(m.code); // passando alle sotto-aree, niente area intera
    o.delete(m.code);
    if (checked) a.add(code);
    else {
      a.delete(code);
      o.delete(code);
    }
    emit(a, o);
  };

  // ── Owner ──────────────────────────────────────────────────────────────────
  const toggleMacroOwner = (m: MacroAreaNode, checked: boolean) => {
    const o = new Set(oSet);
    secs(m).forEach((s) => o.delete(s.code)); // esclusività: area intera vs sotto-aree
    if (checked) o.add(m.code);
    else o.delete(m.code);
    emit(new Set(aSet), o);
  };
  const toggleSubOwner = (m: MacroAreaNode, code: string, checked: boolean) => {
    const o = new Set(oSet);
    o.delete(m.code);
    if (checked) o.add(code);
    else o.delete(code);
    emit(new Set(aSet), o);
  };

  const macroWhole = (m: MacroAreaNode) => assignAll || aSet.has(m.code);
  const hasAssignedSubs = (m: MacroAreaNode) => assignAll ? secs(m).length > 0 : secs(m).some((s) => aSet.has(s.code));
  const inOwnerScope = (m: MacroAreaNode) => macroWhole(m) || hasAssignedSubs(m);

  const box = 'h-4 w-4 rounded border-slate-300 text-indigo-600';
  const subBox = 'h-3.5 w-3.5 rounded border-slate-300 text-indigo-600';
  const expandBtn = 'text-[11px] font-medium text-indigo-600 hover:underline';

  return (
    <div className="space-y-4">
      {/* ── ASSEGNAZIONE ─────────────────────────────────────────────────── */}
      {!assignAll && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Aree assegnate</div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
            {macroAreas.map((m) => {
              const hasSubs = secs(m).length > 0;
              const whole = aSet.has(m.code);
              const key = `a:${m.code}`;
              const isOpen = expanded.has(key);
              return (
                <div key={m.code}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className={box}
                      checked={whole}
                      disabled={disabled}
                      onChange={(e) => toggleMacroAssign(m, e.target.checked)}
                    />
                    <span className="text-sm text-slate-700">{m.label}</span>
                    {hasSubs && (
                      <button type="button" className={expandBtn} onClick={() => toggleExpand(key)}>
                        {isOpen ? '▾ nascondi sotto-aree' : '▸ sotto-aree'}
                      </button>
                    )}
                  </div>
                  {hasSubs && isOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      {whole && <div className="text-[10px] text-slate-400">Tutta l'area è assegnata (deseleziona l'area per scegliere singole sotto-aree).</div>}
                      {secs(m).map((s) => (
                        <label key={s.code} className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            className={subBox}
                            checked={aSet.has(s.code)}
                            disabled={disabled || whole}
                            onChange={(e) => toggleSubAssign(m, s.code, e.target.checked)}
                          />
                          <span className={whole ? 'text-slate-400' : ''}>{s.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── OWNER ────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Owner</div>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
          {macroAreas.filter(inOwnerScope).length === 0 ? (
            <div className="py-1 text-xs text-slate-400">Assegna prima delle aree/sotto-aree per poter indicare gli owner.</div>
          ) : (
            macroAreas.filter(inOwnerScope).map((m) => {
              const hasSubs = secs(m).length > 0;
              const whole = macroWhole(m);
              const key = `o:${m.code}`;
              const isOpen = expanded.has(key);
              const ownerSubs = secs(m).filter((s) => assignAll || aSet.has(s.code));
              return (
                <div key={m.code}>
                  <div className="flex items-center gap-2">
                    {whole ? (
                      <>
                        <input
                          type="checkbox"
                          className={box}
                          checked={oSet.has(m.code)}
                          disabled={disabled}
                          onChange={(e) => toggleMacroOwner(m, e.target.checked)}
                        />
                        <span className="text-sm text-slate-700">
                          {m.label} <span className="text-[11px] text-slate-400">(area intera)</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-700">{m.label}</span>
                    )}
                    {hasSubs && ownerSubs.length > 0 && (
                      <button type="button" className={expandBtn} onClick={() => toggleExpand(key)}>
                        {isOpen ? '▾ nascondi sotto-aree' : '▸ owner sotto-aree'}
                      </button>
                    )}
                  </div>
                  {hasSubs && isOpen && ownerSubs.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1">
                      {ownerSubs.map((s) => (
                        <label key={s.code} className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            className={subBox}
                            checked={oSet.has(s.code)}
                            disabled={disabled || oSet.has(m.code)}
                            onChange={(e) => toggleSubOwner(m, s.code, e.target.checked)}
                          />
                          <span>{s.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
