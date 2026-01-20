// apps/frontend/src/api/debitori.ts
import { api } from './config';
import type { TipologiaAzienda } from './clienti';

export type TipoSoggetto = 'persona_fisica' | 'persona_giuridica';

export interface Debitore {
  id: string;
  tipoSoggetto: TipoSoggetto;

  // persona fisica
  nome?: string;
  cognome?: string;
  codiceFiscale?: string;
  dataNascita?: string;
  luogoNascita?: string;

  // persona giuridica
  ragioneSociale?: string;
  partitaIva?: string;
  tipologia?: TipologiaAzienda;
  sedeLegale?: string;
  sedeOperativa?: string;

  // comuni
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  nazione?: string;

  referente?: string;
  telefono?: string;
  email?: string;
  pec?: string;

  attivo: boolean;

  createdAt: string;
  updatedAt: string;
}

export type DebitoreCreatePayload = {
  tipoSoggetto: TipoSoggetto;

  nome?: string;
  cognome?: string;
  codiceFiscale?: string;
  dataNascita?: string;
  luogoNascita?: string;

  ragioneSociale?: string;
  partitaIva?: string;
  tipologia?: TipologiaAzienda;
  sedeLegale?: string;
  sedeOperativa?: string;

  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  nazione?: string;

  referente?: string;
  telefono?: string;
  email?: string;
  pec?: string;

  // cliente a cui agganciare il debitore
  clientiIds: string[];
};

export type DebitoreUpdatePayload = Partial<
  Omit<DebitoreCreatePayload, 'clientiIds'>
>;

// ====== CRUD Debitori ======

export function fetchDebitori(includeInactive = false): Promise<Debitore[]> {
  const params = includeInactive ? { includeInactive: 'true' } : undefined;
  return api.get<Debitore[]>('/debitori', params);
}

// Tipo esteso con conteggio clienti
export interface DebitoreWithClientiCount extends Debitore {
  clientiCount: number;
}

export function fetchDebitoriWithClientiCount(
  includeInactive = false,
): Promise<DebitoreWithClientiCount[]> {
  const params: Record<string, string> = { withClientiCount: 'true' };
  if (includeInactive) {
    params.includeInactive = 'true';
  }
  return api.get<DebitoreWithClientiCount[]>('/debitori', params);
}

export function fetchDebitore(id: string): Promise<Debitore> {
  return api.get<Debitore>(`/debitori/${id}`);
}

export function createDebitore(
  payload: DebitoreCreatePayload,
): Promise<Debitore> {
  return api.post<Debitore>('/debitori', payload);
}

export function updateDebitore(
  id: string,
  payload: DebitoreUpdatePayload,
): Promise<Debitore> {
  return api.put<Debitore>(`/debitori/${id}`, payload);
}

export function deleteDebitore(id: string): Promise<void> {
  return api.delete<void>(`/debitori/${id}`);
}

// ====== Soft-delete ======

export function deactivateDebitore(id: string): Promise<Debitore> {
  return api.patch<Debitore>(`/debitori/${id}/deactivate`);
}

export function reactivateDebitore(id: string): Promise<Debitore> {
  return api.patch<Debitore>(`/debitori/${id}/reactivate`);
}

// ====== Pratiche count ======

export function fetchPraticheCountForDebitore(
  id: string,
): Promise<{ count: number }> {
  return api.get<{ count: number }>(`/debitori/${id}/pratiche-count`);
}

// ====== Clienti collegati ======

export function fetchClientiForDebitore(
  debitoreId: string,
): Promise<{ clientiIds: string[] }> {
  return api.get<{ clientiIds: string[] }>(`/debitori/${debitoreId}/clienti`);
}

// ====== Relazione Cliente <-> Debitore ======

export function fetchDebitoriForCliente(
  clienteId: string,
  includeInactive = false,
): Promise<Debitore[]> {
  const params = includeInactive ? { includeInactive: 'true' } : undefined;
  return api.get<Debitore[]>(`/clienti/${clienteId}/debitori`, params);
}

export function unlinkDebitoreFromCliente(
  clienteId: string,
  debitoreId: string,
): Promise<void> {
  return api.delete<void>(`/clienti/${clienteId}/debitori/${debitoreId}`);
}

export function linkDebitoreToCliente(
  clienteId: string,
  debitoreId: string,
): Promise<void> {
  return api.post<void>(`/clienti/${clienteId}/debitori/${debitoreId}`, {});
}

// ====== Helper functions ======

export function getDebitoreDisplayName(d: Debitore | { tipoSoggetto?: 'persona_fisica' | 'persona_giuridica'; nome?: string; cognome?: string; ragioneSociale?: string } | undefined): string {
  if (!d) return '(N/D)';
  if (d.tipoSoggetto === 'persona_fisica') {
    const full = `${d.nome ?? ''} ${d.cognome ?? ''}`.trim();
    return full || '(Senza nome)';
  }
  return d.ragioneSociale || '(Senza ragione sociale)';
}