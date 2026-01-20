// apps/frontend/src/api/fasi.ts
import { api } from './config';

// ====== Tipi ======

export interface Fase {
  id: string;
  nome: string;
  codice: string;
  descrizione: string;
  ordine: number;
  colore: string;
  icona: string;
  isFaseChiusura: boolean;
}

// ====== API Functions ======

export async function fetchFasi(): Promise<Fase[]> {
  return api.get<Fase[]>('/fasi');
}

export async function fetchFase(id: string): Promise<Fase> {
  return api.get<Fase>(`/fasi/${id}`);
}

// ====== Helper functions ======

export function getFaseLabel(fase: Fase): string {
  return fase.nome;
}

export function getFaseColor(fase: Fase): string {
  return fase.colore || '#6B7280';
}