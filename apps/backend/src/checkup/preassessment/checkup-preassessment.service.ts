import { Injectable, ForbiddenException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupPreassessmentAlert } from './checkup-preassessment-alert.entity';
import { UpdatePreassessmentDto } from './dto/update-preassessment.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { EmailService } from '../../notifications/email.service';
import { QuestionManagementService } from '../services/question-management.service';
import puppeteer from 'puppeteer';
import sanitizeHtml from 'sanitize-html';

/** Hard cap on the number of preassessment IDs tracked simultaneously in memory. */
const PRESENCE_MAP_SIZE_CAP = 10_000;

@Injectable()
export class CheckupPreassessmentService {
  private readonly logger = new Logger(CheckupPreassessmentService.name);
  private presenceByPreassessment = new Map<string, Map<string, { userId: string; name: string; expiresAt: number }>>();

  // Mutex per-campo per evitare race condition su setPresenceActive
  private presenceMutexes = new Map<string, Promise<void>>();

  private async withPresenceLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const lock = new Promise<void>((resolve) => { release = resolve; });
    const prev = this.presenceMutexes.get(key) ?? Promise.resolve();
    this.presenceMutexes.set(key, prev.then(() => lock));
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.presenceMutexes.get(key) === lock) {
        this.presenceMutexes.delete(key);
      }
    }
  }

  constructor(
    @InjectRepository(CheckupPreassessment)
    private preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupPreassessmentAlert)
    private alertRepository: Repository<CheckupPreassessmentAlert>,
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
    @InjectRepository(CheckupClient)
    private clientRepository: Repository<CheckupClient>,
    private emailService: EmailService,
    private questionManagementService: QuestionManagementService,
  ) {}

  private static OWNER_EMAIL_BY_MACRO: Record<string, string> = {
    a: 'owner_a_email',
    b: 'owner_b_email',
    c: 'owner_c_email',
    d: 'owner_d_email',
    e: 'owner_e_email',
    f: 'owner_f_email',
    g: 'owner_g_email',
    h: 'owner_h_email',
    i: 'owner_i_email',
    j: 'owner_j_email',
  };

  private isOwnerMacroArea(code: string, label?: string | null) {
    if (code === 'k') return true;
    if (label && label.toLowerCase().includes('owner')) return true;
    return false;
  }

  private async getSectionMetaByModel(modelId: string) {
    const structure = await this.questionManagementService.getCompleteStructure(modelId);
    const map = new Map<string, { macroId: string; requiredFields: string[] }>();
    structure.forEach((macro) => {
      const macroId = macro.code;
      (macro.sections || []).forEach((section) => {
        const requiredFields = (section.fields || [])
          .filter((field) => field.required)
          .map((field) => field.fieldId);
        map.set(section.code, { macroId, requiredFields });
      });
    });
    return map;
  }

  private isOwnerForMacro(record: CheckupPreassessment, user: CheckupCurrentUserData, macroId: string) {
    if (user.ruolo !== 'cliente') return false;
    const field = CheckupPreassessmentService.OWNER_EMAIL_BY_MACRO[macroId];
    if (!field) return false;
    const ownerEmail = (record.data?.[field] || '').trim().toLowerCase();
    return ownerEmail !== '' && ownerEmail === user.email.toLowerCase();
  }

  private async getOrCreateByClientId(clientId: string, currentUser: CheckupCurrentUserData): Promise<CheckupPreassessment> {
    const clientExists = await this.clientRepository.findOne({ where: { id: clientId, attivo: true } });
    if (!clientExists) {
      throw new NotFoundException('Cliente non trovato');
    }
    const existing = await this.preassessmentRepository.findOne({ where: { clientId, isLatest: true } });
    if (existing) return existing;

    const created = this.preassessmentRepository.create({
      userId: currentUser.id,
      clientId,
      data: {},
      notes: {},
      fieldNotes: {},
      userFieldNotes: {},
      naFields: {},
      macroValidations: {},
      sectionValidations: {},
      studioCanEdit: false,
      status: 'in_progress',
      completedAt: null,
      completedById: null,
      version: 1,
      parentId: null,
      isLatest: true,
    });

    return this.preassessmentRepository.save(created);
  }

  async createNewVersion(clientId: string, currentUser: CheckupCurrentUserData): Promise<CheckupPreassessment> {
    await this.ensureAccess(currentUser, clientId);

    const current = await this.preassessmentRepository.findOne({ where: { clientId, isLatest: true } });
    if (!current) {
      throw new NotFoundException('Preassessment non trovato');
    }

    current.isLatest = false;
    await this.preassessmentRepository.save(current);

    const newVersion = this.preassessmentRepository.create({
      userId: currentUser.id,
      clientId,
      data: {},
      notes: {},
      fieldNotes: {},
      userFieldNotes: {},
      naFields: {},
      macroValidations: {},
      sectionValidations: {},
      studioCanEdit: false,
      status: 'in_progress',
      completedAt: null,
      completedById: null,
      version: current.version + 1,
      parentId: current.id,
      isLatest: true,
    });

    return this.preassessmentRepository.save(newVersion);
  }

  async getHistory(clientId: string, currentUser: CheckupCurrentUserData) {
    await this.ensureAccess(currentUser, clientId);

    return this.preassessmentRepository.find({
      where: { clientId },
      order: { version: 'DESC' },
      select: ['id', 'version', 'status', 'createdAt', 'updatedAt', 'completedAt', 'isLatest', 'parentId'],
    });
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

    if (user.ruolo === 'cliente' && record.status === 'concluso') {
      throw new ForbiddenException('Il checkup è concluso e non può più essere modificato');
    }

    // Owner email fields (owner_*_email) must NOT be modifiable by cliente role.
    // Capture them from the existing record BEFORE any data update so that
    // isOwnerForMacro always checks the staff-assigned values, not what the
    // client just sent.
    const ownerEmailFields = new Set(Object.values(CheckupPreassessmentService.OWNER_EMAIL_BY_MACRO));
    const frozenOwnerEmails: Record<string, string> = {};
    for (const field of ownerEmailFields) {
      const existing = record.data?.[field];
      if (existing !== undefined) frozenOwnerEmails[field] = existing;
    }

    this.applyFieldMeta(record, dto.data, dto.naFields, user);
    if (dto.data !== undefined) {
      if (user.ruolo === 'cliente') {
        // Merge incoming data but preserve all owner email fields from the DB
        const sanitized = { ...dto.data };
        for (const field of ownerEmailFields) {
          if (frozenOwnerEmails[field] !== undefined) {
            sanitized[field] = frozenOwnerEmails[field];
          } else {
            delete sanitized[field];
          }
        }
        record.data = sanitized;
      } else {
        record.data = dto.data;
      }
    }
    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.fieldNotes !== undefined && user.ruolo !== 'cliente') {
      record.fieldNotes = dto.fieldNotes;
    }
    if (dto.userFieldNotes !== undefined && user.ruolo === 'cliente') {
      record.userFieldNotes = dto.userFieldNotes;
    }
    if (dto.naFields !== undefined) record.naFields = dto.naFields;
    if (dto.macroValidations !== undefined && user.ruolo === 'cliente') {
      const prev = record.macroValidations || {};
      const next = dto.macroValidations || {};
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      // Build a temporary record snapshot using frozen owner emails for the check
      const recordForOwnerCheck = {
        ...record,
        data: { ...(record.data || {}), ...frozenOwnerEmails },
      } as CheckupPreassessment;
      for (const key of keys) {
        const prevVal = prev[key];
        const nextVal = next[key];
        if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
          if (!this.isOwnerForMacro(recordForOwnerCheck, user, key)) {
            throw new ForbiddenException('Solo l\'owner può validare la macro area');
          }
        }
      }
      record.macroValidations = next;
    }
    let completionStudioId: string | null = null;
    if (dto.sectionValidations !== undefined && user.ruolo === 'cliente') {
      const prev = record.sectionValidations || {};
      const next = dto.sectionValidations || {};
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      const { modelId, studioId } = await this.resolveModelIdForClient(record.clientId);
      const sectionMeta = await this.getSectionMetaByModel(modelId);
      const recordForOwnerCheck = {
        ...record,
        data: { ...(record.data || {}), ...frozenOwnerEmails },
      } as CheckupPreassessment;

      for (const key of keys) {
        const prevVal = prev[key];
        const nextVal = next[key];
        if (JSON.stringify(prevVal) === JSON.stringify(nextVal)) continue;
        const meta = sectionMeta.get(key);
        if (!meta) {
          throw new NotFoundException('Sezione non trovata per la validazione');
        }
        if (!this.isOwnerForMacro(recordForOwnerCheck, user, meta.macroId)) {
          throw new ForbiddenException('Solo l\'owner può validare la sezione');
        }
        if (nextVal) {
          const data = record.data || {};
          const naFields = record.naFields || {};
          const required = meta.requiredFields || [];
          const total = required.filter((fieldId) => !naFields[fieldId]).length;
          const done = required.filter((fieldId) => !naFields[fieldId] && (data[fieldId] || '').trim() !== '').length;
          if (total > 0 && done < total) {
            throw new ForbiddenException('La sezione non è completa');
          }
        }
      }

      record.sectionValidations = next;

      const sectionsToValidate = Array.from(sectionMeta.entries())
        .filter(([_, meta]) => !this.isOwnerMacroArea(meta.macroId))
        .map(([sectionId]) => sectionId);
      if (sectionsToValidate.length > 0) {
        const allValidated = sectionsToValidate.every((sectionId) => next[sectionId]);
        if (allValidated && record.status !== 'concluso') {
          record.status = 'concluso';
          record.completedAt = new Date();
          record.completedById = user.id;
          completionStudioId = studioId;
        }
      }
    }
    if (dto.studioCanEdit !== undefined) record.studioCanEdit = dto.studioCanEdit;

    const saved = await this.preassessmentRepository.save(record);

    // Notifica completamento: email + alert agli admin_studio del licenziatario
    if (completionStudioId) {
      const client = await this.clientRepository.findOne({ where: { id: record.clientId } });
      if (client) {
        this.notifyCompletion(saved, client, user, completionStudioId).catch((err) =>
          this.logger.error(`notifyCompletion failed: ${err?.message}`),
        );
      }
    }

    return saved;
  }

  private async resolveModelIdForClient(clientId: string) {
    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId, attiva: true },
    });
    if (!sublicense) {
      throw new NotFoundException('Sottolicenza non trovata');
    }
    const license = await this.licenseRepository.findOne({
      where: { id: sublicense.licenseId },
      relations: ['model', 'studio'],
    });
    const modelId = sublicense.modelId || license?.modelId || null;
    if (!license || !modelId) {
      throw new ConflictException('Licenza senza modello associato');
    }
    return { modelId, studioId: license.studioId, license };
  }

  private async notifyCompletion(
    preassessment: CheckupPreassessment,
    client: CheckupClient,
    user: CheckupCurrentUserData,
    studioId: string | null,
  ) {
    if (!studioId) return;
    const admins = await this.userRepository.find({
      where: { studioId, ruolo: 'admin_studio', attivo: true },
    });
    const requester = `${user.nome} ${user.cognome}`.trim() || user.email;
    const company = client.nome || client.ragioneSociale || 'Cliente';
    const completedAt = new Date().toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const subject = `✅ Checkup concluso — ${company}`;
    const text = `Il checkup di ${company} è stato completato da ${requester} in data ${completedAt}.`;
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px">
        <div style="background:#1e3a8a;border-radius:8px;padding:20px 24px;margin-bottom:24px">
          <h2 style="color:#fff;margin:0;font-size:18px">Checkup Governance · Pre-Assessment</h2>
        </div>
        <h3 style="color:#0f172a;margin:0 0 8px">✅ Checkup concluso</h3>
        <p style="color:#334155;margin:0 0 16px;font-size:15px">
          Il pre-assessment per <strong>${company}</strong> è stato completato con successo.
        </p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
          <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Cliente</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;font-size:13px">${company}</td></tr>
          <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Completato da</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a;font-size:13px">${requester}</td></tr>
          <tr><td style="padding:10px 16px;color:#64748b;font-size:13px">Data</td><td style="padding:10px 16px;font-weight:600;color:#0f172a;font-size:13px">${completedAt}</td></tr>
        </table>
        <p style="color:#64748b;font-size:12px;margin-top:24px;text-align:center">
          Accedi alla piattaforma Checkup per visualizzare il report completo.
        </p>
      </div>`;

    await Promise.all(
      admins.map(async (admin) => {
        if (admin.email) {
          await this.emailService.sendEmail({
            to: admin.email,
            subject,
            text,
            html,
          });
        }
        const alert = this.alertRepository.create({
          preassessmentId: preassessment.id,
          createdById: user.id,
          targetUserId: admin.id,
          priority: 'info',
          messaggio: text,
        });
        await this.alertRepository.save(alert);
      }),
    );
  }

  async complete(user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente') {
      throw new ForbiddenException('Solo il cliente può concludere il checkup');
    }
    if (!user.clientId) {
      throw new ForbiddenException('Cliente non associato');
    }

    const record = await this.getOrCreate(user);
    if (record.status === 'concluso') {
      return record;
    }

    const { modelId, studioId } = await this.resolveModelIdForClient(user.clientId);
    const macroAreas = await this.questionManagementService.getAllMacroAreas(modelId);
    const expectedMacros = macroAreas
      .filter((m) => !this.isOwnerMacroArea(m.code, m.label))
      .map((m) => m.code);
    const validations = record.macroValidations || {};
    const missing = expectedMacros.filter((m) => !validations[m]);
    if (missing.length > 0) {
      throw new ConflictException('Non tutte le macro aree sono validate');
    }

    record.status = 'concluso';
    record.completedAt = new Date();
    record.completedById = user.id;
    const saved = await this.preassessmentRepository.save(record);

    const client = await this.clientRepository.findOne({ where: { id: user.clientId } });
    if (client) {
      await this.notifyCompletion(saved, client, user, studioId);
    }

    return saved;
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

  async getPreassessmentForReport(preassessmentId: string, currentUser: CheckupCurrentUserData) {
    return this.ensureAccessByPreassessment(currentUser, preassessmentId);
  }

  private async resolveAllowDocuments(clientId: string): Promise<boolean> {
    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId, attiva: true },
    });
    return sublicense?.allowDocuments ?? true;
  }

  async getPreassessmentForDocuments(preassessmentId: string, currentUser: CheckupCurrentUserData) {
    const { preassessment, client } = await this.ensureAccessByPreassessment(currentUser, preassessmentId);
    const allowDocuments = await this.resolveAllowDocuments(client.id);
    return { preassessment, client, allowDocuments };
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

  /**
   * Global presence cleanup — runs every 5 minutes.
   * Iterates ALL tracked preassessments and removes expired entries.
   * Prevents unbounded memory growth over long server uptime.
   */
  @Cron('*/5 * * * *')
  cleanupAllPresence() {
    const now = Date.now();
    let removed = 0;
    for (const [preassessmentId, map] of this.presenceByPreassessment.entries()) {
      for (const [fieldId, entry] of map.entries()) {
        if (entry.expiresAt < now) {
          map.delete(fieldId);
          removed++;
        }
      }
      if (map.size === 0) {
        this.presenceByPreassessment.delete(preassessmentId);
      }
    }
    if (removed > 0) {
      this.logger.debug(`Presence cleanup: removed ${removed} expired entries. Active preassessments: ${this.presenceByPreassessment.size}`);
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

    // Guard against unbounded map growth
    if (!this.presenceByPreassessment.has(preassessmentId) &&
        this.presenceByPreassessment.size >= PRESENCE_MAP_SIZE_CAP) {
      this.logger.warn(`Presence map size cap reached (${PRESENCE_MAP_SIZE_CAP}). Ignoring setPresenceActive for preassessment ${preassessmentId}`);
      return { ok: true };
    }

    // Mutex per-campo: garantisce atomicità del check-and-set anche con async/await
    const lockKey = `${preassessmentId}:${fieldId}`;
    return this.withPresenceLock(lockKey, async () => {
      const map = this.presenceByPreassessment.get(preassessmentId) || new Map();
      const now = Date.now();
      const existing = map.get(fieldId);
      if (existing && existing.userId !== currentUser.id && existing.expiresAt > now) {
        throw new ForbiddenException('Campo in modifica da altro utente');
      }
      map.set(fieldId, {
        userId: currentUser.id,
        name: `${currentUser.nome} ${currentUser.cognome}`.trim() || currentUser.email,
        expiresAt: now + 30000, // 30s: più ragionevole di 10s
      });
      this.presenceByPreassessment.set(preassessmentId, map);
      return { ok: true };
    });
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
    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId: client.id, attiva: true },
    });
    return {
      client: {
        id: client.id,
        nome: client.ragioneSociale || client.nome,
        cognome: '',
        email: client.email,
        azienda: client.ragioneSociale || client.nome,
        studioId: null,
        studioNome: null,
        sublicense: sublicense
          ? {
              id: sublicense.id,
              modelId: sublicense.modelId,
              allowDocuments: sublicense.allowDocuments,
            }
          : null,
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
      const hasOtherUpdates =
        dto.data !== undefined ||
        dto.notes !== undefined ||
        dto.naFields !== undefined ||
        dto.macroValidations !== undefined ||
        dto.studioCanEdit !== undefined ||
        dto.userFieldNotes !== undefined;
      if (hasOtherUpdates) {
        throw new ForbiddenException('Modifiche non autorizzate dal cliente');
      }
      if (dto.fieldNotes === undefined) {
        throw new ForbiddenException('Modifiche non autorizzate dal cliente');
      }
    }

    this.applyFieldMeta(record, dto.data, dto.naFields, currentUser);
    if (dto.data !== undefined) record.data = dto.data;
    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.fieldNotes !== undefined) record.fieldNotes = dto.fieldNotes;
    if (dto.userFieldNotes !== undefined) {
      throw new ForbiddenException('Solo il cliente può modificare le note utente');
    }
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
      where: clients.map((client) => ({ clientId: client.id, isLatest: true })),
    });

    const byClientId = new Map(preassessments.map((p) => [p.clientId, p]));

    return clients.map((client) => {
      const pre = byClientId.get(client.id) || null;
      const sublicense = sublicenses.find((s) => s.clientId === client.id) || null;
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
          sublicense: sublicense
            ? {
                id: sublicense.id,
                modelId: sublicense.modelId,
                allowDocuments: sublicense.allowDocuments,
              }
            : null,
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

  /**
   * Sanitizes HTML with a strict allowlist before passing it to Puppeteer.
   * Uses sanitize-html (allowlist-based) instead of regex for robust XSS/SSRF
   * prevention: blocks event handlers, dangerous tags (script, iframe, object,
   * svg, embed, form), data:/javascript: URIs, and external resources.
   * Puppeteer request interception provides a second layer of defence.
   */
  private sanitizeHtmlForPdf(html: string): string {
    return sanitizeHtml(html, {
      // Allow only presentational and structural tags needed for PDF rendering
      allowedTags: [
        'html', 'head', 'body', 'title', 'style',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr', 'div', 'span', 'section', 'article', 'main',
        'header', 'footer', 'nav', 'aside',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
        'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small',
        'sub', 'sup', 'code', 'pre', 'blockquote', 'q', 'abbr', 'cite',
        'img',       // data: URIs allowed below for inline images
        'figure', 'figcaption',
        'a',         // href restricted below
        'meta',      // charset only
      ],
      allowedAttributes: {
        '*': ['class', 'id', 'style'],
        'a': ['href'],          // only safe schemes allowed below
        'img': ['src', 'alt', 'width', 'height'],
        'td': ['colspan', 'rowspan'],
        'th': ['colspan', 'rowspan', 'scope'],
        'table': ['border', 'cellpadding', 'cellspacing', 'width'],
        'meta': ['charset'],
      },
      // Allow only safe URI schemes — block javascript:, vbscript:, file:, http/https (SSRF)
      allowedSchemes: ['data'],          // data: URIs for inline images/fonts only
      allowedSchemesByTag: {
        'a': ['mailto'],                 // links can only be mailto: (no http/https external)
      },
      // Strip all inline event handlers (onclick, onload, onerror, …)
      allowedStyles: {
        '*': {
          // Allow common CSS properties; block url() to prevent external resource loading
          'color': [/.*/],
          'background-color': [/.*/],
          'font-size': [/.*/],
          'font-weight': [/.*/],
          'font-family': [/.*/],
          'text-align': [/.*/],
          'text-decoration': [/.*/],
          'border': [/.*/],
          'border-radius': [/.*/],
          'padding': [/.*/],
          'margin': [/.*/],
          'width': [/.*/],
          'height': [/.*/],
          'max-width': [/.*/],
          'display': [/.*/],
          'flex': [/.*/],
          'flex-direction': [/.*/],
          'align-items': [/.*/],
          'justify-content': [/.*/],
          'gap': [/.*/],
          'page-break-after': [/.*/],
          'page-break-before': [/.*/],
          'page-break-inside': [/.*/],
        },
      },
      // Disallow dangerous tags entirely — svg, script, iframe, object, embed, form, input, …
      disallowedTagsMode: 'discard',
    });
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const safeHtml = this.sanitizeHtmlForPdf(html);
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
      ],
    });
    try {
      const page = await browser.newPage();

      // Block all network requests except data URIs (needed for inline images/fonts)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        const url = req.url();
        // Allow data: URIs for fonts/images; block everything else that goes to network
        if (url.startsWith('data:') || resourceType === 'document') {
          req.continue();
        } else {
          req.abort();
        }
      });

      await page.setContent(safeHtml, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      });
      return Buffer.from(pdf);
    } finally {
      // Always close the browser to prevent Chromium process leaks
      await browser.close();
    }
  }
}
