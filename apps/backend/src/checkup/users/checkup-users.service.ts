import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, Not, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CheckupUser } from './checkup-user.entity';
import { CreateCheckupUserDto } from './dto/create-checkup-user.dto';
import { UpdateCheckupUserDto } from './dto/update-checkup-user.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupMailService } from '../mail/checkup-mail.service';
import { CheckupPreassessment } from '../preassessment/checkup-preassessment.entity';
import { QuestionManagementService } from '../services/question-management.service';

@Injectable()
export class CheckupUsersService {
  private static OWNER_FIELDS_BY_MACRO: Record<string, { name: string; role: string; email: string }> = {
    a: { name: 'owner_a_nome', role: 'owner_a_ruolo', email: 'owner_a_email' },
    b: { name: 'owner_b_nome', role: 'owner_b_ruolo', email: 'owner_b_email' },
    c: { name: 'owner_c_nome', role: 'owner_c_ruolo', email: 'owner_c_email' },
    l: { name: 'owner_l_nome', role: 'owner_l_ruolo', email: 'owner_l_email' },
    d: { name: 'owner_d_nome', role: 'owner_d_ruolo', email: 'owner_d_email' },
    e: { name: 'owner_e_nome', role: 'owner_e_ruolo', email: 'owner_e_email' },
    f: { name: 'owner_f_nome', role: 'owner_f_ruolo', email: 'owner_f_email' },
    g: { name: 'owner_g_nome', role: 'owner_g_ruolo', email: 'owner_g_email' },
    h: { name: 'owner_h_nome', role: 'owner_h_ruolo', email: 'owner_h_email' },
    i: { name: 'owner_i_nome', role: 'owner_i_ruolo', email: 'owner_i_email' },
    j: { name: 'owner_j_nome', role: 'owner_j_ruolo', email: 'owner_j_email' },
  };

  private static getOwnerFieldsForMacro(macroId: string) {
    const base = CheckupUsersService.OWNER_FIELDS_BY_MACRO[macroId]
      ? macroId
      : macroId.split('_').pop() || macroId;
    const fields = CheckupUsersService.OWNER_FIELDS_BY_MACRO[base];
    if (!fields || base === macroId) return fields;
    const prefix = macroId.slice(0, -(base.length + 1));
    return {
      name: `${prefix}_${fields.name}`,
      role: `${prefix}_${fields.role}`,
      email: `${prefix}_${fields.email}`,
    };
  }

