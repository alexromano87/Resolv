// src/relazioni/clienti-debitori.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClienteDebitore } from './cliente-debitore.entity';
import { Debitore } from '../debitori/debitore.entity';

@Injectable()
export class ClientiDebitoriService {
  constructor(
    @InjectRepository(ClienteDebitore)
    private readonly cdRepo: Repository<ClienteDebitore>,
    @InjectRepository(Debitore)
    private readonly debitoriRepo: Repository<Debitore>,
  ) {}

  async getDebitoriByCliente(
    clienteId: string,
    includeInactive = false,
  ): Promise<Debitore[]> {
    const links = await this.cdRepo.find({
      where: { clienteId, attivo: true },
      relations: ['debitore'],
    });

    // Filtra i debitori in base allo stato attivo
    const debitori = links.map((l) => l.debitore);
    
    if (includeInactive) {
      return debitori; // Restituisci tutti i debitori collegati
    }
    
    // Filtra solo i debitori attivi
    return debitori.filter((d) => d.attivo !== false);
  }

  /**
   * Collega un singolo debitore a un cliente.
   * Se il link esiste già (anche se disattivato), lo riattiva.
   */
  async linkDebitoreToCliente(
    clienteId: string,
    debitoreId: string,
  ): Promise<void> {
    const existing = await this.cdRepo.findOne({
      where: { clienteId, debitoreId },
    });

    if (existing) {
      if (!existing.attivo) {
        existing.attivo = true;
        await this.cdRepo.save(existing);
      }
      // Se già attivo, non fare nulla
    } else {
      const link = this.cdRepo.create({
        clienteId,
        debitoreId,
        attivo: true,
      });
      await this.cdRepo.save(link);
    }
  }

  async setDebitoriForCliente(
    clienteId: string,
    debitoriIds: string[],
  ): Promise<void> {
    // disattivo (soft) tutti quelli esistenti
    await this.cdRepo.update({ clienteId }, { attivo: false });

    if (!debitoriIds || debitoriIds.length === 0) {
      return;
    }

    // riattivo o creo i link necessari
    const existing = await this.cdRepo.find({
      where: { clienteId, debitoreId: In(debitoriIds) },
    });

    const existingMap = new Map(
      existing.map((l) => [l.debitoreId, l]),
    );

    const toSave: ClienteDebitore[] = [];

    for (const debitoreId of debitoriIds) {
      const found = existingMap.get(debitoreId);
      if (found) {
        found.attivo = true;
        toSave.push(found);
      } else {
        toSave.push(
          this.cdRepo.create({
            clienteId,
            debitoreId,
            attivo: true,
          }),
        );
      }
    }

    await this.cdRepo.save(toSave);
  }

  async unlinkDebitoreFromCliente(
    clienteId: string,
    debitoreId: string,
  ): Promise<void> {
    await this.cdRepo.update({ clienteId, debitoreId }, { attivo: false });
  }

  /**
   * Restituisce tutti i clienti collegati a un debitore.
   */
  async getClientiByDebitore(debitoreId: string): Promise<string[]> {
    const links = await this.cdRepo.find({
      where: { debitoreId, attivo: true },
    });
    return links.map((l) => l.clienteId);
  }
}