import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse/sync';
import { Repository } from 'typeorm';
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
import { CheckupImportEntity } from './dto/checkup-import-request.dto';

type ImportError = {
  row: number;
  reason: string;
};

type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
};

@Injectable()
export class CheckupImportService {
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

  async importBackup(buffer: Buffer, licenziatarioId?: string) {
    const payload = JSON.parse(buffer.toString('utf-8')) as {
      data?: Record<string, any[]>;
    };

    if (!payload || typeof payload !== 'object' || !payload.data) {
      throw new Error('Formato backup non valido');
    }

    const results: Record<string, ImportResult> = {};
    const errors: Array<{ entity: string; row: number; reason: string }> = [];

    const runImport = async (
      entity: string,
      repo: Repository<any>,
      records: any[],
      requiredFields: string[],
      options?: { forceStudioId?: string },
    ) => {
      const result = await this.importRecords(repo, records, {
        allowedFields: this.getAllowedFields(repo),
        requiredFields,
        rowOffset: 1,
        coerce: true,
        forceStudioId: options?.forceStudioId,
      });
      results[entity] = result;
      result.errors.forEach((err) => errors.push({ entity, ...err }));
    };

    const data = payload.data;

    if (Array.isArray(data.licenziatari)) {
      await runImport(
        'licenziatari',
        this.studiosRepo,
        this.filterByStudioId(data.licenziatari, licenziatarioId),
        ['nome'],
      );
    }

    if (Array.isArray(data.sublicenziatari)) {
      await runImport(
        'sublicenziatari',
        this.clientsRepo,
        data.sublicenziatari,
        ['nome'],
      );
    }

    if (Array.isArray(data.utenti)) {
      await runImport(
        'utenti',
        this.usersRepo,
        data.utenti,
        ['email', 'nome', 'cognome', 'ruolo'],
        { forceStudioId: licenziatarioId },
      );
    }

    if (Array.isArray(data.licenze)) {
      await runImport(
        'licenze',
        this.licensesRepo,
        data.licenze,
        ['modelId', 'intestatario', 'tipo', 'numeroUtenze'],
        { forceStudioId: licenziatarioId },
      );
    }

    if (Array.isArray(data.sublicenze)) {
      await runImport(
        'sublicenze',
        this.sublicensesRepo,
        data.sublicenze,
        ['licenseId', 'numeroUtenze'],
      );
    }

    if (Array.isArray(data.risposte)) {
      await runImport(
        'risposte',
        this.preassessmentsRepo,
        data.risposte,
        ['userId', 'clientId'],
      );
    }

    if (Array.isArray(data.domande)) {
      const result = await this.importDomandeRecords(data.domande);
      results.domande = result;
      result.errors.forEach((err) => errors.push({ entity: 'domande', ...err }));
    }

    return { results, errors };
  }