  constructor(
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupStudio)
    private studioRepository: Repository<CheckupStudio>,
    @InjectRepository(CheckupClient)
    private clientRepository: Repository<CheckupClient>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
    @InjectRepository(CheckupPreassessment)
    private preassessmentRepository: Repository<CheckupPreassessment>,
    private readonly mailService: CheckupMailService,
    private readonly questionManagementService: QuestionManagementService,
  ) {}

  private isStudioStaff(currentUser: CheckupCurrentUserData) {
    return ['admin_studio', 'segreteria', 'collaboratore'].includes(currentUser.ruolo);
  }

  private isOwnerMacroArea(code: string, label?: string | null) {
    if (code === 'k') return true;
    if (label && label.toLowerCase().includes('owner')) return true;
    return false;
  }

  private normalizeMacroList(list?: string[] | null) {
    if (!list) return [];
    return Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
  }

  private async ensureUniqueSuperOwner(clientId: string, excludeUserId?: string) {
    const where: Record<string, any> = { clientId, attivo: true, superOwner: true };
    if (excludeUserId) where.id = Not(excludeUserId);
    const existing = await this.userRepository.findOne({ where });
    if (existing) {
      const ownerName = `${existing.nome} ${existing.cognome}`.trim() || existing.email;
      throw new ConflictException(`Esiste gia un Super-owner attivo per questo cliente: ${ownerName}.`);
    }
  }

  private async validateMacroAreaSelection(modelId: string | null | undefined, macroIds?: string[] | null) {
    const normalized = this.normalizeMacroList(macroIds);
    if (normalized.length === 0) return;
    if (!modelId) {
      throw new ConflictException('La sublicenza non ha un modello associato');
    }
    const macroAreas = await this.questionManagementService.getAllMacroAreas(modelId);
    const allowed = macroAreas.filter((macro) => !this.isOwnerMacroArea(macro.code, macro.label));
    const allowedSet = new Set(allowed.map((macro) => macro.code));
    const invalid = normalized.filter((macroId) => !allowedSet.has(macroId));
    if (invalid.length) {
      throw new ConflictException('Macro area non valida');
    }
  }

  private async getMacroAreaLabelMap(modelId: string | null | undefined) {
    if (!modelId) {
      return new Map<string, string>();
    }
    const macroAreas = await this.questionManagementService.getAllMacroAreas(modelId);
    return new Map(macroAreas.map((macro) => [macro.code, macro.label || macro.code]));
  }

  private ensureMacroOwnersWithinAssignments(ownerIds?: string[] | null, assignmentIds?: string[] | null) {
    const owners = this.normalizeMacroList(ownerIds);
    const assignments = this.normalizeMacroList(assignmentIds);
    if (owners.length === 0 || assignments.length === 0) return;
    const assignmentSet = new Set(assignments);
    const invalid = owners.filter((macroId) => !assignmentSet.has(macroId));
    if (invalid.length) {
      throw new ConflictException('Le macro aree owner devono essere incluse tra le macro aree assegnate');
    }
  }

  private async ensureUniqueMacroOwners(
    clientId: string,
    macroIds: string[],
    macroAreaLabels?: Map<string, string>,
    excludeUserId?: string,
  ) {
    const normalized = this.normalizeMacroList(macroIds);
    if (normalized.length === 0) return;
    const where: Record<string, any> = { clientId, attivo: true };
    if (excludeUserId) where.id = Not(excludeUserId);
    const otherUsers = await this.userRepository.find({ where });
    const alreadyOwned = new Map<string, CheckupUser>();
    otherUsers.forEach((user) => {
      (user.macroAreaOwner || []).forEach((macroId) => alreadyOwned.set(macroId, user));
    });
    const conflicts = normalized.filter((macroId) => alreadyOwned.has(macroId));
    if (conflicts.length) {
      const conflictMacroId = conflicts[0];
      const assignedUser = alreadyOwned.get(conflictMacroId);
      const macroLabel = macroAreaLabels?.get(conflictMacroId) || conflictMacroId;
      const ownerName = assignedUser
        ? `${assignedUser.nome} ${assignedUser.cognome}`.trim() || assignedUser.email
        : 'un altro utente';
      throw new ConflictException(
        `La macro area "${macroLabel}" risulta gia assegnata come owner a ${ownerName}.`,
      );
    }
  }

  private async getOrCreatePreassessment(clientId: string, ownerUserId: string) {
    const existing = await this.preassessmentRepository.findOne({ where: { clientId, isLatest: true } });
    if (existing) return existing;
    const created = this.preassessmentRepository.create({
      userId: ownerUserId,
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

  private async updateMacroOwnerData(clientId: string, macroIds: string[], user: CheckupUser | null) {
    const normalized = this.normalizeMacroList(macroIds);
    if (!normalized.length || !user) return;
    const record = await this.getOrCreatePreassessment(clientId, user.id);
    const data = { ...(record.data || {}) };
    normalized.forEach((macroId) => {
      const fields = CheckupUsersService.getOwnerFieldsForMacro(macroId);
      if (!fields) return;
      data[fields.name] = `${user.nome} ${user.cognome}`.trim();
      data[fields.role] = 'Cliente';
      data[fields.email] = user.email;
    });
    record.data = data;
    await this.preassessmentRepository.save(record);
  }

  private async clearMacroOwnerData(clientId: string, macroIds: string[]) {
    const normalized = this.normalizeMacroList(macroIds);
    if (!normalized.length) return;
    const record = await this.preassessmentRepository.findOne({ where: { clientId, isLatest: true } });
    if (!record) return;
    const data = { ...(record.data || {}) };
    normalized.forEach((macroId) => {
      const fields = CheckupUsersService.getOwnerFieldsForMacro(macroId);
      if (!fields) return;
      data[fields.name] = '';
      data[fields.role] = '';
      data[fields.email] = '';
    });
    record.data = data;
    await this.preassessmentRepository.save(record);
  }

  private async getAccessibleClientIds(currentUser: CheckupCurrentUserData): Promise<string[]> {
    if (!currentUser.studioId || !this.isStudioStaff(currentUser)) return [];
    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (!license) return [];
    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, attiva: true, clientId: Not(IsNull()) },
    });
    return sublicenses.map((s) => s.clientId!).filter(Boolean);
  }

  private async ensureClientAccess(currentUser: CheckupCurrentUserData, clientId: string) {
    const clientIds = await this.getAccessibleClientIds(currentUser);
    if (!clientIds.includes(clientId)) {
      throw new ForbiddenException('Non autorizzato');
    }
  }

  private async ensureUserAccess(currentUser: CheckupCurrentUserData, user: CheckupUser) {
    if (user.clientId) {
      await this.ensureClientAccess(currentUser, user.clientId);
      return;
    }
    if (!user.studioId || !currentUser.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
    if (user.studioId !== currentUser.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
  }

  private async getLicenseMaxUsers(studioId: string): Promise<number | null> {
    const license = await this.licenseRepository.findOne({ where: { studioId } });
    return license ? license.numeroUtenze : null;
  }

  private async getClientMaxUsers(clientId: string): Promise<number | null> {
    const sublicense = await this.sublicenseRepository.findOne({
      where: { clientId, attiva: true },
    });
    return sublicense ? sublicense.numeroUtenze : null;
  }

  private async resolveClientSublicense(
    studioId: string,
    clientId: string,
    sublicenseId?: string | null,
  ): Promise<CheckupSublicense> {
    if (sublicenseId) {
      const sublicense = await this.sublicenseRepository.findOne({
        where: { id: sublicenseId, clientId },
        relations: ['license'],
      });
      if (!sublicense) {
        throw new ConflictException('Sublicenza non trovata per il cliente');
      }
      if (sublicense.license?.studioId !== studioId) {
        throw new ForbiddenException('Sublicenza non autorizzata');
      }
      return sublicense;
    }

    const license = await this.licenseRepository.findOne({ where: { studioId } });
    if (!license) {
      throw new ForbiddenException('Licenza non trovata');
    }
    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, clientId, attiva: true },
    });
    if (!sublicenses.length) {
      throw new ForbiddenException('Sublicenza non trovata');
    }
    if (sublicenses.length > 1) {
      throw new ConflictException('Seleziona la sublicenza da assegnare');
    }
    return sublicenses[0];
  }

  async create(dto: CreateCheckupUserDto, currentUser: CheckupCurrentUserData): Promise<CheckupUser> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email già in uso');
    }

    const isClient = dto.ruolo === 'cliente';
    const clientId = dto.clientId?.trim() || null;
    const targetStudioId = currentUser.studioId || null;
    let maxUsers: number | null = null;

    let resolvedSublicenseId: string | null = null;
    let resolvedModelId: string | null = null;
    if (isClient) {
      const nextSuperOwner = Boolean(dto.superOwner);
      if (!clientId) {
        throw new BadRequestException('Seleziona il cliente per l\'utente');
      }
      if (currentUser.ruolo !== 'admin_studio' || !currentUser.studioId) {
        throw new ForbiddenException('Non autorizzato');
      }
      const sublicense = await this.resolveClientSublicense(
        currentUser.studioId,
        clientId,
        dto.sublicenseId,
      );
      resolvedSublicenseId = sublicense.id;
      const client = await this.clientRepository.findOne({ where: { id: clientId } });
      if (!sublicense) {
        throw new ForbiddenException('Cliente non associato alla licenza');
      }
      if (client && !client.attivo) {
        throw new ForbiddenException('Cliente non attivo');
      }
      resolvedModelId = sublicense.modelId ?? null;
      const macroAreaLabels = await this.getMacroAreaLabelMap(resolvedModelId);
      await this.validateMacroAreaSelection(resolvedModelId, dto.macroAreaAssignments);
      await this.validateMacroAreaSelection(resolvedModelId, dto.macroAreaOwner);
      this.ensureMacroOwnersWithinAssignments(dto.macroAreaOwner, dto.macroAreaAssignments);
      await this.ensureUniqueMacroOwners(clientId, dto.macroAreaOwner || [], macroAreaLabels);
      if (nextSuperOwner) {
        await this.ensureUniqueSuperOwner(clientId);
      }
      maxUsers = sublicense.numeroUtenze;
      const activeCount = await this.userRepository.count({
        where: { sublicenseId: sublicense.id, attivo: true },
      });
      if (maxUsers !== null && activeCount >= maxUsers) {
        throw new ConflictException('Limite utenti raggiunto per questo cliente');
      }
    } else {
      if (!targetStudioId) {
        throw new ForbiddenException('Studio non associato');
      }
      const targetStudio = await this.studioRepository.findOne({ where: { id: targetStudioId } });
      if (!targetStudio || targetStudio.tipo !== 'licenziatario') {
        throw new ForbiddenException('Studio non valido');
      }
      maxUsers = await this.getLicenseMaxUsers(targetStudioId);
      if (maxUsers !== null) {
        const activeCount = await this.userRepository.count({
          where: { studioId: targetStudioId, attivo: true },
        });
        if (activeCount >= maxUsers) {
          throw new ConflictException('Limite utenti raggiunto per questo studio');
        }
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      nome: dto.nome,
      cognome: dto.cognome,
      telefono: dto.telefono || null,
      ruolo: dto.ruolo,
      studioId: isClient ? null : targetStudioId,
      clientId: isClient ? clientId : null,
      sublicenseId: isClient ? resolvedSublicenseId : null,
      azienda: dto.azienda || null,
      macroAreaOwner: isClient ? this.normalizeMacroList(dto.macroAreaOwner) : null,
      macroAreaAssignments: isClient ? this.normalizeMacroList(dto.macroAreaAssignments) : null,
      superOwner: isClient ? Boolean(dto.superOwner) : false,
      mustChangePassword: true,
    });

    const saved = await this.userRepository.save(user);
    if (isClient && clientId) {
      await this.updateMacroOwnerData(clientId, this.normalizeMacroList(dto.macroAreaOwner), saved);
    }

    // Welcome email per i nuovi clienti (fire-and-forget)
    if (isClient) {
      const appUrl = process.env.CHECKUP_APP_URL || 'http://localhost:8081';
      this.mailService.sendMail({
        to: email,
        subject: '[Checkup] Benvenuto — le tue credenziali di accesso',
        html: `
          <p>Benvenuto/a, <strong>${dto.nome} ${dto.cognome}</strong>!</p>
          <p>Il tuo studio ha creato un account per te sulla piattaforma Pre-Assessment Checkup.</p>
          <p>Ecco le tue credenziali:</p>
          <table style="border-collapse:collapse;margin:12px 0;">
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Email:</td><td><strong>${email}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Password temporanea:</td><td><strong>${dto.password}</strong></td></tr>
          </table>
          <p style="color:#ef4444;"><strong>Importante:</strong> ti verrà chiesto di cambiare la password al primo accesso.</p>
          <p style="margin-top:16px;"><a href="${appUrl}/checkup/login" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Accedi ora</a></p>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
            <p style="margin:0;">Questo è un messaggio automatico — non rispondere a questa email.</p>
          </div>
        `,
      });
    }

    return saved;
  }

  async findAll(currentUser: CheckupCurrentUserData, search?: string, includeInactive = false): Promise<CheckupUser[]> {
    if (!currentUser.studioId) return [];
    const clientIds = await this.getAccessibleClientIds(currentUser);
    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.studio', 'studio')
      .leftJoinAndSelect('u.client', 'client')
      .leftJoinAndSelect('u.sublicense', 'sublicense')
      .where(new Brackets((sub) => {
        sub.where('u.studioId = :studioId', { studioId: currentUser.studioId });
        if (clientIds.length) {
          sub.orWhere('u.clientId IN (:...clientIds)', { clientIds });
        }
      }));

    if (!includeInactive) {
      qb.andWhere('u.attivo = :attivo', { attivo: true });
    }

    const q = search?.trim().toLowerCase();
    if (q) {
      const like = `%${q}%`;
      qb.andWhere(new Brackets((sub) => {
        sub.where('LOWER(u.nome) LIKE :like', { like })
          .orWhere('LOWER(u.cognome) LIKE :like', { like })
          .orWhere('LOWER(u.email) LIKE :like', { like })
          .orWhere('LOWER(u.azienda) LIKE :like', { like })
          .orWhere('LOWER(u.ruolo) LIKE :like', { like })
          .orWhere('LOWER(u.telefono) LIKE :like', { like })
          .orWhere('LOWER(studio.nome) LIKE :like', { like })
          .orWhere('LOWER(client.nome) LIKE :like', { like })
          .orWhere('LOWER(client.ragioneSociale) LIKE :like', { like })
          .orWhere('LOWER(client.codiceFiscale) LIKE :like', { like });
      }));
    }

    return qb.orderBy('u.cognome', 'ASC')
      .addOrderBy('u.nome', 'ASC')
      .getMany();
  }

  async findOne(id: string, currentUser: CheckupCurrentUserData, includeInactive = false): Promise<CheckupUser> {
    const user = await this.userRepository.findOne({
      where: includeInactive ? { id } : { id, attivo: true },
      relations: ['studio', 'client', 'sublicense'],
    });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }
    await this.ensureUserAccess(currentUser, user);
    return user;
  }

  async update(id: string, dto: UpdateCheckupUserDto, currentUser: CheckupCurrentUserData): Promise<CheckupUser> {
    const user = await this.findOne(id, currentUser, true);

    const updates: Partial<CheckupUser> = {};
    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      if (email !== user.email) {
        const existing = await this.userRepository.findOne({ where: { email } });
        if (existing && existing.id !== user.id) {
          throw new ConflictException('Email già in uso');
        }
      }
      updates.email = email;
    }

    if (dto.nome !== undefined) updates.nome = dto.nome;
    if (dto.cognome !== undefined) updates.cognome = dto.cognome;
    if (dto.telefono !== undefined) updates.telefono = dto.telefono;
    if (dto.azienda !== undefined) updates.azienda = dto.azienda;
    if (dto.ruolo !== undefined) updates.ruolo = dto.ruolo;
    if (dto.attivo !== undefined) updates.attivo = dto.attivo;

    const nextRole = dto.ruolo ?? user.ruolo;
    const prevClientId = user.clientId;
    const nextClientId = dto.clientId !== undefined ? dto.clientId?.trim() || null : user.clientId;
    const nextStudioId = dto.studioId !== undefined ? dto.studioId?.trim() || null : user.studioId;
    const nextSublicenseId = dto.sublicenseId !== undefined ? dto.sublicenseId?.trim() || null : user.sublicenseId;
    const prevMacroOwner = this.normalizeMacroList(user.macroAreaOwner);
    const prevMacroAssignments = this.normalizeMacroList(user.macroAreaAssignments);
    const nextSuperOwner = dto.superOwner !== undefined ? Boolean(dto.superOwner) : Boolean(user.superOwner);
    const nextMacroOwner = dto.macroAreaOwner !== undefined
      ? this.normalizeMacroList(dto.macroAreaOwner)
      : prevMacroOwner;
    const nextMacroAssignments = dto.macroAreaAssignments !== undefined
      ? this.normalizeMacroList(dto.macroAreaAssignments)
      : prevMacroAssignments;

    if (nextRole === 'cliente') {
      if (!nextClientId) {
        throw new BadRequestException('Seleziona il cliente per l\'utente');
      }
      await this.ensureClientAccess(currentUser, nextClientId);
      if (!currentUser.studioId) {
        throw new ForbiddenException('Studio non associato');
      }
      const nextSublicense = await this.resolveClientSublicense(
        currentUser.studioId,
        nextClientId,
        nextSublicenseId,
      );
      const modelId = nextSublicense.modelId ?? null;
      const macroAreaLabels = await this.getMacroAreaLabelMap(modelId);
      await this.validateMacroAreaSelection(modelId, nextMacroAssignments);
      await this.validateMacroAreaSelection(modelId, nextMacroOwner);
      this.ensureMacroOwnersWithinAssignments(nextMacroOwner, nextMacroAssignments);
      const shouldCheckOwnerConflicts =
        nextMacroOwner.length > 0
        && (
          dto.macroAreaOwner !== undefined
          || nextClientId !== user.clientId
          || nextRole !== user.ruolo
        );
      if (shouldCheckOwnerConflicts) {
        await this.ensureUniqueMacroOwners(nextClientId, nextMacroOwner, macroAreaLabels, user.id);
      }
      if (nextSuperOwner && (dto.superOwner !== undefined || nextClientId !== user.clientId || !user.superOwner)) {
        await this.ensureUniqueSuperOwner(nextClientId, user.id);
      }
      updates.clientId = nextClientId;
      updates.studioId = null;
      updates.sublicenseId = nextSublicense.id;
      updates.macroAreaOwner = nextMacroOwner;
      updates.macroAreaAssignments = nextMacroAssignments;
      updates.superOwner = nextSuperOwner;

      const activating = dto.attivo === true && user.attivo === false;
      const movingClient = nextClientId !== user.clientId;
      const becomingClient = nextRole !== user.ruolo;
      const movingSublicense = nextSublicense.id !== user.sublicenseId;
      if (activating || movingClient || becomingClient || movingSublicense) {
        const maxUsers = nextSublicense.numeroUtenze;
        if (maxUsers !== null) {
          const activeCount = await this.userRepository.count({
            where: { sublicenseId: nextSublicense.id, attivo: true, id: Not(user.id) },
          });
          if (activeCount >= maxUsers) {
            throw new ConflictException('Limite utenti raggiunto per questo cliente');
          }
        }
      }
    } else {
      const targetStudioId = currentUser.studioId;
      if (!targetStudioId) {
        throw new ForbiddenException('Studio non associato');
      }
      if (nextStudioId && nextStudioId !== targetStudioId) {
        throw new ForbiddenException('Studio non autorizzato');
      }
      updates.studioId = targetStudioId;
      updates.clientId = null;
      updates.sublicenseId = null;
      updates.macroAreaOwner = null;
      updates.macroAreaAssignments = null;
      updates.superOwner = false;

      const activating = dto.attivo === true && user.attivo === false;
      const becomingStaff = nextRole !== user.ruolo;
      if (activating || becomingStaff) {
        const maxUsers = await this.getLicenseMaxUsers(targetStudioId);
        if (maxUsers !== null) {
          const activeCount = await this.userRepository.count({
            where: { studioId: targetStudioId, attivo: true, id: Not(user.id) },
          });
          if (activeCount >= maxUsers) {
            throw new ConflictException('Limite utenti raggiunto per questo studio');
          }
        }
      }
    }

    Object.assign(user, updates);
    const saved = await this.userRepository.save(user);

    if (nextRole === 'cliente' && nextClientId) {
      const removed = prevMacroOwner.filter((macro) => !nextMacroOwner.includes(macro));

      if (removed.length > 0) {
        const otherUsers = await this.userRepository.find({
          where: {
            id: Not(saved.id),
            clientId: nextClientId,
            attivo: true,
          },
        });
        const stillOwned = new Set<string>();
        otherUsers.forEach((item) => {
          (item.macroAreaOwner || []).forEach((macro) => stillOwned.add(macro));
        });
        const toClear = removed.filter((macro) => !stillOwned.has(macro));
        if (toClear.length > 0) {
          await this.clearMacroOwnerData(nextClientId, toClear);
        }
      }

      if (nextMacroOwner.length > 0) {
        await this.updateMacroOwnerData(nextClientId, nextMacroOwner, saved);
      }
    }

    if (prevClientId && prevClientId !== nextClientId && prevMacroOwner.length > 0) {
      const otherUsers = await this.userRepository.find({
        where: {
          clientId: prevClientId,
          attivo: true,
        },
      });
      const stillOwned = new Set<string>();
      otherUsers
        .filter((item) => item.id !== saved.id)
        .forEach((item) => {
          (item.macroAreaOwner || []).forEach((macro) => stillOwned.add(macro));
        });
      const toClear = prevMacroOwner.filter((macro) => !stillOwned.has(macro));
      if (toClear.length > 0) {
        await this.clearMacroOwnerData(prevClientId, toClear);
      }
    }

    return saved;
  }

  async deactivate(id: string, currentUser: CheckupCurrentUserData): Promise<CheckupUser> {
    const user = await this.findOne(id, currentUser);
    user.attivo = false;
    return this.userRepository.save(user);
  }

  async resetPassword(id: string, newPassword: string, currentUser: CheckupCurrentUserData): Promise<CheckupUser> {
    const user = await this.findOne(id, currentUser, true);
    user.password = await bcrypt.hash(newPassword, 10);
    return this.userRepository.save(user);
  }

  async getUsage(currentUser: CheckupCurrentUserData) {
    if (!currentUser.studioId) {
      throw new ForbiddenException('Studio non associato');
    }

    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    const licenseMax = license?.numeroUtenze ?? null;

    const sublicenses = license
      ? await this.sublicenseRepository.find({
          where: { licenseId: license.id, clientId: Not(IsNull()) },
        })
      : [];

    const clientIds = sublicenses.map((s) => s.clientId!).filter(Boolean);
    const studioCount = await this.userRepository.count({
      where: { studioId: currentUser.studioId, attivo: true },
    });

    const clientCounts = clientIds.length
      ? await this.userRepository
          .createQueryBuilder('u')
          .select('u.clientId', 'clientId')
          .addSelect('COUNT(*)', 'count')
          .where('u.attivo = :attivo', { attivo: true })
          .andWhere('u.clientId IN (:...clientIds)', { clientIds })
          .groupBy('u.clientId')
          .getRawMany()
      : [];

    const countsMap = clientCounts.reduce<Record<string, number>>((acc, row) => {
      acc[row.clientId] = Number(row.count) || 0;
      return acc;
    }, {});

    return {
      license: {
        studioId: currentUser.studioId,
        maxUsers: licenseMax,
        activeUsers: studioCount || 0,
      },
      clients: sublicenses.map((s) => ({
        clientId: s.clientId,
        maxUsers: s.numeroUtenze,
        activeUsers: countsMap[s.clientId || ''] || 0,
      })),
    };
  }
}
