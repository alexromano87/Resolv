// apps/frontend/src/api/piani-ammortamento.ts
import { api } from './config';

export type StatoPiano = 'attivo' | 'chiuso_positivo' | 'chiuso_negativo' | 'sospeso';

export interface RataAmmortamento {
  id: string;
  pianoId: string;
  numeroRata: number;
  importo: number;
  quotaCapitale: number;
  quotaInteressi: number;
  dataScadenza: string;
  pagata: boolean;
  dataPagamento: string | null;
  metodoPagamento: string | null;
  codicePagamento: string | null;
  ricevutaPath: string | null;
  movimentoFinanziarioId: string | null;
  movimentoInteressiId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PianoAmmortamento {
  id: string;
  praticaId: string;
  capitaleIniziale: number;
  numeroRate: number;
  dataInizio: string;
  stato: StatoPiano;
  dataChiusura: string | null;
  importoRecuperato: number | null;
  importoInserito: boolean;
  movimentoFinanziarioId: string | null;
  note: string | null;
  applicaInteressi: boolean;
  tipoInteresse: 'legale' | 'moratorio' | 'fisso' | null;
  tassoInteresse: number | null;
  tipoAmmortamento: 'italiano' | 'francese';
  capitalizzazione: 'nessuna' | 'trimestrale' | 'semestrale' | 'annuale';
  dataInizioInteressi: string | null;
  moratorioPre2013: boolean;
  moratorioMaggiorazione: boolean;
  moratorioPctMaggiorazione: number | null;
  applicaArt1194: boolean;
  totaleInteressi: number;
  rate: RataAmmortamento[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePianoAmmortamentoDto {
  praticaId: string;
  capitaleIniziale: number;
  numeroRate: number;
  dataInizioRate: string;
  note?: string;
  applicaInteressi?: boolean;
  tipoInteresse?: 'legale' | 'moratorio' | 'fisso';
  tassoInteresse?: number;
  tipoAmmortamento?: 'italiano' | 'francese';
  capitalizzazione?: 'nessuna' | 'trimestrale' | 'semestrale' | 'annuale';
  dataInizioInteressi?: string;
  moratorioPre2013?: boolean;
  moratorioMaggiorazione?: boolean;
  moratorioPctMaggiorazione?: number;
  applicaArt1194?: boolean;
}

export interface UpdateRataDto {
  pagata?: boolean;
  dataPagamento?: string | null;
  note?: string;
}

export interface ChiudiPianoDto {
  esito: 'positivo' | 'negativo';
  note?: string;
}

export interface InserisciCapitaleDto {
  note?: string;
}

export interface RegistraPagamentoRataDto {
  dataPagamento: string;
  metodoPagamento: string;
  codicePagamento?: string;
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
  stato: StatoPiano;
  importoRecuperato: number | null;
  importoInserito: boolean;
  dataChiusura: string | null;
}

export const pianiAmmortamentoApi = {
  async creaPiano(dto: CreatePianoAmmortamentoDto): Promise<PianoAmmortamento> {
    return await api.post('/piani-ammortamento', dto);
  },

  async getPianoByPratica(praticaId: string): Promise<PianoAmmortamento | null> {
    return await api.get(`/piani-ammortamento/pratica/${praticaId}`);
  },

  async getStatistiche(pianoId: string): Promise<StatistichePiano> {
    return await api.get(`/piani-ammortamento/${pianoId}/statistiche`);
  },

  async updateRata(rataId: string, dto: UpdateRataDto): Promise<RataAmmortamento> {
    return await api.patch(`/piani-ammortamento/rata/${rataId}`, dto);
  },

  async registraPagamentoRata(
    rataId: string,
    dto: RegistraPagamentoRataDto,
    ricevuta?: File
  ): Promise<RataAmmortamento> {
    const formData = new FormData();
    formData.append('dataPagamento', dto.dataPagamento);
    formData.append('metodoPagamento', dto.metodoPagamento);
    if (dto.codicePagamento) {
      formData.append('codicePagamento', dto.codicePagamento);
    }
    if (dto.note) {
      formData.append('note', dto.note);
    }
    if (ricevuta) {
      formData.append('ricevuta', ricevuta);
    }

    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/piani-ammortamento/rata/${rataId}/registra-pagamento`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Errore durante la registrazione del pagamento');
    }

    return await response.json();
  },

  async stornaPagamentoRata(rataId: string): Promise<RataAmmortamento> {
    return await api.post(`/piani-ammortamento/rata/${rataId}/storna-pagamento`, {});
  },

  async downloadRicevutaRata(rataId: string): Promise<Blob> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/piani-ammortamento/rata/${rataId}/ricevuta`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Errore durante il download della ricevuta');
    }

    return await response.blob();
  },

  async chiudiPiano(pianoId: string, dto: ChiudiPianoDto): Promise<PianoAmmortamento> {
    return await api.post(`/piani-ammortamento/${pianoId}/chiudi`, dto);
  },

  async riapriPiano(pianoId: string): Promise<PianoAmmortamento> {
    return await api.post(`/piani-ammortamento/${pianoId}/riapri`, {});
  },

  async inserisciCapitale(pianoId: string, dto: InserisciCapitaleDto): Promise<PianoAmmortamento> {
    return await api.post(`/piani-ammortamento/${pianoId}/inserisci-capitale`, dto);
  },

  async downloadReport(pianoId: string): Promise<Blob> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/piani-ammortamento/${pianoId}/report`,
      {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Errore durante il download del report');
    }
    return await response.blob();
  },

  async deletePiano(pianoId: string): Promise<void> {
    await api.delete(`/piani-ammortamento/${pianoId}`);
  },
};
