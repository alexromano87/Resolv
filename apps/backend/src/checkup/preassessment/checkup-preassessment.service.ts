import { Injectable, ForbiddenException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, Not, IsNull } from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupPreassessmentStatus } from './checkup-preassessment-status.enum';
import { CheckupPreassessmentValidationService, OWNER_EMAIL_FIELDS } from './checkup-preassessment-validation.service';
import { UpdatePreassessmentDto } from './dto/update-preassessment.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupAuditLogService } from '../audit/checkup-audit-log.service';
import { CheckupPreassessmentNotificationsService } from './checkup-preassessment-notifications.service';
import { CheckupPreassessmentRenderService } from './checkup-preassessment-render.service';

function isOwnerEmailField(fieldId: string) {
  return OWNER_EMAIL_FIELDS.has(fieldId) || /(^|_)owner_[a-z]_email$/.test(fieldId);
}

@Injectable()
export class CheckupPreassessmentService {
  private readonly logger = new Logger(CheckupPreassessmentService.name);

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
    @InjectRepository(CheckupStudio)
    private studioRepository: Repository<CheckupStudio>,
    private auditLogService: CheckupAuditLogService,
    private preassessmentNotificationsService: CheckupPreassessmentNotificationsService,
    private preassessmentRenderService: CheckupPreassessmentRenderService,
    private readonly dataSource: DataSource,
    private readonly validationService: CheckupPreassessmentValidationService,
  ) {}

  private async normalizeLegacyClosedState(record: CheckupPreassessment): Promise<CheckupPreassessment> {
    if (record.status !== CheckupPreassessmentStatus.CONCLUSO || record.finalValidation) {
      return record;
    }
    record.status = CheckupPreassessmentStatus.IN_PROGRESS;
    record.completedAt = null;
    record.completedById = null;
    return this.preassessmentRepository.save(record);
  }

  private async getOrCreateByClientId(clientId: string, currentUser: CheckupCurrentUserData): Promise<CheckupPreassessment> {
    const clientExists = await this.clientRepository.findOne({ where: { id: clientId, attivo: true } });
    if (!clientExists) {
      throw new NotFoundException('Cliente non trovato');
    }
    const existing = await this.preassessmentRepository.findOne({ where: { clientId, isLatest: true } });
    if (existing) return this.normalizeLegacyClosedState(existing);

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
      status: CheckupPreassessmentStatus.IN_PROGRESS,
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: CheckupPreassessment;
    try {
      current.isLatest = false;
      await queryRunner.manager.save(current);

      const newVersion = queryRunner.manager.create(CheckupPreassessment, {
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
        status: CheckupPreassessmentStatus.IN_PROGRESS,
        completedAt: null,
        completedById: null,
        version: current.version + 1,
        parentId: current.id,
        isLatest: true,
      });

      saved = await queryRunner.manager.save(newVersion);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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

  async update(user: CheckupCurrentUserData, dto: UpdatePreassessmentDto): Promise<CheckupPreassessment> {
    const record = await this.getOrCreate(user);

    if (user.ruolo === 'cliente' && record.status === CheckupPreassessmentStatus.CONCLUSO && record.finalValidation) {
      throw new ForbiddenException('Il checkup è concluso e non può più essere modificato');
    }

    // Owner email fields (owner_*_email) must NOT be modifiable by cliente role.
    // Capture them from the existing record BEFORE any data update so that
    // isOwnerForMacro always checks the staff-assigned values, not what the
    // client just sent.
    const frozenOwnerEmails: Record<string, string> = {};
    Object.entries(record.data || {}).forEach(([field, value]) => {
      if (isOwnerEmailField(field) && value !== undefined) frozenOwnerEmails[field] = value;
    });

    const vs = this.validationService;
    const assignedMacroAreas =
      user.ruolo === 'cliente' && !vs.isSuperOwner(user)
        ? vs.normalizeMacroAssignments(user.macroAreaAssignments)
        : [];
    const allowedClientMacros = assignedMacroAreas.length > 0 ? new Set(assignedMacroAreas) : null;
    let sectionMeta: Map<string, { macroId: string; requiredFields: string[] }> | null = null;
    let fieldToMacro: Map<string, string> | null = null;

    if (
      user.ruolo === 'cliente' &&
      allowedClientMacros &&
      record.clientId &&
      (dto.data !== undefined || dto.naFields !== undefined || dto.userFieldNotes !== undefined || dto.sectionValidations !== undefined)
    ) {
      const { modelId } = await this.resolveModelIdForClient(record.clientId);
      const structureMeta = await vs.getStructureMetaByModel(modelId);
      sectionMeta = structureMeta.sectionMeta;
      fieldToMacro = structureMeta.fieldToMacro;
    }

    const nextData = user.ruolo === 'cliente' && fieldToMacro
      ? vs.mergeAllowedFieldValues(record.data || {}, dto.data, fieldToMacro, allowedClientMacros)
      : dto.data;
    const nextNaFields = user.ruolo === 'cliente' && fieldToMacro
      ? vs.mergeAllowedFieldValues(record.naFields || {}, dto.naFields, fieldToMacro, allowedClientMacros)
      : dto.naFields;
    const nextUserFieldNotes = user.ruolo === 'cliente' && fieldToMacro
      ? vs.mergeAllowedFieldValues(record.userFieldNotes || {}, dto.userFieldNotes, fieldToMacro, allowedClientMacros)
      : dto.userFieldNotes;

    vs.applyFieldMeta(record, nextData, nextNaFields, user);

    if (nextData !== undefined) {
      if (user.ruolo === 'cliente') {
        // Merge incoming data but preserve all owner email fields from the DB
        const sanitized = { ...nextData };
        Object.keys(sanitized).filter(isOwnerEmailField).forEach((field) => {
          if (frozenOwnerEmails[field] === undefined) delete sanitized[field];
        });
        Object.entries(frozenOwnerEmails).forEach(([field, value]) => { sanitized[field] = value; });
        record.data = sanitized;
      } else {
        record.data = nextData;
      }
    }

    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.fieldNotes !== undefined && user.ruolo !== 'cliente') record.fieldNotes = dto.fieldNotes;
    if (nextUserFieldNotes !== undefined && user.ruolo === 'cliente') record.userFieldNotes = nextUserFieldNotes;
    if (nextNaFields !== undefined) record.naFields = nextNaFields;

    if (dto.macroValidations !== undefined && user.ruolo === 'cliente') {
      const prev = record.macroValidations || {};
      const next = dto.macroValidations || {};
      // Build a temporary record snapshot using frozen owner emails for the check
      const recordForOwnerCheck = { ...record, data: { ...(record.data || {}), ...frozenOwnerEmails } } as CheckupPreassessment;
      for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
        if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
          if (allowedClientMacros && !allowedClientMacros.has(key)) {
            this.logger.warn(`Macro validation denied for user ${user.id}: not assigned to macro ${key}`);
            throw new ForbiddenException('Utente non assegnato alla macro area');
          }
          if (!vs.isOwnerForMacro(recordForOwnerCheck, user, key)) {
            this.logger.warn(`Macro validation denied for user ${user.id}: not owner of macro ${key}`);
            throw new ForbiddenException('Solo l\'owner può validare la macro area');
          }
        }
      }
      record.macroValidations = next;
    }

    if (dto.sectionValidations !== undefined && user.ruolo === 'cliente') {
      const prev = record.sectionValidations || {};
      const next = dto.sectionValidations || {};
      const resolved = await this.resolveModelIdForClient(record.clientId);
      if (!sectionMeta) {
        sectionMeta = await vs.getSectionMetaByModel(resolved.modelId);
      }
      const recordForOwnerCheck = { ...record, data: { ...(record.data || {}), ...frozenOwnerEmails } } as CheckupPreassessment;

      for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
        if (JSON.stringify(prev[key]) === JSON.stringify(next[key])) continue;
        const meta = sectionMeta.get(key);
        if (!meta) throw new NotFoundException('Sezione non trovata per la validazione');
        if (allowedClientMacros && !allowedClientMacros.has(meta.macroId)) {
          this.logger.warn(`Section validation denied for user ${user.id}: not assigned to macro ${meta.macroId}`);
          throw new ForbiddenException('Utente non assegnato alla macro area');
        }
        if (!vs.isOwnerForMacro(recordForOwnerCheck, user, meta.macroId)) {
          this.logger.warn(`Section validation denied for user ${user.id}: not owner of macro ${meta.macroId}`);
          throw new ForbiddenException('Solo l\'owner può validare la sezione');
        }
        if (next[key]) {
          const data = record.data || {};
          const naFields = record.naFields || {};
          const required = meta.requiredFields || [];
          const total = required.filter((f) => !naFields[f]).length;
          const done = required.filter((f) => !naFields[f] && (data[f] || '').trim() !== '').length;
          if (total > 0 && done < total) throw new ForbiddenException('La sezione non è completa');
        }
      }

      record.sectionValidations = next;

      const newlyValidated = Object.keys(next).filter((k) => !prev[k] && next[k]);
      if (newlyValidated.length > 0) {
        const notificationContext = await this.buildNotificationContext(record.clientId, record.id, resolved.studioId);
        this.auditLogService.log({
          userId: user.id,
          userEmail: user.email,
          userRole: user.ruolo,
          action: 'UPDATE',
          entityType: 'PREASSESSMENT',
          entityId: record.id,
          entityName: notificationContext.clientName,
          description: `Sezione${newlyValidated.length > 1 ? 'i' : ''} validat${newlyValidated.length > 1 ? 'e' : 'a'}: ${newlyValidated.join(', ')}`,
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
    }

    if (dto.studioCanEdit !== undefined) record.studioCanEdit = dto.studioCanEdit;

    const saved = await this.preassessmentRepository.save(record);

    return saved;
  }

  private async resolveModelIdForClient(clientId: string) {
    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId, attiva: true },
    });
    if (!sublicense) {
      throw new NotFoundException('Sottolicenza non trovata');
    }
    if (!sublicense.modelId) {
      throw new ConflictException('Sublicenza senza modello associato');
    }
    const license = await this.licenseRepository.findOne({
      where: { id: sublicense.licenseId },
      relations: ['studio'],
    });
    if (!license) {
      throw new ConflictException('Licenza non trovata');
    }
    return { modelId: sublicense.modelId, studioId: license.studioId, license };
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
    return this.finalValidate(user);
  }

  async finalValidate(user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente' || !user.clientId) {
      throw new ForbiddenException('Solo un utente cliente può validare il checkup');
    }
    if (!user.superOwner) {
      throw new ForbiddenException('Solo il Super-owner può validare il checkup');
    }

    // Resolve structure before the transaction (read-only lookups)
    const { modelId, studioId } = await this.resolveModelIdForClient(user.clientId);
    const vs = this.validationService;
    const structureMeta = await vs.getStructureMetaByModel(modelId);
    const expectedSections = Array.from(structureMeta.sectionMeta.entries())
      .filter(([_, meta]) => !vs.isOwnerMacroArea(meta.macroId))
      .map(([sectionId]) => sectionId);

    // Atomic read-modify-write with pessimistic write lock to prevent concurrent final validations
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: CheckupPreassessment;
    try {
      const record = await queryRunner.manager.findOne(CheckupPreassessment, {
        where: { clientId: user.clientId, isLatest: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!record) throw new NotFoundException('Checkup non trovato');

      if (record.finalValidation) {
        throw new ConflictException('Il checkup è già stato validato dal Super-owner');
      }

      const missingSections = expectedSections.filter((sectionId) => !(record.sectionValidations || {})[sectionId]);
      if (missingSections.length > 0) {
        throw new ConflictException('Per la validazione finale tutte le sezioni devono essere validate');
      }

      const name = `${user.nome} ${user.cognome}`.trim() || user.email;
      record.status = CheckupPreassessmentStatus.CONCLUSO;
      record.finalValidation = {
        by: { id: user.id, name, ruolo: user.ruolo },
        at: new Date().toISOString(),
      };
      if (!record.completedAt) {
        record.completedAt = new Date();
        record.completedById = user.id;
      }
      saved = await queryRunner.manager.save(record);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    const client = await this.clientRepository.findOne({ where: { id: user.clientId } });
    if (client) {
      await this.preassessmentNotificationsService.notifyFinalValidation(saved, client, user, studioId);
    }

    return saved;
  }

  async reopenFinalValidation(user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente' || !user.clientId) {
      throw new ForbiddenException('Solo un utente cliente può riaprire il checkup');
    }
    if (!user.superOwner) {
      throw new ForbiddenException('Solo il Super-owner può riaprire il checkup');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: CheckupPreassessment;
    try {
      const record = await queryRunner.manager.findOne(CheckupPreassessment, {
        where: { clientId: user.clientId, isLatest: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!record) throw new NotFoundException('Checkup non trovato');
      if (!record.finalValidation && record.status !== CheckupPreassessmentStatus.CONCLUSO) {
        throw new ConflictException('Il checkup non risulta chiuso');
      }

      record.status = CheckupPreassessmentStatus.IN_PROGRESS;
      record.finalValidation = null;
      record.completedAt = null;
      record.completedById = null;
      saved = await queryRunner.manager.save(record);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
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

    // Resolve licenziatario studio from sublicense → license → studio
    let studioId: string | null = null;
    let studioNome: string | null = null;
    if (sublicense) {
      const license = await this.licenseRepository.findOne({ where: { id: sublicense.licenseId } });
      if (license?.studioId) {
        const studio = await this.studioRepository.findOne({ where: { id: license.studioId } });
        studioId = license.studioId;
        studioNome = studio?.ragioneSociale || studio?.nome || null;
      }
    }

    return {
      client: {
        id: client.id,
        nome: client.ragioneSociale || client.nome,
        cognome: '',
        email: client.email,
        azienda: client.ragioneSociale || client.nome,
        ragioneSociale: client.ragioneSociale || null,
        studioId,
        studioNome,
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

    // Detect changed consultant notes before applying changes
    let affectedMacros: Set<string> | null = null;
    if (dto.fieldNotes !== undefined) {
      const oldNotes = record.fieldNotes || {};
      const changedFields = Object.entries(dto.fieldNotes)
        .filter(([fieldId, note]) => note && (note as string).trim() && note !== (oldNotes[fieldId] || ''))
        .map(([fieldId]) => fieldId);
      if (changedFields.length > 0) {
        const { modelId } = await this.resolveModelIdForClient(record.clientId);
        const { fieldToMacro } = await this.validationService.getStructureMetaByModel(modelId);
        affectedMacros = new Set(
          changedFields.map((f) => fieldToMacro.get(f)).filter(Boolean) as string[],
        );
      }
    }

    this.validationService.applyFieldMeta(record, dto.data, dto.naFields, currentUser);
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

    const saved = await this.preassessmentRepository.save(record);

    if (affectedMacros && affectedMacros.size > 0) {
      this.preassessmentNotificationsService
        .notifyConsultantNote(saved, client, currentUser, affectedMacros)
        .catch(() => {});
    }

    return saved;
  }

  async listClients(currentUser: CheckupCurrentUserData) {
    if (!currentUser.studioId) return [];

    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (!license) return [];

    // Fetch the licenziatario studio name once for all clients
    const licenziatarioStudio = await this.studioRepository.findOne({ where: { id: currentUser.studioId } });
    const studioNome = licenziatarioStudio?.ragioneSociale || licenziatarioStudio?.nome || null;

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
          ragioneSociale: client.ragioneSociale || null,
          studioId: currentUser.studioId ?? null,
          studioNome,
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
            naFields: pre.naFields,
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
