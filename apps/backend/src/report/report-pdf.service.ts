import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cliente } from '../clienti/cliente.entity';
import { Pratica } from '../pratiche/pratica.entity';
import { MovimentoFinanziario, TipoMovimento } from '../movimenti-finanziari/movimento-finanziario.entity';
import { Alert } from '../alerts/alert.entity';
import { Studio } from '../studi/studio.entity';

interface ReportOptions {
  clienteId: string;
  dataInizio?: Date;
  dataFine?: Date;
  includiDettaglioPratiche?: boolean;
  includiMovimenti?: boolean;
  note?: string;
}

@Injectable()
export class ReportPdfService {
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
    // Carica dati
    const cliente = await this.clienteRepo.findOne({
      where: { id: options.clienteId },
      relations: ['studio'],
    });

    if (!cliente) {
      throw new Error('Cliente non trovato');
    }

    const studio = cliente.studio || await this.studioRepo.findOne({ where: {} });

    // Filtra pratiche per cliente
    const pratiche = await this.praticaRepo.find({
      where: { clienteId: options.clienteId },
      relations: ['debitore', 'avvocati', 'collaboratori'],
      order: { createdAt: 'DESC' },
    });

    // Calcola statistiche
    const stats = this.calcolaStatistiche(pratiche);

    // Carica movimenti finanziari
    const praticheIds = pratiche.map(p => p.id);
    let movimenti: MovimentoFinanziario[] = [];
    if (options.includiMovimenti && praticheIds.length > 0) {
      movimenti = await this.movimentoRepo.find({
        where: { praticaId: In(praticheIds) },
        order: { data: 'DESC' },
      });
    }

    // Carica alert attivi
    let alerts: Alert[] = [];
    if (praticheIds.length > 0) {
      alerts = await this.alertRepo.find({
        where: {
          praticaId: In(praticheIds),
          stato: 'in_gestione',
          attivo: true,
        },
        relations: ['pratica'],
        take: 10,
        order: { dataScadenza: 'ASC' },
      });
    }

