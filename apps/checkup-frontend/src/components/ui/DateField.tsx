import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BodyPortal } from './BodyPortal';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar as CalendarIcon,
} from 'lucide-react';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const formatDisplayDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const isoFromDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

  const clampDate = (value: Date, min?: string, max?: string) => {
    const parsedMin = min ? new Date(min) : undefined;
    const parsedMax = max ? new Date(max) : undefined;
  if (parsedMin && value < parsedMin) {
    return parsedMin;
  }
  if (parsedMax && value > parsedMax) {
    return parsedMax;
  }
  return value;
};

const buildCalendar = (month: Date) => {
  const year = month.getFullYear();
  const currentMonth = month.getMonth();
  const firstOfMonth = new Date(year, currentMonth, 1);
  const startDay = (firstOfMonth.getDay() + 6) % 7; // Monday-based
  const matrix = [];
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - startDay);

  for (let i = 0; i < 42; i += 1) {
    const cell = new Date(startDate);
    cell.setDate(startDate.getDate() + i);
    matrix.push({
      date: new Date(cell),
      isCurrentMonth: cell.getMonth() === currentMonth,
    });
  }

  return matrix;
};

interface DateFieldProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}

export function DateField({
  value,
  onChange,
  placeholder = 'Seleziona una data',
  helperText,
  min,
  max,
  disabled = false,
  className = '',
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = value ? new Date(value) : new Date();
    if (Number.isNaN(selected.getTime())) {
      return new Date();
    }
    return selected;
  });
  const [calendarStyle, setCalendarStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [value]);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const preferredHeight = 380;
      const height = Math.min(preferredHeight, window.innerHeight - 24);
      const width = 300;
      const maxLeft = window.innerWidth - width - 12;
      const top = Math.min(window.innerHeight - height - 12, rect.bottom + 8);
      const left = Math.max(12, Math.min(rect.left, maxLeft));
      setCalendarStyle({
        position: 'fixed',
        top,
        left,
        width,
        maxHeight: height,
        zIndex: 2100,
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
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        calendarRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const monthDays = useMemo(() => buildCalendar(visibleMonth), [visibleMonth]);

  const handleSelectDate = (date: Date) => {
    if (disabled) return;
    const safe = clampDate(date, min, max);
    onChange(isoFromDate(safe));
    setVisibleMonth(safe);
    setIsOpen(false);
  };

  const minYear = min ? new Date(min).getFullYear() : 1900;
  const maxYear = max ? new Date(max).getFullYear() : new Date().getFullYear() + 10;
  const canNavigatePrev = !min || visibleMonth > new Date(min);
  const canNavigateNext = !max || new Date(max) > visibleMonth;
  const handleVisibleMonthChange = (next: Date) => {
    const clamped = clampDate(next, min, max);
    setVisibleMonth(clamped);
  };

  const triggerClassNames = [
    'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm outline-none transition',
    'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
    disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-indigo-400',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => !prev);
        }}
        className={triggerClassNames}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          <span className={`${value ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {helperText && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
      {isOpen && !disabled && (
        <BodyPortal>
          <div
            ref={calendarRef}
            style={calendarStyle}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_30px_70px_rgba(15,23,42,0.2)] dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleVisibleMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                  disabled={!canNavigatePrev}
                  className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleVisibleMonthChange(new Date(visibleMonth.getFullYear() - 1, visibleMonth.getMonth(), 1))}
                  disabled={visibleMonth.getFullYear() - 1 < minYear}
                  className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  {visibleMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </span>
                <select
                  value={visibleMonth.getFullYear()}
                  onChange={(event) => {
                    const selectedYear = Number(event.target.value);
                    handleVisibleMonthChange(new Date(selectedYear, visibleMonth.getMonth(), 1));
                  }}
                  className="bg-transparent font-semibold text-slate-600 dark:text-slate-300 focus:outline-none"
                >
                  {Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleVisibleMonthChange(new Date(visibleMonth.getFullYear() + 1, visibleMonth.getMonth(), 1))}
                  disabled={visibleMonth.getFullYear() + 1 > maxYear}
                  className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleVisibleMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                  disabled={!canNavigateNext}
                  className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
              {WEEKDAYS.map((day) => (
                <span key={day} className="text-center">
                  {day}
                </span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
              {monthDays.map(({ date, isCurrentMonth }) => {
                const isSelected =
                  selectedDate && date.toDateString() === selectedDate.toDateString();
                const isDisabled =
                  (min && date < new Date(min)) || (max && date > new Date(max)) || !isCurrentMonth;
                return (
                  <button
                    type="button"
                    key={date.toISOString()}
                    onClick={() => handleSelectDate(date)}
                    disabled={isDisabled}
                    className={`h-8 w-8 rounded-full text-xs transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : isDisabled
                        ? 'text-slate-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    } ${isCurrentMonth ? '' : 'text-slate-400'} flex items-center justify-center`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSelectDate(new Date())}
                className="w-full px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg transition"
              >
                Oggi
              </button>
            </div>
          </div>
        </BodyPortal>
      )}
    </div>
  );
}
