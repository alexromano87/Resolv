// src/import/import.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { MovimentoFinanziario } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Documento } from '../documenti/documento.entity';
import { Alert } from '../alerts/alert.entity';
import { Ticket } from '../tickets/ticket.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { User } from '../users/user.entity';
import { ImportCsvEntity } from './dto/import-request.dto';

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
export class ImportService {
  constructor(
    @InjectRepository(Cliente)
    private clientiRepo: Repository<Cliente>,
    @InjectRepository(Debitore)
    private debitoriRepo: Repository<Debitore>,
    @InjectRepository(Avvocato)
    private avvocatiRepo: Repository<Avvocato>,
    @InjectRepository(Pratica)
    private praticheRepo: Repository<Pratica>,
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

  async importBackup(buffer: Buffer) {
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
      allowedFields: string[],
      requiredFields: string[],
      rowOffset: number = 1,
    ) => {
      const result = await this.importRecords(repo, records, {
        allowedFields,
        requiredFields,
        rowOffset,
      });
      results[entity] = result;
      result.errors.forEach((err) => errors.push({ entity, ...err }));
    };

    const data = payload.data;

    if (Array.isArray(data.clienti)) {
      await runImport(
        'clienti',
        this.clientiRepo,
        data.clienti,
        this.clienteFields(),
        ['ragioneSociale', 'email'],
      );
    }

    if (Array.isArray(data.debitori)) {
      await runImport(
        'debitori',
        this.debitoriRepo,
        data.debitori,
        this.debitoreFields(),
        ['tipoSoggetto'],
      );
    }

    if (Array.isArray(data.avvocati)) {
      await runImport(
        'avvocati',
        this.avvocatiRepo,
        data.avvocati,
        this.avvocatoFields(),
        ['nome', 'cognome', 'email'],
      );
    }

    if (Array.isArray(data.users)) {
      await runImport(
        'users',
        this.usersRepo,
        data.users,
        this.userFields(),
        ['email', 'password', 'nome', 'cognome', 'ruolo'],
      );
    }

    if (Array.isArray(data.pratiche)) {
      await runImport(
        'pratiche',
        this.praticheRepo,
        data.pratiche,
        this.praticaFields(),
        ['clienteId', 'debitoreId'],
      );

      await this.syncPraticheAvvocati(data.pratiche);
    }

    if (Array.isArray(data.movimentiFinanziari)) {
      await runImport(
        'movimentiFinanziari',
        this.movimentiRepo,
        data.movimentiFinanziari,
        this.movimentoFields(),
        ['praticaId', 'tipo', 'importo', 'data'],
      );
    }

    if (Array.isArray(data.documenti)) {
      await runImport(
        'documenti',
        this.documentiRepo,
        data.documenti,
        this.documentoFields(),
        ['nome', 'percorsoFile', 'nomeOriginale', 'estensione', 'tipo', 'dimensione'],
      );
    }

    if (Array.isArray(data.alerts)) {
      await runImport(
        'alerts',
        this.alertsRepo,
        data.alerts,
        this.alertFields(),
        ['praticaId', 'titolo', 'descrizione', 'destinatario', 'dataScadenza'],
      );
    }

    if (Array.isArray(data.tickets)) {
      await runImport(
        'tickets',
        this.ticketsRepo,
        data.tickets,
        this.ticketFields(),
        ['oggetto', 'descrizione', 'autore'],
      );
    }

    if (Array.isArray(data.auditLogs)) {
      await runImport(
        'auditLogs',
        this.auditLogsRepo,
        data.auditLogs,
        this.auditLogFields(),
        ['action', 'entityType'],
      );
    }

    return {
      results,
      errors,
    };
  }

