import { Injectable, ForbiddenException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { UpdatePreassessmentDto } from './dto/update-preassessment.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { QuestionManagementService } from '../services/question-management.service';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { CheckupPreassessmentNotificationsService } from './checkup-preassessment-notifications.service';
import { CheckupPreassessmentRenderService } from './checkup-preassessment-render.service';

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
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
    @InjectRepository(CheckupClient)
    private clientRepository: Repository<CheckupClient>,
    private questionManagementService: QuestionManagementService,
    private auditLogService: CheckupAuditLogService,
    private preassessmentNotificationsService: CheckupPreassessmentNotificationsService,
    private preassessmentRenderService: CheckupPreassessmentRenderService,
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

  private async getStructureMetaByModel(modelId: string) {
    const structure = await this.questionManagementService.getCompleteStructure(modelId);
    const sectionMeta = new Map<string, { macroId: string; requiredFields: string[] }>();
    const fieldToMacro = new Map<string, string>();

    structure.forEach((macro) => {
      const macroId = macro.code;
      (macro.sections || []).forEach((section) => {
        const requiredFields = (section.fields || [])
          .filter((field) => field.required)
          .map((field) => field.fieldId);
        sectionMeta.set(section.code, { macroId, requiredFields });
        (section.fields || []).forEach((field) => {
          fieldToMacro.set(field.fieldId, macroId);
        });
      });
    });

    return { sectionMeta, fieldToMacro };
  }

  private normalizeMacroAssignments(assignments?: string[] | null) {
    return Array.from(
      new Set(
        (assignments || [])
          .map((value) => value?.trim())
          .filter((value): value is string => !!value),
      ),
    );
  }

  private mergeAllowedFieldValues<T extends string | boolean>(
    existing: Record<string, T> | null | undefined,
    incoming: Record<string, T> | undefined,
    fieldToMacro: Map<string, string>,
    allowedMacros: Set<string> | null,
  ) {
    if (incoming === undefined) return undefined;
    if (!allowedMacros) return incoming;

    const merged = { ...(existing || {}) };
    Object.entries(incoming).forEach(([fieldId, value]) => {
      const macroId = fieldToMacro.get(fieldId);
      if (macroId && allowedMacros.has(macroId)) {
        merged[fieldId] = value;
      }
    });
    return merged;
  }

  private isOwnerForMacro(record: CheckupPreassessment, user: CheckupCurrentUserData, macroId: string) {
    if (user.ruolo !== 'cliente') return false;
    const field = CheckupPreassessmentService.OWNER_EMAIL_BY_MACRO[macroId];
    if (!field) return false;
    const ownerEmail = (record.data?.[field] || '').trim().toLowerCase();
    return ownerEmail !== '' && ownerEmail === user.email.toLowerCase();
  }

  private isSuperOwner(user: CheckupCurrentUserData) {
    return user.ruolo === 'cliente' && Boolean(user.superOwner);
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
      finalValidation: null,
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
      finalValidation: null,
      studioCanEdit: false,
      status: 'in_progress',
      completedAt: null,
      completedById: null,
      version: current.version + 1,
      parentId: current.id,
      isLatest: true,
    });

    const saved = await this.preassessmentRepository.save(newVersion);
    const notificationContext = await this.buildNotificationContext(clientId, saved.id, currentUser.studioId);
    this.auditLogService.log({
      userId: currentUser.id,
      userEmail: currentUser.email,
      userRole: currentUser.ruolo,
      action: 'CREATE',
      entityType: 'PREASSESSMENT',
      entityId: saved.id,
      entityName: notificationContext.clientName,
      description: `Nuova versione del checkup creata (v${saved.version})`,
      studioId: notificationContext.studioId ?? undefined,
      success: true,
      metadata: {
        clientId: notificationContext.clientId,
        clientName: notificationContext.clientName,
        preassessmentId: notificationContext.preassessmentId,
        actionUrl: notificationContext.actionUrl,
        actorName: `${currentUser.nome} ${currentUser.cognome}`.trim() || currentUser.email,
      },
    }).catch(() => {});
    return saved;
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

    const assignedMacroAreas =
      user.ruolo === 'cliente' && !this.isSuperOwner(user) ? this.normalizeMacroAssignments(user.macroAreaAssignments) : [];
    const allowedClientMacros = assignedMacroAreas.length > 0 ? new Set(assignedMacroAreas) : null;
    let sectionMeta: Map<string, { macroId: string; requiredFields: string[] }> | null = null;
    let fieldToMacro: Map<string, string> | null = null;

    if (
      user.ruolo === 'cliente' &&
      allowedClientMacros &&
      record.clientId &&
      (
        dto.data !== undefined ||
        dto.naFields !== undefined ||
        dto.userFieldNotes !== undefined ||
        dto.sectionValidations !== undefined
      )
    ) {
      const { modelId } = await this.resolveModelIdForClient(record.clientId);
      const structureMeta = await this.getStructureMetaByModel(modelId);
      sectionMeta = structureMeta.sectionMeta;
      fieldToMacro = structureMeta.fieldToMacro;
    }

    const nextData =
      user.ruolo === 'cliente' && fieldToMacro
        ? this.mergeAllowedFieldValues(record.data || {}, dto.data, fieldToMacro, allowedClientMacros)
        : dto.data;
    const nextNaFields =
      user.ruolo === 'cliente' && fieldToMacro
        ? this.mergeAllowedFieldValues(record.naFields || {}, dto.naFields, fieldToMacro, allowedClientMacros)
        : dto.naFields;
    const nextUserFieldNotes =
      user.ruolo === 'cliente' && fieldToMacro
        ? this.mergeAllowedFieldValues(record.userFieldNotes || {}, dto.userFieldNotes, fieldToMacro, allowedClientMacros)
        : dto.userFieldNotes;

    this.applyFieldMeta(record, nextData, nextNaFields, user);
    if (nextData !== undefined) {
      if (user.ruolo === 'cliente') {
        // Merge incoming data but preserve all owner email fields from the DB
        const sanitized = { ...nextData };
        for (const field of ownerEmailFields) {
          if (frozenOwnerEmails[field] !== undefined) {
            sanitized[field] = frozenOwnerEmails[field];
          } else {
            delete sanitized[field];
          }
        }
        record.data = sanitized;
      } else {
        record.data = nextData;
      }
    }
    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.fieldNotes !== undefined && user.ruolo !== 'cliente') {
      record.fieldNotes = dto.fieldNotes;
    }
    if (nextUserFieldNotes !== undefined && user.ruolo === 'cliente') {
      record.userFieldNotes = nextUserFieldNotes;
    }
    if (nextNaFields !== undefined) record.naFields = nextNaFields;
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
          if (allowedClientMacros && !allowedClientMacros.has(key)) {
            throw new ForbiddenException('Utente non assegnato alla macro area');
          }
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
      let studioId: string | null = null;
      if (!sectionMeta) {
        const resolved = await this.resolveModelIdForClient(record.clientId);
        studioId = resolved.studioId;
        sectionMeta = await this.getSectionMetaByModel(resolved.modelId);
      } else {
        const resolved = await this.resolveModelIdForClient(record.clientId);
        studioId = resolved.studioId;
      }
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
        if (allowedClientMacros && !allowedClientMacros.has(meta.macroId)) {
          throw new ForbiddenException('Utente non assegnato alla macro area');
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

      // Log esplicito per ogni sezione appena validata
      const newlyValidated = Array.from(keys).filter((k) => !prev[k] && next[k]);
      if (newlyValidated.length > 0) {
        const notificationContext = await this.buildNotificationContext(record.clientId, record.id, completionStudioId);
        const sectionNames = newlyValidated.join(', ');
        this.auditLogService.log({
          userId: user.id,
          userEmail: user.email,
          userRole: user.ruolo,
          action: 'UPDATE',
          entityType: 'PREASSESSMENT',
          entityId: record.id,
          entityName: notificationContext.clientName,
          description: `Sezione${newlyValidated.length > 1 ? 'i' : ''} validat${newlyValidated.length > 1 ? 'e' : 'a'}: ${sectionNames}`,
          studioId: notificationContext.studioId ?? undefined,
          success: true,
          metadata: {
            validatedSections: newlyValidated,
            clientId: notificationContext.clientId,
            clientName: notificationContext.clientName,
            preassessmentId: notificationContext.preassessmentId,
            actionUrl: notificationContext.actionUrl,
            actorName: `${user.nome} ${user.cognome}`.trim() || user.email,
          },
        }).catch(() => {});
      }

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
        this.preassessmentNotificationsService.notifyCompletion(saved, client, user, completionStudioId).catch((err) =>
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

  private async buildNotificationContext(clientId: string, preassessmentId: string, studioId?: string | null) {
    const client = await this.clientRepository.findOne({ where: { id: clientId } });
    const resolvedStudioId = studioId ?? (await this.resolveModelIdForClient(clientId)).studioId;
    const clientName = client?.ragioneSociale || client?.nome || 'Cliente';
    return {
      studioId: resolvedStudioId,
      clientId,
      preassessmentId,
      clientName,
      actionUrl: `/checkup/clienti/${clientId}`,
    };
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
      await this.preassessmentNotificationsService.notifyCompletion(saved, client, user, studioId);
    }

    return saved;
  }

  async finalValidate(user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente' || !user.clientId) {
      throw new ForbiddenException('Solo un utente cliente può validare il checkup');
    }
    if (!user.superOwner) {
      throw new ForbiddenException('Solo il Super-owner può validare il checkup');
    }

    const record = await this.getOrCreate(user);
    if (record.finalValidation) {
      throw new ConflictException('Il checkup è già stato validato dal Super-owner');
    }

    const { modelId, studioId } = await this.resolveModelIdForClient(user.clientId);
    const macroAreas = await this.questionManagementService.getAllMacroAreas(modelId);
    const validatableMacros = macroAreas.filter((m) => !this.isOwnerMacroArea(m.code, m.label));
    const expectedMacros = validatableMacros.map((m) => m.code);
    const structureMeta = await this.getStructureMetaByModel(modelId);
    const expectedSections = Array.from(structureMeta.sectionMeta.entries())
      .filter(([_, meta]) => !this.isOwnerMacroArea(meta.macroId))
      .map(([sectionId]) => sectionId);

    const missingMacros = expectedMacros.filter((macroId) => !(record.macroValidations || {})[macroId]);
    if (missingMacros.length > 0) {
      throw new ConflictException('Per la validazione finale tutte le macro aree devono essere validate');
    }

    const missingSections = expectedSections.filter((sectionId) => !(record.sectionValidations || {})[sectionId]);
    if (missingSections.length > 0) {
      throw new ConflictException('Per la validazione finale tutte le sezioni devono essere validate');
    }

    const name = `${user.nome} ${user.cognome}`.trim() || user.email;
    record.status = 'concluso';
    record.finalValidation = {
      by: { id: user.id, name, ruolo: user.ruolo },
      at: new Date().toISOString(),
    };
    if (!record.completedAt) {
      record.completedAt = new Date();
      record.completedById = user.id;
    }
    const saved = await this.preassessmentRepository.save(record);

    const client = await this.clientRepository.findOne({ where: { id: user.clientId } });
    if (client) {
      await this.preassessmentNotificationsService.notifyFinalValidation(saved, client, user, studioId);
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
            status: pre.status,
            data: pre.data,
            sectionValidationsCount: Object.keys(pre.sectionValidations || {}).length,
            finalValidationAt: pre.finalValidation?.at || null,
          }
          : null,
      };
    });
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    return this.preassessmentRenderService.renderHtmlToPdf(html);
  }
}
