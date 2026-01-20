// apps/frontend/src/api/alerts.ts
import { api } from './config';

export type AlertStato = 'in_gestione' | 'chiuso';
export type AlertDestinatario = 'studio' | 'cliente';
export type AlertModalitaNotifica = 'popup';

export interface MessaggioAlert {
  id: string;
  autore: string;
  testo: string;
  dataInvio: Date;
}

export interface Alert {
  id: string;
  praticaId: string;
  pratica?: {
    id: string;
    cliente?: {
      ragioneSociale: string;
    };
    debitore?: {
      ragioneSociale?: string;
      nome?: string;
      cognome?: string;
      tipoSoggetto?: 'persona_fisica' | 'persona_giuridica';
    };
  };
  titolo: string;
  descrizione: string;
  destinatario: AlertDestinatario;
  modalitaNotifica: AlertModalitaNotifica;
  dataScadenza: Date;
  giorniAnticipo: number;
  stato: AlertStato;
  messaggi: MessaggioAlert[];
  attivo: boolean;
  dataCreazione: Date;
  dataAggiornamento: Date;
  dataChiusura: Date | null;
  clienteCanClose?: boolean;
  creatoDa: string | null;
}

export interface CreateAlertDto {
  praticaId: string;
  titolo: string;
  descrizione: string;
  destinatario: AlertDestinatario;
  modalitaNotifica?: AlertModalitaNotifica;
  dataScadenza: Date | string;
  giorniAnticipo?: number;
  clienteCanClose?: boolean;
}

export interface UpdateAlertDto {
  titolo?: string;
  descrizione?: string;
  destinatario?: AlertDestinatario;
  modalitaNotifica?: AlertModalitaNotifica;
  dataScadenza?: Date | string;
  giorniAnticipo?: number;
  stato?: AlertStato;
  clienteCanClose?: boolean;
}

export interface AddMessaggioAlertDto {
  autore: 'studio' | 'cliente';
  testo: string;
}

export const alertsApi = {
  getAll: async (includeInactive = false): Promise<Alert[]> => {
    return api.get<Alert[]>('/alerts', { includeInactive: String(includeInactive) });
  },

  getAllByPratica: async (praticaId: string, includeInactive = false): Promise<Alert[]> => {
    return api.get<Alert[]>(`/alerts/pratica/${praticaId}`, { includeInactive: String(includeInactive) });
  },

  getAllByStato: async (stato: AlertStato, includeInactive = false): Promise<Alert[]> => {
    return api.get<Alert[]>(`/alerts/stato/${stato}`, { includeInactive: String(includeInactive) });
  },

  getOne: async (id: string): Promise<Alert> => {
    return api.get<Alert>(`/alerts/${id}`);
  },

  create: async (createDto: CreateAlertDto): Promise<Alert> => {
    return api.post<Alert>('/alerts', createDto);
  },

  update: async (id: string, updateDto: UpdateAlertDto): Promise<Alert> => {
    return api.patch<Alert>(`/alerts/${id}`, updateDto);
  },

  deactivate: async (id: string): Promise<Alert> => {
    return api.patch<Alert>(`/alerts/${id}/deactivate`);
  },

  reactivate: async (id: string): Promise<Alert> => {
    return api.patch<Alert>(`/alerts/${id}/reactivate`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/alerts/${id}`);
  },

  addMessaggio: async (id: string, messaggio: AddMessaggioAlertDto): Promise<Alert> => {
    return api.post<Alert>(`/alerts/${id}/messaggi`, messaggio);
  },

  chiudi: async (id: string): Promise<Alert> => {
    return api.patch<Alert>(`/alerts/${id}/chiudi`);
  },

  riapri: async (id: string): Promise<Alert> => {
    return api.patch<Alert>(`/alerts/${id}/riapri`);
  },
};

export async function fetchAlerts(includeInactive = false): Promise<Alert[]> {
  return alertsApi.getAll(includeInactive);
}