  async importCsv(entity: CheckupImportEntity, buffer: Buffer, licenziatarioId?: string): Promise<ImportResult> {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    }) as Record<string, string>[];

    switch (entity) {
      case CheckupImportEntity.LICENZIATARI:
        return this.importRecords(this.studiosRepo, this.filterByStudioId(records, licenziatarioId), {
          allowedFields: this.getAllowedFields(this.studiosRepo),
          requiredFields: ['nome'],
          rowOffset: 2,
          coerce: true,
        });
      case CheckupImportEntity.SUBLICENZIATARI:
        return this.importRecords(this.clientsRepo, records, {
          allowedFields: this.getAllowedFields(this.clientsRepo),
          requiredFields: ['nome'],
          rowOffset: 2,
          coerce: true,
        });
      case CheckupImportEntity.UTENTI:
        return this.importRecords(this.usersRepo, records, {
          allowedFields: this.getAllowedFields(this.usersRepo),
          requiredFields: ['email', 'nome', 'cognome', 'ruolo'],
          rowOffset: 2,
          coerce: true,
          forceStudioId: licenziatarioId,
        });
      case CheckupImportEntity.LICENZE:
        return this.importRecords(this.licensesRepo, records, {
          allowedFields: this.getAllowedFields(this.licensesRepo),
          requiredFields: ['modelId', 'intestatario', 'tipo', 'numeroUtenze'],
          rowOffset: 2,
          coerce: true,
          forceStudioId: licenziatarioId,
        });
      case CheckupImportEntity.SUBLICENZE:
        return this.importRecords(this.sublicensesRepo, records, {
          allowedFields: this.getAllowedFields(this.sublicensesRepo),
          requiredFields: ['licenseId', 'numeroUtenze'],
          rowOffset: 2,
          coerce: true,
        });
      case CheckupImportEntity.RISPOSTE:
        return this.importRecords(this.preassessmentsRepo, records, {
          allowedFields: this.getAllowedFields(this.preassessmentsRepo),
          requiredFields: ['userId', 'clientId'],
          rowOffset: 2,
          coerce: true,
        });
      case CheckupImportEntity.DOMANDE:
        return this.importDomandeRecords(records, 2);
      default:
        return {
          total: records.length,
          imported: 0,
          skipped: records.length,
          errors: [{ row: 1, reason: 'Entità non supportata' }],
        };
    }
  }

  private async importDomandeRecords(records: any[], rowOffset = 1): Promise<ImportResult> {
    const result: ImportResult = {
      total: records.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < records.length; i += 1) {
      const row = i + rowOffset;
      const record = records[i] || {};

      const modelId = this.pickValue(record, ['modelId', 'model_id']);
      const modelCode = this.pickValue(record, ['modelCode', 'model_code']);
      const modelLabel = this.pickValue(record, ['modelLabel', 'model_label', 'modelName', 'model_name']);

      const macroCode = this.pickValue(record, ['macroCode', 'macro_code']);
      const macroLabel = this.pickValue(record, ['macroLabel', 'macro_label']);
      const macroColor = this.pickValue(record, ['macroColor', 'macro_color']);
      const macroSortOrder = this.toNumber(this.pickValue(record, ['macroSortOrder', 'macro_sort_order']));

      const sectionCode = this.pickValue(record, ['sectionCode', 'section_code']);
      const sectionTitle = this.pickValue(record, ['sectionTitle', 'section_title']);
      const sectionDescription = this.pickValue(record, ['sectionDescription', 'section_description']);
      const sectionSortOrder = this.toNumber(this.pickValue(record, ['sectionSortOrder', 'section_sort_order']));

      const fieldId = this.pickValue(record, ['fieldId', 'field_id']);
      const label = this.pickValue(record, ['label']);
      const type = this.pickValue(record, ['type']);
      const options = this.parseOptions(this.pickValue(record, ['options']));
      const required = this.toBoolean(this.pickValue(record, ['required']));
      const help = this.pickValue(record, ['help']);
      const allowDocuments = this.toBoolean(this.pickValue(record, ['allowDocuments', 'allow_documents']));
      const weight = this.toNumber(this.pickValue(record, ['weight']));
      const sortOrder = this.toNumber(this.pickValue(record, ['sortOrder', 'sort_order']));

      if (!modelId && !modelCode) {
        result.skipped += 1;
        result.errors.push({ row, reason: 'ModelId o ModelCode mancante' });
        continue;
      }
      if (!macroCode || !macroLabel) {
        result.skipped += 1;
        result.errors.push({ row, reason: 'Macro area (code/label) mancante' });
        continue;
      }
      if (!sectionCode || !sectionTitle) {
        result.skipped += 1;
        result.errors.push({ row, reason: 'Sezione (code/title) mancante' });
        continue;
      }
      if (!fieldId || !label || !type) {
        result.skipped += 1;
        result.errors.push({ row, reason: 'Campo domanda incompleto (fieldId/label/type)' });
        continue;
      }

      try {
        let model: QuestionModel | null = null;
        if (modelId) {
          model = await this.questionModelsRepo.findOne({ where: { id: String(modelId) } });
        }
        if (!model && modelCode) {
          model = await this.questionModelsRepo.findOne({ where: { code: String(modelCode) } });
        }
        if (!model) {
          if (!modelCode || !modelLabel) {
            result.skipped += 1;
            result.errors.push({ row, reason: 'ModelCode/ModelLabel mancanti per creare il modello' });
            continue;
          }
          model = await this.questionModelsRepo.save({
            id: modelId ? String(modelId) : undefined,
            code: String(modelCode),
            label: String(modelLabel),
            description: null,
            attivo: true,
            status: 'draft',
            version: 1,
          });
        }
        if (!model) {
          result.skipped += 1;
          result.errors.push({ row, reason: 'Impossibile creare il modello' });
          continue;
        }

        let macro = await this.questionMacroRepo.findOne({ where: { code: String(macroCode) } });
        if (!macro) {
          if (!macroColor) {
            result.skipped += 1;
            result.errors.push({ row, reason: 'Macro area color mancante' });
            continue;
          }
          macro = await this.questionMacroRepo.save({
            code: String(macroCode),
            label: String(macroLabel),
            color: String(macroColor),
            sortOrder: Number.isFinite(macroSortOrder) ? macroSortOrder : 0,
            modelId: model.id,
          });
        }

        let section: QuestionSection | null = await this.questionSectionsRepo.findOne({ where: { code: String(sectionCode) } });
        if (!section) {
          section = await this.questionSectionsRepo.save({
            code: String(sectionCode),
            title: String(sectionTitle),
            description: sectionDescription ? String(sectionDescription) : undefined,
            sortOrder: Number.isFinite(sectionSortOrder) ? sectionSortOrder : 0,
            macroAreaId: macro.id,
          } as Partial<QuestionSection>);
        }
        if (!section) {
          result.skipped += 1;
          result.errors.push({ row, reason: 'Impossibile creare la sezione' });
          continue;
        }

        const existingField = await this.questionFieldsRepo.findOne({
          where: { fieldId: String(fieldId), sectionId: section.id },
        });

        if (existingField) {
          await this.questionFieldsRepo.save({
            ...existingField,
            label: String(label),
            type: String(type),
            options: options ?? existingField.options,
            required: required ?? existingField.required,
            help: help ? String(help) : existingField.help,
            allowDocuments: allowDocuments ?? existingField.allowDocuments,
            weight: Number.isFinite(weight) ? weight : existingField.weight,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : existingField.sortOrder,
          });
        } else {
          await this.questionFieldsRepo.save({
            fieldId: String(fieldId),
            label: String(label),
            type: String(type),
            options,
            required: required ?? false,
            help: help ? String(help) : null,
            allowDocuments: allowDocuments ?? true,
            weight: Number.isFinite(weight) ? weight : 1,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
            sectionId: section.id,
          } as Partial<QuestionField>);
        }

        result.imported += 1;
      } catch (error: any) {
        result.skipped += 1;
        result.errors.push({
          row,
          reason: error?.message || 'Errore durante l\'import',
        });
      }
    }

    return result;
  }

  private async importRecords(
    repo: Repository<any>,
    records: any[],
    options: {
      allowedFields: string[];
      requiredFields: string[];
      rowOffset: number;
      coerce?: boolean;
      forceStudioId?: string;
    },
  ): Promise<ImportResult> {
    const result: ImportResult = {
      total: records.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < records.length; i += 1) {
      const raw = records[i];
      const row = i + options.rowOffset;
      const record = this.pickFields(raw, options.allowedFields, options.coerce);
      if (options.forceStudioId && options.allowedFields.includes('studioId')) {
        record.studioId = options.forceStudioId;
      }

      const missing = options.requiredFields.filter((field) => {
        const value = record[field];
        return value === undefined || value === null || value === '';
      });

      if (missing.length > 0) {
        result.skipped += 1;
        result.errors.push({
          row,
          reason: `Campi obbligatori mancanti: ${missing.join(', ')}`,
        });
        continue;
      }

      try {
        await repo.save(record);
        result.imported += 1;
      } catch (error: any) {
        result.skipped += 1;
        result.errors.push({
          row,
          reason: error?.message || 'Errore durante l\'import',
        });
      }
    }

    return result;
  }

  private getAllowedFields(repo: Repository<any>): string[] {
    return repo.metadata.columns.map((column) => column.propertyName);
  }

  private pickFields(record: Record<string, any>, allowed: string[], coerce?: boolean) {
    const out: Record<string, any> = {};
    allowed.forEach((field) => {
      if (record[field] === undefined) return;
      out[field] = coerce ? this.coerceValue(field, record[field]) : record[field];
    });
    return out;
  }

  private coerceValue(field: string, value: any) {
    if (value === '') return undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          // ignore
        }
      }
    }
    if (this.isBooleanField(field)) {
      return this.toBoolean(value);
    }
    if (this.isNumberField(field)) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }

  private isBooleanField(field: string) {
    return [
      'attivo',
      'allowDocuments',
      'required',
      'studioCanEdit',
      'mustChangePassword',
      'twoFactorEnabled',
      'isLatest',
    ].includes(field);
  }

  private isNumberField(field: string) {
    return [
      'numeroUtenze',
      'numeroSottolicenze',
      'sortOrder',
      'version',
      'weight',
    ].includes(field);
  }

  private pickValue(record: Record<string, any>, keys: string[]) {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
        return record[key];
      }
    }
    return undefined;
  }

  private toBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'si';
  }

  private toNumber(value: any): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private parseOptions(value: any): string[] | null {
    if (value === undefined || value === null || value === '') return null;
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [String(parsed)];
        } catch {
          // fallthrough
        }
      }
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [String(value)];
  }

  private filterByStudioId(records: any[], licenziatarioId?: string): any[] {
    if (!licenziatarioId) return records;
    return records.filter((record) => record && record.id === licenziatarioId);
  }
}