  async importCsv(entity: ImportCsvEntity, buffer: Buffer): Promise<ImportResult> {
    let expectedHeaders: string[];
    let csvMap: Record<string, string>;
    let records: any[];
    let requiredFields: string[];
    let repo: Repository<any>;
    let allowedFields: string[];
    let uniqueFields: string[] = [];

    switch (entity) {
      case ImportCsvEntity.CLIENTI:
        csvMap = this.clienteCsvMap();
        expectedHeaders = Object.keys(csvMap);
        requiredFields = ['ragioneSociale', 'email'];
        repo = this.clientiRepo;
        allowedFields = this.clienteFields();
        uniqueFields = ['email'];
        break;

      case ImportCsvEntity.DEBITORI:
        csvMap = this.debitoreCsvMap();
        expectedHeaders = Object.keys(csvMap);
        requiredFields = ['tipoSoggetto'];
        repo = this.debitoriRepo;
        allowedFields = this.debitoreFields();
        uniqueFields = ['codiceFiscale'];
        break;

      case ImportCsvEntity.USERS:
        csvMap = this.userCsvMap();
        expectedHeaders = Object.keys(csvMap);
        requiredFields = ['email', 'nome', 'cognome', 'ruolo'];
        repo = this.usersRepo;
        allowedFields = this.userFields();
        uniqueFields = ['email'];
        break;

      case ImportCsvEntity.AVVOCATI:
        csvMap = this.avvocatoCsvMap();
        expectedHeaders = Object.keys(csvMap);
        requiredFields = ['nome', 'cognome', 'email'];
        repo = this.avvocatiRepo;
        allowedFields = this.avvocatoFields();
        uniqueFields = ['email'];
        break;

      case ImportCsvEntity.PRATICHE:
        csvMap = this.praticaCsvMap();
        expectedHeaders = Object.keys(csvMap);
        requiredFields = ['clienteId', 'debitoreId'];
        repo = this.praticheRepo;
        allowedFields = this.praticaFields();
        uniqueFields = ['numeroPratica'];
        break;

      default:
        throw new Error(`Tipo entità non supportato: ${entity}`);
    }

    const { delimiter, fromLine } = this.detectCsvLayout(buffer, expectedHeaders);
    const rows = parse(buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter,
      from_line: fromLine,
      relax_column_count: true,
    }) as Record<string, string>[];

    records = rows.map((row) => this.normalizeCsvRow(row, csvMap));

