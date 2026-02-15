import { api } from './config';

export interface CheckupStudioDetails {
  id: string;
  nome: string;
  tipo: 'licenziatario' | 'cliente';
  ragioneSociale: string | null;
  partitaIva: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  citta: string | null;
  provincia: string | null;
  cap: string | null;
  paese: string | null;
  email: string | null;
  telefono: string | null;
  sitoWeb: string | null;
  logoUrl: string | null;
  note: string | null;
  attivo: boolean;
}

export interface CheckupLicenseInfo {
  id: string;
  studioId: string;
  intestatario: string;
  tipo: string;
  numeroLicenza?: string | null;
  numeroUtenze: number;
  numeroSottolicenze: number;
  dataInizioValidita?: string | null;
  dataScadenza?: string | null;
}

export interface CheckupSublicenseInfo {
  id: string;
  licenseId: string;
  clientId: string | null;
  numeroUtenze: number;
  attiva: boolean;
  licenziatarioNome?: string | null;
}

export interface CheckupStudioProfile {
  studio: CheckupStudioDetails;
  license: CheckupLicenseInfo | null;
  sublicense: CheckupSublicenseInfo | null;
  sublicenses?: Array<{
    id: string;
    clientId: string | null;
    numeroUtenze: number;
    attiva: boolean;
    cliente?: { id: string; nome: string } | null;
  }>;
}

export interface UpdateCheckupStudioPayload {
  nome?: string;
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  paese?: string;
  email?: string;
  telefono?: string;
  sitoWeb?: string;
  logoUrl?: string;
  note?: string;
}

export interface ClientStudioOption {
  id: string;
  nome: string;
  ragioneSociale?: string | null;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  numeroUtenze?: number;
  attivo?: boolean;
}

export interface CheckupClientRecord {
  id: string;
  nome: string;
  ragioneSociale?: string | null;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  email?: string | null;
  telefono?: string | null;
  attivo: boolean;
  numeroUtenze?: number;
  sublicense?: {
    id: string;
    numeroSublicenza?: string | null;
    numeroUtenze: number;
    tipo?: string | null;
    attiva: boolean;
    dataInizioValidita?: string | null;
    dataScadenza?: string | null;
  };
}

export interface CheckupSublicenseOption {
  id: string;
  numeroSublicenza?: string | null;
  numeroUtenze: number;
  tipo?: string | null;
  attiva: boolean;
  dataInizioValidita?: string | null;
  dataScadenza?: string | null;
  clientId?: string | null;
  license?: {
    id: string;
    intestatario: string;
    tipo: string;
    numeroUtenze: number;
    numeroSottolicenze: number;
    numeroLicenza: string | null;
    dataInizioValidita: string | null;
    dataScadenza: string | null;
  };
}

export interface CreateCheckupClientPayload {
  nome: string;
  sublicenseId: string;
  ragioneSociale?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  paese?: string;
  email?: string;
  telefono?: string;
  sitoWeb?: string;
  logoUrl?: string;
  note?: string;
}

export interface UpdateCheckupClientPayload extends Partial<CreateCheckupClientPayload> {
  attivo?: boolean;
}

export const studiosApi = {
  getMyStudio: () => api.get<CheckupStudioProfile>('/checkup/studios/me'),
  updateMyStudio: (payload: UpdateCheckupStudioPayload) =>
    api.put<CheckupStudioDetails>('/checkup/studios/me', payload),
  listClientStudios: () => api.get<CheckupClientRecord[]>('/checkup/studios/clients'),
  listSublicenses: () => api.get<CheckupSublicenseOption[]>('/checkup/studios/sublicenses'),
  createClient: (payload: CreateCheckupClientPayload) =>
    api.post<CheckupClientRecord>('/checkup/studios/clients', payload),
  updateClient: (id: string, payload: UpdateCheckupClientPayload) =>
    api.put<CheckupClientRecord>(`/checkup/studios/clients/${id}`, payload),
  deactivateClient: (id: string) =>
    api.patch<CheckupStudioDetails>(`/checkup/studios/clients/${id}/deactivate`),
};
