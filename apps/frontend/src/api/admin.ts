import { api } from './config';

export interface AdminDashboardStats {
  totali: {
    studi: number;
    studiAttivi: number;
    utenti: number;
    utentiAttivi: number;
    pratiche: number;
    praticheAperte: number;
    clienti: number;
    debitori: number;
    avvocati: number;
  };

  perStudio: Array<{
    studioId: string;
    studioNome: string;
    studioAttivo: boolean;
    numeroUtenti: number;
    numeroPratiche: number;
    numeroClienti: number;
    numeroDebitori: number;
    numeroAvvocati: number;
  }>;

  attivitaRecente: {
    ultimiUtentiCreati: Array<{
      id: string;
      nome: string;
      cognome: string;
      email: string;
      ruolo: string;
      studioNome: string | null;
      createdAt: string;
    }>;

    ultimePraticheCreate: Array<{
      id: string;
      numeroProtocollo: string;
      cliente: string;
      debitore: string;
      studioNome: string | null;
      createdAt: string;
    }>;
  };
}

export interface OrphanDataReport {
  praticheSenzaStudio: number;
  clientiSenzaStudio: number;
  debitoriSenzaStudio: number;
  avvocatiSenzaStudio: number;
  movimentiFinanziariSenzaStudio: number;
  alertsSenzaStudio: number;
  ticketsSenzaStudio: number;
  documentiSenzaStudio: number;
  cartelleSenzaStudio: number;
  utentiSenzaStudio: number;
}

export interface StudioStats {
  studio: {
    id: string;
    nome: string;
    ragioneSociale: string;
    email: string;
    telefono: string;
    attivo: boolean;
    createdAt: string;
    updatedAt: string;
  };
  statistiche: {
    numeroUtenti: number;
    utentiAttivi: number;
    utentiPerRuolo: Record<string, number>;
    numeroPratiche: number;
    praticheAperte: number;
    praticheChiuse: number;
    numeroClienti: number;
    numeroDebitori: number;
    numeroAvvocati: number;
    numeroDocumenti: number;
    storageUtilizzatoMB: number;
    alertsAperti: number;
    ticketsAperti: number;
  };
  finanziari: {
    capitaleAffidato: number;
    capitaleRecuperato: number;
    percentualeRecupero: string;
  };
}

export const adminApi = {
  getDashboard: async (): Promise<AdminDashboardStats> => {
    return api.get<AdminDashboardStats>('/dashboard/admin');
  },

  getOrphanData: async (): Promise<OrphanDataReport> => {
    return api.get<OrphanDataReport>('/admin/maintenance/orphan-data');
  },

  assignOrphanData: async (studioId: string): Promise<any> => {
    return api.post<any>('/admin/maintenance/assign-orphan-data', { studioId });
  },

  getStudioStats: async (studioId: string): Promise<StudioStats> => {
    return api.get<StudioStats>(`/studi/${studioId}/stats`);
  },
};
