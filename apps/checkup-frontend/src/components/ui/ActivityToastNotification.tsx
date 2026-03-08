import { MessageCircle, Ticket, ClipboardCheck, CheckCircle2, X } from 'lucide-react';

export type ActivityToastKind = 'chat' | 'ticket' | 'validation' | 'completed' | 'approved';

export interface ActivityToast {
  id: string;
  kind: ActivityToastKind;
  titolo: string;
  messaggio: string;
  ctaLabel?: string;
}

interface ActivityToastNotificationProps {
  toasts: ActivityToast[];
  onDismiss: (id: string) => void;
  onNavigate: (toast: ActivityToast) => void;
}

const TOAST_STYLES: Record<ActivityToastKind, { box: string; icon: string; Icon: typeof MessageCircle }> = {
  chat: {
    box: 'bg-sky-50 border-sky-300 text-sky-900',
    icon: 'text-sky-600',
    Icon: MessageCircle,
  },
  ticket: {
    box: 'bg-amber-50 border-amber-300 text-amber-900',
    icon: 'text-amber-600',
    Icon: Ticket,
  },
  validation: {
    box: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    icon: 'text-indigo-600',
    Icon: ClipboardCheck,
  },
  completed: {
    box: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    icon: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  approved: {
    box: 'bg-teal-50 border-teal-300 text-teal-900',
    icon: 'text-teal-600',
    Icon: CheckCircle2,
  },
};

export function ActivityToastNotification({ toasts, onDismiss, onNavigate }: ActivityToastNotificationProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[88px] right-[22rem] z-[9999] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 pointer-events-auto">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.kind];
        const Icon = style.Icon;

        return (
          <div
            key={toast.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 shadow-lg transition-all hover:brightness-95 ${style.box}`}
            onClick={() => {
              onNavigate(toast);
              onDismiss(toast.id);
            }}
            role="alert"
          >
            <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${style.icon}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.titolo}</p>
              <p className="mt-0.5 text-xs opacity-80">{toast.messaggio}</p>
              {toast.ctaLabel ? <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">{toast.ctaLabel}</p> : null}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDismiss(toast.id);
              }}
              className="mt-0.5 flex-shrink-0 opacity-50 transition-opacity hover:opacity-100"
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
