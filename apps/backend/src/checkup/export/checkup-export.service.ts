import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { CheckupStudio } from '../studios/checkup-studio.entity';
import { CheckupClient } from '../clients/checkup-client.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupPreassessment } from '../preassessment/checkup-preassessment.entity';
import { QuestionModel } from '../entities/question-model.entity';
import { QuestionMacroArea } from '../entities/question-macro-area.entity';
import { QuestionSection } from '../entities/question-section.entity';
import { QuestionField } from '../entities/question-field.entity';
import { CheckupExportEntity, CheckupExportFormat, CheckupExportRequestDto } from './dto/checkup-export-request.dto';

@Injectable()
export class CheckupExportService {
  constructor(
    @InjectRepository(CheckupStudio)
    private studiosRepo: Repository<CheckupStudio>,
    @InjectRepository(CheckupClient)
    private clientsRepo: Repository<CheckupClient>,
    @InjectRepository(CheckupUser)
    private usersRepo: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private licensesRepo: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicensesRepo: Repository<CheckupSublicense>,
    @InjectRepository(CheckupPreassessment)
    private preassessmentsRepo: Repository<CheckupPreassessment>,
    @InjectRepository(QuestionModel)
    private questionModelsRepo: Repository<QuestionModel>,
    @InjectRepository(QuestionMacroArea)
    private questionMacroRepo: Repository<QuestionMacroArea>,
    @InjectRepository(QuestionSection)
    private questionSectionsRepo: Repository<QuestionSection>,
    @InjectRepository(QuestionField)
    private questionFieldsRepo: Repository<QuestionField>,
  ) {}

