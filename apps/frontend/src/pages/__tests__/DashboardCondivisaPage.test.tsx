import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardCondivisaPage } from '../DashboardCondivisaPage';
import type { DashboardCondivisa } from '../../api/dashboard';
import * as dashboardApi from '../../api/dashboard';

const renderPage = (initialEntry = '/dashboard-condivisa?clienteId=c1') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard-condivisa" element={<DashboardCondivisaPage />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DashboardCondivisaPage', () => {
  it('mostra le sezioni pratiche, documenti, movimenti e timeline quando abilitate', async () => {
    const mockData: DashboardCondivisa = {
      cliente: { id: 'c1', ragioneSociale: 'Cliente Uno' },
      configurazione: {
        abilitata: true,
        dashboard: { stats: true, kpi: true },
        pratiche: {
          elenco: true,
          dettagli: true,
          documenti: true,
          movimentiFinanziari: true,
          timeline: true,
        },
      },
      stats: {
        numeroPratiche: 1,
        praticheAperte: 1,
        praticheChiuse: 0,
        praticheChiusePositive: 0,
        praticheChiuseNegative: 0,
        capitaleAffidato: 0,
        interessiAffidati: 0,
        anticipazioniAffidate: 0,
        compensiAffidati: 0,
        capitaleRecuperato: 0,
        interessiRecuperati: 0,
        anticipazioniRecuperate: 0,
        compensiRecuperati: 0,
        percentualeRecuperoCapitale: 0,
        percentualeRecuperoInteressi: 0,
        percentualeRecuperoAnticipazioni: 0,
        percentualeRecuperoCompensi: 0,
      },
      kpi: {
        totalePraticheAffidate: 1,
        totalePraticheChiuse: 0,
        percentualeChiusura: 0,
        esitoNegativo: 0,
        esitoPositivo: 0,
        esitoPositivoParziale: 0,
        esitoPositivoTotale: 0,
        recuperoCapitale: { totale: 0, parziale: 0, completo: 0 },
        recuperoInteressi: { totale: 0, parziale: 0, completo: 0 },
        recuperoCompensi: { totale: 0, parziale: 0, completo: 0 },
      },
      pratiche: [
        {
          id: 'p1',
          titolo: 'Test vs Debitore',
          cliente: 'Cliente Uno',
          debitore: 'Debitore Uno',
          aperta: true,
          esito: 'positivo',
          capitale: 1000,
          importoRecuperatoCapitale: 500,
          anticipazioni: 0,
          importoRecuperatoAnticipazioni: 0,
          compensiLegali: 100,
          compensiLiquidati: 0,
          interessi: 50,
          interessiRecuperati: 0,
          dataAffidamento: '2024-01-01',
          dataChiusura: null,
          riferimentoCredito: 'R1',
        },
      ],
      documenti: [
        {
          id: 'doc1',
          nome: 'Documento 1',
          descrizione: 'Descrizione',
          tipo: 'pdf',
          praticaId: 'p1',
          praticaLabel: 'Test vs Debitore',
          dataCreazione: '2024-01-02',
          caricatoDa: 'Studio',
        },
      ],
      movimentiFinanziari: [
        {
          id: 'mov1',
          tipo: 'recupero_capitale',
          importo: 500,
          data: '2024-01-03',
          oggetto: 'Pagamento',
          praticaId: 'p1',
          praticaLabel: 'Test vs Debitore',
        },
      ],
      timeline: [
        {
          praticaId: 'p1',
          praticaLabel: 'Test vs Debitore',
          title: 'Apertura',
          date: '2024-01-01',
          tipo: 'fase',
        },
      ],
    };

    const fetchSpy = vi
      .spyOn(dashboardApi, 'fetchDashboardCondivisa')
      .mockResolvedValue(mockData);
    renderPage();

    await waitFor(() => expect(screen.getByText('Pratiche condivise')).toBeInTheDocument());
    expect(screen.getByText('Documenti condivisi')).toBeInTheDocument();
    expect(screen.getByText('Movimenti finanziari')).toBeInTheDocument();
    expect(screen.getByText('Timeline operativa')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith('c1');
  });

  it('su clientId mancante mostra messaggio di errore', async () => {
    const fetchSpy = vi.spyOn(dashboardApi, 'fetchDashboardCondivisa');
    renderPage('/dashboard-condivisa');
    await waitFor(() => expect(screen.getByText(/ID cliente non specificato/i)).toBeInTheDocument());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('mostra messaggio di errore quando l\'API fallisce', async () => {
    const fetchSpy = vi
      .spyOn(dashboardApi, 'fetchDashboardCondivisa')
      .mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/boom/i)).toBeInTheDocument());
    expect(screen.getByText(/Accesso non consentito/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith('c1');
  });

  it('indica quando non ci sono pratiche condivise', async () => {
    const mockData = {
      cliente: { id: 'c1', ragioneSociale: 'Cliente Uno' },
      configurazione: {
        abilitata: true,
        dashboard: { stats: false, kpi: false },
        pratiche: {
          elenco: true,
          dettagli: true,
          documenti: false,
          movimentiFinanziari: false,
          timeline: false,
        },
      },
      pratiche: [],
    } as DashboardCondivisa;
    const fetchSpy = vi
      .spyOn(dashboardApi, 'fetchDashboardCondivisa')
      .mockResolvedValue(mockData);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nessuna pratica condivisa disponibile.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Documenti condivisi')).not.toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalled();
  });
});
