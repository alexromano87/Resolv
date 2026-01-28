// apps/frontend/src/components/ui/CustomSelect.tsx
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  status?: 'completed';
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  dropUp?: boolean;
  className?: string;
  triggerClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleziona...',
  disabled = false,
  loading = false,
  dropUp = false,
  className = '',
  triggerClassName = '',
  searchable = false,
  searchPlaceholder = 'Cerca...',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const filteredOptions = searchable && searchTerm.trim()
    ? options.filter((option) => {
        const term = searchTerm.toLowerCase().trim();
        return (
          option.label.toLowerCase().includes(term) ||
          option.value.toLowerCase().includes(term) ||
          (option.sublabel ? option.sublabel.toLowerCase().includes(term) : false)
        );
      })
    : options;

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const preferredHeight = 280;
  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const shouldDropUp = dropUp;
        const height = Math.min(preferredHeight, window.innerHeight - 24);
        const top = shouldDropUp
          ? Math.max(12, rect.top - height - 8)
          : Math.min(window.innerHeight - height - 12, rect.bottom + 8);
        const maxLeft = window.innerWidth - rect.width - 12;
        const left = Math.max(12, Math.min(rect.left, maxLeft));
        setDropdownStyle({
          position: 'fixed',
          top,
          left,
          width: rect.width,
          maxHeight: height,
          zIndex: 2000,
        });
    };

    const scheduleUpdate = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    scheduleUpdate();
    const handleResize = () => scheduleUpdate();
    const handleScroll = () => scheduleUpdate();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isOpen, dropUp]);

  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  return (
    <div ref={containerRef} className={`relative z-30 ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={[
          'flex w-full items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-left text-xs shadow-[0_16px_40px_rgba(15,23,42,0.12)] outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/60 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-indigo-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30 dark:disabled:bg-slate-800 dark:disabled:text-slate-400',
          triggerClassName,
        ].join(' ')}
      >
        {loading ? (
          <span className="text-slate-400 dark:text-slate-500">Caricamento...</span>
        ) : selectedOption ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {selectedOption.icon}
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {selectedOption.sublabel}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
        )}

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {searchable && (
              <div className="border-b border-slate-200/70 p-2 dark:border-slate-700">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2 pl-3 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/30"
                />
              </div>
            )}
            {/* Results List */}
            <div className="max-h-64 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  Nessuna opzione disponibile
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  const isCompletedStatus = option.status === 'completed';
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition ${
                        option.disabled
                          ? 'cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                          : isCompletedStatus
                          ? 'bg-emerald-50/70 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          isSelected
                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300'
                            : isCompletedStatus
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-medium ${
                            isSelected
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : isCompletedStatus
                              ? 'text-emerald-700 dark:text-emerald-200'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {option.label}
                        </p>
                        {option.sublabel && (
                          <p
                            className={`truncate text-[10px] ${
                              isCompletedStatus
                                ? 'text-emerald-700/80 dark:text-emerald-200/80'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {option.sublabel}
                          </p>
                        )}
                      </div>

                      {option.icon && (
                        <div className="shrink-0">{option.icon}</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
