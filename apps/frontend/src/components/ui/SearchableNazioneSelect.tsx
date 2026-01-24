import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Globe, ChevronDown } from 'lucide-react';
import type { Nazione } from '../../api/nazioni';

export interface SearchableNazioneSelectProps {
  nazioni: Nazione[];
  value: string | null;
  onChange: (codice: string | null) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  allowClear?: boolean;
}

export function SearchableNazioneSelect({
  nazioni,
  value,
  onChange,
  loading = false,
  disabled = false,
  placeholder = 'Seleziona nazione...',
  className = '',
  triggerClassName = '',
  allowClear = true,
}: SearchableNazioneSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedNazione = useMemo(
    () => nazioni.find((n) => n.codice === value) ?? null,
    [nazioni, value],
  );

  const filteredNazioni = useMemo(() => {
    if (!searchTerm.trim()) return nazioni;
    const term = searchTerm.toLowerCase().trim();
    return nazioni.filter((n) => {
      if (n.nome.toLowerCase().includes(term)) return true;
      if (n.codice.toLowerCase().includes(term)) return true;
      return false;
    });
  }, [nazioni, searchTerm]);

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

  const handleSelect = (nazione: Nazione) => {
    onChange(nazione.codice);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
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
          <span className="text-slate-400 dark:text-slate-500">Caricamento nazioni...</span>
        ) : selectedNazione ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Globe className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                {selectedNazione.nome}
              </span>
              <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                {selectedNazione.codice}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {selectedNazione && !disabled && allowClear && (
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
                  placeholder="Cerca nazione..."
                  className="w-full rounded-xl border border-slate-200/70 bg-white py-2 pl-7 pr-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto py-1">
              {filteredNazioni.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  Nessuna nazione trovata
                </div>
              ) : (
                filteredNazioni.map((nazione) => (
                  <button
                    key={nazione.codice}
                    type="button"
                    onClick={() => handleSelect(nazione)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition ${
                      nazione.codice === value
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                        {nazione.nome}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                        {nazione.codice}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
