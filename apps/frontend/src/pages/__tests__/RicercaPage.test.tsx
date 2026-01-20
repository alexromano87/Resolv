import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { RicercaPage } from '../RicercaPage';
import { fetchClienti } from '../../api/clienti';
import { fetchDebitoriWithClientiCount } from '../../api/debitori';
import { fetchPratiche } from '../../api/pratiche';
import { fetchAlerts } from '../../api/alerts';
import { fetchTickets } from '../../api/tickets';
import { movimentiFinanziariApi } from '../../api/movimenti-finanziari';

vi.mock('../../api/clienti', () => ({
  fetchClienti: vi.fn(),
}));
vi.mock('../../api/debitori', () => ({
  fetchDebitoriWithClientiCount: vi.fn(),
  getDebitoreDisplayName: (d: any) => d?.ragioneSociale || 'Debitore',
}));
vi.mock('../../api/pratiche', () => ({
  fetchPratiche: vi.fn(),
  formatCurrency: (n: number) => n.toString(),
  getDebitoreDisplayName: (d: any) => d?.ragioneSociale || 'Debitore',
}));
vi.mock('../../api/alerts', () => ({
  fetchAlerts: vi.fn(),
}));
vi.mock('../../api/tickets', () => ({
  fetchTickets: vi.fn(),
}));
vi.mock('../../api/movimenti-finanziari', () => ({
  movimentiFinanziariApi: {
    getTotaliByPratica: vi.fn(),
  },
}));
vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));
vi.mock('../../components/ui/DebitoreDetailModal', () => ({
  DebitoreDetailModal: () => null,
}));
vi.mock('../../components/ui/CustomSelect', () => ({
  CustomSelect: ({ options, value, onChange }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="select">
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock('../../components/Pagination', () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => <div data-testid="pagination">{children}</div>,
}));

describe('RicercaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchClienti as vi.Mock).mockResolvedValue([{ id: 'c1', ragioneSociale: 'Cliente Uno', attivo: true }]);
    (fetchDebitoriWithClientiCount as vi.Mock).mockResolvedValue([
      { id: 'd1', ragioneSociale: 'Debitore Uno', clientiCount: 1, attivo: true },
    ]);
    (fetchPratiche as vi.Mock).mockResolvedValue([
      { id: 'p1', clienteId: 'c1', debitoreId: 'd1', faseId: 'f1', aperta: true, capitale: 100, createdAt: '', updatedAt: '' },
    ]);
    (fetchAlerts as vi.Mock).mockResolvedValue([{ id: 'a1', titolo: 'Alert Demo', praticaId: 'p1', stato: 'in_gestione' }]);
    (fetchTickets as vi.Mock).mockResolvedValue([{ id: 't1', oggetto: 'Ticket Demo', praticaId: 'p1', priorita: 'normale', stato: 'aperto' }]);
    (movimentiFinanziariApi.getTotaliByPratica as vi.Mock).mockResolvedValue({
      capitale: 0,
      anticipazioni: 0,
      compensi: 0,
      interessi: 0,
      recuperoCapitale: 0,
      recuperoAnticipazioni: 0,
      recuperoCompensi: 0,
      recuperoInteressi: 0,
    });
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <RicercaPage />
      </MemoryRouter>,
    );
  }

  it('esegue una ricerca e mostra i risultati', async () => {
    renderPage();

    const searchInput = await screen.findByPlaceholderText(/Inserisci nome/i);
    fireEvent.change(searchInput, { target: { value: 'uno' } });
    await waitFor(() => expect(fetchClienti).toHaveBeenCalled());
    const searchButton = screen.getByRole('button', { name: /^Cerca$/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getAllByText(/Cliente Uno/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Ticket Demo/i)).toBeInTheDocument();
      expect(screen.getByText(/Alert Demo/i)).toBeInTheDocument();
    });
  });

  it('mostra messaggio se non ci sono risultati', async () => {
    (fetchPratiche as vi.Mock).mockResolvedValue([]);
    (fetchAlerts as vi.Mock).mockResolvedValue([]);
    (fetchTickets as vi.Mock).mockResolvedValue([]);
    renderPage();

    const searchInput = await screen.findByPlaceholderText(/Inserisci nome/i);
    fireEvent.change(searchInput, { target: { value: 'zero' } });
    const searchButton = screen.getByRole('button', { name: /^Cerca$/i });
    fireEvent.click(searchButton);
    await waitFor(() => {
      expect(screen.getByText(/Nessun risultato trovato/i)).toBeInTheDocument();
    });
  });
});
