import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { UpdatePreassessmentDto } from './dto/update-preassessment.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import puppeteer from 'puppeteer';

@Injectable()
export class CheckupPreassessmentService {
  private presenceByPreassessment = new Map<string, Map<string, { userId: string; name: string; expiresAt: number }>>();

  constructor(
    @InjectRepository(CheckupPreassessment)
    private preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
    @InjectRepository(CheckupClient)
    private clientRepository: Repository<CheckupClient>,
  ) {}

  private async getOrCreateByClientId(clientId: string, currentUser: CheckupCurrentUserData): Promise<CheckupPreassessment> {
    const clientExists = await this.clientRepository.findOne({ where: { id: clientId, attivo: true } });
    if (!clientExists) {
      throw new NotFoundException('Cliente non trovato');
    }
    const existing = await this.preassessmentRepository.findOne({ where: { clientId } });
    if (existing) return existing;

    const created = this.preassessmentRepository.create({
      userId: currentUser.id,
      clientId,
      data: {},
      notes: {},
      fieldNotes: {},
      naFields: {},
      macroValidations: {},
      studioCanEdit: false,
    });

    return this.preassessmentRepository.save(created);
  }

  async getOrCreate(user: CheckupCurrentUserData): Promise<CheckupPreassessment> {
    if (!user.clientId) {
      throw new ForbiddenException('Cliente non associato');
    }
    return this.getOrCreateByClientId(user.clientId, user);
  }

  private applyFieldMeta(
    record: CheckupPreassessment,
    nextData: Record<string, string> | undefined,
    nextNaFields: Record<string, boolean> | undefined,
    currentUser: CheckupCurrentUserData,
  ) {
    if (!nextData && !nextNaFields) return;
    const prev = record.data || {};
    const prevNA = record.naFields || {};
    const meta = record.fieldMeta || {};
    const nowIso = new Date().toISOString();
    const name = `${currentUser.nome} ${currentUser.cognome}`.trim() || currentUser.email;
    const keys = new Set<string>([
      ...Object.keys(prev),
      ...Object.keys(prevNA),
      ...Object.keys(nextData || {}),
      ...Object.keys(nextNaFields || {}),
    ]);

    keys.forEach((key) => {
      const prevVal = prev[key] ?? '';
      const nextVal = nextData ? (nextData[key] ?? '') : prevVal;
      const prevNa = !!prevNA[key];
      const nextNa = nextNaFields ? !!nextNaFields[key] : prevNa;
      if (prevVal !== nextVal || prevNa !== nextNa) {
        meta[key] = {
          updatedAt: nowIso,
          updatedBy: {
            id: currentUser.id,
            name,
            ruolo: currentUser.ruolo,
          },
        };
      }
    });

    record.fieldMeta = meta;
  }

  async update(user: CheckupCurrentUserData, dto: UpdatePreassessmentDto): Promise<CheckupPreassessment> {
    const record = await this.getOrCreate(user);

    this.applyFieldMeta(record, dto.data, dto.naFields, user);
    if (dto.data !== undefined) record.data = dto.data;
    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.fieldNotes !== undefined && user.ruolo !== 'cliente') record.fieldNotes = dto.fieldNotes;
    if (dto.naFields !== undefined) record.naFields = dto.naFields;
    if (dto.macroValidations !== undefined && user.ruolo === 'cliente') {
      record.macroValidations = dto.macroValidations;
    }
    if (dto.studioCanEdit !== undefined) record.studioCanEdit = dto.studioCanEdit;

