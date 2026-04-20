import { Body, ConflictException, Controller, Get, NotFoundException, Post, UseGuards, Param, Put, Patch, Delete, Query, BadRequestException, UseInterceptors, UploadedFile, Req, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import * as ExcelJS from 'exceljs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperadminGuard } from '../auth/superadmin.guard';
import { CheckupStudio } from '../checkup/studios/checkup-studio.entity';
import { CheckupClient } from '../checkup/clients/checkup-client.entity';
import { CheckupUser } from '../checkup/users/checkup-user.entity';
import { CheckupLicense } from '../checkup/licenses/checkup-license.entity';
import { CheckupSublicense } from '../checkup/licenses/checkup-sublicense.entity';
import { CheckupPreassessment } from '../checkup/preassessment/checkup-preassessment.entity';
import { QuestionMacroArea } from '../checkup/entities/question-macro-area.entity';
import { QuestionSection } from '../checkup/entities/question-section.entity';
import { QuestionField } from '../checkup/entities/question-field.entity';
import { QuestionModel } from '../checkup/entities/question-model.entity';
import { QuestionManagementService } from '../checkup/services/question-management.service';
import { CheckupPdfConfig } from '../checkup/entities/checkup-pdf-config.entity';
import { PdfConfigDto } from '../checkup/dto/pdf-config.dto';
import { DEFAULT_PDF_CONFIG } from '../checkup/pdf-config/checkup-pdf-config.service';
import { CheckupPreassessmentRenderService } from '../checkup/preassessment/checkup-preassessment-render.service';
import { CreateCheckupStudioDto } from './dto/create-checkup-studio.dto';
import { CreateCheckupLicenseDto } from './dto/create-checkup-license.dto';
import { CreateCheckupSublicenseDto } from './dto/create-checkup-sublicense.dto';
import { RenewCheckupValidityDto } from './dto/renew-checkup-validity.dto';
import { UpdateCheckupStudioDto } from './dto/update-checkup-studio.dto';
import { CreateCheckupUserDto } from '../checkup/users/dto/create-checkup-user.dto';
import { UpdateCheckupUserDto } from '../checkup/users/dto/update-checkup-user.dto';
import { CreateCheckupClientDto } from '../checkup/studios/dto/create-checkup-client.dto';
import { UpdateCheckupClientDto } from '../checkup/studios/dto/update-checkup-client.dto';
import {
  CreateQuestionModelDto,
  UpdateQuestionModelDto,
  CreateMacroAreaDto,
  UpdateMacroAreaDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateFieldDto,
  UpdateFieldDto,
} from '../checkup/dto/question-management.dto';

@Controller('admin/checkup')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class CheckupAdminController {
  constructor(
    @InjectRepository(CheckupStudio)
    private studioRepository: Repository<CheckupStudio>,
    @InjectRepository(CheckupClient)
    private clientRepository: Repository<CheckupClient>,
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
    @InjectRepository(CheckupPreassessment)
    private preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(QuestionModel)
    private questionModelRepository: Repository<QuestionModel>,
    @InjectRepository(CheckupPdfConfig)
    private pdfConfigRepository: Repository<CheckupPdfConfig>,
    private questionManagementService: QuestionManagementService,
    private renderService: CheckupPreassessmentRenderService,
  ) {}

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
    const base = CheckupAdminController.OWNER_FIELDS_BY_MACRO[macroId]
      ? macroId
      : macroId.split('_').pop() || macroId;
    const fields = CheckupAdminController.OWNER_FIELDS_BY_MACRO[base];
    if (!fields || base === macroId) return fields;
    const prefix = macroId.slice(0, -(base.length + 1));
    return {
      name: `${prefix}_${fields.name}`,
      role: `${prefix}_${fields.role}`,
      email: `${prefix}_${fields.email}`,
    };
  }

  private isOwnerMacroArea(code: string, label?: string | null) {
    if (code === 'k') return true;
    if (label && label.toLowerCase().includes('owner')) return true;
    return false;
  }

  private normalizeMacroOwnerList(list?: string[] | null) {
    if (!list) return [];
    return Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
  }

  private normalizeMacroAssignmentList(list?: string[] | null) {
    if (!list) return [];
    return Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
  }

  private async validateMacroAreaSelection(modelId: string | null | undefined, macroIds?: string[] | null) {
    const normalized = this.normalizeMacroAssignmentList(macroIds);
    if (normalized.length === 0) {
      return;
    }
    if (!modelId) {
      throw new ConflictException('La sublicenza non ha un modello associato');
    }
    const macroAreas = await this.questionManagementService.getAllMacroAreas(modelId);
    const allowed = macroAreas.filter((m) => !this.isOwnerMacroArea(m.code, m.label));
    const allowedSet = new Set(allowed.map((m) => m.code));
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
    const owners = this.normalizeMacroOwnerList(ownerIds);
    const assignments = this.normalizeMacroAssignmentList(assignmentIds);
    if (owners.length === 0 || assignments.length === 0) {
      return;
    }
    const allowedAssignments = new Set(assignments);
    const invalid = owners.filter((macroId) => !allowedAssignments.has(macroId));
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
    const normalized = this.normalizeMacroOwnerList(macroIds);
    if (normalized.length === 0) return;

    const where: Record<string, any> = { clientId, attivo: true };
    if (excludeUserId) {
      where.id = Not(excludeUserId);
    }
    const otherUsers = await this.userRepository.find({ where });
    const alreadyOwned = new Map<string, CheckupUser>();
    otherUsers.forEach((u) => {
      (u.macroAreaOwner || []).forEach((macro) => alreadyOwned.set(macro, u));
    });
    const conflicts = normalized.filter((macro) => alreadyOwned.has(macro));
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

  private async ensureUniqueSuperOwner(clientId: string, excludeUserId?: string) {
    const where: Record<string, any> = { clientId, attivo: true, superOwner: true };
    if (excludeUserId) {
      where.id = Not(excludeUserId);
    }
    const existing = await this.userRepository.findOne({ where });
    if (existing) {
      const ownerName = `${existing.nome} ${existing.cognome}`.trim() || existing.email;
      throw new ConflictException(`Esiste gia un Super-owner attivo per questo cliente: ${ownerName}.`);
    }
  }

  private async getOrCreatePreassessment(clientId: string, ownerUserId: string) {
    const existing = await this.preassessmentRepository.findOne({ where: { clientId } });
    if (existing) return existing;
    const created = this.preassessmentRepository.create({
      userId: ownerUserId,
      clientId,
      data: {},
      notes: {},
      fieldNotes: {},
      naFields: {},
      macroValidations: {},
      studioCanEdit: false,
      status: 'in_progress',
    });
    return this.preassessmentRepository.save(created);
  }

  private async updateMacroOwnerData(
    clientId: string,
    macroIds: string[],
    user: CheckupUser | null,
  ) {
    const normalized = this.normalizeMacroOwnerList(macroIds);
    if (!normalized.length || !user) return;

    const record = await this.getOrCreatePreassessment(clientId, user.id);
    const data = { ...(record.data || {}) };
    normalized.forEach((macroId) => {
      const fields = CheckupAdminController.getOwnerFieldsForMacro(macroId);
      if (!fields) return;
      data[fields.name] = `${user.nome} ${user.cognome}`.trim();
      data[fields.role] = 'Cliente';
      data[fields.email] = user.email;
    });
    record.data = data;
    await this.preassessmentRepository.save(record);
  }

  private async clearMacroOwnerData(clientId: string, macroIds: string[]) {
    const normalized = this.normalizeMacroOwnerList(macroIds);
    if (!normalized.length) return;
    const record = await this.preassessmentRepository.findOne({ where: { clientId } });
    if (!record) return;
    const data = { ...(record.data || {}) };
    normalized.forEach((macroId) => {
      const fields = CheckupAdminController.getOwnerFieldsForMacro(macroId);
      if (!fields) return;
      data[fields.name] = '';
      data[fields.role] = '';
      data[fields.email] = '';
    });
    record.data = data;
    await this.preassessmentRepository.save(record);
  }

  @Get('dashboard')
  async getDashboardStats() {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const in30daysStr = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const isExpiredDate = (date?: string | null) => !!date && date < todayStr;
    const isExpiringSoonDate = (date?: string | null) => !!date && date >= todayStr && date <= in30daysStr;
    const daysUntil = (date?: string | null): number | null => {
      if (!date) return null;
      return Math.ceil((new Date(date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const [studios, licenses, sublicenses, clients, users, allPreassessments, allModels] = await Promise.all([
      this.studioRepository.find(),
      this.licenseRepository.find(),
      this.sublicenseRepository.find(),
      this.clientRepository.find(),
      this.userRepository.find(),
      this.preassessmentRepository.find(),
      this.questionModelRepository.find(),
    ]);

    // Deduplicate preassessments by clientId keeping most recently updated
    const latestByClient = new Map<string, CheckupPreassessment>();
    allPreassessments.forEach((p) => {
      if (!p.clientId) return;
      const existing = latestByClient.get(p.clientId);
      if (!existing || new Date(p.updatedAt) > new Date(existing.updatedAt)) {
        latestByClient.set(p.clientId, p);
      }
    });
    const preassessments = [...latestByClient.values()];

    // Studios
    const licenziatari = studios.filter((s) => s.tipo === 'licenziatario');
    const clientiStudio = studios.filter((s) => s.tipo === 'cliente');

    // Licenses
    const assignedLicenses = licenses.filter((l) => l.studioId);
    const expiredLicenses = licenses.filter((l) => isExpiredDate(l.dataScadenza));
    const expiringSoonLicenses = licenses.filter((l) => isExpiringSoonDate(l.dataScadenza));
    const totalUtenze = licenses.reduce((sum, l) => sum + (l.numeroUtenze || 0), 0);

    // Sublicenses
    const activeSublicenses = sublicenses.filter((s) => s.attiva);
    const assignedToClient = sublicenses.filter((s) => s.clientId);
    const unassigned = sublicenses.filter((s) => !s.clientId && !s.clienteStudioId);
    const expiredSublicenses = sublicenses.filter((s) => isExpiredDate(s.dataScadenza));
    const expiringSoonSublicenses = sublicenses.filter((s) => isExpiringSoonDate(s.dataScadenza));

    // Users
    const activeUsers = users.filter((u) => u.attivo);
    const with2fa = users.filter((u) => u.twoFactorEnabled);
    const recentlyLoggedIn = users.filter((u) => u.lastLogin && new Date(u.lastLogin) > sevenDaysAgo);
    const neverLoggedIn = users.filter((u) => !u.lastLogin);
    const mustChangePwd = users.filter((u) => u.mustChangePassword);
    const byRole = users.reduce((acc, u) => {
      acc[u.ruolo] = (acc[u.ruolo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Preassessments
    const completed = preassessments.filter((p) => p.status === 'concluso');
    const inProgress = preassessments.filter((p) => p.status === 'in_progress');

    // Lookup maps for licenziatari breakdown
    const licenseByStudioId = new Map<string, CheckupLicense>();
    licenses.forEach((l) => { if (l.studioId) licenseByStudioId.set(l.studioId, l); });

    const sublicensesByLicenseId = new Map<string, CheckupSublicense[]>();
    sublicenses.forEach((s) => {
      if (!sublicensesByLicenseId.has(s.licenseId)) sublicensesByLicenseId.set(s.licenseId, []);
      sublicensesByLicenseId.get(s.licenseId)!.push(s);
    });

    const clientsById = new Map(clients.map((c) => [c.id, c]));
    const preassessmentsByClientId = new Map(preassessments.map((p) => [p.clientId, p]));

    const licenziatariBreakdown = licenziatari.map((studio) => {
      const license = licenseByStudioId.get(studio.id) ?? null;
      const studioSublicenses = license ? (sublicensesByLicenseId.get(license.id) ?? []) : [];
      const clientIds = [...new Set(studioSublicenses.filter((s) => s.clientId).map((s) => s.clientId!))];
      const studioClients = clientIds.map((id) => clientsById.get(id)).filter(Boolean) as CheckupClient[];

      const paCompleted = studioClients.filter((c) => preassessmentsByClientId.get(c.id)?.status === 'concluso').length;
      const paInProgress = studioClients.filter((c) => preassessmentsByClientId.get(c.id)?.status === 'in_progress').length;

      return {
        id: studio.id,
        nome: studio.nome,
        attivo: studio.attivo,
        hasLicense: !!license,
        licenzaScadenza: license?.dataScadenza ?? null,
        licenzaScaduta: isExpiredDate(license?.dataScadenza),
        licenzaInScadenza: isExpiringSoonDate(license?.dataScadenza),
        totalSublicenses: studioSublicenses.length,
        activeSublicenses: studioSublicenses.filter((s) => s.attiva).length,
        expiringSoonSublicenses: studioSublicenses.filter((s) => isExpiringSoonDate(s.dataScadenza)).length,
        expiredSublicenses: studioSublicenses.filter((s) => isExpiredDate(s.dataScadenza)).length,
        totalClients: studioClients.length,
        activeClients: studioClients.filter((c) => c.attivo).length,
        preassessmentCompleted: paCompleted,
        preassessmentInProgress: paInProgress,
      };
    });

    // Build critical items list
    type CriticalItem = {
      type: string;
      label: string;
      detail: string;
      severity: 'critical' | 'warning';
      studioNome?: string;
      expiryDate?: string;
      daysRemaining?: number;
    };
    const criticalItems: CriticalItem[] = [];

    assignedToClient
      .filter((s) => isExpiredDate(s.dataScadenza))
      .forEach((s) => {
        const licenseEntry = licenses.find((l) => l.id === s.licenseId);
        const studioEntry = licenseEntry?.studioId ? licenziatari.find((st) => st.id === licenseEntry.studioId) : null;
        criticalItems.push({
          type: 'sublicense_expired',
          label: `Sublicenza ${s.numeroSublicenza ?? s.id.slice(0, 8).toUpperCase()}`,
          detail: `Scaduta il ${s.dataScadenza ?? '—'}`,
          severity: 'critical',
          studioNome: studioEntry?.nome,
          expiryDate: s.dataScadenza ?? undefined,
          daysRemaining: daysUntil(s.dataScadenza) ?? undefined,
        });
      });

    assignedToClient
      .filter((s) => isExpiringSoonDate(s.dataScadenza) && !isExpiredDate(s.dataScadenza))
      .forEach((s) => {
        const licenseEntry = licenses.find((l) => l.id === s.licenseId);
        const studioEntry = licenseEntry?.studioId ? licenziatari.find((st) => st.id === licenseEntry.studioId) : null;
        const days = daysUntil(s.dataScadenza);
        criticalItems.push({
          type: 'sublicense_expiring',
          label: `Sublicenza ${s.numeroSublicenza ?? s.id.slice(0, 8).toUpperCase()}`,
          detail: `Scade tra ${days} giorn${days === 1 ? 'o' : 'i'} (${s.dataScadenza})`,
          severity: 'warning',
          studioNome: studioEntry?.nome,
          expiryDate: s.dataScadenza ?? undefined,
          daysRemaining: days ?? undefined,
        });
      });

    licenziatari
      .filter((s) => s.attivo && !licenseByStudioId.has(s.id))
      .forEach((studio) => {
        criticalItems.push({
          type: 'studio_no_license',
          label: studio.nome,
          detail: 'Nessuna licenza assegnata',
          severity: 'critical',
          studioNome: studio.nome,
        });
      });

    licenziatari
      .filter((s) => isExpiredDate(licenseByStudioId.get(s.id)?.dataScadenza))
      .forEach((studio) => {
        const lic = licenseByStudioId.get(studio.id)!;
        criticalItems.push({
          type: 'license_expired',
          label: `Licenza — ${studio.nome}`,
          detail: `Scaduta il ${lic.dataScadenza}`,
          severity: 'critical',
          studioNome: studio.nome,
          expiryDate: lic.dataScadenza ?? undefined,
          daysRemaining: daysUntil(lic.dataScadenza) ?? undefined,
        });
      });

    criticalItems.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
      if (a.daysRemaining != null && b.daysRemaining != null) return a.daysRemaining - b.daysRemaining;
      return 0;
    });

    // Models breakdown: count active sublicenses per model
    const activeSublicensesByModelId = new Map<string, number>();
    sublicenses.filter((s) => s.attiva && s.modelId).forEach((s) => {
      activeSublicensesByModelId.set(s.modelId!, (activeSublicensesByModelId.get(s.modelId!) || 0) + 1);
    });

    const publishedModels = allModels.filter((m) => m.attivo && m.status === 'published');
    const modelsBreakdown = allModels
      .filter((m) => m.attivo)
      .map((m) => ({
        id: m.id,
        code: m.code,
        label: m.label,
        status: m.status,
        activeSublicenseCount: activeSublicensesByModelId.get(m.id) || 0,
      }))
      .sort((a, b) => b.activeSublicenseCount - a.activeSublicenseCount);

    return {
      studios: {
        total: studios.length,
        active: studios.filter((s) => s.attivo).length,
        inactive: studios.filter((s) => !s.attivo).length,
        licenziatari: licenziatari.length,
        licenziatariAttivi: licenziatari.filter((s) => s.attivo).length,
        clientiStudio: clientiStudio.length,
      },
      clients: {
        total: clients.length,
        active: clients.filter((c) => c.attivo).length,
        inactive: clients.filter((c) => !c.attivo).length,
        preassessmentCompleted: completed.length,
        preassessmentInProgress: inProgress.length,
        completionRate: clients.length > 0 ? Math.round((completed.length / clients.length) * 100) : 0,
      },
      licenses: {
        total: licenses.length,
        assigned: assignedLicenses.length,
        unassigned: licenses.length - assignedLicenses.length,
        expiringSoon: expiringSoonLicenses.length,
        expired: expiredLicenses.length,
        totalUtenze,
      },
      sublicenses: {
        total: sublicenses.length,
        active: activeSublicenses.length,
        inactive: sublicenses.filter((s) => !s.attiva).length,
        assignedToClient: assignedToClient.length,
        unassigned: unassigned.length,
        expiringSoon: expiringSoonSublicenses.length,
        expired: expiredSublicenses.length,
      },
      users: {
        total: users.length,
        active: activeUsers.length,
        inactive: users.filter((u) => !u.attivo).length,
        byRole,
        with2fa: with2fa.length,
        recentlyLoggedIn: recentlyLoggedIn.length,
        neverLoggedIn: neverLoggedIn.length,
        mustChangePassword: mustChangePwd.length,
      },
      preassessments: {
        total: preassessments.length,
        inProgress: inProgress.length,
        completed: completed.length,
        completionRate: preassessments.length > 0 ? Math.round((completed.length / preassessments.length) * 100) : 0,
      },
      models: {
        total: allModels.filter((m) => m.attivo).length,
        published: publishedModels.length,
        breakdown: modelsBreakdown,
      },
      licenziatariBreakdown,
      criticalItems: criticalItems.slice(0, 50),
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('studios')
  async listStudios(): Promise<CheckupStudio[]> {
    return this.studioRepository.find({ order: { nome: 'ASC' } });
  }

  @Post('studios')
  async createStudio(@Body() dto: CreateCheckupStudioDto): Promise<CheckupStudio> {
    const nome = dto.nome.trim();
    const existing = await this.studioRepository.findOne({ where: { nome } });
    if (existing) {
      throw new ConflictException('Studio già esistente');
    }
    let pendingLicense: CheckupLicense | null = null;
    if (dto.licenseId?.trim()) {
      if ((dto.tipo ?? 'licenziatario') !== 'licenziatario') {
        throw new ConflictException('Solo gli studi licenziatari possono avere una licenza principale');
      }
      pendingLicense = await this.licenseRepository.findOne({ where: { id: dto.licenseId.trim() } });
      if (!pendingLicense) {
        throw new NotFoundException('Licenza non trovata');
      }
      if (pendingLicense.studioId) {
        throw new ConflictException('La licenza selezionata è già assegnata ad un altro studio');
      }
    }
    const studio = this.studioRepository.create({
      nome,
      tipo: dto.tipo ?? 'licenziatario',
      ragioneSociale: dto.ragioneSociale?.trim() || null,
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
    const savedStudio = await this.studioRepository.save(studio);

    if (pendingLicense) {
      pendingLicense.studioId = savedStudio.id;
      if (!pendingLicense.intestatario) {
        pendingLicense.intestatario = savedStudio.ragioneSociale?.trim() || savedStudio.nome;
      }
      await this.licenseRepository.save(pendingLicense);
    }

    return savedStudio;
  }

  @Put('studios/:id')
  async updateStudio(
    @Param('id') id: string,
    @Body() dto: UpdateCheckupStudioDto,
  ): Promise<CheckupStudio> {
    const studio = await this.studioRepository.findOne({ where: { id } });
    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }

    if (dto.nome) {
      const nome = dto.nome.trim();
      if (nome !== studio.nome) {
        const existing = await this.studioRepository.findOne({ where: { nome } });
        if (existing && existing.id !== studio.id) {
          throw new ConflictException('Studio già esistente');
        }
      }
      studio.nome = nome;
    }

    if (dto.tipo) studio.tipo = dto.tipo;
    if (dto.ragioneSociale !== undefined) studio.ragioneSociale = dto.ragioneSociale?.trim() || null;
    if (dto.partitaIva !== undefined) studio.partitaIva = dto.partitaIva?.trim() || null;
    if (dto.codiceFiscale !== undefined) studio.codiceFiscale = dto.codiceFiscale?.trim() || null;
    if (dto.indirizzo !== undefined) studio.indirizzo = dto.indirizzo?.trim() || null;
    if (dto.citta !== undefined) studio.citta = dto.citta?.trim() || null;
    if (dto.provincia !== undefined) studio.provincia = dto.provincia?.trim() || null;
    if (dto.cap !== undefined) studio.cap = dto.cap?.trim() || null;
    if (dto.paese !== undefined) studio.paese = dto.paese?.trim() || null;
    if (dto.email !== undefined) studio.email = dto.email?.trim() || null;
    if (dto.telefono !== undefined) studio.telefono = dto.telefono?.trim() || null;
    if (dto.sitoWeb !== undefined) studio.sitoWeb = dto.sitoWeb?.trim() || null;
    if (dto.logoUrl !== undefined) studio.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.note !== undefined) studio.note = dto.note?.trim() || null;
    if (dto.attivo !== undefined) studio.attivo = Boolean(dto.attivo);

    if (dto.licenseId !== undefined) {
      const currentLicense = await this.licenseRepository.findOne({ where: { studioId: studio.id } });
      const nextLicenseId = dto.licenseId?.trim() || null;
      const activeStudioUsers = await this.userRepository.find({
        where: { studioId: studio.id, attivo: true },
        order: { createdAt: 'ASC' },
      });
      const normalizedKeepUserIds: string[] = Array.from(
        new Set((dto.keepUserIds || []).map((userId) => userId.trim()).filter(Boolean)),
      );

      if (!nextLicenseId) {
        if (activeStudioUsers.length > 0) {
          throw new ConflictException('Non puoi rimuovere la licenza finché sono presenti utenze attive. Disattiva prima le utenze.');
        }
        if (currentLicense) {
          currentLicense.studioId = null;
          await this.licenseRepository.save(currentLicense);
        }
      } else {
        if (studio.tipo !== 'licenziatario') {
          throw new ConflictException('Solo gli studi licenziatari possono avere una licenza principale');
        }
        const nextLicense = await this.licenseRepository.findOne({ where: { id: nextLicenseId } });
        if (!nextLicense) {
          throw new NotFoundException('Licenza non trovata');
        }
        if (nextLicense.studioId && nextLicense.studioId !== studio.id) {
          throw new ConflictException('La licenza selezionata è già assegnata ad un altro studio');
        }
        if (currentLicense && currentLicense.id === nextLicense.id && activeStudioUsers.length > nextLicense.numeroUtenze) {
          const excess = activeStudioUsers.length - nextLicense.numeroUtenze;
          throw new ConflictException(
            `La licenza consente massimo ${nextLicense.numeroUtenze} utenti attivi, ma questo licenziatario ne ha ${activeStudioUsers.length}. Devi disattivarne o eliminarne almeno ${excess}.`,
          );
        }
        if (currentLicense && currentLicense.id !== nextLicense.id && activeStudioUsers.length > nextLicense.numeroUtenze) {
          const activeUserIds = new Set(activeStudioUsers.map((user) => user.id));
          const keepUserIds = normalizedKeepUserIds.filter((userId) => activeUserIds.has(userId));
          if (keepUserIds.length === 0) {
            throw new ConflictException('La nuova licenza prevede meno utenti attivi. Seleziona le utenze da mantenere.');
          }
          if (keepUserIds.length > nextLicense.numeroUtenze) {
            throw new ConflictException('Hai selezionato più utenze di quelle consentite dalla nuova licenza.');
          }
          const usersToDeactivate = activeStudioUsers.filter((user) => !keepUserIds.includes(user.id));
          for (const user of usersToDeactivate) {
            user.attivo = false;
          }
          if (usersToDeactivate.length > 0) {
            await this.userRepository.save(usersToDeactivate);
          }
        }
        if (currentLicense && currentLicense.id !== nextLicense.id) {
          currentLicense.studioId = null;
          await this.licenseRepository.save(currentLicense);
        }
        nextLicense.studioId = studio.id;
        if (!nextLicense.intestatario) {
          nextLicense.intestatario = studio.ragioneSociale?.trim() || studio.nome;
        }
        await this.licenseRepository.save(nextLicense);
      }
    }

    return this.studioRepository.save(studio);
  }

  @Patch('studios/:id/deactivate')
  async deactivateStudio(@Param('id') id: string): Promise<CheckupStudio> {
    const studio = await this.studioRepository.findOne({ where: { id } });
    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }
    studio.attivo = false;
    return this.studioRepository.save(studio);
  }

  private isExpired(dateValue?: string | null) {
    if (!dateValue) return false;
    const today = new Date().toISOString().slice(0, 10);
    return dateValue < today;
  }

  private async ensureStudioCapacity(studioId: string, excludeUserId?: string) {
    const license = await this.licenseRepository.findOne({ where: { studioId } });
    if (!license) return;
    const where: any = { studioId, attivo: true };
    if (excludeUserId) where.id = Not(excludeUserId);
    const activeCount = await this.userRepository.count({ where });
    if (activeCount >= license.numeroUtenze) {
      throw new ConflictException('Limite utenti licenza raggiunto');
    }
  }

  private async resolveClientSublicense(clientId: string, sublicenseId?: string | null) {
    if (sublicenseId) {
      const sublicense = await this.sublicenseRepository.findOne({
        where: { id: sublicenseId },
        relations: ['client'],
      });
      if (!sublicense || !sublicense.clientId) {
        throw new ConflictException('Sublicenza non trovata');
      }
      if (sublicense.clientId !== clientId) {
        throw new ConflictException('La sublicenza selezionata non è assegnata al cliente');
      }
      return sublicense;
    }

    const sublicenses = await this.sublicenseRepository.find({
      where: { clientId, attiva: true },
    });
    if (!sublicenses.length) {
      throw new ConflictException('Sublicenza non trovata o non attiva');
    }
    if (sublicenses.length > 1) {
      throw new ConflictException('Seleziona la sublicenza da assegnare');
    }
    return sublicenses[0];
  }

  private async ensureClientCapacity(clientId: string, sublicenseId: string, excludeUserId?: string) {
    const sublicense = await this.resolveClientSublicense(clientId, sublicenseId);
    if (!sublicense.tipo || !sublicense.dataInizioValidita || !sublicense.dataScadenza) {
      throw new ConflictException('Completa la sublicenza prima di assegnarla');
    }
    if (!sublicense.attiva) {
      throw new ConflictException('La sublicenza non è attiva');
    }
    if (this.isExpired(sublicense.dataScadenza)) {
      throw new ConflictException('La sublicenza è scaduta');
    }

    const where: any = { sublicenseId, attivo: true };
    if (excludeUserId) where.id = Not(excludeUserId);
    const activeCount = await this.userRepository.count({ where });
    if (activeCount >= sublicense.numeroUtenze) {
      throw new ConflictException('Limite utenti sublicenza raggiunto');
    }
  }

  @Get('users')
  async listUsers(): Promise<CheckupUser[]> {
    return this.userRepository.find({
      relations: ['studio', 'client', 'sublicense', 'sublicense.license'],
      order: { createdAt: 'DESC' },
    });
  }

  @Post('users')
  async createUser(@Body() dto: CreateCheckupUserDto): Promise<CheckupUser> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email già in uso');
    }

    let resolvedSublicenseId: string | null = null;
    let resolvedModelId: string | null = null;
    if (dto.ruolo === 'cliente') {
      if (!dto.clientId) {
        throw new ConflictException('Seleziona il cliente per l\'utente');
      }
      const client = await this.clientRepository.findOne({ where: { id: dto.clientId, attivo: true } });
      if (!client) {
        throw new NotFoundException('Cliente non trovato');
      }
      const clientSublicense = await this.resolveClientSublicense(dto.clientId, dto.sublicenseId);
      resolvedSublicenseId = clientSublicense.id;
      resolvedModelId = clientSublicense.modelId ?? null;
      const macroAreaLabels = await this.getMacroAreaLabelMap(resolvedModelId);
      await this.validateMacroAreaSelection(resolvedModelId, dto.macroAreaAssignments);
      await this.validateMacroAreaSelection(resolvedModelId, dto.macroAreaOwner);
      this.ensureMacroOwnersWithinAssignments(dto.macroAreaOwner, dto.macroAreaAssignments);
      await this.ensureUniqueMacroOwners(dto.clientId, dto.macroAreaOwner || [], macroAreaLabels);
      if (dto.superOwner) {
        await this.ensureUniqueSuperOwner(dto.clientId);
      }
      await this.ensureClientCapacity(dto.clientId, clientSublicense.id);
    } else {
      if (!dto.studioId) {
        throw new ConflictException('Seleziona lo studio per l\'utente');
      }
      const studio = await this.studioRepository.findOne({ where: { id: dto.studioId } });
      if (!studio) {
        throw new NotFoundException('Studio non trovato');
      }
      if (studio.tipo !== 'licenziatario') {
        throw new ConflictException('Gli utenti staff possono essere creati solo per studi licenziatari');
      }
      await this.ensureStudioCapacity(dto.studioId);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      nome: dto.nome.trim(),
      cognome: dto.cognome.trim(),
      telefono: dto.telefono?.trim() || null,
      ruolo: dto.ruolo,
      studioId: dto.ruolo === 'cliente' ? null : dto.studioId ?? null,
      clientId: dto.ruolo === 'cliente' ? dto.clientId ?? null : null,
      sublicenseId: dto.ruolo === 'cliente' ? resolvedSublicenseId : null,
      azienda: dto.azienda?.trim() || null,
      macroAreaOwner: dto.ruolo === 'cliente' ? this.normalizeMacroOwnerList(dto.macroAreaOwner) : null,
      macroAreaAssignments: dto.ruolo === 'cliente' ? this.normalizeMacroAssignmentList(dto.macroAreaAssignments) : null,
      superOwner: dto.ruolo === 'cliente' ? Boolean(dto.superOwner) : false,
      mustChangePassword: true,
      attivo: true,
    });

    const saved = await this.userRepository.save(user);
    if (dto.ruolo === 'cliente' && dto.clientId) {
      const macroOwners = this.normalizeMacroOwnerList(dto.macroAreaOwner);
      await this.updateMacroOwnerData(dto.clientId, macroOwners, saved);
    }
    return saved;
  }

  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateCheckupUserDto,
  ): Promise<CheckupUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      if (email !== user.email) {
        const existing = await this.userRepository.findOne({ where: { email } });
        if (existing && existing.id !== user.id) {
          throw new ConflictException('Email già in uso');
        }
      }
      user.email = email;
    }

    if (dto.nome !== undefined) user.nome = dto.nome.trim();
    if (dto.cognome !== undefined) user.cognome = dto.cognome.trim();
    if (dto.telefono !== undefined) user.telefono = dto.telefono?.trim() || null;
    if (dto.azienda !== undefined) user.azienda = dto.azienda?.trim() || null;

    const nextRole = dto.ruolo ?? user.ruolo;
    const nextClientId = dto.clientId !== undefined ? dto.clientId || null : user.clientId;
    const nextStudioId = dto.studioId !== undefined ? dto.studioId || null : user.studioId;
    const nextSublicenseId = dto.sublicenseId !== undefined ? dto.sublicenseId || null : user.sublicenseId;
    const prevMacroOwner = this.normalizeMacroOwnerList(user.macroAreaOwner || undefined);
    const prevMacroAssignments = this.normalizeMacroAssignmentList(user.macroAreaAssignments || undefined);
    const nextSuperOwner = dto.superOwner !== undefined ? Boolean(dto.superOwner) : Boolean(user.superOwner);
    const nextMacroOwner = dto.macroAreaOwner !== undefined
      ? this.normalizeMacroOwnerList(dto.macroAreaOwner)
      : prevMacroOwner;
    const nextMacroAssignments = dto.macroAreaAssignments !== undefined
      ? this.normalizeMacroAssignmentList(dto.macroAreaAssignments)
      : prevMacroAssignments;
    const prevClientId = user.clientId;

    if (nextRole === 'cliente') {
      if (!nextClientId) {
        throw new ConflictException('Seleziona il cliente per l\'utente');
      }
      const client = await this.clientRepository.findOne({ where: { id: nextClientId, attivo: true } });
      if (!client) {
        throw new NotFoundException('Cliente non trovato');
      }
      if (!nextSublicenseId) {
        throw new ConflictException('Seleziona la sublicenza per l\'utente');
      }
      const clientSublicense = await this.resolveClientSublicense(nextClientId, nextSublicenseId);
      const modelId = clientSublicense.modelId ?? null;
      const macroAreaLabels = await this.getMacroAreaLabelMap(modelId);
      await this.validateMacroAreaSelection(modelId, nextMacroAssignments);
      await this.validateMacroAreaSelection(modelId, nextMacroOwner);
      this.ensureMacroOwnersWithinAssignments(nextMacroOwner, nextMacroAssignments);
      const shouldCheckOwnerConflicts =
        nextMacroOwner.length > 0
        && (dto.macroAreaOwner !== undefined || nextClientId !== prevClientId || nextRole !== user.ruolo);
      if (shouldCheckOwnerConflicts) {
        await this.ensureUniqueMacroOwners(nextClientId, nextMacroOwner, macroAreaLabels, user.id);
      }
      if (nextSuperOwner && (dto.superOwner !== undefined || nextClientId !== prevClientId || !user.superOwner)) {
        await this.ensureUniqueSuperOwner(nextClientId, user.id);
      }
      const activating = dto.attivo === true && !user.attivo;
      const movingClient = nextClientId !== user.clientId;
      const becomingClient = nextRole !== user.ruolo;
      const movingSublicense = nextSublicenseId !== user.sublicenseId;
      if (activating || movingClient || becomingClient) {
        await this.ensureClientCapacity(nextClientId, clientSublicense.id, user.id);
      }
      if (movingSublicense) {
        await this.ensureClientCapacity(nextClientId, clientSublicense.id, user.id);
      }
      user.clientId = nextClientId;
      user.studioId = null;
      user.sublicenseId = clientSublicense.id;
      user.macroAreaOwner = nextMacroOwner;
      user.macroAreaAssignments = nextMacroAssignments;
      user.superOwner = nextSuperOwner;
    } else {
      if (!nextStudioId) {
        throw new ConflictException('Seleziona lo studio per l\'utente');
      }
      const studio = await this.studioRepository.findOne({ where: { id: nextStudioId } });
      if (!studio) {
        throw new NotFoundException('Studio non trovato');
      }
      if (studio.tipo !== 'licenziatario') {
        throw new ConflictException('Gli utenti staff possono essere creati solo per studi licenziatari');
      }
      const activating = dto.attivo === true && !user.attivo;
      const movingStudio = nextStudioId !== user.studioId;
      const becomingStaff = nextRole !== user.ruolo;
      if (activating || movingStudio || becomingStaff) {
        await this.ensureStudioCapacity(nextStudioId, user.id);
      }
      user.studioId = nextStudioId;
      user.clientId = null;
      user.sublicenseId = null;
      user.macroAreaOwner = null;
      user.macroAreaAssignments = null;
      user.superOwner = false;
    }

    if (dto.ruolo !== undefined) user.ruolo = dto.ruolo;
    if (dto.attivo !== undefined) user.attivo = Boolean(dto.attivo);

    const saved = await this.userRepository.save(user);

    if (nextRole === 'cliente' && nextClientId) {
      const removed = prevMacroOwner.filter((m) => !nextMacroOwner.includes(m));
      const added = nextMacroOwner.filter((m) => !prevMacroOwner.includes(m));

      if (removed.length > 0) {
        const otherUsers = await this.userRepository.find({
          where: {
            id: Not(saved.id),
            clientId: nextClientId,
            attivo: true,
          },
        });
        const stillOwned = new Set<string>();
        otherUsers.forEach((u) => {
          (u.macroAreaOwner || []).forEach((macro) => stillOwned.add(macro));
        });
        const toClear = removed.filter((macro) => !stillOwned.has(macro));
        if (toClear.length) {
          await this.clearMacroOwnerData(nextClientId, toClear);
        }
      }

      if (added.length) {
        await this.updateMacroOwnerData(nextClientId, added, saved);
      }
    }

    if (prevClientId && prevClientId !== nextClientId && prevMacroOwner.length) {
      const otherUsers = await this.userRepository.find({
        where: {
          clientId: prevClientId,
          attivo: true,
        },
      });
      const stillOwned = new Set<string>();
      otherUsers
        .filter((u) => u.id !== saved.id)
        .forEach((u) => {
          (u.macroAreaOwner || []).forEach((macro) => stillOwned.add(macro));
        });
      const toClear = prevMacroOwner.filter((macro) => !stillOwned.has(macro));
      if (toClear.length) {
        await this.clearMacroOwnerData(prevClientId, toClear);
      }
    }

    return saved;
  }

  @Patch('users/:id/deactivate')
  async deactivateUser(@Param('id') id: string): Promise<CheckupUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }
    user.attivo = false;
    return this.userRepository.save(user);
  }

  @Put('users/:id/reset-password')
  async resetUserPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ): Promise<CheckupUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }
    user.password = await bcrypt.hash(body.newPassword, 10);
    user.mustChangePassword = true;
    return this.userRepository.save(user);
  }

  @Get('clients')
  async listClients(): Promise<CheckupClient[]> {
    return this.clientRepository.find({ order: { createdAt: 'DESC' } });
  }

  @Post('clients')
  async createClient(@Body() dto: CreateCheckupClientDto): Promise<CheckupClient> {
    const sublicense = await this.sublicenseRepository.findOne({ where: { id: dto.sublicenseId } });
    if (!sublicense) {
      throw new NotFoundException('Sublicenza non trovata');
    }
    if (sublicense.clientId) {
      throw new ConflictException('La sublicenza è già assegnata');
    }
    if (!sublicense.attiva) {
      throw new ConflictException('La sublicenza non è attiva');
    }
    if (!sublicense.tipo || !sublicense.dataInizioValidita || !sublicense.dataScadenza) {
      throw new ConflictException('Completa la sublicenza prima di assegnarla');
    }
    if (this.isExpired(sublicense.dataScadenza)) {
      throw new ConflictException('La sublicenza è scaduta');
    }

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
    return savedClient;
  }

  @Put('clients/:id')
  async updateClient(@Param('id') id: string, @Body() dto: UpdateCheckupClientDto): Promise<CheckupClient> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Cliente non trovato');
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

    return this.clientRepository.save(client);
  }

  @Patch('clients/:id/deactivate')
  async deactivateClient(@Param('id') id: string): Promise<CheckupClient> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Cliente non trovato');
    }
    client.attivo = false;
    return this.clientRepository.save(client);
  }

  @Get('licenses')
  async listLicenses(): Promise<CheckupLicense[]> {
    const licenses = await this.licenseRepository.find({
      relations: ['studio', 'sublicenses', 'sublicenses.model', 'sublicenses.clienteStudio', 'sublicenses.client'],
      order: { updatedAt: 'DESC' },
    });
    return licenses.map((license) => {
      license.numeroSottolicenze = license.sublicenses?.filter((s) => s.attiva).length ?? 0;
      return Object.assign(license, {
        activeSublicensesCount: license.sublicenses?.filter((s) => s.attiva).length ?? 0,
        inactiveSublicensesCount: license.sublicenses?.filter((s) => !s.attiva).length ?? 0,
        isActivated: Boolean(license.studioId),
      });
    });
  }

  @Get('sublicenses')
  async listSublicenses(): Promise<CheckupSublicense[]> {
    return this.sublicenseRepository.find({
      relations: ['license', 'license.studio', 'clienteStudio', 'client'],
      order: { updatedAt: 'DESC' },
    });
  }

  @Post('licenses')
  async upsertLicense(@Body() dto: CreateCheckupLicenseDto): Promise<CheckupLicense> {
    let studio: CheckupStudio | null = null;
    if (dto.studioId) {
      studio = await this.studioRepository.findOne({ where: { id: dto.studioId } });
      if (!studio) {
        throw new NotFoundException('Studio non trovato');
      }
      if (studio.tipo !== 'licenziatario') {
        throw new ConflictException('Solo gli studi licenziatari possono avere una licenza principale');
      }
      const existingForStudio = await this.licenseRepository.findOne({ where: { studioId: studio.id } });
      if (existingForStudio && existingForStudio.id !== dto.id) {
        throw new ConflictException('Lo studio selezionato ha già una licenza');
      }
    }

    const payload = {
      studioId: studio?.id ?? null,
      intestatario: dto.intestatario?.trim() || studio?.ragioneSociale?.trim() || studio?.nome || 'Licenza',
      tipo: dto.tipo.trim(),
      numeroUtenze: Number(dto.numeroUtenze),
      numeroSublicenze: 0,
      dataInizioValidita: dto.dataInizioValidita,
      dataScadenza: dto.dataScadenza,
    };

    if (dto.id) {
      const existing = await this.licenseRepository.findOne({ where: { id: dto.id } });
      if (!existing) {
        throw new NotFoundException('Licenza non trovata');
      }
      this.licenseRepository.merge(existing, {
        ...payload,
        numeroSottolicenze: existing.numeroSottolicenze ?? 0,
      });
      if (!existing.numeroLicenza) {
        existing.numeroLicenza = await this.generateLicenseNumber();
      }
      return this.licenseRepository.save(existing);
    }

    const license = this.licenseRepository.create({
      ...payload,
      numeroLicenza: await this.generateLicenseNumber(),
    });
    return this.licenseRepository.save(license);
  }

  private async generateLicenseNumber(): Promise<string> {
    while (true) {
      const code = randomBytes(8).toString('hex').toUpperCase();
      const exists = await this.licenseRepository.findOne({ where: { numeroLicenza: code } });
      if (!exists) return code;
    }
  }

  @Patch('licenses/:id/renew')
  async renewLicense(@Param('id') id: string, @Body() dto: RenewCheckupValidityDto): Promise<CheckupLicense> {
    const license = await this.licenseRepository.findOne({ where: { id } });
    if (!license) {
      throw new NotFoundException('Licenza non trovata');
    }
    license.dataInizioValidita = dto.dataInizioValidita;
    license.dataScadenza = dto.dataScadenza;
    return this.licenseRepository.save(license);
  }

  @Delete('licenses/:id')
  async deleteLicense(@Param('id') id: string): Promise<{ success: true }> {
    const license = await this.licenseRepository.findOne({ where: { id }, relations: ['sublicenses'] });
    if (!license) {
      throw new NotFoundException('Licenza non trovata');
    }
    if (license.studioId) {
      throw new ConflictException('Non puoi eliminare una licenza associata a uno studio');
    }
    await this.licenseRepository.remove(license);
    return { success: true };
  }

  @Post('sublicenses')
  async upsertSublicense(@Body() dto: CreateCheckupSublicenseDto): Promise<CheckupSublicense> {
    const license = await this.licenseRepository.findOne({ where: { id: dto.licenseId } });
    if (!license) {
      throw new NotFoundException('Licenza non trovata');
    }

    if (!dto.tipo || !dto.dataInizioValidita || !dto.dataScadenza) {
      throw new ConflictException('Compila tutti i campi obbligatori');
    }

    if (!dto.modelId) {
      throw new BadRequestException('Il modello è obbligatorio per la sublicenza');
    }

    const model = await this.questionModelRepository.findOne({ where: { id: dto.modelId } });
    if (!model) {
      throw new NotFoundException('Modello non trovato');
    }

    const payload: Partial<CheckupSublicense> = {
      licenseId: license.id,
      numeroUtenze: Number(dto.numeroUtenze),
      tipo: dto.tipo.trim(),
      dataInizioValidita: dto.dataInizioValidita,
      dataScadenza: dto.dataScadenza,
      attiva: dto.attiva ?? true,
      allowDocuments: dto.allowDocuments ?? true,
      modelId: dto.modelId,
    };

    if (dto.clientId !== undefined) {
      payload.clientId = dto.clientId || null;
      if (dto.clientId) {
        payload.clienteStudioId = null;
      }
    }
    if (dto.clienteStudioId !== undefined) {
      payload.clienteStudioId = dto.clienteStudioId || null;
      if (dto.clienteStudioId) {
        payload.clientId = null;
      }
    }

    if (dto.id) {
      const existing = await this.sublicenseRepository.findOne({ where: { id: dto.id } });
      if (!existing) {
        throw new NotFoundException('Sublicenza non trovata');
      }
      this.sublicenseRepository.merge(existing, payload);
      if (!existing.numeroSublicenza) {
        existing.numeroSublicenza = await this.generateSublicenseNumber();
      }
      const saved = await this.sublicenseRepository.save(existing);
      await this.refreshLicenseSublicenseCount(license.id);
      return saved;
    }

    const sublicense = this.sublicenseRepository.create({
      ...payload,
      numeroSublicenza: await this.generateSublicenseNumber(),
    });
    const saved = await this.sublicenseRepository.save(sublicense);
    await this.refreshLicenseSublicenseCount(license.id);
    return saved;
  }

  private async refreshLicenseSublicenseCount(licenseId: string) {
    const count = await this.sublicenseRepository.count({
      where: { licenseId, attiva: true },
    });
    await this.licenseRepository.update(licenseId, { numeroSottolicenze: count });
  }

  private async generateSublicenseNumber(): Promise<string> {
    while (true) {
      const code = randomBytes(8).toString('hex').toUpperCase();
      const exists = await this.sublicenseRepository.findOne({ where: { numeroSublicenza: code } });
      if (!exists) return code;
    }
  }

  @Patch('sublicenses/:id/renew')
  async renewSublicense(@Param('id') id: string, @Body() dto: RenewCheckupValidityDto): Promise<CheckupSublicense> {
    const sublicense = await this.sublicenseRepository.findOne({ where: { id } });
    if (!sublicense) {
      throw new NotFoundException('Sublicenza non trovata');
    }
    sublicense.dataInizioValidita = dto.dataInizioValidita;
    sublicense.dataScadenza = dto.dataScadenza;
    sublicense.attiva = true;
    const saved = await this.sublicenseRepository.save(sublicense);
    await this.refreshLicenseSublicenseCount(sublicense.licenseId);
    return saved;
  }

  @Delete('sublicenses/:id')
  async deleteSublicense(@Param('id') id: string): Promise<{ success: true }> {
    const sublicense = await this.sublicenseRepository.findOne({ where: { id } });
    if (!sublicense) {
      throw new NotFoundException('Sublicenza non trovata');
    }
    if (sublicense.clientId || sublicense.clienteStudioId) {
      throw new ConflictException('Non puoi eliminare una sublicenza già assegnata a un cliente');
    }
    const activeUsers = await this.userRepository.count({ where: { sublicenseId: id, attivo: true } });
    if (activeUsers > 0) {
      throw new ConflictException('Non puoi eliminare una sublicenza con utenti attivi associati');
    }
    const licenseId = sublicense.licenseId;
    await this.sublicenseRepository.remove(sublicense);
    await this.refreshLicenseSublicenseCount(licenseId);
    return { success: true };
  }

  // ==================== QUESTION MANAGEMENT ====================

  @Get('questions/structure')
  async getQuestionsStructure(@Query('modelId') modelId?: string) {
    return this.questionManagementService.getCompleteStructure(modelId);
  }

  @Get('questions/macro-areas')
  async getAllMacroAreas(@Query('modelId') modelId?: string) {
    return this.questionManagementService.getAllMacroAreas(modelId);
  }

  @Get('questions/sections')
  async getAllSections() {
    return this.questionManagementService.getAllSections();
  }

  @Get('questions/fields')
  async getAllFields() {
    return this.questionManagementService.getAllFields();
  }

  @Post('questions/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async importQuestionsExcel(
    @Body('modelId') modelId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!modelId) {
      throw new BadRequestException('ModelId mancante');
    }
    if (!file) {
      throw new BadRequestException('File mancante');
    }
    const model = await this.questionModelRepository.findOne({ where: { id: modelId } });
    if (!model) {
      throw new NotFoundException('Modello non trovato');
    }

    const workbook = new ExcelJS.Workbook();
    const fileBuffer = file.buffer as any;
    await workbook.xlsx.load(fileBuffer);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet?.getRow(1);
    const headerValues = Array.isArray(headerRow?.values) ? headerRow!.values : [];
    const columns = headerValues
      .slice(1)
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    const rows = worksheet ? Math.max(0, worksheet.rowCount - 1) : 0;

    return {
      ok: true,
      modelId,
      filename: file.originalname,
      rows,
      columns,
      message: 'Import ricevuto. Mappatura colonne in definizione.',
    };
  }

  // Models CRUD
  @Get('questions/models')
  async getAllModels() {
    return this.questionManagementService.getAllModels();
  }

  @Get('questions/models/:id')
  async getModelById(@Param('id') id: string) {
    return this.questionManagementService.getModelById(id);
  }

  @Post('questions/models')
  async createModel(@Body() dto: CreateQuestionModelDto) {
    return this.questionManagementService.createModel(dto);
  }

  @Put('questions/models/:id')
  async updateModel(@Param('id') id: string, @Body() dto: UpdateQuestionModelDto) {
    return this.questionManagementService.updateModel(id, dto);
  }

  @Delete('questions/models/:id')
  async deleteModel(@Param('id') id: string) {
    await this.questionManagementService.deleteModel(id);
    return { success: true, message: 'Modello eliminato' };
  }

  // Macro Areas CRUD
  @Post('questions/macro-areas')
  async createMacroArea(@Body() dto: CreateMacroAreaDto) {
    return this.questionManagementService.createMacroArea(dto);
  }

  @Put('questions/macro-areas/:id')
  async updateMacroArea(@Param('id') id: string, @Body() dto: UpdateMacroAreaDto) {
    return this.questionManagementService.updateMacroArea(parseInt(id), dto);
  }

  @Delete('questions/macro-areas/:id')
  async deleteMacroArea(@Param('id') id: string) {
    await this.questionManagementService.deleteMacroArea(parseInt(id));
    return { success: true, message: 'Macro area eliminata' };
  }

  // Sections CRUD
  @Post('questions/sections')
  async createSection(@Body() dto: CreateSectionDto) {
    return this.questionManagementService.createSection(dto);
  }

  @Put('questions/sections/:id')
  async updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.questionManagementService.updateSection(parseInt(id), dto);
  }

  @Delete('questions/sections/:id')
  async deleteSection(@Param('id') id: string) {
    await this.questionManagementService.deleteSection(parseInt(id));
    return { success: true, message: 'Sezione eliminata' };
  }

  // Fields CRUD
  @Post('questions/fields')
  async createField(@Body() dto: CreateFieldDto) {
    return this.questionManagementService.createField(dto);
  }

  @Put('questions/fields/:id')
  async updateField(@Param('id') id: string, @Body() dto: UpdateFieldDto) {
    return this.questionManagementService.updateField(parseInt(id), dto);
  }

  @Delete('questions/fields/:id')
  async deleteField(@Param('id') id: string) {
    await this.questionManagementService.deleteField(parseInt(id));
    return { success: true, message: 'Campo eliminato' };
  }

  // ── PDF Config ────────────────────────────────────────────────────────────

  @Get('pdf-config')
  async getPdfConfig(): Promise<PdfConfigDto> {
    const record = await this.pdfConfigRepository.findOne({ where: { id: 1 } });
    return record?.config ?? DEFAULT_PDF_CONFIG;
  }

  @Get('pdf-config/preview-context')
  async getPdfPreviewContext(): Promise<{ companyName: string; consultantName: string }> {
    const [studio, client] = await Promise.all([
      this.studioRepository.findOne({
        where: { attivo: true, tipo: 'licenziatario' },
        order: { updatedAt: 'DESC' },
      }),
      this.clientRepository.findOne({
        where: { attivo: true },
        order: { updatedAt: 'DESC' },
      }),
    ]);

    return {
      companyName: client?.ragioneSociale || client?.nome || 'Cliente di esempio',
      consultantName: studio?.ragioneSociale || studio?.nome || 'Studio licenziatario',
    };
  }

  @Put('pdf-config')
  async updatePdfConfig(@Body() dto: PdfConfigDto, @Req() req: any): Promise<PdfConfigDto> {
    let record = await this.pdfConfigRepository.findOne({ where: { id: 1 } });
    if (!record) {
      record = this.pdfConfigRepository.create({ id: 1 });
    }
    record.config = dto;
    record.updatedBy = req.user?.email ?? req.user?.username ?? null;
    await this.pdfConfigRepository.save(record);
    return record.config;
  }

  @Post('pdf-config/preview')
  @HttpCode(200)
  async previewPdfConfig(@Body() body: { html: string }, @Res() res: Response): Promise<void> {
    const pdf = await this.renderService.renderHtmlToPdf(body.html ?? '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="anteprima-report.pdf"');
    res.end(pdf);
  }

}
