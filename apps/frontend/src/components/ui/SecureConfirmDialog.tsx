// apps/frontend/src/components/ui/SecureConfirmDialog.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Info, HelpCircle } from 'lucide-react';
import { BodyPortal } from './BodyPortal';

export type SecureConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'default';

export interface SecureConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmationText: string; // The exact text user must type to confirm
  confirmationPlaceholder?: string; // Placeholder shown in input
  confirmText?: string;
  cancelText?: string;
  variant?: SecureConfirmDialogVariant;
  loading?: boolean;
}

export function SecureConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmationText,
  confirmationPlaceholder = 'Digita il testo sopra per confermare',
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'danger',
  loading = false,
}: SecureConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      // Focus on input field when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Focus trap and ESC handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Block body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  // Check if confirmation text matches
  const isConfirmationValid = inputValue === confirmationText;

  // Variant styles
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

  const handleConfirmClick = () => {
    if (isConfirmationValid && !loading) {
      onConfirm();
    }
  };

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
          <div className="mb-4 text-center text-sm text-slate-600 dark:text-slate-300">
            {message}
          </div>

          {/* Confirmation text to type */}
          <div className="mb-4 rounded-lg bg-slate-100 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Per confermare, digita esattamente:
            </p>
            <code className="block text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 rounded px-2 py-1 border border-slate-200 dark:border-slate-600">
              {confirmationText}
            </code>
          </div>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmationPlaceholder}
            disabled={loading}
            className={`w-full rounded-lg border px-3 py-2 text-sm mb-6 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:bg-slate-800 ${
              inputValue && !isConfirmationValid
                ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
            } ${
              inputValue && isConfirmationValid
                ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20'
                : ''
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isConfirmationValid && !loading) {
                handleConfirmClick();
              }
            }}
          />

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
              onClick={handleConfirmClick}
              disabled={loading || !isConfirmationValid}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${style.confirmBtn}`}
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

// Hook to manage secure confirm dialog state
export function useSecureConfirmDialog() {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    props: Omit<SecureConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    props: { title: '', message: '', confirmationText: '' },
    resolve: null,
  });

  const confirm = React.useCallback(
    (
      props: Omit<SecureConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>,
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
      <SecureConfirmDialog
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
    SecureConfirmDialog: DialogComponent,
  };
}
