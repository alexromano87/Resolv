import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './ToastProvider';

const Trigger: React.FC = () => {
  const { success, error, info, showToast } = useToast();
  return (
    <div>
      <button onClick={() => success('Operazione ok')}>Success</button>
      <button onClick={() => error('Errore')}>Error</button>
      <button onClick={() => info('Info')}>Info</button>
      <button
        onClick={() =>
          showToast({
            message: 'Custom',
            title: 'Custom title',
            duration: 0,
          })
        }
      >
        Custom
      </button>
    </div>
  );
};

describe('ToastProvider', () => {
  it('mostra e rimuove i toast', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    expect(screen.getByText('Operazione ok')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByText('Errore')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Info' }));
    expect(screen.getByText('Info', { selector: 'p' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByText('Custom title')).toBeInTheDocument();
    expect(screen.getByText('Custom', { selector: 'p' })).toBeInTheDocument();

    const toastCloseButtons = document.querySelectorAll('.pointer-events-auto button');
    expect(toastCloseButtons.length).toBeGreaterThan(0);
    fireEvent.click(toastCloseButtons[0] as HTMLButtonElement);
  });

  it('fornisce un fallback senza provider', () => {
    const Fallback = () => {
      const toast = useToast();
      toast.success('ok');
      toast.error('err');
      toast.info('info');
      toast.showToast({ message: 'custom' });
      return <span>fallback</span>;
    };

    render(<Fallback />);
    expect(screen.getByText('fallback')).toBeInTheDocument();
  });
});
