import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { TicketsPage } from '../TicketsPage';
import { ticketsApi } from '../../api/tickets';
import { fetchPratiche } from '../../api/pratiche';
import { useAuth } from '../../contexts/AuthContext';

const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastInfo = vi.fn();
const confirmMock = vi.fn();

vi.mock('../../api/tickets', () => ({
  ticketsApi: {
    getAll: vi.fn(),
    getAllByStato: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateStato: vi.fn(),
    addMessaggio: vi.fn(),
    toggleAttivo: vi.fn(),
  },
}));

vi.mock('../../api/pratiche', () => ({
  fetchPratiche: vi.fn(),
  getDebitoreDisplayName: () => 'Debitore Demo',
}));

vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
    info: toastInfo,
  }),
}));

vi.mock('../../components/ui/ConfirmDialog', () => ({
  useConfirmDialog: () => ({
    confirm: confirmMock,
    ConfirmDialog: () => null,
  }),
}));

// Semplifica i componenti UI per test
vi.mock('../../components/ui/CustomSelect', () => ({
  CustomSelect: ({ options, value, onChange, placeholder }: any) => (
    <select
      data-testid={placeholder || 'custom-select'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder || 'Seleziona...'}</option>
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

vi.mock('../../components/ui/BodyPortal', () => ({
  BodyPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function setup() {
  (useAuth as vi.Mock).mockReturnValue({
    user: {
      id: 'user-1',
      ruolo: 'cliente',
      nome: 'Mario',
      cognome: 'Rossi',
    },
  });

  return render(
    <MemoryRouter>
      <TicketsPage />
    </MemoryRouter>,
  );
}

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ticketsApi.getAll as vi.Mock).mockResolvedValue([]);
    (fetchPratiche as vi.Mock).mockResolvedValue([]);
    confirmMock.mockResolvedValue(true);
  });

  it('mostra i ticket caricati', async () => {
    (ticketsApi.getAll as vi.Mock).mockResolvedValue([
      {
        id: 't1',
        numeroTicket: 'TK-1',
        oggetto: 'Problema A',
        descrizione: 'Dettaglio',
        praticaId: null,
        categoria: 'altro',
        priorita: 'normale',
        stato: 'aperto',
        attivo: true,
        autore: 'Cliente Demo',
        dataCreazione: new Date().toISOString(),
      },
    ]);

    setup();

    expect(await screen.findByText('Problema A')).toBeInTheDocument();
    expect(screen.getByText('#TK-1')).toBeInTheDocument();
  });

  it('mostra un messaggio di errore se il caricamento fallisce', async () => {
    (ticketsApi.getAll as vi.Mock).mockRejectedValue(new Error('boom'));

    setup();

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith('boom', 'Errore');
  });

  it('valida i campi obbligatori prima di creare un ticket', async () => {
    setup();

    fireEvent.click(await screen.findByText('Nuovo Ticket'));
    fireEvent.click(screen.getByText('Salva'));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Compila tutti i campi obbligatori', 'Validazione');
    });
    expect(ticketsApi.create).not.toHaveBeenCalled();
  });

  it('crea un nuovo ticket quando i dati sono validi', async () => {
    (fetchPratiche as vi.Mock).mockResolvedValue([
      {
        id: 'p1',
        attivo: true,
        aperta: true,
        clienteId: 'c1',
        debitoreId: 'd1',
        faseId: 'f1',
        capitale: 0,
        importoRecuperatoCapitale: 0,
        anticipazioni: 0,
        importoRecuperatoAnticipazioni: 0,
        compensiLegali: 0,
        compensiLiquidati: 0,
        interessi: 0,
        interessiRecuperati: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cliente: { id: 'c1', ragioneSociale: 'Cliente Demo', attivo: true },
        debitore: { id: 'd1', tipoSoggetto: 'persona_giuridica', ragioneSociale: 'Debitore Demo', attivo: true },
      },
    ]);
    (ticketsApi.create as vi.Mock).mockResolvedValue({});

    setup();

    fireEvent.click(await screen.findByText('Nuovo Ticket'));

    fireEvent.change(screen.getByTestId('Seleziona la pratica di riferimento...'), { target: { value: 'p1' } });
    fireEvent.change(screen.getByPlaceholderText(/Richiesta chiarimenti/i), { target: { value: 'Nuovo caso' } });
    fireEvent.change(screen.getByPlaceholderText(/Descrizione dettagliata/i), { target: { value: 'Dettagli della richiesta' } });

    fireEvent.click(screen.getByText('Salva'));

    await waitFor(() => expect(ticketsApi.create).toHaveBeenCalled());
    expect(ticketsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        praticaId: 'p1',
        oggetto: 'Nuovo caso',
        descrizione: 'Dettagli della richiesta',
        autore: 'Mario Rossi',
        categoria: 'richiesta_informazioni',
        priorita: 'normale',
      }),
    );
  });
});
