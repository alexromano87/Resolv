// apps/frontend/src/api/pratiche.ts
import { api } from './config';
import type { Fase } from './fasi';
import type { Avvocato } from './avvocati';
import type { User } from './auth';
import type { MovimentoFinanziario } from './movimenti-finanziari';

// ====== Tipi ======

export type EsitoPratica = 'positivo' | 'negativo' | null;
export type EsitoOpposizione = 'rigetto' | 'accoglimento_parziale' | 'accoglimento_totale';
export type TipoPignoramento = 'mobiliare_debitore' | 'mobiliare_terzi' | 'immobiliare';
export type EsitoPignoramento = 'iscrizione_a_ruolo' | 'desistenza' | 'opposizione';

// Evento che si è verificato durante una fase
export interface EventoFase {
  tipo: 'documento_caricato' | 'documento_eliminato' | 'avvocato_aggiunto' | 'avvocato_rimosso' | 'collaboratore_aggiunto' | 'collaboratore_rimosso' | 'movimento_finanziario' | 'note_fase_modificate' | 'piano_ammortamento_creato' | 'piano_ammortamento_pagamento' | 'piano_ammortamento_storno';
  data: string; // ISO date
  eseguitoDa?: string; // Nome utente che ha eseguito l'azione
  dettagli: any; // Dettagli specifici dell'evento
}

// Storico fasi - riferisce alle fasi tramite ID
export interface StoricoFase {
  faseId: string;
  faseCodice: string;
  faseNome: string;
  dataInizio: string;
  dataFine?: string;
  note?: string; // Note inserite al momento del cambio fase
  noteFase?: string; // Note specifiche della fase, salvate quando la fase viene chiusa
  cambiatoDaUserId?: string; // ID dell'utente che ha eseguito il cambio fase
  cambiatoDaNome?: string; // Nome completo dell'utente che ha eseguito il cambio fase
  // Eventi accaduti durante questa fase
  eventi?: EventoFase[];
}

export interface Pratica {
  id: string;
  numeroPratica?: string; // Numero progressivo formato: numero/anno
  attivo: boolean;
  studioId?: string | null;

  // Relazioni
  clienteId: string;
  debitoreId: string;
  faseId: string; // FK alla tabella fasi
  
  // Oggetti relazionati (popolati dal backend con JOIN)
  cliente?: {
    id: string;
    ragioneSociale: string;
    attivo: boolean;
  };
  debitore?: {
    id: string;
    tipoSoggetto: 'persona_fisica' | 'persona_giuridica';
    nome?: string;
    cognome?: string;
    ragioneSociale?: string;
    attivo: boolean;
  };
  fase?: Fase; // Oggetto Fase completo dal DB

  // Avvocati e movimenti finanziari
  avvocati?: Avvocato[];
  collaboratori?: User[];
  movimentiFinanziari?: MovimentoFinanziario[];

  // Stato
  aperta: boolean;
  esito: EsitoPratica;

  // Importi
  capitale: number;
  importoRecuperatoCapitale: number;
  anticipazioni: number;
  importoRecuperatoAnticipazioni: number;
  compensiLegali: number;
  compensiLiquidati: number;
  interessi: number;
  interessiRecuperati: number;

  // Calcolo automatico interessi
  applicaInteressi: boolean;
  tipoInteresse: 'legale' | 'moratorio' | 'fisso' | null;
  tassoInteresse: number | null;
  dataInizioInteressi: string | null;
  dataFineMaturazione: string | null;
  moratorioPre2013: boolean;
  moratorioMaggiorazione: boolean;
  moratorioPctMaggiorazione: number | null;

  // Note e riferimenti
  note?: string;
  noteFase?: string; // Note specifiche per la fase corrente, resettate ad ogni cambio fase
  riferimentoCredito?: string;

  // Storico
  storico?: StoricoFase[];
  opposizione?: {
    esito?: EsitoOpposizione;
    dataEsito?: string;
    note?: string;
  };
  pignoramento?: {
    tipo?: TipoPignoramento;
    dataNotifica?: string;
    esito?: EsitoPignoramento;
    note?: string;
  };

  // Date
  dataAffidamento?: string;
  dataChiusura?: string;
  dataScadenza?: string;

  // Meta
  createdAt: string;
  updatedAt: string;
}

export interface PraticaCreatePayload {
  clienteId: string;
  debitoreId: string;
  numeroPratica?: string;
  avvocatiIds?: string[]; // Array di UUID avvocati da associare
  collaboratoriIds?: string[]; // Array di UUID collaboratori da associare
  faseId?: string; // UUID della fase, opzionale (default: prima fase)
  aperta?: boolean;
  esito?: EsitoPratica;
  capitale?: number;
  importoRecuperatoCapitale?: number;
  anticipazioni?: number;
  importoRecuperatoAnticipazioni?: number;
  compensiLegali?: number;
  compensiLiquidati?: number;
  interessi?: number;
  interessiRecuperati?: number;
  applicaInteressi?: boolean;
  tipoInteresse?: 'legale' | 'moratorio' | 'fisso';
  tassoInteresse?: number;
  dataInizioInteressi?: string;
  dataFineMaturazione?: string;
  moratorioPre2013?: boolean;
  moratorioMaggiorazione?: boolean;
  moratorioPctMaggiorazione?: number;
  note?: string;
  noteFase?: string;
  riferimentoCredito?: string;
  opposizione?: {
    esito?: EsitoOpposizione;
    dataEsito?: string;
    note?: string;
  };
  pignoramento?: {
    tipo?: TipoPignoramento;
    dataNotifica?: string;
    esito?: EsitoPignoramento;
    note?: string;
  };
  dataAffidamento?: string;
  dataChiusura?: string;
  dataScadenza?: string;
}

