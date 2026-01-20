// apps/frontend/src/components/ui/SearchableDebitoreSelect.tsx
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Building2, Check, ChevronDown, User } from 'lucide-react';
import type { Debitore } from '../../api/debitori';
import { getDebitoreDisplayName } from '../../api/debitori';

export interface SearchableDebitoreSelectProps {
  debitori: Debitore[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  allowClear?: boolean;
  selectedDebitoreId?: string | null;
  onSelect?: (debitoreId: string | null) => void;
  value?: string | null;
  onChange?: (debitoreId: string | null) => void;
}

export function SearchableDebitoreSelect({
  debitori,
  loading = false,
  disabled = false,
  placeholder = 'Cerca debitore...',
  className = '',
  triggerClassName = '',
  allowClear = true,
  selectedDebitoreId,
  onSelect,
  value,
  onChange,
}: SearchableDebitoreSelectProps) {
  const actualSelectedId = value !== undefined ? value : selectedDebitoreId;
  const actualOnSelect = onChange || onSelect || (() => {});

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedDebitore = useMemo(
    () => debitori.find((d) => d.id === actualSelectedId) ?? null,
    [debitori, actualSelectedId],
  );

  const filteredDebitori = useMemo(() => {
    if (!searchTerm.trim()) return debitori;
    const term = searchTerm.toLowerCase().trim();
    const termNoSpace = term.replace(/[\s.]/g, '');

    return debitori.filter((d) => {
      const displayName = getDebitoreDisplayName(d).toLowerCase();
      if (displayName.includes(term)) return true;
      if (d.partitaIva?.replace(/[\s.]/g, '').includes(termNoSpace)) return true;
      if (d.codiceFiscale?.toLowerCase().includes(term)) return true;
      if (d.citta?.toLowerCase().includes(term)) return true;
      return false;
    });
  }, [debitori, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const preferredHeight = 280;

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldDropUp = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
      const height = Math.min(preferredHeight, window.innerHeight - 24);
      const top = shouldDropUp
        ? Math.max(12, rect.top - height - 8)
        : Math.min(window.innerHeight - height - 12, rect.bottom + 8);

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

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (debitore: Debitore) => {
    actualOnSelect(debitore.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    actualOnSelect(null);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const getSecondaryLine = (d: Debitore) => {
    const parts = [
      d.partitaIva && `P.IVA ${d.partitaIva}`,
      d.codiceFiscale && `CF ${d.codiceFiscale}`,
      d.citta,
    ].filter(Boolean);
    return parts.join(' · ');
  };

  return (
    <div ref={containerRef} className={`relative z-30 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={[
          'flex w-full items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-left text-xs shadow-[0_16px_40px_rgba(15,23,42,0.12)] outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 disabled:cursor-not-allowed disabled:bg-white/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30 dark:disabled:bg-slate-800',
          triggerClassName,
        ].join(' ')}
      >
        {loading ? (
          <span className="text-slate-400 dark:text-slate-500">Caricamento debitori...</span>
        ) : selectedDebitore ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {selectedDebitore.tipoSoggetto === 'persona_giuridica' ? (
              <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
            ) : (
              <User className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                {getDebitoreDisplayName(selectedDebitore)}
              </span>
              {getSecondaryLine(selectedDebitore) && (
                <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {getSecondaryLine(selectedDebitore)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {selectedDebitore && !disabled && allowClear && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              className="rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200/70 p-2 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Cerca per nome, P.IVA, CF o città..."
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-8 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/30"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <X className="h-3 w-3 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {filteredDebitori.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  {searchTerm
                    ? 'Nessun debitore trovato per questa ricerca'
                    : 'Nessun debitore disponibile'}
                </div>
              ) : (
                <ul className="py-1">
                  {filteredDebitori.map((debitore) => {
                    const isSelected = debitore.id === actualSelectedId;
                    return (
                      <li key={debitore.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(debitore)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                              isSelected
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3" />
                            ) : debitore.tipoSoggetto === 'persona_giuridica' ? (
                              <Building2 className="h-3 w-3" />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate font-medium ${
                                isSelected
                                  ? 'text-indigo-700 dark:text-indigo-300'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {getDebitoreDisplayName(debitore)}
                            </p>
                            <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                              {getSecondaryLine(debitore)}
                            </p>
                          </div>

                          {!debitore.attivo && (
                            <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                              Disattivato
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {filteredDebitori.length > 0 && (
              <div className="border-t border-slate-200 px-3 py-1.5 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {filteredDebitori.length === debitori.length
                  ? `${debitori.length} debitori totali`
                  : `${filteredDebitori.length} di ${debitori.length} debitori`}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