  async exportData(dto: CheckupExportRequestDto): Promise<Buffer> {
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

  async exportBackup(licenziatarioId?: string): Promise<Buffer> {
    const payload = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        licenziatarioId: licenziatarioId || null,
      },
      data: {
        licenziatari: await this.fetchData({ entity: CheckupExportEntity.LICENZIATARI, format: CheckupExportFormat.JSON, licenziatarioId }),
        sublicenziatari: await this.fetchData({ entity: CheckupExportEntity.Sublicenziatari, format: CheckupExportFormat.JSON, licenziatarioId }),
        utenti: await this.fetchData({ entity: CheckupExportEntity.UTENTI, format: CheckupExportFormat.JSON, licenziatarioId }),
        licenze: await this.fetchData({ entity: CheckupExportEntity.LICENZE, format: CheckupExportFormat.JSON, licenziatarioId }),
        sublicenze: await this.fetchData({ entity: CheckupExportEntity.SUBLICENZE, format: CheckupExportFormat.JSON, licenziatarioId }),
        risposte: await this.fetchData({ entity: CheckupExportEntity.RISPOSTE, format: CheckupExportFormat.JSON, licenziatarioId }),
        domande: await this.fetchData({ entity: CheckupExportEntity.DOMANDE, format: CheckupExportFormat.JSON, licenziatarioId }),
      },
    };
    return Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
  }

  private async fetchData(dto: CheckupExportRequestDto): Promise<any[]> {
    const licenziatarioId = dto.licenziatarioId;

    const licenses = licenziatarioId
      ? await this.licensesRepo.find({ where: { studioId: licenziatarioId } })
      : await this.licensesRepo.find();
    const licenseIds = licenses.map((l) => l.id);

    const sublicenses = licenseIds.length > 0
      ? await this.sublicensesRepo.find({ where: { licenseId: In(licenseIds) } })
      : licenziatarioId
        ? []
        : await this.sublicensesRepo.find();
    const clientIds = sublicenses.map((s) => s.clientId).filter(Boolean) as string[];

    const modelIds = new Set<string>();
    licenses.forEach((l) => {
      if (l.modelId) modelIds.add(l.modelId);
      (l.modelIds || []).forEach((id) => modelIds.add(id));
    });

    switch (dto.entity) {
      case CheckupExportEntity.LICENZIATARI:
        return this.studiosRepo.find({
          where: licenziatarioId
            ? { id: licenziatarioId, tipo: 'licenziatario' }
            : { tipo: 'licenziatario' },
        });

      case CheckupExportEntity.Sublicenziatari:
        return clientIds.length > 0
          ? this.clientsRepo.find({ where: { id: In(clientIds) } })
          : licenziatarioId
            ? []
            : this.clientsRepo.find();

      case CheckupExportEntity.UTENTI: {
        if (!licenziatarioId) {
          const users = await this.usersRepo.find();
          return users.map((u) => ({ ...u, password: undefined }));
        }
        const users = await this.usersRepo.find({
          where: [
            { studioId: licenziatarioId },
            ...(clientIds.length ? [{ clientId: In(clientIds) }] : []),
          ],
        });
        return users.map((u) => ({ ...u, password: undefined }));
      }

      case CheckupExportEntity.LICENZE:
        return licenses;

      case CheckupExportEntity.SUBLICENZE:
        return sublicenses;

      case CheckupExportEntity.RISPOSTE:
        return clientIds.length > 0
          ? this.preassessmentsRepo.find({ where: { clientId: In(clientIds) } })
          : licenziatarioId
            ? []
            : this.preassessmentsRepo.find();

      case CheckupExportEntity.DOMANDE: {
        const modelIdList = Array.from(modelIds);
        const models = modelIdList.length
          ? await this.questionModelsRepo.find({ where: { id: In(modelIdList) } })
          : await this.questionModelsRepo.find();
        const macroAreas = modelIdList.length
          ? await this.questionMacroRepo.find({ where: { modelId: In(modelIdList) } })
          : await this.questionMacroRepo.find();
        const macroIds = macroAreas.map((m) => m.id);
        const sections = macroIds.length
          ? await this.questionSectionsRepo.find({ where: { macroAreaId: In(macroIds) } })
          : await this.questionSectionsRepo.find();
        const sectionIds = sections.map((s) => s.id);
        const fields = sectionIds.length
          ? await this.questionFieldsRepo.find({ where: { sectionId: In(sectionIds) } })
          : await this.questionFieldsRepo.find();

        const macroMap = new Map(macroAreas.map((m) => [m.id, m]));
        const sectionMap = new Map(sections.map((s) => [s.id, s]));
        const modelMap = new Map(models.map((m) => [m.id, m]));

        return fields.map((field) => {
          const section = sectionMap.get(field.sectionId);
          const macro = section ? macroMap.get(section.macroAreaId) : undefined;
          const model = macro ? modelMap.get(macro.modelId) : undefined;
          return {
            modelId: model?.id || null,
            modelCode: model?.code || null,
            modelLabel: model?.label || null,
            macroCode: macro?.code || null,
            macroLabel: macro?.label || null,
            macroColor: macro?.color || null,
            macroSortOrder: macro?.sortOrder ?? null,
            sectionCode: section?.code || null,
            sectionTitle: section?.title || null,
            sectionDescription: section?.description || null,
            sectionSortOrder: section?.sortOrder ?? null,
            fieldId: field.fieldId,
            label: field.label,
            type: field.type,
            options: field.options,
            required: field.required,
            help: field.help,
            allowDocuments: field.allowDocuments,
            weight: field.weight,
            sortOrder: field.sortOrder,
          };
        });
      }

      default:
        return [];
    }
  }

  private generateCSV(data: any[]): Buffer {
    if (!data || data.length === 0) {
      return Buffer.from('Nessun dato disponibile', 'utf-8');
    }
    const keys = Array.from(new Set(data.flatMap((item) => Object.keys(this.flattenObject(item)))));
    const header = keys.join(',');
    const rows = data.map((item) => {
      const flatItem = this.flattenObject(item);
      return keys
        .map((key) => {
          const value = flatItem[key];
          if (value === null || value === undefined) return '';
          const stringValue = String(value).replace(/"/g, '""');
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        })
        .join(',');
    });
    return Buffer.from([header, ...rows].join('\n'), 'utf-8');
  }

  private async generateExcel(data: any[], entityName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(entityName);

    if (!data || data.length === 0) {
      worksheet.addRow(['Nessun dato disponibile']);
      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    const flatData = data.map((item) => this.flattenObject(item));
    const columns = Object.keys(flatData[0]).map((key) => ({
      header: key,
      key: key,
      width: 20,
    }));
    worksheet.columns = columns;
    flatData.forEach((item) => worksheet.addRow(item));
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

  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
    return flattened;
  }
}
