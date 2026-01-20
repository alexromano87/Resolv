import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renderizza e gestisce conferma/chiusura', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Conferma operazione"
        message="Sei sicuro?"
        confirmText="Procedi"
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Conferma operazione')).toBeInTheDocument();
    expect(screen.getByText('Sei sicuro?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Procedi' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Annulla/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chiude con ESC e backdrop', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Chiudi"
        message="Test"
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = document.querySelector('.modal-overlay');
    expect(backdrop).toBeTruthy();
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('non renderizza quando chiusa', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        onClose={() => undefined}
        onConfirm={() => undefined}
        title="Hidden"
        message="Hidden"
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('non chiude con ESC o backdrop quando in loading', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Loading"
        message="Attendi"
        loading
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    const backdrop = document.querySelector('.modal-overlay');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(onClose).not.toHaveBeenCalled();
  });

  it('risolve la conferma tramite hook', async () => {
    const Harness = () => {
      const { confirm, ConfirmDialog } = useConfirmDialog();
      const [result, setResult] = useState('');

      return (
        <div>
          <button
            type="button"
            onClick={async () => {
              const res = await confirm({
                title: 'Conferma',
                message: 'Procedere?',
              });
              setResult(res ? 'ok' : 'no');
            }}
          >
            Apri
          </button>
          <ConfirmDialog />
          {result && <span>{result}</span>}
        </div>
      );
    };

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Apri' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /Conferma/i }));

    await waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument();
    });
  });
});
