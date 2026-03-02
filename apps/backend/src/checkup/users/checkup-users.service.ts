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

@Injectable()
export class CheckupUsersService {
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
    private readonly mailService: CheckupMailService,
  ) {}

  private async getAccessibleClientIds(currentUser: CheckupCurrentUserData): Promise<string[]> {
    if (!currentUser.studioId || currentUser.ruolo !== 'admin_studio') return [];
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
    if (isClient) {
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
      mustChangePassword: true,
    });

    const saved = await this.userRepository.save(user);

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
    const nextClientId = dto.clientId !== undefined ? dto.clientId?.trim() || null : user.clientId;
    const nextStudioId = dto.studioId !== undefined ? dto.studioId?.trim() || null : user.studioId;
    const nextSublicenseId = dto.sublicenseId !== undefined ? dto.sublicenseId?.trim() || null : user.sublicenseId;

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
      updates.clientId = nextClientId;
      updates.studioId = null;
      updates.sublicenseId = nextSublicense.id;

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
    return this.userRepository.save(user);
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
