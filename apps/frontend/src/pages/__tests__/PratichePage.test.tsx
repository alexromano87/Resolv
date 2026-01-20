import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { PratichePage } from '../PratichePage';
import { fetchPratiche, createPratica, cambiaFasePratica } from '../../api/pratiche';
import { fetchFasi } from '../../api/fasi';
import { fetchClienti } from '../../api/clienti';
import { fetchDebitoriForCliente } from '../../api/debitori';
import { avvocatiApi } from '../../api/avvocati';
import { collaboratoriApi } from '../../api/collaboratori';
import { movimentiFinanziariApi } from '../../api/movimenti-finanziari';

const { successMock, toastErrorMock, confirmMock } = vi.hoisted(() => ({
  successMock: vi.fn(),
  toastErrorMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock('../../api/pratiche', () => ({
  fetchPratiche: vi.fn(),
  createPratica: vi.fn(),
  cambiaFasePratica: vi.fn(),
  formatCurrency: (v: number) => v.toString(),
  getDebitoreDisplayName: () => 'Debitore Demo',
}));
vi.mock('../../api/fasi', () => ({
  fetchFasi: vi.fn(),
}));
vi.mock('../../api/clienti', () => ({
  fetchClienti: vi.fn(),
}));
vi.mock('../../api/debitori', () => ({
  fetchDebitoriForCliente: vi.fn(),
}));
vi.mock('../../api/avvocati', () => ({
  avvocatiApi: { getAll: vi.fn() },
}));
vi.mock('../../api/collaboratori', () => ({
  collaboratoriApi: { getAll: vi.fn() },
}));
vi.mock('../../api/movimenti-finanziari', () => ({
  movimentiFinanziariApi: { getTotaliByPratica: vi.fn() },
}));
vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({ success: successMock, error: toastErrorMock }),
}));
vi.mock('../../components/ui/ConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: confirmMock, ConfirmDialog: () => null }),
}));
vi.mock('../../components/ui/SearchableClienteSelect', () => ({
  SearchableClienteSelect: ({ placeholder, onChange, value }: any) => (
    <input
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value || null)}
    />
  ),
}));
vi.mock('../../components/ui/SearchableDebitoreSelect', () => ({
  SearchableDebitoreSelect: ({ placeholder, onChange, value }: any) => (
    <input
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value || null)}
    />
  ),
}));
vi.mock('../../components/ui/CustomSelect', () => ({
  CustomSelect: ({ options, value, onChange, placeholder }: any) => (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} data-testid={placeholder || 'select'}>
      <option value="">{placeholder || 'Seleziona'}</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock('../../components/ui/AvvocatiMultiSelect', () => ({
  AvvocatiMultiSelect: () => <div>AvvocatiMultiSelect</div>,
}));
vi.mock('../../components/ui/CollaboratoriMultiSelect', () => ({
  CollaboratoriMultiSelect: () => <div>CollaboratoriMultiSelect</div>,
}));
vi.mock('../../components/Pagination', () => ({
  Pagination: () => <div data-testid="pagination" />,
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { ruolo: 'admin' } }),
}));

describe('PratichePage', () => {
  const praticaBase = {
    id: 'p1',
    clienteId: 'c1',
    debitoreId: 'd1',
    faseId: 'f1',
    attivo: true,
    aperta: true,
    capitale: 1000,
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    successMock.mockReset();
    toastErrorMock.mockReset();
    confirmMock.mockReset();
    (fetchPratiche as vi.Mock).mockResolvedValue([praticaBase]);
    (fetchFasi as vi.Mock).mockResolvedValue([{ id: 'f1', nome: 'Nuova', codice: 'N', colore: '#00f' }]);
    (fetchClienti as vi.Mock).mockResolvedValue([{ id: 'c1', ragioneSociale: 'Cliente Demo', attivo: true }]);
    (fetchDebitoriForCliente as vi.Mock).mockResolvedValue([]);
    (avvocatiApi.getAll as vi.Mock).mockResolvedValue([]);
    (collaboratoriApi.getAll as vi.Mock).mockResolvedValue([]);
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
        <PratichePage />
      </MemoryRouter>,
    );
  }

  it('mostra la lista pratiche caricata', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Cerca cliente, debitore o numero pratica/i), {
      target: { value: 'Cliente Demo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Cerca/i }));

    expect(await screen.findByText('Cliente Demo')).toBeInTheDocument();
    expect(screen.getByText('vs Debitore Demo')).toBeInTheDocument();
  });

  it('mostra messaggio di errore quando il caricamento fallisce', async () => {
    (fetchPratiche as vi.Mock).mockRejectedValue(new Error('boom'));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Cerca cliente, debitore o numero pratica/i), {
      target: { value: 'Demo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Cerca/i }));

    await waitFor(() => expect(screen.getByText(/Impossibile caricare le pratiche/i)).toBeInTheDocument());
  });

  it('valida la creazione pratica richiedendo cliente e debitore', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Nuova pratica'));
    fireEvent.click(screen.getByText('Crea pratica'));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Compila i campi obbligatori per creare la pratica',
      );
    });
  });

  it('blocca la ricerca senza filtri o testo', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Cerca/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Seleziona un cliente o inserisci un criterio di ricerca',
      );
    });
  });

  it('crea una pratica dopo la conferma', async () => {
    confirmMock.mockResolvedValueOnce(true);
    (createPratica as vi.Mock).mockResolvedValueOnce({});
    (fetchPratiche as vi.Mock).mockResolvedValueOnce([]);

    renderPage();

    fireEvent.click(await screen.findByText('Nuova pratica'));
    fireEvent.change(screen.getByPlaceholderText('Seleziona cliente...'), {
      target: { value: 'c1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Seleziona debitore...'), {
      target: { value: 'd1' },
    });

    const capitaleInput = screen.getByPlaceholderText('0,00');
    fireEvent.focus(capitaleInput);
    fireEvent.change(capitaleInput, { target: { value: '1.000,50' } });
    fireEvent.blur(capitaleInput);

    const interessiCheckbox = screen.getByLabelText(/Applica calcolo automatico interessi/i);
    fireEvent.click(interessiCheckbox);
    const tipoInteresseSelect = screen.getByTestId('Seleziona tipo interesse...');
    fireEvent.change(tipoInteresseSelect, { target: { value: 'fisso' } });
    expect(await screen.findByPlaceholderText("es. 5.50")).toBeInTheDocument();

    fireEvent.click(screen.getByText('Crea pratica'));

    await waitFor(() => {
      expect(createPratica).toHaveBeenCalled();
    });
    expect(successMock).toHaveBeenCalledWith('Pratica creata con successo');
  });

  it('modifica lo stato pratica', async () => {
    confirmMock.mockResolvedValueOnce(true);
    (cambiaFasePratica as vi.Mock).mockResolvedValueOnce({});
    (fetchFasi as vi.Mock).mockResolvedValueOnce([
      { id: 'f1', nome: 'Nuova', codice: 'N', colore: '#00f' },
      { id: 'f2', nome: 'Chiusa', codice: 'C', colore: '#0f0' },
    ]);

    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Cerca cliente, debitore o numero pratica/i), {
      target: { value: 'Cliente Demo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Cerca/i }));

    await screen.findByTitle('Modifica stato');
    fireEvent.click(screen.getByTitle('Modifica stato'));

    const faseSelect = await screen.findByTestId('Seleziona nuovo stato...');
    fireEvent.change(faseSelect, { target: { value: 'f2' } });
    fireEvent.change(screen.getByPlaceholderText(/Inserisci eventuali note/i), {
      target: { value: 'Nota test' },
    });

    const submitButtons = screen.getAllByRole('button', { name: /Modifica stato/i });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(cambiaFasePratica).toHaveBeenCalledWith('p1', {
        nuovaFaseId: 'f2',
        note: 'Nota test',
      });
    });
    expect(successMock).toHaveBeenCalledWith('Stato pratica aggiornato');
  });

  it('rimuove i filtri quando non ci sono pratiche', async () => {
    (fetchPratiche as vi.Mock).mockResolvedValueOnce([]);
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Cerca cliente, debitore o numero pratica/i), {
      target: { value: 'Cliente' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Cerca/i }));

    await screen.findByText(/Nessuna pratica trovata/i);
    fireEvent.click(screen.getByRole('button', { name: /Rimuovi filtri/i }));
  });
});