    // Genera PDF
    return this.generaPdf({
      cliente,
      studio,
      pratiche,
      movimenti,
      alerts,
      stats,
      options,
    });
  }

  private calcolaStatistiche(pratiche: Pratica[]) {
    const totale = pratiche.length;
    const aperte = pratiche.filter(p => p.aperta).length;
    const chiuse = totale - aperte;
    const capitaleTotale = pratiche.reduce((sum, p) => sum + (p.capitale || 0), 0);

    // Raggruppa per fase usando il campo faseCorrente
    const perFase: Record<string, number> = {};
    pratiche.forEach(p => {
      const faseCodice = p.faseId || 'non_definita';
      // Usa il codice fase come chiave, poi possiamo mapparlo al nome
      perFase[faseCodice] = (perFase[faseCodice] || 0) + 1;
    });

    return {
      totale,
      aperte,
      chiuse,
      capitaleTotale,
      perFase,
    };
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

  private async generaPdf(data: {
    cliente: Cliente;
    studio: Studio | null;
    pratiche: Pratica[];
    movimenti: MovimentoFinanziario[];
    alerts: Alert[];
    stats: any;
    options: ReportOptions;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header con logo
        if (data.studio?.logo) {
          try {
            const logoBuffer = Buffer.from(data.studio.logo.split(',')[1] || data.studio.logo, 'base64');
            doc.image(logoBuffer, 50, 45, { width: 100 });
          } catch (e) {
            // Se il logo non è valido, salta
          }
        }

        doc.fontSize(20).font('Helvetica-Bold').text('Report Cliente', 200, 60);
        doc.fontSize(10).font('Helvetica').text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 200, 85);

        doc.moveDown(3);

        // Informazioni Cliente
        doc.fontSize(14).font('Helvetica-Bold').text('Informazioni Cliente', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        const nomeCliente = data.cliente.ragioneSociale || 'Cliente';

        doc.text(`Nome: ${nomeCliente}`);
        if (data.cliente.codiceFiscale) doc.text(`Codice Fiscale: ${data.cliente.codiceFiscale}`);
        if (data.cliente.partitaIva) doc.text(`P.IVA: ${data.cliente.partitaIva}`);
        if (data.cliente.email) doc.text(`Email: ${data.cliente.email}`);

        doc.moveDown(2);

        // Statistiche
        doc.fontSize(14).font('Helvetica-Bold').text('Riepilogo Statistiche', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        doc.text(`Pratiche Totali: ${data.stats.totale}`);
        doc.text(`Pratiche Aperte: ${data.stats.aperte}`);
        doc.text(`Pratiche Chiuse: ${data.stats.chiuse}`);
        doc.text(`Capitale Totale: € ${data.stats.capitaleTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);

        doc.moveDown(1.5);

        // Distribuzione per Fase
        doc.fontSize(12).font('Helvetica-Bold').text('Distribuzione per Fase');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');

        Object.entries(data.stats.perFase).forEach(([faseCodice, count]) => {
          const faseNome = this.getFaseNome(faseCodice);
          const percentuale = ((count as number / data.stats.totale) * 100).toFixed(1);
          doc.text(`${faseNome}: ${count} (${percentuale}%)`);
        });

        doc.moveDown(2);

        // Analisi Finanziaria
        if (data.movimenti.length > 0) {
          const entrate = data.movimenti
            .filter(m => this.isEntrata(m.tipo))
            .reduce((sum, m) => sum + Number(m.importo), 0);
          const uscite = data.movimenti
            .filter(m => !this.isEntrata(m.tipo))
            .reduce((sum, m) => sum + Number(m.importo), 0);

          doc.fontSize(14).font('Helvetica-Bold').text('Analisi Finanziaria', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10).font('Helvetica');

          doc.text(`Entrate Totali: € ${entrate.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
          doc.text(`Uscite Totali: € ${uscite.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
          doc.text(`Saldo: € ${(entrate - uscite).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);

          doc.moveDown(2);
        }

        // Alert Critici
        const alertCritici = data.alerts.filter(a => {
          const oggi = new Date();
          const scadenza = new Date(a.dataScadenza);
          const giorniRimanenti = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
          return a.attivo && a.stato !== 'chiuso' && giorniRimanenti <= 7;
        });

        if (alertCritici.length > 0) {
          doc.fontSize(14).font('Helvetica-Bold').fillColor('red').text('Alert Critici', { underline: true });
          doc.fillColor('black');
          doc.moveDown(0.5);
          doc.fontSize(9).font('Helvetica');

          alertCritici.slice(0, 5).forEach(alert => {
            const scadenza = new Date(alert.dataScadenza).toLocaleDateString('it-IT');
            doc.text(`• ${alert.titolo} - Scadenza: ${scadenza}`);
          });

          doc.moveDown(2);
        }

        // Lista Pratiche
        if (data.options.includiDettaglioPratiche && data.pratiche.length > 0) {
          doc.addPage();
          doc.fontSize(16).font('Helvetica-Bold').text('Elenco Pratiche', { underline: true });
          doc.moveDown(1);

          data.pratiche.slice(0, 20).forEach((pratica, index) => {
            const debitoreNome = pratica.debitore?.ragioneSociale ||
              (pratica.debitore ? `${pratica.debitore.nome || ''} ${pratica.debitore.cognome || ''}`.trim() : 'N/D');

            doc.fontSize(10).font('Helvetica-Bold');
            doc.text(`${index + 1}. ${debitoreNome}`, { continued: true });
            doc.font('Helvetica').text(` - ${pratica.aperta ? 'Aperta' : 'Chiusa'}`);

            doc.fontSize(9).font('Helvetica');
            doc.text(`   Fase: ${this.getFaseNome(pratica.faseId || 'non_definita')}`);
            doc.text(`   Capitale: € ${(pratica.capitale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);

            if (pratica.note) {
              doc.text(`   Note: ${pratica.note.substring(0, 100)}${pratica.note.length > 100 ? '...' : ''}`);
            }

            doc.moveDown(0.5);
          });

          if (data.pratiche.length > 20) {
            doc.text(`... e altre ${data.pratiche.length - 20} pratiche`);
          }
        }

        // Note finali
        if (data.options.note) {
          doc.moveDown(2);
          doc.fontSize(12).font('Helvetica-Bold').text('Note');
          doc.moveDown(0.5);
          doc.fontSize(10).font('Helvetica').text(data.options.note);
        }

        // Footer - aggiungi a tutte le pagine
        const range = doc.bufferedPageRange();
        const totalPages = range.count;

        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).font('Helvetica')
            .text(
              `Pagina ${i + 1} di ${totalPages} - Generato automaticamente da Resolv`,
              50,
              doc.page.height - 50,
              { align: 'center', width: doc.page.width - 100 }
            );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private getDefaultLogo(): string {
    // Logo Resolv di default in base64 - placeholder 1x1 pixel trasparente
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}
