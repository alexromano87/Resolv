import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

/** Numero di colonne metadata prima delle colonne campo (devono coincidere con l'export). */
const META_COLS = 17;

/** Nome dei fogli nel file Excel. */
const SHEET_DATA = 'Pre-Assessment';
const SHEET_LEGEND = 'Legenda Campi';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; id: string; reason: string }[];
}

@Injectable()
export class CheckupPreassessmentExcelImportService {
  private readonly logger = new Logger(CheckupPreassessmentExcelImportService.name);

  constructor(
    @InjectRepository(CheckupPreassessment)
    private readonly preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupLicense)
    private readonly licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private readonly sublicenseRepository: Repository<CheckupSublicense>,
  ) {}

  async importExcel(buffer: Buffer, user: CheckupCurrentUserData): Promise<ImportResult> {
    if (!user.studioId) {
      throw new ForbiddenException('Solo lo studio può importare i dati');
    }

    // ── 1. Carica il workbook ─────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch {
      throw new BadRequestException('File Excel non valido o corrotto');
    }

    // ── 2. Leggi il foglio Legenda per ottenere la mappa posizione → fieldId ──
    const legendWs = workbook.getWorksheet(SHEET_LEGEND);
    if (!legendWs) {
      throw new BadRequestException(`Foglio "${SHEET_LEGEND}" non trovato. Assicurarsi di importare un file esportato da questo sistema.`);
    }

    // Legenda: riga 1 = header; dal riga 2 → fieldId in colonna E (indice 5)
    const fieldIdByPosition: string[] = []; // indice 0 = prima colonna campo (col 18 del foglio dati)
    legendWs.eachRow((row, rowNumber) => {
      if (rowNumber < 2) return; // salta header
      const fieldId = String(row.getCell(5).value ?? '').trim();
      if (fieldId) fieldIdByPosition.push(fieldId);
    });

    if (fieldIdByPosition.length === 0) {
      throw new BadRequestException('Il foglio Legenda Campi è vuoto o malformato');
    }

    // ── 3. Leggi il foglio Pre-Assessment ─────────────────────────────────────
    const dataWs = workbook.getWorksheet(SHEET_DATA);
    if (!dataWs) {
      throw new BadRequestException(`Foglio "${SHEET_DATA}" non trovato`);
    }

    // ── 4. Raccogli client IDs ammessi per questo studio ──────────────────────
    const allowedClientIds = await this.loadAllowedClientIds(user.studioId);

    // ── 5. Pre-carica tutte le preassessment che potrebbero essere aggiornate ──
    // Leggiamo prima tutti gli ID dalla colonna 1 (righe >= 4) per fare un'unica query
    const preassessmentIdList: string[] = [];
    dataWs.eachRow((row, rowNumber) => {
      if (rowNumber < 4) return;
      const id = String(row.getCell(1).value ?? '').trim();
      if (id) preassessmentIdList.push(id);
    });

    const preassessmentMap = new Map<string, CheckupPreassessment>();
    if (preassessmentIdList.length > 0) {
      const records = await this.preassessmentRepository.find({
        where: { id: In(preassessmentIdList), isLatest: true },
      });
      records.forEach((r) => preassessmentMap.set(r.id, r));
    }

    // ── 6. Processa ogni riga dati ────────────────────────────────────────────
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
    const toSave: CheckupPreassessment[] = [];

    dataWs.eachRow((row, rowNumber) => {
      if (rowNumber < 4) return; // righe 1-3 sono intestazioni

      const id = String(row.getCell(1).value ?? '').trim();
      if (!id) {
        result.skipped++;
        return;
      }

      const pre = preassessmentMap.get(id);
      if (!pre) {
        result.errors.push({ row: rowNumber, id, reason: 'Preassessment non trovata o non è la versione più recente' });
        return;
      }

      // Verifica accesso: il cliente deve appartenere allo studio
      if (!allowedClientIds.has(pre.clientId)) {
        result.errors.push({ row: rowNumber, id, reason: 'Non autorizzato: il cliente non appartiene a questo studio' });
        return;
      }

      // Costruisce i nuovi oggetti data e naFields dalla riga Excel
      const newData: Record<string, string> = { ...(pre.data ?? {}) };
      const newNaFields: Record<string, boolean> = { ...(pre.naFields ?? {}) };

      for (let i = 0; i < fieldIdByPosition.length; i++) {
        const fieldId = fieldIdByPosition[i];
        const colIndex = META_COLS + i + 1; // 1-based
        const cell = row.getCell(colIndex);
        const rawValue = cell.value;

        // Gestisci valori composti (formula risultato, richText, ecc.)
        const cellText = this.extractCellText(rawValue);

        if (cellText === 'N/A') {
          // Marca il campo come N/A e rimuovi il valore
          newNaFields[fieldId] = true;
          delete newData[fieldId];
        } else if (cellText === '') {
          // Cella vuota: rimuovi sia il valore che il flag N/A
          delete newData[fieldId];
          delete newNaFields[fieldId];
        } else {
          // Valore presente: imposta il dato e rimuovi il flag N/A
          newData[fieldId] = cellText;
          delete newNaFields[fieldId];
        }
      }

      pre.data = newData;
      pre.naFields = newNaFields;
      toSave.push(pre);
    });

    // ── 7. Salva tutte le preassessment modificate in batch ───────────────────
    if (toSave.length > 0) {
      // Salva in gruppi di 50 per evitare query troppo grandi
      const BATCH_SIZE = 50;
      for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
        const batch = toSave.slice(i, i + BATCH_SIZE);
        await this.preassessmentRepository.save(batch);
      }
      result.imported = toSave.length;
    }

    this.logger.log(
      `Import Excel: ${result.imported} importate, ${result.skipped} saltate, ${result.errors.length} errori — utente ${user.id}`,
    );
    return result;
  }

  /** Restituisce il Set dei clientId ammessi per lo studio corrente. */
  private async loadAllowedClientIds(studioId: string): Promise<Set<string>> {
    const license = await this.licenseRepository.findOne({ where: { studioId } });
    if (!license) return new Set();
    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, attiva: true },
    });
    return new Set(sublicenses.map((s) => s.clientId).filter(Boolean) as string[]);
  }

  /** Estrae il testo leggibile da un valore cella ExcelJS (gestisce formula, richText, Date). */
  private extractCellText(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value instanceof Date) return value.toISOString();

    // Formula result
    if (typeof value === 'object' && 'result' in value) {
      return this.extractCellText((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    }
    // Rich text
    if (typeof value === 'object' && 'richText' in value) {
      return (value as ExcelJS.CellRichTextValue).richText.map((rt) => rt.text).join('').trim();
    }
    // Shared string
    if (typeof value === 'object' && 'text' in value) {
      const text = (value as any).text;
      if (typeof text === 'string') return text.trim();
    }

    return String(value).trim();
  }
}
