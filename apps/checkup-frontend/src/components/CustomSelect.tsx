import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  noOptionsText?: string;
  className?: string;
  triggerClassName?: string;
  onOpen?: () => void;
  onClose?: () => void;
  allowClear?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleziona... ',
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Filtra...',
  noOptionsText = 'Nessun risultato',
  className = '',
  triggerClassName = '',
  onOpen,
  onClose,
  allowClear = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOptions = normalizedSearch
    ? options.filter((o) => {
        const haystack = `${o.label} ${o.description || ''}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : options;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current
        && !containerRef.current.contains(target)
        && !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [isOpen, onOpen, onClose]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const height = Math.min(280, window.innerHeight - 24);
      const top = Math.min(window.innerHeight - height - 12, rect.bottom + 8);
      const maxLeft = window.innerWidth - rect.width - 12;
      const left = Math.max(12, Math.min(rect.left, maxLeft));
      setDropdownStyle({
        position: 'fixed',
        top,
        left,
        width: rect.width,
        maxHeight: height,
        zIndex: 10010,
      });
    };
    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((p) => !p)}
        className={[
          'flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName,
        ].join(' ')}
      >
      {selected ? (
        <div className="flex flex-col text-left">
          <span className="truncate font-medium text-slate-900">{selected.label}</span>
          {selected.description && (
            <span className="truncate text-[11px] text-slate-500">{selected.description}</span>
          )}
        </div>
      ) : (
        <span className="text-slate-400">{placeholder}</span>
      )}
        <span className="flex items-center gap-1">
          {allowClear && value && (
            <span
              role="button"
              aria-label="Deseleziona"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">{noOptionsText}</div>
            )}
            {filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                    option.disabled
                      ? 'cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex flex-col text-left">
                    <span className="truncate">{option.label}</span>
                    {option.description && (
                      <span className="truncate text-[11px] text-slate-500">{option.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