// Update non permette cambio fase (usa endpoint dedicato)
export interface PraticaUpdatePayload extends Partial<Omit<PraticaCreatePayload, 'faseId'>> {}

export interface CambiaFasePayload {
  nuovaFaseId: string; // UUID della nuova fase
  esito?: 'positivo' | 'negativo'; // Obbligatorio se la fase è di chiusura
  note?: string;
}

export interface PraticheStats {
  aperte: number;
  chiusePositive: number;
  chiuseNegative: number;
  totali: number;
  capitaleAffidato: number;
  capitaleRecuperato: number;
  capitaleDaRecuperare: number;
  anticipazioni: number;
  anticipazioniRecuperate: number;
  compensiMaturati: number;
  compensiLiquidati: number;
  perFase: Record<string, number>; // chiave: codice fase, valore: count
}

// ====== CRUD Pratiche ======

export function fetchPratiche(
  options: {
    includeInactive?: boolean;
    clienteId?: string;
    debitoreId?: string;
  } = {},
): Promise<Pratica[]> {
  const params: Record<string, string> = {};
  if (options.includeInactive) params.includeInactive = 'true';
  if (options.clienteId) params.clienteId = options.clienteId;
  if (options.debitoreId) params.debitoreId = options.debitoreId;

  return api.get<Pratica[]>('/pratiche', Object.keys(params).length > 0 ? params : undefined);
}

export function fetchPratica(id: string): Promise<Pratica> {
  return api.get<Pratica>(`/pratiche/${id}`);
}

export function fetchPraticheStats(): Promise<PraticheStats> {
  return api.get<PraticheStats>('/pratiche/stats');
}

export function createPratica(payload: PraticaCreatePayload): Promise<Pratica> {
  return api.post<Pratica>('/pratiche', payload);
}

export function updatePratica(
  id: string,
  payload: PraticaUpdatePayload,
): Promise<Pratica> {
  return api.put<Pratica>(`/pratiche/${id}`, payload);
}

export function deletePratica(id: string): Promise<void> {
  return api.delete<void>(`/pratiche/${id}`);
}

// ====== Gestione stato ======

export function cambiaFasePratica(
  id: string,
  payload: CambiaFasePayload,
): Promise<Pratica> {
  return api.patch<Pratica>(`/pratiche/${id}/fase`, payload);
}

export function riapriPratica(
  id: string,
  faseId?: string, // UUID della fase in cui riaprire
): Promise<Pratica> {
  return api.patch<Pratica>(`/pratiche/${id}/riapri`, { faseId });
}

export function deactivatePratica(id: string): Promise<Pratica> {
  return api.patch<Pratica>(`/pratiche/${id}/deactivate`, {});
}

export function reactivatePratica(id: string): Promise<Pratica> {
  return api.patch<Pratica>(`/pratiche/${id}/reactivate`, {});
}

// ====== Helper functions ======

// Label esiti (questi sono fissi, non dinamici)
export const ESITI_LABELS: Record<string, string> = {
  positivo: 'Esito positivo',
  negativo: 'Esito negativo',
};

export function getEsitoLabel(esito: EsitoPratica): string {
  if (!esito) return 'In corso';
  return ESITI_LABELS[esito] || esito;
}

// Helper per ottenere il nome della fase dalla pratica
export function getFaseNome(pratica: Pratica): string {
  return pratica.fase?.nome || '(Fase sconosciuta)';
}

// Helper per ottenere il colore della fase dalla pratica
export function getFaseColore(pratica: Pratica): string {
  return pratica.fase?.colore || '#6B7280'; // gray-500 default
}

// Helper per verificare se la pratica è in una fase di chiusura
export function isInFaseChiusura(pratica: Pratica): boolean {
  return pratica.fase?.isFaseChiusura || false;
}

export function getDebitoreDisplayName(debitore?: { tipoSoggetto?: 'persona_fisica' | 'persona_giuridica'; nome?: string; cognome?: string; ragioneSociale?: string }): string {
  if (!debitore) return '(Debitore non trovato)';
  if (debitore.tipoSoggetto === 'persona_fisica') {
    const full = `${debitore.nome ?? ''} ${debitore.cognome ?? ''}`.trim();
    return full || '(Senza nome)';
  }
  return debitore.ragioneSociale || '(Senza ragione sociale)';
}

export function formatCurrency(value: number | string | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === undefined || num === null || isNaN(num)) return '€ 0,00';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(num);
}

export function getCapitaleDaRecuperare(pratica: Pratica): number {
  return (pratica.capitale || 0) - (pratica.importoRecuperatoCapitale || 0);
}

export function getPercentualeRecupero(pratica: Pratica): number {
  if (!pratica.capitale || pratica.capitale === 0) return 0;
  return ((pratica.importoRecuperatoCapitale || 0) / pratica.capitale) * 100;
}

// ====== Calcolo Interessi ======

export interface CalcoloInteressiResponse {
  interessiCalcolati: number;
  capitale: number;
  dataInizioInteressi: string | null;
  dataFineMaturazione: string | null;
  tipoInteresse: 'legale' | 'moratorio' | 'fisso' | null;
  tassoInteresse: number | null;
  applicaInteressi: boolean;
}

export function calcolaInteressiPratica(praticaId: string): Promise<CalcoloInteressiResponse> {
  return api.get<CalcoloInteressiResponse>(`/pratiche/${praticaId}/calcola-interessi`);
}