    return this.importRecords(repo, records, {
      allowedFields,
      requiredFields,
      rowOffset: 2, // header row
      coerce: true,
      uniqueFields,
    });
  }

  private async importRecords(
    repo: Repository<any>,
    records: any[],
    options: {
      allowedFields: string[];
      requiredFields: string[];
      rowOffset: number;
      coerce?: boolean;
      uniqueFields?: string[];
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

      // Check for duplicates if uniqueFields are specified
      if (options.uniqueFields && options.uniqueFields.length > 0) {
        let isDuplicate = false;
        for (const uniqueField of options.uniqueFields) {
          const value = record[uniqueField];
          if (value) {
            try {
              const existing = await repo.findOne({
                where: { [uniqueField]: value },
              });
              if (existing) {
                result.skipped += 1;
                result.errors.push({
                  row,
                  reason: `Record già esistente (${uniqueField}: ${value})`,
                });
                isDuplicate = true;
                break;
              }
            } catch (error: any) {
              // Continue if check fails
            }
          }
        }
        if (isDuplicate) continue;
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
    if (field === 'attivo') {
      return String(value).toLowerCase() === 'true' || String(value) === '1';
    }
    if (['dataNascita', 'dataAffidamento', 'dataChiusura', 'dataScadenza', 'data', 'dataCreazione', 'dataAggiornamento'].includes(field)) {
      return value ? new Date(value) : undefined;
    }
    if (['capitale', 'importoRecuperatoCapitale', 'anticipazioni', 'importoRecuperatoAnticipazioni', 'compensiLegali', 'compensiLiquidati', 'interessi', 'interessiRecuperati', 'importo'].includes(field)) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }

  private normalizeCsvRow(row: Record<string, string>, map: Record<string, string>) {
    const normalized: Record<string, any> = {};
    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = this.normalizeHeader(key);
      const target = map[normalizedKey];
      if (target) {
        normalized[target] = value;
      }
    });
    return normalized;
  }

  private normalizeHeader(header: string) {
    return header
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private detectCsvLayout(buffer: Buffer, expectedHeaders: string[]) {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).map((line) => line.replace(/^\uFEFF/, ''));
    const expectedSet = new Set(expectedHeaders.map((header) => this.normalizeHeader(header)));

    let bestDelimiter: ',' | ';' | '\t' = ',';
    let bestCount = 0;
    let headerLineIndex = 0;

    let bestMatchCount = 0;

    lines.forEach((line, index) => {
      if (!line.trim()) return;
      ([';', ',', '\t'] as Array<',' | ';' | '\t'>).forEach((delimiter) => {
        if (!line.includes(delimiter)) return;
        const parts = line.split(delimiter).map((part) => this.normalizeHeader(part));
        const matchCount = parts.filter((part) => expectedSet.has(part)).length;
        if (matchCount > bestMatchCount) {
          bestMatchCount = matchCount;
          bestDelimiter = delimiter;
          headerLineIndex = index;
          bestCount = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
        }
      });
    });

    if (bestMatchCount >= 2) {
      return { delimiter: bestDelimiter, fromLine: headerLineIndex + 1 };
    }

    // Fallback: scegli il delimitatore con più occorrenze nelle prime righe non vuote.
    const sample = lines.filter((line) => line.trim() !== '').slice(0, 5);
    const totals = { ',': 0, ';': 0, '\t': 0 };
    sample.forEach((line) => {
      totals[','] += (line.match(/,/g) || []).length;
      totals[';'] += (line.match(/;/g) || []).length;
      totals['\t'] += (line.match(/\t/g) || []).length;
    });

    if (bestCount === 0) {
      if (totals[';'] === 0 && totals[','] === 0 && totals['\t'] === 0) {
        throw new Error('Separatore CSV non riconosciuto');
      }
    }

    if (totals[';'] >= totals[','] && totals[';'] >= totals['\t']) {
      bestDelimiter = ';';
    } else if (totals['\t'] >= totals[','] && totals['\t'] >= totals[';']) {
      bestDelimiter = '\t';
    } else {
      bestDelimiter = ',';
    }

    return { delimiter: bestDelimiter, fromLine: 1 };
  }

  private clienteCsvMap() {
    return {
      id: 'id',
      attivo: 'attivo',
      studioid: 'studioId',
      ragionesociale: 'ragioneSociale',
      codicefiscale: 'codiceFiscale',
      partitaiva: 'partitaIva',
      sedelegale: 'sedeLegale',
      sedeoperativa: 'sedeOperativa',
      indirizzo: 'indirizzo',
      cap: 'cap',
      citta: 'citta',
      provincia: 'provincia',
      nazione: 'nazione',
      tipologia: 'tipologia',
      referente: 'referente',
      telefono: 'telefono',
      email: 'email',
      pec: 'pec',
    };
  }

  private debitoreCsvMap() {
    return {
      id: 'id',
      attivo: 'attivo',
      studioid: 'studioId',
      tiposoggetto: 'tipoSoggetto',
      nome: 'nome',
      cognome: 'cognome',
      codicefiscale: 'codiceFiscale',
      datanascita: 'dataNascita',
      luogonascita: 'luogoNascita',
      ragionesociale: 'ragioneSociale',
      partitaiva: 'partitaIva',
      tipologia: 'tipologia',
      sedelegale: 'sedeLegale',
      sedeoperativa: 'sedeOperativa',
      indirizzo: 'indirizzo',
      cap: 'cap',
      citta: 'citta',
      provincia: 'provincia',
      nazione: 'nazione',
      referente: 'referente',
      telefono: 'telefono',
      email: 'email',
      pec: 'pec',
    };
  }

  private userCsvMap() {
    return {
      id: 'id',
      email: 'email',
      password: 'password',
      nome: 'nome',
      cognome: 'cognome',
      ruolo: 'ruolo',
      clienteid: 'clienteId',
      studioid: 'studioId',
      attivo: 'attivo',
    };
  }

  private avvocatoCsvMap() {
    return {
      id: 'id',
      attivo: 'attivo',
      studioid: 'studioId',
      nome: 'nome',
      cognome: 'cognome',
      codicefiscale: 'codiceFiscale',
      email: 'email',
      telefono: 'telefono',
      livelloaccessopratiche: 'livelloAccessoPratiche',
      livellopermessi: 'livelloPermessi',
      note: 'note',
    };
  }

  private praticaCsvMap() {
    return {
      id: 'id',
      attivo: 'attivo',
      clienteid: 'clienteId',
      studioid: 'studioId',
      debitoreid: 'debitoreId',
      faseid: 'faseId',
      aperta: 'aperta',
      esito: 'esito',
      capitale: 'capitale',
      importorecuperatocapitale: 'importoRecuperatoCapitale',
      anticipazioni: 'anticipazioni',
      importorecuperatoanticipazioni: 'importoRecuperatoAnticipazioni',
      compensilegali: 'compensiLegali',
      compensiliquidati: 'compensiLiquidati',
      interessi: 'interessi',
      interessirecuperati: 'interessiRecuperati',
      note: 'note',
      riferimentocredito: 'riferimentoCredito',
      dataaffidamento: 'dataAffidamento',
      datachiusura: 'dataChiusura',
      datascadenza: 'dataScadenza',
      numeropratica: 'numeroPratica',
    };
  }

  private async syncPraticheAvvocati(pratiche: Array<{ id?: string; avvocati?: Array<{ id?: string }> }>) {
    for (const pratica of pratiche) {
      if (!pratica?.id || !Array.isArray(pratica.avvocati)) {
        continue;
      }
      const avvocatiIds = pratica.avvocati
        .map((avvocato) => avvocato?.id)
        .filter((id): id is string => Boolean(id));

      if (avvocatiIds.length === 0) continue;

      try {
        await this.praticheRepo
          .createQueryBuilder()
          .relation(Pratica, 'avvocati')
          .of(pratica.id)
          .add(avvocatiIds);
      } catch {
        // Skip relation errors
      }
    }
  }

  private clienteFields() {
    return [
      'id',
      'attivo',
      'studioId',
      'ragioneSociale',
      'codiceFiscale',
      'partitaIva',
      'sedeLegale',
      'sedeOperativa',
      'indirizzo',
      'cap',
      'citta',
      'provincia',
      'nazione',
      'tipologia',
      'referente',
      'telefono',
      'email',
      'pec',
      'configurazioneCondivisione',
      'createdAt',
      'updatedAt',
    ];
  }

  private debitoreFields() {
    return [
      'id',
      'attivo',
      'studioId',
      'tipoSoggetto',
      'nome',
      'cognome',
      'codiceFiscale',
      'dataNascita',
      'luogoNascita',
      'ragioneSociale',
      'partitaIva',
      'tipologia',
      'sedeLegale',
      'sedeOperativa',
      'indirizzo',
      'cap',
      'citta',
      'provincia',
      'nazione',
      'referente',
      'telefono',
      'email',
      'pec',
      'createdAt',
      'updatedAt',
    ];
  }

  private avvocatoFields() {
    return [
      'id',
      'attivo',
      'studioId',
      'nome',
      'cognome',
      'codiceFiscale',
      'email',
      'telefono',
      'livelloAccessoPratiche',
      'livelloPermessi',
      'note',
      'createdAt',
      'updatedAt',
    ];
  }

  private userFields() {
    return [
      'id',
      'email',
      'password',
      'nome',
      'cognome',
      'ruolo',
      'clienteId',
      'studioId',
      'attivo',
      'createdAt',
      'updatedAt',
      'lastLogin',
    ];
  }

  private praticaFields() {
    return [
      'id',
      'attivo',
      'clienteId',
      'studioId',
      'debitoreId',
      'faseId',
      'aperta',
      'esito',
      'capitale',
      'importoRecuperatoCapitale',
      'anticipazioni',
      'importoRecuperatoAnticipazioni',
      'compensiLegali',
      'compensiLiquidati',
      'interessi',
      'interessiRecuperati',
      'note',
      'riferimentoCredito',
      'storico',
      'opposizione',
      'pignoramento',
      'dataAffidamento',
      'dataChiusura',
      'dataScadenza',
      'createdAt',
      'updatedAt',
    ];
  }

  private movimentoFields() {
    return [
      'id',
      'studioId',
      'praticaId',
      'tipo',
      'importo',
      'data',
      'oggetto',
      'createdAt',
      'updatedAt',
    ];
  }

  private documentoFields() {
    return [
      'id',
      'studioId',
      'nome',
      'descrizione',
      'percorsoFile',
      'nomeOriginale',
      'estensione',
      'tipo',
      'dimensione',
      'caricatoDa',
      'praticaId',
      'cartellaId',
      'attivo',
      'dataCreazione',
      'dataAggiornamento',
    ];
  }

  private alertFields() {
    return [
      'id',
      'studioId',
      'praticaId',
      'titolo',
      'descrizione',
      'destinatario',
      'modalitaNotifica',
      'dataScadenza',
      'giorniAnticipo',
      'stato',
      'messaggi',
      'attivo',
      'dataCreazione',
      'dataAggiornamento',
      'dataChiusura',
    ];
  }

  private ticketFields() {
    return [
      'id',
      'numeroTicket',
      'studioId',
      'praticaId',
      'oggetto',
      'descrizione',
      'autore',
      'categoria',
      'priorita',
      'stato',
      'messaggi',
      'attivo',
      'dataCreazione',
      'dataAggiornamento',
      'dataChiusura',
    ];
  }

  private auditLogFields() {
    return [
      'id',
      'createdAt',
      'userId',
      'userEmail',
      'userRole',
      'action',
      'entityType',
      'entityId',
      'entityName',
      'description',
      'metadata',
      'ipAddress',
      'userAgent',
      'studioId',
      'success',
      'errorMessage',
    ];
  }
}
