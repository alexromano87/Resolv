// apps/frontend/src/api/tickets.ts
import { api } from './config';

export type TicketStato = 'aperto' | 'in_gestione' | 'chiuso';
export type TicketPriorita = 'bassa' | 'normale' | 'alta' | 'urgente';
export type TicketCategoria = 'richiesta_informazioni' | 'documentazione' | 'pagamenti' | 'segnalazione_problema' | 'altro';

export interface MessaggioTicket {
  id: string;
  autore: string;
  autoreNome?: string;
  testo: string;
  dataInvio: Date;
}

export interface Ticket {
  id: string;
  numeroTicket: string;
  alertId?: string | null;
  praticaId: string | null;
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
  } | null;
  oggetto: string;
  descrizione: string;
  autore: string;
  categoria: TicketCategoria;
  priorita: TicketPriorita;
  stato: TicketStato;
  messaggi: MessaggioTicket[];
  attivo: boolean;
  dataCreazione: Date;
  dataAggiornamento: Date;
  dataChiusura: Date | null;
}

export interface CreateTicketDto {
  praticaId?: string | null;
  oggetto: string;
  descrizione: string;
  autore: string;
  categoria?: TicketCategoria;
  priorita?: TicketPriorita;
}

export interface UpdateTicketDto {
  oggetto?: string;
  descrizione?: string;
  priorita?: TicketPriorita;
  stato?: TicketStato;
}

export interface AddMessaggioTicketDto {
  autore: 'studio' | 'cliente';
  autoreNome?: string;
  testo: string;
}

export const ticketsApi = {
  getAll: async (includeInactive = false): Promise<Ticket[]> => {
    return api.get<Ticket[]>('/tickets', { includeInactive: String(includeInactive) });
  },

  getAllByPratica: async (praticaId: string, includeInactive = false): Promise<Ticket[]> => {
    return api.get<Ticket[]>(`/tickets/pratica/${praticaId}`, { includeInactive: String(includeInactive) });
  },

  getAllByStato: async (stato: TicketStato, includeInactive = false): Promise<Ticket[]> => {
    return api.get<Ticket[]>(`/tickets/stato/${stato}`, { includeInactive: String(includeInactive) });
  },

  getOne: async (id: string): Promise<Ticket> => {
    return api.get<Ticket>(`/tickets/${id}`);
  },

  create: async (createDto: CreateTicketDto): Promise<Ticket> => {
    return api.post<Ticket>('/tickets', createDto);
  },

  update: async (id: string, updateDto: UpdateTicketDto): Promise<Ticket> => {
    return api.patch<Ticket>(`/tickets/${id}`, updateDto);
  },

  deactivate: async (id: string): Promise<Ticket> => {
    return api.patch<Ticket>(`/tickets/${id}/deactivate`);
  },

  reactivate: async (id: string): Promise<Ticket> => {
    return api.patch<Ticket>(`/tickets/${id}/reactivate`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tickets/${id}`);
  },

  addMessaggio: async (id: string, messaggio: AddMessaggioTicketDto): Promise<Ticket> => {
    return api.post<Ticket>(`/tickets/${id}/messaggi`, messaggio);
  },

  chiudi: async (id: string): Promise<Ticket> => {
    return api.patch<Ticket>(`/tickets/${id}/chiudi`);
  },

  prendiInCarico: async (id: string): Promise<Ticket> => {
    return api.patch<Ticket>(`/tickets/${id}/prendi-in-carico`);
  },

  riapri: async (id: string): Promise<Ticket> => {
    return api.patch<Ticket>(`/tickets/${id}/riapri`);
  },
};

export async function fetchTickets(includeInactive = false): Promise<Ticket[]> {
  return ticketsApi.getAll(includeInactive);
}
