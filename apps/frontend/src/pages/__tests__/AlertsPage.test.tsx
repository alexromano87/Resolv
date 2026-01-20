import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api/alerts', () => ({
  alertsApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'a1',
        titolo: 'Alert Demo',
        descrizione: 'Scadenza pagamento',
        destinatario: 'cliente',
        modalitaNotifica: 'popup',
        dataScadenza: new Date().toISOString(),
        giorniAnticipo: 3,
        stato: 'in_gestione',
        messaggi: [],
      },
    ]),
    getAllByStato: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addMessaggio: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    chiudi: vi.fn(),
    riapri: vi.fn(),
  },
}));

vi.mock('../../api/pratiche', () => ({
  fetchPratiche: vi.fn().mockResolvedValue([]),
  getDebitoreDisplayName: vi.fn().mockReturnValue(''),
}));

vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../components/ui/ConfirmDialog', () => {
  return {
    useConfirmDialog: () => ({
      confirm: vi.fn().mockResolvedValue(true),
      ConfirmDialog: () => null,
    }),
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { ruolo: 'admin' },
  }),
}));

import { AlertsPage } from '../AlertsPage';

describe('AlertsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carica e mostra un alert', async () => {
    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Alert Demo/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Scadenza pagamento/i)).toBeInTheDocument();
    expect(screen.getByText(/messaggi/i)).toBeInTheDocument();
  });
});
