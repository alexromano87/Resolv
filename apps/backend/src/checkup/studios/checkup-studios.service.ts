import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { CheckupStudio } from './checkup-studio.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { UpdateCheckupStudioDto } from './dto/update-checkup-studio.dto';
import { CreateCheckupClientDto } from './dto/create-checkup-client.dto';
import { UpdateCheckupClientDto } from './dto/update-checkup-client.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

@Injectable()
export class CheckupStudiosService {
  constructor(
    @InjectRepository(CheckupStudio)
    private studioRepository: Repository<CheckupStudio>,
    @InjectRepository(CheckupClient)
    private clientRepository: Repository<CheckupClient>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
  ) {}

  private isStudioStaff(currentUser: CheckupCurrentUserData) {
    return ['admin_studio', 'segreteria', 'collaboratore'].includes(currentUser.ruolo);
  }

  private async getStudioOrThrow(studioId: string) {
    const studio = await this.studioRepository.findOne({
      where: { id: studioId, attivo: true },
      relations: ['license'],
    });
    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }
    return studio;
  }

  private async getLicenseForAdmin(currentUser: CheckupCurrentUserData) {
    if (!currentUser.studioId) {
      throw new ForbiddenException('Studio non associato');
    }
    const studio = await this.studioRepository.findOne({ where: { id: currentUser.studioId } });
    if (!studio || studio.tipo !== 'licenziatario') {
      throw new ForbiddenException('Studio non autorizzato');
    }
    const license = await this.licenseRepository.findOne({
      where: { studioId: studio.id },
    });
    if (!license) {
      throw new NotFoundException('Licenza non trovata');
    }
    return license;
  }

  private isExpired(dateValue?: string | null) {
    if (!dateValue) return false;
    const today = new Date().toISOString().slice(0, 10);
    return dateValue < today;
  }

  private async ensureSublicenseAssignable(
    sublicense: CheckupSublicense,
    licenseId: string,
    clientId?: string,
  ) {
    if (sublicense.licenseId !== licenseId) {
      throw new ForbiddenException('Sublicenza non valida per questa licenza');
    }
    if (!sublicense.tipo || !sublicense.dataInizioValidita || !sublicense.dataScadenza) {
      throw new ConflictException('Completa la sublicenza prima di assegnarla');
    }
    if (!sublicense.attiva) {
      throw new ConflictException('La sublicenza non è attiva');
    }
    if (this.isExpired(sublicense.dataScadenza)) {
      throw new ConflictException('La sublicenza è scaduta');
    }
    if (sublicense.clientId && sublicense.clientId !== clientId) {
      throw new ConflictException('La sublicenza è già assegnata');
    }
    if (clientId) {
      const alreadyAssigned = await this.sublicenseRepository.findOne({
        where: { licenseId, clientId },
      });
      if (alreadyAssigned && alreadyAssigned.id !== sublicense.id) {
        throw new ConflictException('Il cliente ha già una sublicenza associata');
      }
    }
  }

  async getMyStudio(currentUser: CheckupCurrentUserData) {
    if (!currentUser.studioId) {
      throw new NotFoundException('Studio non associato');
    }

    const studio = await this.getStudioOrThrow(currentUser.studioId);

    let license: CheckupLicense | null = null;

    let sublicenses: CheckupSublicense[] = [];
    if (studio.license) {
      license = studio.license;
      sublicenses = await this.sublicenseRepository.find({
        where: { licenseId: studio.license.id },
        relations: ['client', 'model'],
      });
    }

    return {
      studio,
      license: license
        ? {
            id: license.id,
            studioId: license.studioId,
            intestatario: license.intestatario,
            tipo: license.tipo,
            numeroLicenza: license.numeroLicenza,
            numeroUtenze: license.numeroUtenze,
            numeroSottolicenze: license.numeroSottolicenze,
            dataInizioValidita: license.dataInizioValidita,
            dataScadenza: license.dataScadenza,
            model: sublicenses[0]?.model
              ? {
                  id: sublicenses[0].model.id,
                  code: sublicenses[0].model.code,
                  label: sublicenses[0].model.label,
                }
              : null,
          }
        : null,
      sublicense: null,
      sublicenses: sublicenses.map((s) => {
        const cliente = s.client;
        return {
          id: s.id,
          clientId: s.clientId ?? null,
          numeroUtenze: s.numeroUtenze,
          attiva: s.attiva,
          cliente: cliente ? { id: cliente.id, nome: cliente.ragioneSociale || cliente.nome || 'Cliente senza nome' } : null,
        };
      }),
    };
  }

  async updateMyStudio(dto: UpdateCheckupStudioDto, currentUser: CheckupCurrentUserData) {
    if (!currentUser.studioId) {
      throw new NotFoundException('Studio non associato');
    }
    if (currentUser.ruolo !== 'admin_studio') {
      throw new ForbiddenException('Solo l\'admin può modificare i dati dello studio');
    }

    const studio = await this.getStudioOrThrow(currentUser.studioId);

    Object.assign(studio, {
      nome: dto.nome?.trim() ?? studio.nome,
      ragioneSociale: dto.ragioneSociale?.trim() ?? studio.ragioneSociale,
      partitaIva: dto.partitaIva?.trim() ?? studio.partitaIva,
      codiceFiscale: dto.codiceFiscale?.trim() ?? studio.codiceFiscale,
      indirizzo: dto.indirizzo?.trim() ?? studio.indirizzo,
      citta: dto.citta?.trim() ?? studio.citta,
      provincia: dto.provincia?.trim() ?? studio.provincia,
      cap: dto.cap?.trim() ?? studio.cap,
      paese: dto.paese?.trim() ?? studio.paese,
      email: dto.email?.trim() ?? studio.email,
      telefono: dto.telefono?.trim() ?? studio.telefono,
      sitoWeb: dto.sitoWeb?.trim() ?? studio.sitoWeb,
      logoUrl: dto.logoUrl?.trim() ?? studio.logoUrl,
      note: dto.note?.trim() ?? studio.note,
    });

    return this.studioRepository.save(studio);
  }

  async listClientStudios(currentUser: CheckupCurrentUserData) {
    if (!currentUser.studioId || currentUser.ruolo !== 'admin_studio') {
      throw new ForbiddenException('Non autorizzato');
    }

    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (!license) {
      return [];
    }

    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, clientId: Not(IsNull()) },
      relations: ['client'],
    });

    return sublicenses
      .map((s) => {
        const cliente = s.client;
        if (!cliente) return null;
        return {
          id: cliente.id,
          nome: cliente.nome,
          ragioneSociale: cliente.ragioneSociale,
          partitaIva: cliente.partitaIva,
          codiceFiscale: cliente.codiceFiscale,
          email: cliente.email,
          telefono: cliente.telefono,
          attivo: cliente.attivo,
          numeroUtenze: s.numeroUtenze,
          sublicense: {
            id: s.id,
            numeroSublicenza: s.numeroSublicenza,
            numeroUtenze: s.numeroUtenze,
            tipo: s.tipo,
            attiva: s.attiva,
            dataInizioValidita: s.dataInizioValidita,
            dataScadenza: s.dataScadenza,
          },
        };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }

  async listSublicenses(currentUser: CheckupCurrentUserData) {
    if (!this.isStudioStaff(currentUser)) {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.getLicenseForAdmin(currentUser);
    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id },
      relations: ['model'],
    });
    return sublicenses.map((s) => ({
      id: s.id,
      numeroSublicenza: s.numeroSublicenza,
      numeroUtenze: s.numeroUtenze,
      tipo: s.tipo,
      attiva: s.attiva,
      dataInizioValidita: s.dataInizioValidita,
      dataScadenza: s.dataScadenza,
      clientId: s.clientId,
      license: {
        id: license.id,
        intestatario: license.intestatario,
        tipo: license.tipo,
        numeroUtenze: license.numeroUtenze,
        numeroSottolicenze: license.numeroSottolicenze,
        numeroLicenza: license.numeroLicenza,
        dataInizioValidita: license.dataInizioValidita,
        dataScadenza: license.dataScadenza,
        modelId: s.modelId,
        model: s.model
          ? {
              id: s.model.id,
              code: s.model.code,
              label: s.model.label,
            }
          : null,
      },
    }));
  }

  async createClient(dto: CreateCheckupClientDto, currentUser: CheckupCurrentUserData) {
    if (currentUser.ruolo !== 'admin_studio') {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.getLicenseForAdmin(currentUser);
    const sublicense = await this.sublicenseRepository.findOne({ where: { id: dto.sublicenseId } });
    if (!sublicense) {
      throw new NotFoundException('Sublicenza non trovata');
    }
    await this.ensureSublicenseAssignable(sublicense, license.id);
    const nome = dto.nome?.trim() || null;
    const ragioneSociale = dto.ragioneSociale?.trim() || null;
    if (!nome && !ragioneSociale) {
      throw new ConflictException('Compila almeno nome cliente o ragione sociale/denominazione');
    }

    const client = this.clientRepository.create({
      nome,
      ragioneSociale,
      partitaIva: dto.partitaIva?.trim() || null,
      codiceFiscale: dto.codiceFiscale?.trim() || null,
      indirizzo: dto.indirizzo?.trim() || null,
      citta: dto.citta?.trim() || null,
      provincia: dto.provincia?.trim() || null,
      cap: dto.cap?.trim() || null,
      paese: dto.paese?.trim() || null,
      email: dto.email?.trim() || null,
      telefono: dto.telefono?.trim() || null,
      sitoWeb: dto.sitoWeb?.trim() || null,
      logoUrl: dto.logoUrl?.trim() || null,
      note: dto.note?.trim() || null,
      attivo: true,
    });

    const savedClient = await this.clientRepository.save(client);

    sublicense.clientId = savedClient.id;
    sublicense.clienteStudioId = null;
    await this.sublicenseRepository.save(sublicense);

    return {
      id: savedClient.id,
      nome: savedClient.nome,
      ragioneSociale: savedClient.ragioneSociale,
      partitaIva: savedClient.partitaIva,
      codiceFiscale: savedClient.codiceFiscale,
      email: savedClient.email,
      telefono: savedClient.telefono,
      attivo: savedClient.attivo,
      numeroUtenze: sublicense.numeroUtenze,
      sublicense: {
        id: sublicense.id,
        numeroSublicenza: sublicense.numeroSublicenza,
        numeroUtenze: sublicense.numeroUtenze,
        tipo: sublicense.tipo,
        attiva: sublicense.attiva,
        dataInizioValidita: sublicense.dataInizioValidita,
        dataScadenza: sublicense.dataScadenza,
      },
    };
  }

  async updateClient(id: string, dto: UpdateCheckupClientDto, currentUser: CheckupCurrentUserData) {
    if (currentUser.ruolo !== 'admin_studio') {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.getLicenseForAdmin(currentUser);
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Cliente non trovato');
    }

    const existingSublicense = await this.sublicenseRepository.findOne({
      where: { licenseId: license.id, clientId: client.id },
    });
    if (!existingSublicense) {
      throw new ForbiddenException('Cliente non associato alla licenza');
    }

    const nextNome = dto.nome !== undefined ? (dto.nome.trim() || null) : client.nome;
    const nextRagioneSociale = dto.ragioneSociale !== undefined ? (dto.ragioneSociale.trim() || null) : client.ragioneSociale;
    if (!nextNome && !nextRagioneSociale) {
      throw new ConflictException('Compila almeno nome cliente o ragione sociale/denominazione');
    }

    Object.assign(client, {
      nome: nextNome,
      ragioneSociale: nextRagioneSociale,
      partitaIva: dto.partitaIva?.trim() ?? client.partitaIva,
      codiceFiscale: dto.codiceFiscale?.trim() ?? client.codiceFiscale,
      indirizzo: dto.indirizzo?.trim() ?? client.indirizzo,
      citta: dto.citta?.trim() ?? client.citta,
      provincia: dto.provincia?.trim() ?? client.provincia,
      cap: dto.cap?.trim() ?? client.cap,
      paese: dto.paese?.trim() ?? client.paese,
      email: dto.email?.trim() ?? client.email,
      telefono: dto.telefono?.trim() ?? client.telefono,
      sitoWeb: dto.sitoWeb?.trim() ?? client.sitoWeb,
      logoUrl: dto.logoUrl?.trim() ?? client.logoUrl,
      note: dto.note?.trim() ?? client.note,
      attivo: dto.attivo ?? client.attivo,
    });

    const savedClient = await this.clientRepository.save(client);

    let nextSublicense = existingSublicense;
    if (dto.sublicenseId && dto.sublicenseId !== existingSublicense.id) {
      const target = await this.sublicenseRepository.findOne({ where: { id: dto.sublicenseId } });
      if (!target) {
        throw new NotFoundException('Sublicenza non trovata');
      }
      await this.ensureSublicenseAssignable(target, license.id, client.id);
      existingSublicense.clientId = null;
      existingSublicense.clienteStudioId = null;
      await this.sublicenseRepository.save(existingSublicense);
      target.clientId = client.id;
      target.clienteStudioId = null;
      nextSublicense = await this.sublicenseRepository.save(target);
    }

    return {
      id: savedClient.id,
      nome: savedClient.nome,
      ragioneSociale: savedClient.ragioneSociale,
      partitaIva: savedClient.partitaIva,
      codiceFiscale: savedClient.codiceFiscale,
      email: savedClient.email,
      telefono: savedClient.telefono,
      attivo: savedClient.attivo,
      numeroUtenze: nextSublicense.numeroUtenze,
      sublicense: {
        id: nextSublicense.id,
        numeroSublicenza: nextSublicense.numeroSublicenza,
        numeroUtenze: nextSublicense.numeroUtenze,
        tipo: nextSublicense.tipo,
        attiva: nextSublicense.attiva,
        dataInizioValidita: nextSublicense.dataInizioValidita,
        dataScadenza: nextSublicense.dataScadenza,
      },
    };
  }

  async deactivateClient(id: string, currentUser: CheckupCurrentUserData) {
    if (currentUser.ruolo !== 'admin_studio') {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.getLicenseForAdmin(currentUser);
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Cliente non trovato');
    }
    const hasAccess = await this.sublicenseRepository.findOne({
      where: { licenseId: license.id, clientId: client.id },
    });
    if (!hasAccess) {
      throw new ForbiddenException('Cliente non associato alla licenza');
    }
    client.attivo = false;
    return this.clientRepository.save(client);
  }
}
