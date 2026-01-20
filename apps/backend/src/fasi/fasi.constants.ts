// src/fasi/fasi.constants.ts
// Fasi hardcoded - non serve tabella DB

export interface FaseDefinition {
  id: string;
  nome: string;
  codice: string;
  descrizione: string;
  ordine: number;
  colore: string;
  icona: string;
  isFaseChiusura: boolean;
}

export const FASI: FaseDefinition[] = [
  {
    id: 'fase-001',
    nome: 'Analisi preliminare',
    codice: 'analisi_preliminare',
    descrizione: 'Fase iniziale di analisi del credito e della documentazione',
    ordine: 1,
    colore: '#6366F1', // indigo
    icona: 'FileSearch',
    isFaseChiusura: false,
  },
  {
    id: 'fase-002',
    nome: 'Sollecito bonario',
    codice: 'sollecito_bonario',
    descrizione: 'Primo contatto informale con il debitore per sollecitare il pagamento',
    ordine: 2,
    colore: '#8B5CF6', // violet
    icona: 'Phone',
    isFaseChiusura: false,
  },
  {
    id: 'fase-003',
    nome: 'Messa in mora',
    codice: 'messa_in_mora',
    descrizione: 'Invio della diffida formale di pagamento al debitore',
    ordine: 3,
    colore: '#F59E0B', // amber
    icona: 'Mail',
    isFaseChiusura: false,
  },
  {
    id: 'fase-004',
    nome: 'Decreto ingiuntivo',
    codice: 'decreto_ingiuntivo',
    descrizione: 'Richiesta di decreto ingiuntivo al tribunale',
    ordine: 4,
    colore: '#EC4899', // pink
    icona: 'Gavel',
    isFaseChiusura: false,
  },
  {
    id: 'fase-005',
    nome: 'Notifica decreto',
    codice: 'notifica_decreto',
    descrizione: 'Notifica del decreto ingiuntivo al debitore',
    ordine: 5,
    colore: '#14B8A6', // teal
    icona: 'Send',
    isFaseChiusura: false,
  },
  {
    id: 'fase-006',
    nome: 'Opposizione',
    codice: 'opposizione',
    descrizione: "Gestione dell'eventuale opposizione del debitore",
    ordine: 6,
    colore: '#F97316', // orange
    icona: 'Shield',
    isFaseChiusura: false,
  },
  {
    id: 'fase-007',
    nome: 'Esecuzione forzata',
    codice: 'esecuzione_forzata',
    descrizione: 'Avvio delle procedure esecutive',
    ordine: 7,
    colore: '#EF4444', // red
    icona: 'AlertTriangle',
    isFaseChiusura: false,
  },
  {
    id: 'fase-008',
    nome: 'Pignoramento',
    codice: 'pignoramento',
    descrizione: 'Pignoramento dei beni del debitore',
    ordine: 8,
    colore: '#DC2626', // red-600
    icona: 'Lock',
    isFaseChiusura: false,
  },
  {
    id: 'fase-009',
    nome: 'Vendita beni',
    codice: 'vendita_beni',
    descrizione: "Vendita all'asta dei beni pignorati",
    ordine: 9,
    colore: '#9333EA', // purple
    icona: 'ShoppingBag',
    isFaseChiusura: false,
  },
  {
    id: 'fase-010',
    nome: 'Assegnazione/distribuzione',
    codice: 'assegnazione_distribuzione',
    descrizione: 'Distribuzione delle somme ricavate dalla vendita',
    ordine: 10,
    colore: '#0EA5E9', // sky
    icona: 'Split',
    isFaseChiusura: false,
  },
  {
    id: 'fase-011',
    nome: 'Accordo transattivo',
    codice: 'accordo_transattivo',
    descrizione: 'Negoziazione di un accordo transattivo con il debitore',
    ordine: 11,
    colore: '#22C55E', // green
    icona: 'Handshake',
    isFaseChiusura: false,
  },
  {
    id: 'fase-012',
    nome: 'Piano di rientro',
    codice: 'piano_rientro',
    descrizione: 'Definizione di un piano di pagamento rateale',
    ordine: 12,
    colore: '#3B82F6', // blue
    icona: 'CalendarClock',
    isFaseChiusura: false,
  },
  {
    id: 'fase-013',
    nome: 'Monitoraggio pagamenti',
    codice: 'monitoraggio_pagamenti',
    descrizione: 'Monitoraggio del rispetto del piano di pagamento',
    ordine: 13,
    colore: '#06B6D4', // cyan
    icona: 'Eye',
    isFaseChiusura: false,
  },
  {
    id: 'fase-014',
    nome: 'Chiusura positiva',
    codice: 'chiusura_positiva',
    descrizione: 'Pratica conclusa con recupero del credito',
    ordine: 98,
    colore: '#10B981', // emerald
    icona: 'CheckCircle',
    isFaseChiusura: true,
  },
  {
    id: 'fase-015',
    nome: 'Chiusura negativa',
    codice: 'chiusura_negativa',
    descrizione: 'Pratica conclusa senza recupero del credito',
    ordine: 99,
    colore: '#6B7280', // gray
    icona: 'XCircle',
    isFaseChiusura: true,
  },
];

// Helper per trovare fase di default (prima fase non di chiusura)
export const FASE_DEFAULT_ID = 'fase-001';

// Helper per trovare fase per ID
export function getFaseById(id: string): FaseDefinition | undefined {
  return FASI.find((f) => f.id === id);
}

// Helper per trovare fase per codice
export function getFaseByCodice(codice: string): FaseDefinition | undefined {
  return FASI.find((f) => f.codice === codice);
}