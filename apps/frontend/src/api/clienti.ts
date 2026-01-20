// src/api/clienti.ts
import { api } from './config';

export type TipologiaAzienda =
  | 'impresa_individuale'
  | 'impresa_individuale_agricola'
  | 'srl'
  | 'spa'
  | 'scpa'
  | 'srl_agricola'
  | 'snc'
  | 'sas';

export type ClienteTipoSoggetto = 'persona_fisica' | 'persona_giuridica';

export interface ConfigurazioneCondivisione {
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
}

export interface Cliente {
  id: string;
  tipoSoggetto: ClienteTipoSoggetto;
  ragioneSociale: string;
  codiceFiscale?: string;
  partitaIva?: string;

  sedeLegale?: string;
  sedeOperativa?: string;

  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  nazione?: string;

  tipologia?: TipologiaAzienda;
  referente?: string;
  referenteNome?: string;
  referenteCognome?: string;
  referenteEmail?: string;

  telefono?: string;
  email?: string;
  pec?: string;

  attivo: boolean;

  configurazioneCondivisione?: ConfigurazioneCondivisione;

  createdAt: string;
  updatedAt: string;
}

export type ClientePayload = Omit<Cliente, 'id' | 'createdAt' | 'updatedAt' | 'attivo'>;

// ====== CRUD Clienti ======

export function fetchClienti(includeInactive = false): Promise<Cliente[]> {
  const params = includeInactive ? { includeInactive: 'true' } : undefined;
  return api.get<Cliente[]>('/clienti', params);
}

export function fetchCliente(id: string): Promise<Cliente> {
  return api.get<Cliente>(`/clienti/${id}`);
}

export function createCliente(data: ClientePayload): Promise<Cliente> {
  return api.post<Cliente>('/clienti', data);
}

export function updateCliente(
  id: string,
  data: Partial<ClientePayload>,
): Promise<Cliente> {
  return api.put<Cliente>(`/clienti/${id}`, data);
}

export function deleteCliente(id: string): Promise<Cliente> {
  return api.delete<Cliente>(`/clienti/${id}`);
}

// ====== Soft-delete ======

export function deactivateCliente(id: string): Promise<Cliente> {
  return api.patch<Cliente>(`/clienti/${id}/deactivate`);
}

export function reactivateCliente(id: string): Promise<Cliente> {
  return api.patch<Cliente>(`/clienti/${id}/reactivate`);
}

// ====== Pratiche count ======

export function fetchPraticheCountForCliente(
  id: string,
): Promise<{ count: number }> {
  return api.get<{ count: number }>(`/clienti/${id}/pratiche-count`);
}

// ====== Configurazione Condivisione ======

export function fetchConfigurazioneCondivisione(
  id: string,
): Promise<ConfigurazioneCondivisione> {
  return api.get<ConfigurazioneCondivisione>(`/clienti/${id}/condivisione`);
}

export function updateConfigurazioneCondivisione(
  id: string,
  configurazione: ConfigurazioneCondivisione,
): Promise<Cliente> {
  return api.put<Cliente>(`/clienti/${id}/condivisione`, configurazione);
}
