// apps/frontend/src/api/rate-ammortamento.ts
import { api } from './config';

export interface RataAmmortamento {
  id: string;
  praticaId: string;
  numeroRata: number;
  importo: number;
  dataScadenza: string;
  pagata: boolean;
  dataPagamento: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePianoAmmortamentoDto {
  praticaId: string;
  capitaleIniziale: number;
  numeroRate: number;
  dataInizioRate: string;
  note?: string;
}

export interface UpdateRataDto {
  pagata?: boolean;
  dataPagamento?: string | null;
  note?: string;
}

export interface StatistichePiano {
  totaleCapitale: number;
  capitalePagato: number;
  capitaleResiduo: number;
  numeroRateTotali: number;
  ratePagate: number;
  rateResidue: number;
  percentualePagata: number;
}

export const rateAmmortamentoApi = {
  async creaPiano(dto: CreatePianoAmmortamentoDto): Promise<RataAmmortamento[]> {
    return await api.post('/rate-ammortamento/piano', dto);
  },

  async getRateByPratica(praticaId: string): Promise<RataAmmortamento[]> {
    return await api.get(`/rate-ammortamento/pratica/${praticaId}`);
  },

  async getStatistiche(praticaId: string): Promise<StatistichePiano> {
    return await api.get(`/rate-ammortamento/pratica/${praticaId}/statistiche`);
  },

  async updateRata(rataId: string, dto: UpdateRataDto): Promise<RataAmmortamento> {
    return await api.patch(`/rate-ammortamento/${rataId}`, dto);
  },

  async deleteRateByPratica(praticaId: string): Promise<void> {
    await api.delete(`/rate-ammortamento/pratica/${praticaId}`);
  },
};
