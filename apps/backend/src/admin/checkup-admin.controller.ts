import { Body, ConflictException, Controller, Get, NotFoundException, Post, UseGuards, Param, Put, Patch } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperuserGuard } from '../auth/superuser.guard';
import { CheckupStudio } from '../checkup/studios/checkup-studio.entity';
import { CheckupUser } from '../checkup/users/checkup-user.entity';
import { CheckupLicense } from '../checkup/licenses/checkup-license.entity';
import { CheckupSublicense } from '../checkup/licenses/checkup-sublicense.entity';
import { CreateCheckupStudioDto } from './dto/create-checkup-studio.dto';
import { CreateCheckupAdminUserDto } from './dto/create-checkup-admin-user.dto';
import { CreateCheckupLicenseDto } from './dto/create-checkup-license.dto';
import { CreateCheckupSublicenseDto } from './dto/create-checkup-sublicense.dto';
import { UpdateCheckupAdminUserDto } from './dto/update-checkup-admin-user.dto';
import { UpdateCheckupStudioDto } from './dto/update-checkup-studio.dto';

@Controller('admin/checkup')
@UseGuards(JwtAuthGuard, SuperuserGuard)
export class CheckupAdminController {
  constructor(
    @InjectRepository(CheckupStudio)
    private studioRepository: Repository<CheckupStudio>,
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
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

  @Get('users')
  async listAdminUsers(): Promise<CheckupUser[]> {
    return this.userRepository.find({
      where: { ruolo: 'admin_studio' },
      relations: ['studio'],
      order: { createdAt: 'DESC' },
    });
  }

  @Post('users')
  async createAdminUser(@Body() dto: CreateCheckupAdminUserDto): Promise<CheckupUser> {
    const email = dto.email.toLowerCase().trim();
    const studio = await this.studioRepository.findOne({ where: { id: dto.studioId } });
    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }
    if (studio.tipo !== 'licenziatario') {
      throw new ConflictException('Gli admin possono essere creati solo per studi licenziatari');
    }

    const license = await this.licenseRepository.findOne({ where: { studioId: studio.id } });
    if (license) {
      const activeCount = await this.userRepository.count({
        where: { studioId: studio.id, attivo: true },
      });
      if (activeCount >= license.numeroUtenze) {
        throw new ConflictException('Limite utenti licenza raggiunto');
      }
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email già in uso');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      nome: dto.nome.trim(),
      cognome: dto.cognome.trim(),
      telefono: dto.telefono?.trim() || null,
      ruolo: 'admin_studio',
      studioId: studio.id,
      mustChangePassword: true,
      attivo: true,
    });

    return this.userRepository.save(user);
  }

  @Put('users/:id')
  async updateAdminUser(
    @Param('id') id: string,
    @Body() dto: UpdateCheckupAdminUserDto,
  ): Promise<CheckupUser> {
    const user = await this.userRepository.findOne({
      where: { id, ruolo: 'admin_studio' },
      relations: ['studio'],
    });
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

    const previousStudioId = user.studioId;
    const targetStudioId = dto.studioId ?? previousStudioId;
    if (targetStudioId) {
      const studio = await this.studioRepository.findOne({ where: { id: targetStudioId } });
      if (!studio) {
        throw new NotFoundException('Studio non trovato');
      }
      if (studio.tipo !== 'licenziatario') {
        throw new ConflictException('Gli admin possono essere creati solo per studi licenziatari');
      }
    }

    const activating = dto.attivo === true && !user.attivo;
    const movingStudio = dto.studioId !== undefined && dto.studioId !== previousStudioId;
    if ((activating || movingStudio) && targetStudioId) {
      const license = await this.licenseRepository.findOne({ where: { studioId: targetStudioId } });
      if (license) {
        const activeCount = await this.userRepository.count({
          where: { studioId: targetStudioId, attivo: true, id: Not(user.id) },
        });
        if (activeCount >= license.numeroUtenze) {
          throw new ConflictException('Limite utenti licenza raggiunto');
        }
      }
    }

    if (targetStudioId) {
      user.studioId = targetStudioId;
    }

    if (dto.attivo !== undefined) {
      user.attivo = dto.attivo;
    }

    return this.userRepository.save(user);
  }

  @Patch('users/:id/deactivate')
  async deactivateAdminUser(@Param('id') id: string): Promise<CheckupUser> {
    const user = await this.userRepository.findOne({ where: { id, ruolo: 'admin_studio' } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }
    user.attivo = false;
    return this.userRepository.save(user);
  }

  @Put('users/:id/reset-password')
  async resetAdminPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ): Promise<CheckupUser> {
    const user = await this.userRepository.findOne({ where: { id, ruolo: 'admin_studio' } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }
    user.password = await bcrypt.hash(body.newPassword, 10);
    return this.userRepository.save(user);
  }

  @Get('licenses')
  async listLicenses(): Promise<CheckupLicense[]> {
    return this.licenseRepository.find({
      relations: ['studio', 'sublicenses', 'sublicenses.clienteStudio'],
      order: { updatedAt: 'DESC' },
    });
  }

  @Get('sublicenses')
  async listSublicenses(): Promise<CheckupSublicense[]> {
    return this.sublicenseRepository.find({
      relations: ['license', 'license.studio', 'clienteStudio'],
      order: { updatedAt: 'DESC' },
    });
  }

  @Post('licenses')
  async upsertLicense(@Body() dto: CreateCheckupLicenseDto): Promise<CheckupLicense> {
    const studio = await this.studioRepository.findOne({ where: { id: dto.studioId } });
    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }
    if (studio.tipo !== 'licenziatario') {
      throw new ConflictException('Solo gli studi licenziatari possono avere una licenza principale');
    }

    const payload = {
      studioId: studio.id,
      intestatario: dto.intestatario?.trim() || studio.ragioneSociale?.trim() || studio.nome,
      tipo: dto.tipo.trim(),
      numeroUtenze: Number(dto.numeroUtenze),
      numeroSottolicenze: Number(dto.numeroSottolicenze ?? 0),
      dataInizioValidita: dto.dataInizioValidita,
      dataScadenza: dto.dataScadenza,
    };

    const existing = await this.licenseRepository.findOne({ where: { studioId: studio.id } });
    if (existing) {
      this.licenseRepository.merge(existing, payload);
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

    const payload = {
      licenseId: license.id,
      numeroUtenze: Number(dto.numeroUtenze),
      tipo: dto.tipo.trim(),
      dataInizioValidita: dto.dataInizioValidita,
      dataScadenza: dto.dataScadenza,
      attiva: dto.attiva ?? true,
    };

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

    if (license.numeroSottolicenze <= 0) {
      throw new ConflictException('La licenza non prevede sottolicenze');
    }

    const total = await this.sublicenseRepository.count({ where: { licenseId: license.id } });
    if (total >= license.numeroSottolicenze) {
      throw new ConflictException('Limite sottolicenze raggiunto');
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
}
