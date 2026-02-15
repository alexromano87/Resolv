import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { UpdatePreassessmentDto } from './dto/update-preassessment.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import puppeteer from 'puppeteer';

@Injectable()
export class CheckupPreassessmentService {
  constructor(
    @InjectRepository(CheckupPreassessment)
    private preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
  ) {}

  private async getOrCreateByUserId(userId: string): Promise<CheckupPreassessment> {
    const existing = await this.preassessmentRepository.findOne({ where: { userId } });
    if (existing) return existing;

    const created = this.preassessmentRepository.create({
      userId,
      data: {},
      notes: {},
      fieldNotes: {},
      studioCanEdit: false,
    });

    return this.preassessmentRepository.save(created);
  }

  async getOrCreate(user: CheckupCurrentUserData): Promise<CheckupPreassessment> {
    return this.getOrCreateByUserId(user.id);
  }

  async update(user: CheckupCurrentUserData, dto: UpdatePreassessmentDto): Promise<CheckupPreassessment> {
    const record = await this.getOrCreate(user);

    if (dto.data !== undefined) record.data = dto.data;
    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.fieldNotes !== undefined) record.fieldNotes = dto.fieldNotes;
    if (dto.studioCanEdit !== undefined) record.studioCanEdit = dto.studioCanEdit;

    return this.preassessmentRepository.save(record);
  }

  private async ensureAccess(currentUser: CheckupCurrentUserData, client: CheckupUser) {
    if (currentUser.id === client.id) return;
    if (!currentUser.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
    if (!client.clientId) {
      throw new ForbiddenException('Cliente non associato');
    }

    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (license) {
      const sublicense = await this.sublicenseRepository.findOne({
        where: { licenseId: license.id, clientId: client.clientId, attiva: true },
      });
      if (sublicense) return;
    }

    throw new ForbiddenException('Non autorizzato');
  }

  async getClient(clientId: string, currentUser: CheckupCurrentUserData) {
    const client = await this.userRepository.findOne({
      where: { id: clientId, attivo: true },
      relations: ['client'],
    });
    if (!client || client.ruolo !== 'cliente') {
      throw new NotFoundException('Cliente non trovato');
    }

    await this.ensureAccess(currentUser, client);
    const preassessment = await this.getOrCreateByUserId(client.id);
    return {
      client: {
        id: client.id,
        nome: client.nome,
        cognome: client.cognome,
        email: client.email,
        azienda: client.azienda || client.client?.ragioneSociale || client.client?.nome || null,
        studioId: null,
        studioNome: null,
      },
      preassessment,
    };
  }

  async updateClient(clientId: string, dto: UpdatePreassessmentDto, currentUser: CheckupCurrentUserData) {
    const client = await this.userRepository.findOne({
      where: { id: clientId, attivo: true },
      relations: ['client'],
    });
    if (!client || client.ruolo !== 'cliente') {
      throw new NotFoundException('Cliente non trovato');
    }

    await this.ensureAccess(currentUser, client);
    const record = await this.getOrCreateByUserId(client.id);

    if (!record.studioCanEdit) {
      throw new ForbiddenException('Modifiche non autorizzate dal cliente');
    }

    if (dto.data !== undefined) record.data = dto.data;
    if (dto.notes !== undefined) record.notes = dto.notes;
    if (dto.fieldNotes !== undefined) record.fieldNotes = dto.fieldNotes;
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

    const clients = await this.userRepository.find({
      where: { ruolo: 'cliente', clientId: In(clientIds), attivo: true },
      order: { cognome: 'ASC', nome: 'ASC' },
      relations: ['client'],
    });

    if (clients.length === 0) {
      return [];
    }

    const clientUserIds = clients.map((c) => c.id);
    const preassessments = await this.preassessmentRepository.find({
      where: clientUserIds.map((id) => ({ userId: id })),
    });

    const byUserId = new Map(preassessments.map((p) => [p.userId, p]));

    return clients.map((client) => {
      const pre = byUserId.get(client.id) || null;
      const azienda = client.azienda || client.client?.ragioneSociale || client.client?.nome || null;
      return {
        client: {
          id: client.id,
          nome: client.nome,
          cognome: client.cognome,
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
