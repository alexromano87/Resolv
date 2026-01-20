// apps/frontend/src/components/ui/ToastProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  isAlert?: boolean;
};

type ShowToastOptions = {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms
  isAlert?: boolean;
};

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const playToastSound = useCallback(() => {
    try {
      const AudioContext =
        window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.08;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.18);
      oscillator.onended = () => context.close().catch(() => undefined);
    } catch {
      // Ignore audio errors (autoplay restrictions, etc.)
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ShowToastOptions) => {
      const { type = 'info', title, message, duration = 3500 } = options;
      const id = Date.now() + Math.random();

      setToasts((prev) => [
        ...prev,
        {
          id,
          type,
          title,
          message,
          isAlert: options.isAlert,
        },
      ]);

      if (options.isAlert) {
        try {
          const stored = localStorage.getItem('rc-user-settings');
          const parsed = stored ? JSON.parse(stored) : null;
          const soundEnabled = parsed?.notifications?.sound !== false;
          if (soundEnabled) {
            playToastSound();
          }
        } catch {
          playToastSound();
        }
      }

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [playToastSound, removeToast],
  );

  const success = useCallback(
    (message: string, title = 'Operazione completata') =>
      showToast({ type: 'success', title, message }),
    [showToast],
  );

  const error = useCallback(
    (message: string, title = 'Si è verificato un errore') =>
      showToast({ type: 'error', title, message, duration: 5000 }),
    [showToast],
  );

  const info = useCallback(
    (message: string, title = 'Informazione') =>
      showToast({ type: 'info', title, message }),
    [showToast],
  );

  const value: ToastContextValue = {
    showToast,
    success,
    error,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Container toasts */}
      <div className="pointer-events-none fixed top-5 left-1/2 z-[10050] flex w-full max-w-md -translate-x-1/2 flex-col gap-3 px-4">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          const borderClass = toast.isAlert
            ? 'border-rose-500 dark:border-rose-500/80'
            : isSuccess
            ? 'border-indigo-400 dark:border-indigo-400/70'
            : isError
              ? 'border-rose-400 dark:border-rose-400/70'
              : 'border-blue-400 dark:border-blue-400/70';

          const ringClass = toast.isAlert
            ? 'ring-rose-300/70 dark:ring-rose-600/70'
            : isSuccess
            ? 'ring-indigo-300/70 dark:ring-indigo-600/70'
            : isError
              ? 'ring-rose-300/70 dark:ring-rose-600/70'
              : 'ring-blue-300/70 dark:ring-blue-600/70';

          const Icon = isSuccess
            ? CheckCircle2
            : isError
              ? AlertCircle
              : Info;

          return (
            <div
              key={toast.id}
              className={[
                'pointer-events-auto flex items-start gap-4 rounded-3xl border px-5 py-4 text-sm shadow-[0_22px_60px_rgba(15,23,42,0.22)] transition-all duration-200',
                'bg-white dark:bg-slate-950',
                borderClass,
                'ring-1',
                ringClass,
                'animate-[toast-pop_200ms_ease-out]',
              ].join(' ')}
            >
              <div
                className={[
                  'mt-0.5 flex h-8 w-8 items-center justify-center rounded-full',
                  isSuccess
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-200'
                    : isError
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/80 dark:text-rose-200'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-200',
                ].join(' ')}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>

              <div className="flex-1 space-y-0.5">
                {toast.title && (
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                    {toast.title}
                  </p>
                )}
                <p className="text-[12px] leading-snug text-slate-700 dark:text-slate-200">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900/70 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // fallback per sicurezza, così non esplode se dimentichi il provider
    return {
      showToast: (_: ShowToastOptions) => {},
      success: (_: string, __?: string) => {},
      error: (_: string, __?: string) => {},
      info: (_: string, __?: string) => {},
    } satisfies ToastContextValue;
  }
  return ctx;
}