    return this.preassessmentRepository.save(record);
  }

  private async ensureAccess(currentUser: CheckupCurrentUserData, clientId: string) {
    if (currentUser.clientId && currentUser.clientId === clientId) return;
    if (!currentUser.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }

    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (license) {
      const sublicense = await this.sublicenseRepository.findOne({
        where: { licenseId: license.id, clientId, attiva: true },
      });
      if (sublicense) return;
    }

    throw new ForbiddenException('Non autorizzato');
  }

  private async getClientForPreassessment(preassessmentId: string) {
    const preassessment = await this.preassessmentRepository.findOne({ where: { id: preassessmentId } });
    if (!preassessment) {
      throw new NotFoundException('Checkup non trovato');
    }
    const client = await this.clientRepository.findOne({ where: { id: preassessment.clientId } });
    if (!client) {
      throw new NotFoundException('Cliente non trovato');
    }
    return { preassessment, client };
  }

  private async ensureAccessByPreassessment(currentUser: CheckupCurrentUserData, preassessmentId: string) {
    const { preassessment, client } = await this.getClientForPreassessment(preassessmentId);
    await this.ensureAccess(currentUser, client.id);
    return { preassessment, client };
  }

  async getPreassessmentForDocuments(preassessmentId: string, currentUser: CheckupCurrentUserData) {
    return this.ensureAccessByPreassessment(currentUser, preassessmentId);
  }

  private cleanupPresence(preassessmentId: string) {
    const map = this.presenceByPreassessment.get(preassessmentId);
    if (!map) return;
    const now = Date.now();
    for (const [fieldId, entry] of map.entries()) {
      if (entry.expiresAt < now) {
        map.delete(fieldId);
      }
    }
    if (map.size === 0) {
      this.presenceByPreassessment.delete(preassessmentId);
    }
  }

  async getPresence(preassessmentId: string, currentUser: CheckupCurrentUserData) {
    await this.ensureAccessByPreassessment(currentUser, preassessmentId);
    this.cleanupPresence(preassessmentId);
    const map = this.presenceByPreassessment.get(preassessmentId);
    const fields = map
      ? Array.from(map.entries()).map(([fieldId, entry]) => ({
        fieldId,
        userId: entry.userId,
        name: entry.name,
      }))
      : [];
    return { fields };
  }

  async getOnline(currentUser: CheckupCurrentUserData) {
    const now = Date.now();
    const activeIds = Array.from(this.presenceByPreassessment.entries())
      .filter(([_, map]) => Array.from(map.values()).some((v) => v.expiresAt > now))
      .map(([id]) => id);
    if (activeIds.length === 0) return { preassessmentIds: [] };

    if (currentUser.ruolo === 'cliente') {
      if (!currentUser.clientId) return { preassessmentIds: [] };
      const mine = await this.preassessmentRepository.findOne({ where: { clientId: currentUser.clientId } });
      return { preassessmentIds: mine ? [mine.id] : [] };
    }

    if (!currentUser.studioId) return { preassessmentIds: [] };
    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (!license) return { preassessmentIds: [] };
    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, attiva: true },
    });
    const clientIds = new Set(sublicenses.map((s) => s.clientId).filter(Boolean) as string[]);
    if (clientIds.size === 0) return { preassessmentIds: [] };

    const preassessments = await this.preassessmentRepository.find({
      where: activeIds.map((id) => ({ id })),
    });
    const filtered = preassessments.filter((p) => clientIds.has(p.clientId)).map((p) => p.id);
    return { preassessmentIds: filtered };
  }

  async setPresenceActive(preassessmentId: string, fieldId: string, currentUser: CheckupCurrentUserData) {
    const { preassessment } = await this.ensureAccessByPreassessment(currentUser, preassessmentId);
    const isOwner = currentUser.clientId && currentUser.clientId === preassessment.clientId;
    const canEdit = !!isOwner || preassessment.studioCanEdit;
    if (!canEdit) {
      throw new ForbiddenException('Modifiche non autorizzate');
    }

    const map = this.presenceByPreassessment.get(preassessmentId) || new Map();
    const now = Date.now();
    const existing = map.get(fieldId);
    if (existing && existing.userId !== currentUser.id && existing.expiresAt > now) {
      throw new ForbiddenException('Campo in modifica da altro utente');
    }
    map.set(fieldId, {
      userId: currentUser.id,
      name: `${currentUser.nome} ${currentUser.cognome}`.trim() || currentUser.email,
      expiresAt: now + 10000,
    });
    this.presenceByPreassessment.set(preassessmentId, map);
    return { ok: true };
  }

  async setPresenceInactive(preassessmentId: string, fieldId: string, currentUser: CheckupCurrentUserData) {
    await this.ensureAccessByPreassessment(currentUser, preassessmentId);
    const map = this.presenceByPreassessment.get(preassessmentId);
    const entry = map?.get(fieldId);
    if (entry && entry.userId === currentUser.id) {
      map?.delete(fieldId);
    }
    this.cleanupPresence(preassessmentId);
    return { ok: true };
  }

  async getClient(clientId: string, currentUser: CheckupCurrentUserData) {
    const client = await this.clientRepository.findOne({ where: { id: clientId, attivo: true } });
    if (!client) {
      throw new NotFoundException('Cliente non trovato');
    }

    await this.ensureAccess(currentUser, client.id);
    const preassessment = await this.getOrCreateByClientId(client.id, currentUser);
    return {
      client: {
        id: client.id,
        nome: client.ragioneSociale || client.nome,
        cognome: '',
        email: client.email,
        azienda: client.ragioneSociale || client.nome,
        studioId: null,
        studioNome: null,
      },
      preassessment,
    };
  }

  async updateClient(clientId: string, dto: UpdatePreassessmentDto, currentUser: CheckupCurrentUserData) {
    const client = await this.clientRepository.findOne({ where: { id: clientId, attivo: true } });
    if (!client) {
      throw new NotFoundException('Cliente non trovato');
    }

    await this.ensureAccess(currentUser, client.id);
    const record = await this.getOrCreateByClientId(client.id, currentUser);

    if (!record.studioCanEdit) {
      throw new ForbiddenException('Modifiche non autorizzate dal cliente');
    }

    this.applyFieldMeta(record, dto.data, dto.naFields, currentUser);
    if (dto.data !== undefined) record.data = dto.data;
    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.fieldNotes !== undefined) record.fieldNotes = dto.fieldNotes;
    if (dto.naFields !== undefined) record.naFields = dto.naFields;
    if (dto.studioCanEdit !== undefined) {
      throw new ForbiddenException('Solo il cliente può modificare questa autorizzazione');
    }

    return this.preassessmentRepository.save(record);
  }

  async listClients(currentUser: CheckupCurrentUserData) {
    if (!currentUser.studioId) return [];

    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (!license) return [];

    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, attiva: true, clientId: Not(IsNull()) },
    });
    const clientIds = sublicenses.map((s) => s.clientId!).filter(Boolean);
    if (clientIds.length === 0) return [];

    const clients = await this.clientRepository.find({
      where: { id: In(clientIds), attivo: true },
      order: { nome: 'ASC' },
    });

    if (clients.length === 0) {
      return [];
    }

    const preassessments = await this.preassessmentRepository.find({
      where: clients.map((client) => ({ clientId: client.id })),
    });

    const byClientId = new Map(preassessments.map((p) => [p.clientId, p]));

    return clients.map((client) => {
      const pre = byClientId.get(client.id) || null;
      const azienda = client.ragioneSociale || client.nome;
      return {
        client: {
          id: client.id,
          nome: azienda,
          cognome: '',
          email: client.email,
          azienda,
          studioId: null,
          studioNome: null,
        },
        preassessment: pre
          ? {
            id: pre.id,
            updatedAt: pre.updatedAt,
            studioCanEdit: pre.studioCanEdit,
            data: pre.data,
          }
          : null,
      };
    });
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
    });
    await browser.close();
    return Buffer.from(pdf);
  }
}
