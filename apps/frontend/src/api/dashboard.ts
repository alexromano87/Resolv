// apps/frontend/src/api/dashboard.ts
import { api } from './config';

export interface DashboardStats {
  numeroPratiche: number;
  praticheAperte: number;
  praticheChiuse: number;
  praticheChiusePositive: number;
  praticheChiuseNegative: number;

  alertAttivi: number;
  ticketsAperti: number;

  capitaleAffidato: number;
  interessiAffidati: number;
  anticipazioniAffidate: number;
  compensiAffidati: number;

  capitaleRecuperato: number;
  interessiRecuperati: number;
  anticipazioniRecuperate: number;
  compensiRecuperati: number;

  capitaleDaRecuperare: number;

  percentualeRecuperoCapitale: number;
  percentualeRecuperoInteressi: number;
  percentualeRecuperoAnticipazioni: number;
  percentualeRecuperoCompensi: number;
  percentualeCapitaleDaRecuperare: number;
}

export interface KPI {
  totalePraticheAffidate: number;
  totalePraticheChiuse: number;
  percentualeChiusura: number;

  esitoNegativo: number;
  esitoPositivo: number;
  esitoPositivoParziale: number;
  esitoPositivoTotale: number;

  recuperoCapitale: {
    totale: number;
    parziale: number;
    completo: number;
  };

  recuperoInteressi: {
    totale: number;
    parziale: number;
    completo: number;
  };

  recuperoCompensi: {
    totale: number;
    parziale: number;
    completo: number;
  };
}

export interface DashboardCondivisaPratica {
  id: string;
  titolo: string;
  cliente: string;
  debitore: string;
  faseId?: string;
  aperta: boolean;
  esito?: 'positivo' | 'negativo' | null;
  capitale: number;
  importoRecuperatoCapitale: number;
  anticipazioni: number;
  importoRecuperatoAnticipazioni: number;
  compensiLegali: number;
  compensiLiquidati: number;
  interessi: number;
  interessiRecuperati: number;
  dataAffidamento?: string | null;
  dataChiusura?: string | null;
  riferimentoCredito?: string;
  storico?: Array<{
    faseId: string;
    faseCodice: string;
    faseNome: string;
    dataInizio: string;
    dataFine?: string;
    note?: string;
  }>;
  opposizione?: {
    esito?: 'rigetto' | 'accoglimento_parziale' | 'accoglimento_totale';
    dataEsito?: string;
    note?: string;
  };
  pignoramento?: {
    tipo?: 'mobiliare_debitore' | 'mobiliare_terzi' | 'immobiliare';
    dataNotifica?: string;
    esito?: 'iscrizione_a_ruolo' | 'desistenza' | 'opposizione';
    note?: string;
  };
}

export interface DashboardCondivisaDocumento {
  id: string;
  nome: string;
  descrizione?: string;
  tipo: string;
  praticaId: string;
  praticaLabel: string;
  dataCreazione: string;
  caricatoDa?: string | null;
}

export interface DashboardCondivisaMovimento {
  id: string;
  tipo: string;
  importo: number;
  data: string;
  oggetto?: string | null;
  praticaId: string;
  praticaLabel: string;
}

export type DashboardTimelineEventType = 'fase' | 'opposizione' | 'pignoramento';

export interface DashboardTimelineEvent {
  praticaId: string;
  praticaLabel: string;
  title: string;
  date: string;
  detail?: string;
  tipo: DashboardTimelineEventType;
}

export const dashboardApi = {
  async getStats(clienteId?: string): Promise<DashboardStats> {
    const params = clienteId ? { clienteId } : {};
    return await api.get('/dashboard/stats', params);
  },

  async getKPI(clienteId?: string): Promise<KPI> {
    const params = clienteId ? { clienteId } : {};
    return await api.get('/dashboard/kpi', params);
  },
};

export async function fetchDashboardStats(clienteId?: string): Promise<DashboardStats> {
  return dashboardApi.getStats(clienteId);
}

export async function fetchDashboardKPI(clienteId?: string): Promise<KPI> {
  return dashboardApi.getKPI(clienteId);
}

export interface DashboardCondivisa {
  cliente: {
    id: string;
    ragioneSociale: string;
  };
  configurazione: {
    abilitata: boolean;
    dashboard: {
      stats: boolean;
      kpi: boolean;
    };
    pratiche: {
      elenco: boolean;
      dettagli: boolean;
      documenti: boolean;
      movimentiFinanziari: boolean;
      timeline: boolean;
    };
  };
  stats?: DashboardStats;
  kpi?: KPI;
  pratiche?: DashboardCondivisaPratica[];
  documenti?: DashboardCondivisaDocumento[];
  movimentiFinanziari?: DashboardCondivisaMovimento[];
  timeline?: DashboardTimelineEvent[];
}

export async function fetchDashboardCondivisa(clienteId: string): Promise<DashboardCondivisa> {
  return await api.get(`/dashboard/condivisa/${clienteId}`);
}
