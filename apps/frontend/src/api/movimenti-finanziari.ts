// apps/frontend/src/api/movimenti-finanziari.ts
import { api } from './config';

export type TipoMovimento =
  | 'capitale'
  | 'capitale_originario'
  | 'nuovo_capitale'
  | 'anticipazione'
  | 'compenso'
  | 'interessi'
  | 'altro'
  | 'recupero_capitale'
  | 'recupero_anticipazione'
  | 'recupero_compenso'
  | 'recupero_interessi'
  | 'recupero_altro';

export interface MovimentoFinanziario {
  id: string;
  praticaId: string;
  tipo: TipoMovimento;
  importo: number;
  data: string;
  oggetto?: string;
  daFatturare?: boolean | null;
  giaFatturato?: boolean | null;
  createdAt: string;
  updatedAt: string;
  pratica?: any; // Include relazione pratica per report fatturazione
}

export interface CreateMovimentoFinanziarioDto {
  praticaId: string;
  tipo: TipoMovimento;
  importo: number;
  data: string;
  oggetto?: string;
  daFatturare?: boolean | null;
  giaFatturato?: boolean | null;
}

export interface UpdateMovimentoFinanziarioDto {
  tipo?: TipoMovimento;
  importo?: number;
  data?: string;
  oggetto?: string;
  daFatturare?: boolean | null;
  giaFatturato?: boolean | null;
}

export interface TotaliMovimenti {
  capitale: number;
  anticipazioni: number;
  compensi: number;
  interessi: number;
  recuperoCapitale: number;
  recuperoAnticipazioni: number;
  recuperoCompensi: number;
  recuperoInteressi: number;
}

export interface StatisticheFatturazione {
  totDaFatturare: number;
  totGiaFatturato: number;
  compensiDaFatturare: number;
  anticipazioniDaFatturare: number;
  compensiGiaFatturati: number;
  anticipazioniGiaFatturate: number;
}

export const movimentiFinanziariApi = {
  async getAllByPratica(praticaId: string): Promise<MovimentoFinanziario[]> {
    return await api.get(`/movimenti-finanziari/pratica/${praticaId}`);
  },

  async getTotaliByPratica(praticaId: string): Promise<TotaliMovimenti> {
    return await api.get(`/movimenti-finanziari/pratica/${praticaId}/totali`);
  },

  async getById(id: string): Promise<MovimentoFinanziario> {
    return await api.get(`/movimenti-finanziari/${id}`);
  },

  async create(data: CreateMovimentoFinanziarioDto): Promise<MovimentoFinanziario> {
    return await api.post('/movimenti-finanziari', data);
  },

  async update(id: string, data: UpdateMovimentoFinanziarioDto): Promise<MovimentoFinanziario> {
    return await api.patch(`/movimenti-finanziari/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/movimenti-finanziari/${id}`);
  },

  async getReportFatturazione(filters: {
    clienteId?: string;
    statoFatturazione?: 'da_fatturare' | 'gia_fatturato';
    dataInizio?: string;
    dataFine?: string;
    tipoMovimento?: string;
  }): Promise<MovimentoFinanziario[]> {
    const params = new URLSearchParams();
    if (filters.clienteId) params.append('clienteId', filters.clienteId);
    if (filters.statoFatturazione) params.append('statoFatturazione', filters.statoFatturazione);
    if (filters.dataInizio) params.append('dataInizio', filters.dataInizio);
    if (filters.dataFine) params.append('dataFine', filters.dataFine);
    if (filters.tipoMovimento) params.append('tipoMovimento', filters.tipoMovimento);

    return await api.get(`/movimenti-finanziari/report/fatturazione?${params.toString()}`);
  },

  async aggiornaStatoFatturazione(
    movimentoIds: string[],
    statoFatturazione: { daFatturare: boolean; giaFatturato: boolean },
  ): Promise<void> {
    await api.patch('/movimenti-finanziari/report/fatturazione/aggiorna-stato', {
      movimentoIds,
      statoFatturazione,
    });
  },

  async getStatisticheFatturazione(): Promise<StatisticheFatturazione> {
    return await api.get('/movimenti-finanziari/statistiche/fatturazione');
  },

  async downloadPdfFatturazione(filters: {
    clienteId?: string;
    statoFatturazione?: 'da_fatturare' | 'gia_fatturato';
    dataInizio?: string;
    dataFine?: string;
    tipoMovimento?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.clienteId) params.append('clienteId', filters.clienteId);
    if (filters.statoFatturazione) params.append('statoFatturazione', filters.statoFatturazione);
    if (filters.dataInizio) params.append('dataInizio', filters.dataInizio);
    if (filters.dataFine) params.append('dataFine', filters.dataFine);
    if (filters.tipoMovimento) params.append('tipoMovimento', filters.tipoMovimento);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/report/fatturazione/pdf?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Errore durante il download del PDF: ${errorText}`);
    }

    return await response.blob();
  },
};

// Helper per ottenere etichetta tipo movimento
export function getTipoMovimentoLabel(tipo: TipoMovimento): string {
  const labels: Record<TipoMovimento, string> = {
    capitale: 'Capitale',
    capitale_originario: 'Capitale Originario',
    nuovo_capitale: 'Nuovo Capitale',
    anticipazione: 'Anticipazione',
    compenso: 'Compenso legale',
    interessi: 'Interessi',
    altro: 'Altro',
    recupero_capitale: 'Recupero capitale',
    recupero_anticipazione: 'Recupero anticipazione',
    recupero_compenso: 'Recupero compenso',
    recupero_interessi: 'Recupero interessi',
    recupero_altro: 'Recupero altro',
  };
  return labels[tipo] || tipo;
}

// Helper per determinare se è un movimento di recupero
export function isRecupero(tipo: TipoMovimento): boolean {
  return tipo.startsWith('recupero_');
}
