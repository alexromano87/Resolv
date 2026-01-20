// apps/frontend/src/components/ui/ConfirmDialog.tsx
import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { BodyPortal } from './BodyPortal';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'default';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap e chiusura con ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus sul bottone conferma all'apertura
    setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    // Blocca scroll del body
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  // Stili per variante
  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      iconColor: 'text-rose-600 dark:text-rose-400',
      confirmBtn:
        'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      confirmBtn:
        'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
      confirmBtn:
        'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500',
    },
    default: {
      icon: HelpCircle,
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      confirmBtn:
        'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400',
    },
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="modal-overlay absolute inset-0 bg-black/45 backdrop-blur-md transition-opacity"
          onClick={loading ? undefined : onClose}
        />

        {/* Dialog */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          className="modal-content relative z-10 mx-4 w-full max-w-md transform rounded-3xl border border-white/70 bg-white/90 p-7 shadow-[0_28px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl transition-all dark:border-slate-700 dark:bg-slate-900"
        >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${style.iconBg}`}
        >
          <Icon className={`h-6 w-6 ${style.iconColor}`} />
        </div>

        {/* Title */}
        <h3
          id="dialog-title"
          className="mb-2 text-center text-base font-semibold text-slate-900 dark:text-slate-50"
        >
          {title}
        </h3>

        {/* Message */}
        <div className="mb-6 text-center text-sm text-slate-600 dark:text-slate-300">
          {message}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300/60 focus:ring-offset-1 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-slate-600"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${style.confirmBtn}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Attendere...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
    </BodyPortal>
  );
}

// Hook per gestire lo stato del dialog
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    props: { title: '', message: '' },
    resolve: null,
  });

  const confirm = React.useCallback(
    (
      props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>,
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          isOpen: true,
          props,
          resolve,
        });
      });
    },
    [],
  );

  const handleClose = React.useCallback(() => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const DialogComponent = React.useCallback(
    () => (
      <ConfirmDialog
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        {...state.props}
      />
    ),
    [state.isOpen, state.props, handleClose, handleConfirm],
  );

  return {
    confirm,
    ConfirmDialog: DialogComponent,
  };
}
