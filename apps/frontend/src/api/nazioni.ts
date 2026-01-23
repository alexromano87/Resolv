import { api } from './config';

export interface Nazione {
  codice: string;
  nome: string;
  attiva: boolean;
}

export const nazioniApi = {
  getAll: async (attive = true): Promise<Nazione[]> => {
    return api.get<Nazione[]>(`/nazioni?attive=${attive ? 'true' : 'false'}`);
  },
};
