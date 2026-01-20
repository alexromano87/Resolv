import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
import type { User } from '../../api/auth';

interface CollaboratoriMultiSelectProps {
  collaboratori: User[] | undefined;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const getCollaboratoreLabel = (collaboratore: User) =>
  `${collaboratore.nome} ${collaboratore.cognome}`.trim();

export function CollaboratoriMultiSelect({
  collaboratori,
  selectedIds,
  onChange,
  loading = false,
  disabled = false,
  placeholder = 'Seleziona collaboratori...',
}: CollaboratoriMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const safeCollaboratori = collaboratori || [];
  const selectedCollaboratori = safeCollaboratori.filter((c) => selectedIds.includes(c.id));
  const availableCollaboratori = safeCollaboratori.filter(
    (c) => !selectedIds.includes(c.id) && c.attivo,
  );

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  const preferredHeight = 240;

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const height = Math.min(preferredHeight, Math.max(200, spaceBelow - 24));
      const top = rect.bottom + 8;
      setDropdownStyle({
        position: 'fixed',
        top,
        left: Math.max(12, rect.left),
        width: rect.width,
        maxHeight: height,
        zIndex: 2000,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative z-30">
      <div
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        ref={triggerRef}
        className={`min-h-[46px] w-full rounded-2xl border bg-white/90 px-4 py-3 text-sm transition cursor-pointer shadow-[0_14px_36px_rgba(15,23,42,0.12)]
          ${disabled || loading ? 'cursor-not-allowed opacity-50' : 'hover:border-indigo-300'}
          ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-200/60' : 'border-white/70'}
          dark:border-slate-700 dark:bg-slate-900`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedCollaboratori.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          ) : (
            selectedCollaboratori.map((collaboratore) => (
              <span
                key={collaboratore.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
              >
                {getCollaboratoreLabel(collaboratore)}
                <button
                  onClick={(e) => handleRemove(collaboratore.id, e)}
                  className="hover:text-indigo-900 dark:hover:text-indigo-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
          <ChevronDown
            className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen &&
        !disabled &&
        !loading &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[1999]" onClick={() => setIsOpen(false)} />
            <div
              style={dropdownStyle}
              className="overflow-auto rounded-2xl border border-white/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900"
            >
              {availableCollaboratori.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400">
                  {safeCollaboratori.length === 0
                    ? 'Nessun collaboratore disponibile'
                    : 'Tutti i collaboratori sono stati selezionati'}
                </div>
              ) : (
                availableCollaboratori.map((collaboratore) => {
                  const isInactive = !collaboratore.attivo;
                  return (
                    <button
                      key={collaboratore.id}
                      onClick={() => handleToggle(collaboratore.id)}
                      className={[
                        'w-full px-3 py-2 text-left text-sm transition',
                        isInactive
                          ? 'opacity-60 hover:bg-slate-50/50 dark:hover:bg-slate-700/50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700',
                      ].join(' ')}
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {getCollaboratoreLabel(collaboratore)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {collaboratore.email}
                        {!collaboratore.attivo ? ' · inattivo' : ''}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
