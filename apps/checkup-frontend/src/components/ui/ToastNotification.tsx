// apps/checkup-frontend/src/components/ui/ToastNotification.tsx
import { X, CalendarClock, AlertTriangle } from 'lucide-react';

export interface AlertToast {
  id: string;
  messaggio: string;
  priority: 'info' | 'warning' | 'urgent';
  dataScadenza: string;
  preavvisoGiorni: number;
}

interface ToastNotificationProps {
  toasts: AlertToast[];
  onDismiss: (id: string) => void;
  onNavigate: () => void;
}

const PRIORITY_COLORS: Record<AlertToast['priority'], string> = {
  info: 'bg-indigo-50 border-indigo-300 text-indigo-800',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  urgent: 'bg-rose-50 border-rose-300 text-rose-800',
};

const PRIORITY_ICON_COLORS: Record<AlertToast['priority'], string> = {
  info: 'text-indigo-500',
  warning: 'text-amber-500',
  urgent: 'text-rose-500',
};

const PRIORITY_LABELS: Record<AlertToast['priority'], string> = {
  info: 'Alert in scadenza',
  warning: '⚠ Alert in scadenza',
  urgent: '🔴 Alert urgente in scadenza',
};

export function ToastNotification({ toasts, onDismiss, onNavigate }: ToastNotificationProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[88px] right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-auto">
      {toasts.map((t) => {
        const scadeIl = new Date(t.dataScadenza).toLocaleDateString('it-IT', { dateStyle: 'medium' });
        const colors = PRIORITY_COLORS[t.priority];
        const iconColor = PRIORITY_ICON_COLORS[t.priority];
        const Icon = t.priority === 'urgent' ? AlertTriangle : CalendarClock;

        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 border rounded-xl p-3 shadow-lg cursor-pointer hover:brightness-95 transition-all ${colors}`}
            onClick={() => { onNavigate(); onDismiss(t.id); }}
            role="alert"
          >
            <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{PRIORITY_LABELS[t.priority]}</p>
              <p className="text-xs opacity-80 line-clamp-2 mt-0.5">{t.messaggio}</p>
              <p className="text-[10px] opacity-60 mt-0.5">Scade il {scadeIl}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(t.id); }}
              className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
              aria-label="Chiudi"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
