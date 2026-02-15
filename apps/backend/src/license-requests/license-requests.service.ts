import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenseRequest, LicenseRequestStatus } from './license-request.entity';
import { CreateLicenseRequestDto } from './dto/create-license-request.dto';
import { StudiService } from '../studi/studi.service';

@Injectable()
export class LicenseRequestsService {
  constructor(
    @InjectRepository(LicenseRequest)
    private licenseRepo: Repository<LicenseRequest>,
    private studiService: StudiService,
  ) {}

  async create(dto: CreateLicenseRequestDto) {
    const existing = await this.licenseRepo.findOne({
      where: { adminEmail: dto.adminEmail, status: 'pending' },
    });
    if (existing) {
      throw new ConflictException('Esiste già una richiesta pendente con questa email');
    }
    const entity = this.licenseRepo.create({
      ...dto,
      status: 'pending',
      studioMaxUtenti: dto.studioMaxUtenti ?? null,
      studioRagioneSociale: dto.studioRagioneSociale ?? null,
      studioPartitaIva: dto.studioPartitaIva ?? null,
      studioCodiceFiscale: dto.studioCodiceFiscale ?? null,
      studioIndirizzo: dto.studioIndirizzo ?? null,
      studioCitta: dto.studioCitta ?? null,
      studioCap: dto.studioCap ?? null,
      studioProvincia: dto.studioProvincia ?? null,
      studioTelefono: dto.studioTelefono ?? null,
      studioEmail: dto.studioEmail ?? null,
      studioPec: dto.studioPec ?? null,
      adminTelefono: dto.adminTelefono ?? null,
      adminCodiceFiscale: dto.adminCodiceFiscale ?? null,
      note: dto.note ?? null,
    });
    return this.licenseRepo.save(entity);
  }

  async findAll(status?: LicenseRequestStatus) {
    const where = status ? { status } : undefined;
    return this.licenseRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const request = await this.licenseRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Richiesta non trovata');
    }
    return request;
  }

  async provision(id: string, adminPassword?: string) {
    const request = await this.findOne(id);
    if (request.status === 'provisioned') {
      return request;
    }

    const { studio, adminUser, tempPassword } = await this.studiService.createWithAdmin({
      nome: request.studioNome,
      tipologia: request.studioTipologia,
      maxUtenti: request.studioMaxUtenti ?? undefined,
      ragioneSociale: request.studioRagioneSociale ?? undefined,
      partitaIva: request.studioPartitaIva ?? undefined,
      codiceFiscale: request.studioCodiceFiscale ?? undefined,
      indirizzo: request.studioIndirizzo ?? undefined,
      citta: request.studioCitta ?? undefined,
      cap: request.studioCap ?? undefined,
      provincia: request.studioProvincia ?? undefined,
      telefono: request.studioTelefono ?? undefined,
      email: request.studioEmail ?? undefined,
      pec: request.studioPec ?? undefined,
      adminEmail: request.adminEmail,
      adminNome: request.adminNome,
      adminCognome: request.adminCognome,
      adminTelefono: request.adminTelefono ?? undefined,
      adminCodiceFiscale: request.adminCodiceFiscale ?? undefined,
      adminPassword,
    });

    request.status = 'provisioned';
    request.provisionedStudioId = studio.id;
    request.provisionedAdminUserId = adminUser.id;
    await this.licenseRepo.save(request);

    return {
      request,
      studio,
      adminUser,
      tempPassword,
    };
  }
}
