import { Body, ConflictException, Controller, Get, NotFoundException, Post, UseGuards, Param, Put, Patch, Delete } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperuserGuard } from '../auth/superuser.guard';
import { CheckupStudio } from '../checkup/studios/checkup-studio.entity';
import { CheckupClient } from '../checkup/clients/checkup-client.entity';
import { CheckupUser } from '../checkup/users/checkup-user.entity';
import { CheckupLicense } from '../checkup/licenses/checkup-license.entity';
import { CheckupSublicense } from '../checkup/licenses/checkup-sublicense.entity';
import { QuestionMacroArea } from '../checkup/entities/question-macro-area.entity';
import { QuestionSection } from '../checkup/entities/question-section.entity';
import { QuestionField } from '../checkup/entities/question-field.entity';
import { QuestionManagementService } from '../checkup/services/question-management.service';
import { CreateCheckupStudioDto } from './dto/create-checkup-studio.dto';
import { CreateCheckupLicenseDto } from './dto/create-checkup-license.dto';
import { CreateCheckupSublicenseDto } from './dto/create-checkup-sublicense.dto';
import { UpdateCheckupStudioDto } from './dto/update-checkup-studio.dto';
import { CreateCheckupUserDto } from '../checkup/users/dto/create-checkup-user.dto';
import { UpdateCheckupUserDto } from '../checkup/users/dto/update-checkup-user.dto';
import { CreateCheckupClientDto } from '../checkup/studios/dto/create-checkup-client.dto';
import { UpdateCheckupClientDto } from '../checkup/studios/dto/update-checkup-client.dto';
import {
  CreateMacroAreaDto,
  UpdateMacroAreaDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateFieldDto,
  UpdateFieldDto
} from '../checkup/dto/question-management.dto';

