// src/fasi/fasi.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { FASI, FaseDefinition, getFaseById, getFaseByCodice, FASE_DEFAULT_ID } from './fasi.constants';

@Injectable()
export class FasiService {
  /**
   * Restituisce tutte le fasi ordinate per 'ordine'.
   */
  findAll(): FaseDefinition[] {
    return [...FASI].sort((a, b) => a.ordine - b.ordine);
  }

  /**
   * Restituisce una fase per ID.
   */
  findOne(id: string): FaseDefinition {
    const fase = getFaseById(id);
    if (!fase) {
      throw new NotFoundException(`Fase con ID ${id} non trovata`);
    }
    return fase;
  }

  /**
   * Restituisce una fase per codice.
   */
  findByCodice(codice: string): FaseDefinition | undefined {
    return getFaseByCodice(codice);
  }

  /**
   * Restituisce la fase di default (prima fase del processo).
   */
  getDefaultFase(): FaseDefinition {
    return this.findOne(FASE_DEFAULT_ID);
  }

  /**
   * Restituisce l'ID della fase di default.
   */
  getDefaultFaseId(): string {
    return FASE_DEFAULT_ID;
  }

  /**
   * Verifica se una fase è di chiusura.
   */
  isFaseChiusura(faseId: string): boolean {
    const fase = getFaseById(faseId);
    return fase?.isFaseChiusura ?? false;
  }
}