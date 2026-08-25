import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Selettore di contesto (appartenenza): visibile solo quando l'utente ha più
 * appartenenze attive — es. la stessa persona che è collaboratore di un
 * sublicenziatario e admin di un licenziatario diretto. Cambiando contesto il
 * backend riemette i token con il nuovo `mid` e l'app viene ricaricata nel
 * ruolo/studio scelto.
 *
 * Il menu è renderizzato in un portal su document.body con posizione fixed:
 * così esce da eventuali stacking context / overflow dell'header e non finisce
 * dietro all'hero della pagina.
 */
export function ContextSwitcher() {
  const { memberships, activeMembershipId, switchContext } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReflow = () => updatePosition();
    document.addEventListener('mousedown', onClick);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, updatePosition]);

  // Niente switcher se c'è un solo contesto (comportamento invariato).
  if (!memberships || memberships.length <= 1) return null;

  const active = memberships.find((m) => m.id === activeMembershipId) ?? memberships[0];

  const handleSelect = async (membershipId: string) => {
    if (membershipId === activeMembershipId || switching) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchContext(membershipId);
      const next = memberships.find((m) => m.id === membershipId);
      // Ricarica pulita nel nuovo contesto (ruolo/studio possono cambiare).
      const target = next && next.ruolo !== 'cliente' ? '/checkup/dashboard-studio' : '/checkup/';
      window.location.assign(target);
    } catch {
      setSwitching(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className="flex items-center gap-2 rounded-2xl border border-indigo-200/60 bg-white/85 px-3 py-2 text-xs shadow-[0_16px_46px_rgba(10,16,32,0.16)] transition hover:border-indigo-300 disabled:opacity-60"
        title="Cambia contesto"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-indigo-100 text-[11px]" aria-hidden>
          ⇄
        </span>
        <span className="leading-tight text-left">
          <span className="block text-[10px] uppercase tracking-wide text-slate-400">Contesto</span>
          <span className="block max-w-[180px] truncate font-semibold text-slate-900">{active?.label}</span>
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            I tuoi contesti
          </div>
          <div className="max-h-80 overflow-y-auto">
            {memberships.map((m) => {
              const isActive = m.id === activeMembershipId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.id)}
                  disabled={switching}
                  className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60 ${
                    isActive ? 'bg-indigo-50/60' : ''
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-transparent'
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="leading-tight">
                    <span className="block text-sm font-semibold text-slate-900">{m.label}</span>
                    {m.isPrimary && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Predefinito</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
