import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Cliente } from '../clienti/cliente.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { MovimentoFinanziario, TipoMovimento } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Studio } from '../studi/studio.entity';

interface ReportOptions {
  clienteId: string;
  clienteIds?: string[];
  studioId?: string;
  dataInizio?: Date;
  dataFine?: Date;
}

@Injectable()
export class ReportExcelService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(Pratica)
    private readonly praticaRepo: Repository<Pratica>,
    @InjectRepository(MovimentoFinanziario)
    private readonly movimentoRepo: Repository<MovimentoFinanziario>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Studio)
    private readonly studioRepo: Repository<Studio>,
  ) {}

  async generaReportCliente(options: ReportOptions): Promise<Buffer> {
    const { cliente, pratiche, movimenti, alerts } = await this.loadReportData(options);
    return this.creaExcel(cliente, pratiche, movimenti, alerts);
  }

  async generaReportClienteCsv(options: ReportOptions): Promise<Buffer> {
    const { cliente, pratiche, movimenti, alerts } = await this.loadReportData(options);
    const csv = this.creaCsv(cliente, pratiche, movimenti, alerts, options);
    return Buffer.from(csv, 'utf8');
  }

  private async loadReportData(options: ReportOptions) {
    const isAllClients = options.clienteId === 'all';
    let cliente: Cliente;
    let clientiIds: string[] = [];

    if (isAllClients) {
      clientiIds = options.clienteIds ?? [];
      cliente = { id: 'all', ragioneSociale: 'Tutti i clienti' } as Cliente;
    } else {
      const clienteEntity = await this.clienteRepo.findOne({
        where: { id: options.clienteId },
        relations: ['studio'],
      });

      if (!clienteEntity) {
        throw new Error('Cliente non trovato');
      }
      cliente = clienteEntity;
      clientiIds = [clienteEntity.id];
    }

    let pratiche = await this.praticaRepo.find({
      where: { clienteId: In(clientiIds) },
      relations: ['debitore', 'avvocati', 'collaboratori'],
      order: { createdAt: 'DESC' },
    });

    if (options.dataInizio || options.dataFine) {
      pratiche = pratiche.filter(p => {
        const dataCreazione = new Date(p.createdAt);
        if (options.dataInizio && dataCreazione < options.dataInizio) return false;
        if (options.dataFine && dataCreazione > options.dataFine) return false;
        return true;
      });
    }

    const praticheIds = pratiche.map(p => p.id);
    let movimenti: MovimentoFinanziario[] = [];
    if (praticheIds.length > 0) {
      movimenti = await this.movimentoRepo.find({
        where: { praticaId: In(praticheIds) },
        order: { data: 'DESC' },
      });
      if (options.dataInizio || options.dataFine) {
        movimenti = movimenti.filter(m => {
          if (!m.data) return false;
          const dataMovimento = new Date(m.data);
          if (options.dataInizio && dataMovimento < options.dataInizio) return false;
          if (options.dataFine && dataMovimento > options.dataFine) return false;
          return true;
        });
      }
    }

    let alerts: Alert[] = [];
    if (praticheIds.length > 0) {
      alerts = await this.alertRepo.find({
        where: { praticaId: In(praticheIds) },
        relations: ['pratica'],
        order: { dataScadenza: 'ASC' },
      });
      if (options.dataInizio || options.dataFine) {
        alerts = alerts.filter(alert => {
          if (!alert.dataScadenza) return false;
          const dataAlert = new Date(alert.dataScadenza);
          if (options.dataInizio && dataAlert < options.dataInizio) return false;
          if (options.dataFine && dataAlert > options.dataFine) return false;
          return true;
        });
      }
    }

    return { cliente, pratiche, movimenti, alerts };
  }

  private creaCsv(
    cliente: Cliente,
    pratiche: Pratica[],
    movimenti: MovimentoFinanziario[],
    alerts: Alert[],
    options: ReportOptions,
  ): string {
    const rows: string[] = [];
    const separator = ';';

    const escape = (value: string | number | null | undefined) => {
      const raw = value === null || value === undefined ? '' : String(value);
      if (raw.includes('"') || raw.includes('\n') || raw.includes(separator)) {
        return `"${raw.replace(/\"/g, '""')}"`;
      }
      return raw;
    };

    const formatDate = (value?: Date | string) => {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('it-IT');
    };

    const periodoLabel = options.dataInizio || options.dataFine
      ? `Periodo ${options.dataInizio ? formatDate(options.dataInizio) : 'Inizio'} - ${options.dataFine ? formatDate(options.dataFine) : 'Oggi'}`
      : 'Intero storico';

    const praticaMap = new Map(pratiche.map(p => [p.id, p]));

    rows.push('\ufeffReport Cliente');
    rows.push(`Cliente${separator}${escape(cliente.ragioneSociale)}`);
    rows.push(`Data report${separator}${escape(formatDate(new Date()))}`);
    rows.push(`Periodo${separator}${escape(periodoLabel)}`);
    rows.push('');

    rows.push('Pratiche');
    rows.push([
      'Numero',
      'Stato',
      'Debitore',
      'Fase',
      'Capitale',
      'Data creazione',
    ].join(separator));
    pratiche.forEach(pratica => {
      const debitore = pratica.debitore?.ragioneSociale
        || `${pratica.debitore?.nome || ''} ${pratica.debitore?.cognome || ''}`.trim()
        || 'N/D';
      const numero = pratica.numeroPratica || `#${pratica.id.slice(0, 8)}`;
      rows.push([
        escape(numero),
        escape(pratica.aperta ? 'Aperta' : 'Chiusa'),
        escape(debitore),
        escape(this.getFaseNome(pratica.faseId || 'non_definita')),
        escape((pratica.capitale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })),
        escape(formatDate(pratica.createdAt)),
      ].join(separator));
    });
    rows.push('');

    rows.push('Movimenti');
    rows.push(['Data', 'Tipo', 'Importo', 'Pratica'].join(separator));
    if (movimenti.length === 0) {
      rows.push('Nessun movimento');
    } else {
      movimenti.forEach(movimento => {
        const pratica = praticaMap.get(movimento.praticaId);
        const numero = pratica?.numeroPratica || (pratica ? `#${pratica.id.slice(0, 8)}` : 'N/D');
        rows.push([
          escape(formatDate(movimento.data)),
          escape(movimento.tipo),
          escape(Number(movimento.importo || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })),
          escape(numero),
        ].join(separator));
      });
    }
    rows.push('');

    rows.push('Alert');
    rows.push(['Scadenza', 'Titolo', 'Pratica', 'Stato'].join(separator));
    if (alerts.length === 0) {
      rows.push('Nessun alert');
    } else {
      alerts.forEach(alert => {
        const numero = alert.pratica?.numeroPratica || (alert.pratica ? `#${alert.pratica.id.slice(0, 8)}` : 'N/D');
        rows.push([
          escape(formatDate(alert.dataScadenza)),
          escape(alert.titolo || ''),
          escape(numero),
          escape(alert.stato || ''),
        ].join(separator));
      });
    }

    return rows.join('\n');
  }

  private async creaExcel(
    cliente: Cliente,
    pratiche: Pratica[],
    movimenti: MovimentoFinanziario[],
    alerts: Alert[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Resolv';
    workbook.created = new Date();

    // Foglio 1: Dashboard
    this.creaDashboard(workbook, cliente, pratiche, movimenti);

    // Foglio 2: Pratiche
    this.creaPratiche(workbook, pratiche);

    // Foglio 3: Movimenti Finanziari
    if (movimenti.length > 0) {
      this.creaMovimenti(workbook, movimenti);
    }

    // Foglio 4: Alert
    if (alerts.length > 0) {
      this.creaAlerts(workbook, alerts);
    }

    // Foglio 5: Storico Fasi
    this.creaStoricoFasi(workbook, pratiche);

    return await workbook.xlsx.writeBuffer() as any;
  }

  private isEntrata(tipo: TipoMovimento): boolean {
    return tipo.startsWith('recupero_');
  }

  private getFaseNome(faseCodice: string): string {
    const faseMap: Record<string, string> = {
      'tentativo_bonario': 'Tentativo Bonario',
      'diffida': 'Diffida',
      'decreto_ingiuntivo': 'Decreto Ingiuntivo',
      'opposizione': 'Opposizione',
      'esecuzione': 'Esecuzione',
      'fallimento': 'Fallimento',
      'chiusa': 'Chiusa',
      'non_definita': 'Non Definita',
    };
    return faseMap[faseCodice] || faseCodice;
  }

  private creaDashboard(
    workbook: ExcelJS.Workbook,
    cliente: Cliente,
    pratiche: Pratica[],
    movimenti: MovimentoFinanziario[],
  ) {
    const sheet = workbook.addWorksheet('Dashboard');

    // Intestazione
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Report Gestione Pratiche - Dashboard';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FF4F46E5' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Info cliente
    sheet.getCell('A3').value = 'Cliente:';
    sheet.getCell('A3').font = { bold: true };
    sheet.getCell('B3').value = cliente.ragioneSociale;

    sheet.getCell('A4').value = 'Data Report:';
    sheet.getCell('A4').font = { bold: true };
    sheet.getCell('B4').value = new Date().toLocaleDateString('it-IT');

    // KPI
    const totale = pratiche.length;
    const aperte = pratiche.filter(p => p.aperta).length;
    const chiuse = totale - aperte;
    const capitaleTotale = pratiche.reduce((sum, p) => sum + (p.capitale || 0), 0);

    sheet.getCell('A6').value = 'KPI Principali';
    sheet.getCell('A6').font = { size: 14, bold: true };

    const kpiHeaders = ['Metrica', 'Valore'];
    sheet.getRow(7).values = kpiHeaders;
    sheet.getRow(7).font = { bold: true };
    sheet.getRow(7).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    const kpiData = [
      ['Pratiche Totali', totale],
      ['Pratiche Aperte', aperte],
      ['Pratiche Chiuse', chiuse],
      ['Capitale Totale', `€ ${capitaleTotale.toLocaleString('it-IT')}`],
    ];

    kpiData.forEach((row, index) => {
      sheet.getRow(8 + index).values = row;
    });

    // Distribuzione per fase
    const perFase: Record<string, number> = {};
    pratiche.forEach(p => {
      const faseCodice = p.faseId || 'non_definita';
      perFase[faseCodice] = (perFase[faseCodice] || 0) + 1;
    });

    sheet.getCell('A13').value = 'Distribuzione per Fase';
    sheet.getCell('A13').font = { size: 14, bold: true };

    const faseHeaders = ['Fase', 'Numero', '%'];
    sheet.getRow(14).values = faseHeaders;
    sheet.getRow(14).font = { bold: true };
    sheet.getRow(14).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };

    Object.entries(perFase).forEach(([faseCodice, count], index) => {
      sheet.getRow(15 + index).values = [
        this.getFaseNome(faseCodice),
        count,
        `${((count / totale) * 100).toFixed(1)}%`,
      ];
    });

    // Analisi finanziaria
    if (movimenti.length > 0) {
      const entrate = movimenti
        .filter(m => this.isEntrata(m.tipo))
        .reduce((sum, m) => sum + Number(m.importo), 0);

      const uscite = movimenti
        .filter(m => !this.isEntrata(m.tipo))
        .reduce((sum, m) => sum + Number(m.importo), 0);

      const saldo = entrate - uscite;

      const finRow = 15 + Object.keys(perFase).length + 2;
      sheet.getCell(`A${finRow}`).value = 'Analisi Finanziaria';
      sheet.getCell(`A${finRow}`).font = { size: 14, bold: true };

      sheet.getRow(finRow + 1).values = ['Metrica', 'Importo'];
      sheet.getRow(finRow + 1).font = { bold: true };
      sheet.getRow(finRow + 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };

      const finData = [
        ['Recuperi Totali', `€ ${entrate.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Spese Totali', `€ ${uscite.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Saldo', `€ ${saldo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ];

      finData.forEach((row, index) => {
        sheet.getRow(finRow + 2 + index).values = row;
      });
    }

    // Formattazione colonne
    sheet.getColumn('A').width = 25;
    sheet.getColumn('B').width = 20;
    sheet.getColumn('C').width = 15;
    sheet.getColumn('D').width = 15;
  }

  private creaPratiche(workbook: ExcelJS.Workbook, pratiche: Pratica[]) {
    const sheet = workbook.addWorksheet('Pratiche');

    // Intestazione
    const headers = [
      'ID',
      'Debitore',
      'Fase',
      'Stato',
      'Capitale',
      'Data Apertura',
      'Avvocati',
      'Collaboratori',
      'Note Pratica',
    ];

    sheet.getRow(1).values = headers;
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    sheet.getRow(1).height = 25;
    sheet.getRow(1).alignment = { vertical: 'middle' };

    // Dati
    pratiche.forEach((pratica, index) => {
      const rowIndex = index + 2;
      const debitore = pratica.debitore?.ragioneSociale ||
        (pratica.debitore ? `${pratica.debitore.nome || ''} ${pratica.debitore.cognome || ''}`.trim() : 'N/D');

      const avvocati = pratica.avvocati?.map(a => `${a.nome} ${a.cognome}`).join(', ') || '';
      const collaboratori = pratica.collaboratori?.map(c => `${c.nome} ${c.cognome}`).join(', ') || '';

      sheet.getRow(rowIndex).values = [
        pratica.id,
        debitore,
        this.getFaseNome(pratica.faseId || 'non_definita'),
        pratica.aperta ? 'Aperta' : 'Chiusa',
        pratica.capitale || 0,
        pratica.createdAt ? new Date(pratica.createdAt).toLocaleDateString('it-IT') : '',
        avvocati,
        collaboratori,
        pratica.note || '',
      ];

      // Colora la riga in base allo stato
      if (!pratica.aperta) {
        sheet.getRow(rowIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
    });

    // Formattazione colonne
    sheet.getColumn('A').width = 36;
    sheet.getColumn('B').width = 30;
    sheet.getColumn('C').width = 20;
    sheet.getColumn('D').width = 12;
    sheet.getColumn('E').width = 15;
    sheet.getColumn('E').numFmt = '€#,##0.00';
    sheet.getColumn('F').width = 15;
    sheet.getColumn('G').width = 25;
    sheet.getColumn('H').width = 25;
    sheet.getColumn('I').width = 40;

    // Filtri
    sheet.autoFilter = {
      from: 'A1',
      to: `I${pratiche.length + 1}`,
    };
  }

  private creaMovimenti(workbook: ExcelJS.Workbook, movimenti: MovimentoFinanziario[]) {
    const sheet = workbook.addWorksheet('Movimenti Finanziari');

    const headers = [
      'Data',
      'Tipo Movimento',
      'Importo',
      'Descrizione',
    ];

    sheet.getRow(1).values = headers;
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    sheet.getRow(1).height = 25;

    movimenti.forEach((movimento, index) => {
      const rowIndex = index + 2;
      const isRecupero = this.isEntrata(movimento.tipo);

      sheet.getRow(rowIndex).values = [
        movimento.data ? new Date(movimento.data).toLocaleDateString('it-IT') : '',
        this.getTipoMovimentoLabel(movimento.tipo),
        Number(movimento.importo),
        movimento.oggetto || '',
      ];

      // Colora in base al tipo
      const color = isRecupero ? 'FFD1FAE5' : 'FFFEE2E2';
      sheet.getRow(rowIndex).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color },
      };
    });

    sheet.getColumn('A').width = 15;
    sheet.getColumn('B').width = 25;
    sheet.getColumn('C').width = 15;
    sheet.getColumn('C').numFmt = '€#,##0.00';
    sheet.getColumn('D').width = 40;

    sheet.autoFilter = {
      from: 'A1',
      to: `D${movimenti.length + 1}`,
    };
  }

  private getTipoMovimentoLabel(tipo: TipoMovimento): string {
    const labels: Record<TipoMovimento, string> = {
      capitale: 'Capitale',
      capitale_originario: 'Capitale Originario',
      nuovo_capitale: 'Nuovo Capitale',
      anticipazione: 'Anticipazione',
      compenso: 'Compenso',
      interessi: 'Interessi',
      altro: 'Altro',
      recupero_capitale: 'Recupero Capitale',
      recupero_anticipazione: 'Recupero Anticipazione',
      recupero_compenso: 'Recupero Compenso',
      recupero_interessi: 'Recupero Interessi',
      recupero_altro: 'Recupero Altro',
    };
    return labels[tipo] || tipo;
  }

  private creaAlerts(workbook: ExcelJS.Workbook, alerts: Alert[]) {
    const sheet = workbook.addWorksheet('Alert e Scadenze');

    const headers = [
      'Titolo',
      'Descrizione',
      'Data Scadenza',
      'Stato',
      'Destinatario',
      'Giorni Anticipo',
      'Attivo',
    ];

    sheet.getRow(1).values = headers;
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    sheet.getRow(1).height = 25;

    alerts.forEach((alert, index) => {
      const rowIndex = index + 2;
      sheet.getRow(rowIndex).values = [
        alert.titolo,
        alert.descrizione,
        alert.dataScadenza ? new Date(alert.dataScadenza).toLocaleDateString('it-IT') : '',
        alert.stato === 'in_gestione' ? 'In gestione' : 'Chiuso',
        alert.destinatario === 'studio' ? 'Studio' : 'Cliente',
        alert.giorniAnticipo,
        alert.attivo ? 'Sì' : 'No',
      ];

      if (alert.stato === 'chiuso') {
        sheet.getRow(rowIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
    });

    sheet.getColumn('A').width = 30;
    sheet.getColumn('B').width = 50;
    sheet.getColumn('C').width = 15;
    sheet.getColumn('D').width = 15;
    sheet.getColumn('E').width = 15;
    sheet.getColumn('F').width = 15;
    sheet.getColumn('G').width = 10;

    sheet.autoFilter = {
      from: 'A1',
      to: `G${alerts.length + 1}`,
    };
  }

  private creaStoricoFasi(workbook: ExcelJS.Workbook, pratiche: Pratica[]) {
    const sheet = workbook.addWorksheet('Storico Fasi');

    const headers = [
      'Pratica (Debitore)',
      'Fase',
      'Data Inizio',
      'Data Fine',
      'Durata (giorni)',
      'Note',
      'Cambiato Da',
    ];

    sheet.getRow(1).values = headers;
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    sheet.getRow(1).height = 25;

    let rowIndex = 2;

    pratiche.forEach(pratica => {
      if (!pratica.storico || pratica.storico.length === 0) return;

      const debitore = pratica.debitore?.ragioneSociale ||
        (pratica.debitore ? `${pratica.debitore.nome || ''} ${pratica.debitore.cognome || ''}`.trim() : 'N/D');

      pratica.storico.forEach(fase => {
        const dataInizio = fase.dataInizio ? new Date(fase.dataInizio) : null;
        const dataFine = fase.dataFine ? new Date(fase.dataFine) : null;

        let durata = '';
        if (dataInizio && dataFine) {
          const diff = Math.floor((dataFine.getTime() - dataInizio.getTime()) / (1000 * 60 * 60 * 24));
          durata = diff.toString();
        } else if (dataInizio) {
          const diff = Math.floor((new Date().getTime() - dataInizio.getTime()) / (1000 * 60 * 60 * 24));
          durata = `${diff} (in corso)`;
        }

        sheet.getRow(rowIndex).values = [
          debitore,
          fase.faseNome,
          dataInizio ? dataInizio.toLocaleDateString('it-IT') : '',
          dataFine ? dataFine.toLocaleDateString('it-IT') : 'In corso',
          durata,
          fase.note || '',
          fase.cambiatoDaNome || '',
        ];

        if (!dataFine) {
          sheet.getRow(rowIndex).font = { bold: true };
        }

        rowIndex++;
      });
    });

    sheet.getColumn('A').width = 30;
    sheet.getColumn('B').width = 25;
    sheet.getColumn('C').width = 15;
    sheet.getColumn('D').width = 15;
    sheet.getColumn('E').width = 15;
    sheet.getColumn('F').width = 40;
    sheet.getColumn('G').width = 25;

    sheet.autoFilter = {
      from: 'A1',
      to: `G${rowIndex - 1}`,
    };
  }
}