@Controller('admin/checkup')
@UseGuards(JwtAuthGuard, SuperuserGuard)
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
    private questionManagementService: QuestionManagementService,
  ) {}

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
    return this.studioRepository.save(studio);
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
    if (dto.note !== undefined) studio.note = dto.note?.trim() || null;
    if (dto.attivo !== undefined) studio.attivo = Boolean(dto.attivo);

    if (dto.licenseId !== undefined) {
      const currentLicense = await this.licenseRepository.findOne({ where: { studioId: studio.id } });
      const nextLicenseId = dto.licenseId?.trim() || null;

      if (!nextLicenseId) {
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
        throw new ConflictException('Sottolicenza non trovata');
      }
      if (sublicense.clientId !== clientId) {
        throw new ConflictException('La sottolicenza selezionata non è assegnata al cliente');
      }
      return sublicense;
    }

    const sublicenses = await this.sublicenseRepository.find({
      where: { clientId, attiva: true },
    });
    if (!sublicenses.length) {
      throw new ConflictException('Sottolicenza non trovata o non attiva');
    }
    if (sublicenses.length > 1) {
      throw new ConflictException('Seleziona la sottolicenza da assegnare');
    }
    return sublicenses[0];
  }

  private async ensureClientCapacity(clientId: string, sublicenseId: string, excludeUserId?: string) {
    const sublicense = await this.resolveClientSublicense(clientId, sublicenseId);
    if (!sublicense.tipo || !sublicense.dataInizioValidita || !sublicense.dataScadenza) {
      throw new ConflictException('Completa la sottolicenza prima di assegnarla');
    }
    if (!sublicense.attiva) {
      throw new ConflictException('La sottolicenza non è attiva');
    }
    if (this.isExpired(sublicense.dataScadenza)) {
      throw new ConflictException('La sottolicenza è scaduta');
    }

    const where: any = { sublicenseId, attivo: true };
    if (excludeUserId) where.id = Not(excludeUserId);
    const activeCount = await this.userRepository.count({ where });
    if (activeCount >= sublicense.numeroUtenze) {
      throw new ConflictException('Limite utenti sottolicenza raggiunto');
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
      mustChangePassword: true,
      attivo: true,
    });

    return this.userRepository.save(user);
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

    if (nextRole === 'cliente') {
      if (!nextClientId) {
        throw new ConflictException('Seleziona il cliente per l\'utente');
      }
      const client = await this.clientRepository.findOne({ where: { id: nextClientId, attivo: true } });
      if (!client) {
        throw new NotFoundException('Cliente non trovato');
      }
      if (!nextSublicenseId) {
        throw new ConflictException('Seleziona la sottolicenza per l\'utente');
      }
      const clientSublicense = await this.resolveClientSublicense(nextClientId, nextSublicenseId);
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
    }

    if (dto.ruolo !== undefined) user.ruolo = dto.ruolo;
    if (dto.attivo !== undefined) user.attivo = Boolean(dto.attivo);

    return this.userRepository.save(user);
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
      throw new NotFoundException('Sottolicenza non trovata');
    }
    if (sublicense.clientId) {
      throw new ConflictException('La sottolicenza è già assegnata');
    }
    if (!sublicense.attiva) {
      throw new ConflictException('La sottolicenza non è attiva');
    }
    if (!sublicense.tipo || !sublicense.dataInizioValidita || !sublicense.dataScadenza) {
      throw new ConflictException('Completa la sottolicenza prima di assegnarla');
    }
    if (this.isExpired(sublicense.dataScadenza)) {
      throw new ConflictException('La sottolicenza è scaduta');
    }

    const client = this.clientRepository.create({
      nome: dto.nome.trim(),
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

    Object.assign(client, {
      nome: dto.nome?.trim() ?? client.nome,
      ragioneSociale: dto.ragioneSociale?.trim() ?? client.ragioneSociale,
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
    return this.licenseRepository.find({
      relations: ['studio', 'sublicenses', 'sublicenses.clienteStudio', 'sublicenses.client'],
      order: { updatedAt: 'DESC' },
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
      numeroSottolicenze: 0,
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

  @Post('sublicenses')
  async upsertSublicense(@Body() dto: CreateCheckupSublicenseDto): Promise<CheckupSublicense> {
    const license = await this.licenseRepository.findOne({ where: { id: dto.licenseId } });
    if (!license) {
      throw new NotFoundException('Licenza non trovata');
    }

    if (!dto.tipo || !dto.dataInizioValidita || !dto.dataScadenza) {
      throw new ConflictException('Compila tutti i campi obbligatori');
    }

    const payload: Partial<CheckupSublicense> = {
      licenseId: license.id,
      numeroUtenze: Number(dto.numeroUtenze),
      tipo: dto.tipo.trim(),
      dataInizioValidita: dto.dataInizioValidita,
      dataScadenza: dto.dataScadenza,
      attiva: dto.attiva ?? true,
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
        throw new NotFoundException('Sottolicenza non trovata');
      }
      this.sublicenseRepository.merge(existing, payload);
      if (!existing.numeroSublicenza) {
        existing.numeroSublicenza = await this.generateSublicenseNumber();
      }
      return this.sublicenseRepository.save(existing);
    }

    const sublicense = this.sublicenseRepository.create({
      ...payload,
      numeroSublicenza: await this.generateSublicenseNumber(),
    });
    return this.sublicenseRepository.save(sublicense);
  }

  private async generateSublicenseNumber(): Promise<string> {
    while (true) {
      const code = randomBytes(8).toString('hex').toUpperCase();
      const exists = await this.sublicenseRepository.findOne({ where: { numeroSublicenza: code } });
      if (!exists) return code;
    }
  }

  // ==================== QUESTION MANAGEMENT ====================

  @Get('questions/structure')
  async getQuestionsStructure() {
    return this.questionManagementService.getCompleteStructure();
  }

  @Get('questions/macro-areas')
  async getAllMacroAreas() {
    return this.questionManagementService.getAllMacroAreas();
  }

  @Get('questions/sections')
  async getAllSections() {
    return this.questionManagementService.getAllSections();
  }

  @Get('questions/fields')
  async getAllFields() {
    return this.questionManagementService.getAllFields();
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
}
