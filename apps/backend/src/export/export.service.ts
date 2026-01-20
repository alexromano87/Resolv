// src/export/export.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Pratica } from '../pratiche/pratica.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Documento } from '../documenti/documento.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { User } from '../users/user.entity';
import { ExportRequestDto, ExportEntity } from './dto/export-request.dto';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Pratica)
    private praticheRepo: Repository<Pratica>,
    @InjectRepository(Cliente)
    private clientiRepo: Repository<Cliente>,
    @InjectRepository(Debitore)
    private debitoriRepo: Repository<Debitore>,
    @InjectRepository(Avvocato)
    private avvocatiRepo: Repository<Avvocato>,
    @InjectRepository(MovimentoFinanziario)
    private movimentiRepo: Repository<MovimentoFinanziario>,
    @InjectRepository(Documento)
    private documentiRepo: Repository<Documento>,
    @InjectRepository(Alert)
    private alertsRepo: Repository<Alert>,
    @InjectRepository(Ticket)
    private ticketsRepo: Repository<Ticket>,
    @InjectRepository(AuditLog)
    private auditLogsRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async exportData(dto: ExportRequestDto): Promise<Buffer> {
    const data = await this.fetchData(dto);

    switch (dto.format) {
      case 'csv':
        return this.generateCSV(data);
      case 'xlsx':
        return this.generateExcel(data, dto.entity);
      case 'json':
        return this.generateJSON(data);
      default:
        throw new Error('Formato non supportato');
    }
  }

  async backupStudio(studioId: string, includeDocuments = true, includeAuditLogs = false): Promise<Buffer> {
    const backup: any = {
      metadata: {
        studioId,
        exportDate: new Date().toISOString(),
        version: '1.0',
      },
      data: {},
    };

    // Export pratiche con relazioni
    const pratiche = await this.praticheRepo.find({
      where: { studioId },
      relations: ['cliente', 'debitore', 'avvocati', 'movimentiFinanziari'],
    });
    backup.data.pratiche = pratiche;

    // Export clienti
    const clienti = await this.clientiRepo.find({
      where: { studioId },
      relations: ['clientiDebitori', 'clientiDebitori.debitore'],
    });
    backup.data.clienti = clienti;

    // Export debitori
    const debitori = await this.debitoriRepo.find({
      where: { studioId },
    });
    backup.data.debitori = debitori;

    // Export avvocati
    const avvocati = await this.avvocatiRepo.find({
      where: { studioId },
    });
    backup.data.avvocati = avvocati;

    // Export movimenti finanziari
    const movimenti = await this.movimentiRepo.find({
      where: { pratica: { studioId } },
      relations: ['pratica'],
    });
    backup.data.movimentiFinanziari = movimenti;

    // Export alerts
    const alerts = await this.alertsRepo.find({
      where: { pratica: { studioId } },
      relations: ['pratica'],
    });
    backup.data.alerts = alerts;

    // Export tickets
    const tickets = await this.ticketsRepo.find({
      where: { pratica: { studioId } },
      relations: ['pratica'],
    });
    backup.data.tickets = tickets;

    // Export documenti (solo metadata)
    if (includeDocuments) {
      const documenti = await this.documentiRepo.find({
        where: { pratica: { studioId } },
        relations: ['pratica', 'cartella'],
      });
      backup.data.documenti = this.sanitizeDocumenti(documenti);
    }

    // Export audit logs
    if (includeAuditLogs) {
      const auditLogs = await this.auditLogsRepo.find({
        where: { studioId },
      });
      backup.data.auditLogs = auditLogs;
    }

    // Export users dello studio
    const users = await this.usersRepo.find({
      where: { studioId },
    });
    backup.data.users = users.map((u) => ({
      ...u,
      password: undefined, // Remove sensitive data
    }));

    return Buffer.from(JSON.stringify(backup, null, 2), 'utf-8');
  }

  private async fetchData(dto: ExportRequestDto): Promise<any[]> {
    const { entity, studioId, dataInizio, dataFine, includeInactive, searchTerm } = dto;

    const createWhere = (
      baseWheres: any[],
      options: {
        supportsAttivo?: boolean;
        dateField?: string;
        searchFields?: string[];
      },
    ) => {
      let wheres = baseWheres.map((base) => {
        const where = { ...base };

        if (options.supportsAttivo && includeInactive !== true) {
          where.attivo = true;
        }

        if (options.dateField && dataInizio && dataFine) {
          where[options.dateField] = Between(new Date(dataInizio), new Date(dataFine));
        }

        return where;
      });

      if (searchTerm && options.searchFields?.length) {
        const term = Like(`%${searchTerm}%`);
        wheres = wheres.flatMap((base) =>
          options.searchFields!.map((field) => ({
            ...base,
            [field]: term,
          })),
        );
      }

      return wheres.length === 1 ? wheres[0] : wheres;
    };

    switch (entity) {
      case ExportEntity.PRATICHE: {
        const where = createWhere(
          studioId ? [{ studioId }] : [{}],
          {
            supportsAttivo: true,
            dateField: 'createdAt',
            searchFields: ['riferimentoCredito', 'note'],
          },
        );
        return this.praticheRepo.find({
          where,
          relations: ['cliente', 'debitore', 'avvocati'],
        });
      }

      case ExportEntity.CLIENTI: {
        const where = createWhere(
          studioId ? [{ studioId }] : [{}],
          {
            supportsAttivo: true,
            dateField: 'createdAt',
            searchFields: ['ragioneSociale', 'email', 'partitaIva', 'codiceFiscale'],
          },
        );
        return this.clientiRepo.find({ where });
      }

      case ExportEntity.DEBITORI: {
        const where = createWhere(
          studioId ? [{ studioId }] : [{}],
          {
            supportsAttivo: true,
            dateField: 'createdAt',
            searchFields: ['nome', 'cognome', 'ragioneSociale', 'partitaIva', 'codiceFiscale', 'email', 'pec'],
          },
        );
        return this.debitoriRepo.find({ where });
      }

      case ExportEntity.AVVOCATI: {
        const where = createWhere(
          studioId ? [{ studioId }] : [{}],
          {
            supportsAttivo: true,
            dateField: 'createdAt',
            searchFields: ['nome', 'cognome', 'email', 'codiceFiscale'],
          },
        );
        return this.avvocatiRepo.find({ where });
      }

      case ExportEntity.MOVIMENTI_FINANZIARI: {
        const baseWheres = studioId
          ? [{ studioId }, { pratica: { studioId } }]
          : [{}];
        const where = createWhere(
          baseWheres,
          {
            dateField: 'data',
            searchFields: ['oggetto', 'tipo'],
          },
        );
        return this.movimentiRepo.find({
          where,
          relations: ['pratica'],
        });
      }

      case ExportEntity.DOCUMENTI: {
        const baseWheres = studioId
          ? [{ studioId }, { pratica: { studioId } }]
          : [{}];
        const where = createWhere(
          baseWheres,
          {
            supportsAttivo: true,
            dateField: 'dataCreazione',
            searchFields: ['nome', 'descrizione', 'nomeOriginale'],
          },
        );
        const documenti = await this.documentiRepo.find({
          where,
          relations: ['pratica', 'cartella'],
        });
        return this.sanitizeDocumenti(documenti);
      }

      case ExportEntity.ALERTS: {
        const baseWheres = studioId
          ? [{ studioId }, { pratica: { studioId } }]
          : [{}];
        const where = createWhere(
          baseWheres,
          {
            supportsAttivo: true,
            dateField: 'dataCreazione',
            searchFields: ['titolo', 'descrizione'],
          },
        );
        return this.alertsRepo.find({
          where,
          relations: ['pratica'],
        });
      }

      case ExportEntity.TICKETS: {
        const baseWheres = studioId
          ? [{ studioId }, { pratica: { studioId } }]
          : [{}];
        const where = createWhere(
          baseWheres,
          {
            supportsAttivo: true,
            dateField: 'dataCreazione',
            searchFields: ['oggetto', 'descrizione', 'autore'],
          },
        );
        return this.ticketsRepo.find({
          where,
          relations: ['pratica'],
        });
      }

      case ExportEntity.AUDIT_LOGS: {
        const where = createWhere(
          studioId ? [{ studioId }] : [{}],
          {
            dateField: 'createdAt',
            searchFields: ['description', 'userEmail', 'entityName', 'action', 'entityType'],
          },
        );
        return this.auditLogsRepo.find({ where });
      }

      case ExportEntity.USERS: {
        const where = createWhere(
          studioId ? [{ studioId }] : [{}],
          {
            supportsAttivo: true,
            dateField: 'createdAt',
            searchFields: ['email', 'nome', 'cognome'],
          },
        );
        const users = await this.usersRepo.find({ where });
        return users.map((u) => ({ ...u, password: undefined }));
      }

      default:
        throw new Error('Entità non supportata');
    }
  }

  private generateCSV(data: any[]): Buffer {
    if (!data || data.length === 0) {
      return Buffer.from('Nessun dato disponibile', 'utf-8');
    }

    // Get all unique keys from all objects
    const keys = Array.from(
      new Set(data.flatMap((item) => Object.keys(this.flattenObject(item)))),
    );

    // Create CSV header
    const header = keys.join(',');

    // Create CSV rows
    const rows = data.map((item) => {
      const flatItem = this.flattenObject(item);
      return keys
        .map((key) => {
          const value = flatItem[key];
          if (value === null || value === undefined) return '';
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value).replace(/"/g, '""');
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        })
        .join(',');
    });

    const csv = [header, ...rows].join('\n');
    return Buffer.from(csv, 'utf-8');
  }

  private async generateExcel(data: any[], entityName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(entityName);

    if (!data || data.length === 0) {
      worksheet.addRow(['Nessun dato disponibile']);
      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    // Get columns from first item
    const flatData = data.map((item) => this.flattenObject(item));
    const columns = Object.keys(flatData[0]).map((key) => ({
      header: key,
      key: key,
      width: 20,
    }));

    worksheet.columns = columns;

    // Add rows
    flatData.forEach((item) => {
      worksheet.addRow(item);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private generateJSON(data: any[]): Buffer {
    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  private sanitizeDocumenti(documenti: Documento[]): Array<Omit<Documento, 'percorsoFile'>> {
    return documenti.map(({ percorsoFile, ...rest }) => rest);
  }

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively flatten nested objects
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        // Convert arrays to comma-separated strings
        flattened[newKey] = value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v)).join('; ');
      } else if (value instanceof Date) {
        flattened[newKey] = value.toISOString();
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }
}
