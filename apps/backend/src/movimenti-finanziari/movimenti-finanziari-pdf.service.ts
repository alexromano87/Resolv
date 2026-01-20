import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimentoFinanziario } from './movimento-finanziario.entity';
import { Cliente } from '../clienti/cliente.entity';
import { Studio } from '../studi/studio.entity';
import puppeteer from 'puppeteer';

const LOGO_RESOLV_DEFAULT = 'iVBORw0KGgoAAAANSUhEUgAAAGUAAABjCAYAAACCJc7SAAAAxHpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHjabVBbDsMgDPvPKXYE8uB1HLoyaTfY8RfAndpqlnBNXJkk1D/vFz0GhI0s5pJqSsFh1ao0FyUstMkcbPJEivD4WqekMMRLQ+NeEv4/6vwLWJ/mKp6CyhPGdjWqIb/cgvCQjo7ExY6giiCVZTACWsMoteTzCFsPV5R1aNCG1ID573fLvr09+jsq0pU1OKvaakDHiaTNDXEW9aZc89R51jM68YX829MB+gJPxFnZwOS6YAAAAYRpQ0NQSUNDIHByb2ZpbGUAAHicfZE9SMNAHMVfW6VSKiIWFFHIUJ3soiKOtQpFqBBqhVYdTC79giYNSYqLo+BacPBjserg4qyrg6sgCH6AuAtOii5S4v+SQosYD4778e7e4+4d4G9UmGp2xQFVs4x0MiFkc6tC8BVhDCKEfoxKzNTnRDEFz/F1Dx9f72I8y/vcn6NXyZsM8AnEcaYbFvEG8cympXPeJ46wkqQQnxNPGHRB4keuyy6/cS467OeZESOTnieOEAvFDpY7mJUMlXiaOKqoGuX7sy4rnLc4q5Uaa92TvzCc11aWuU5zBEksYgkiBMiooYwKLMRo1Ugxkab9hId/2PGL5JLJVQYjxwKqUCE5fvA/+N2tWZiadJPCCaD7xbY/xoDgLtCs2/b3sW03T4DAM3Cltf3VBjD7SXq9rUWPgL5t4OK6rcl7wOUOMPSkS4bkSAGa/kIBeD+jb8oBA7dAaM3trbWP0wcgQ12lboCDQ2C8SNnrHu/u6ezt3zOt/n4Ag9Vyra9a9w4AAA52aVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA0LjQuMC1FeGl2MiI+CiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpHSU1QPSJodHRwOi8vd3d3LmdpbXAub3JnL3htcC8iCiAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICB4bWxuczpwZGY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8iCiAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOjViNmVmNWZjLWViZGItNDdjNS1iZTE4LTQ2MmZjMjdhNTBhMCIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1ZWRjZDBiNi1mYzVhLTQ5ZTMtYTU3NC02Y2ZlMDUzNDlmNGYiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo3NzdiNDliYi1hMTVkLTQ3MzYtOWEwNi03MTU2YjZjOTgyYWIiCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09Ik1hYyBPUyIKICAgR0lNUDpUaW1lU3RhbXA9IjE3NjY0ODU2MzkyODI0NjUiCiAgIEdJTVA6VmVyc2lvbj0iMi4xMC4zNCIKICAgZGM6Rm9ybWF0PSJpbWFnZS9wbmciCiAgIHBkZjpBdXRob3I9IkFsZXNzYW5kcm8gUm9tYW5vIgogICB0aWZmOk9yaWVudGF0aW9uPSIxIgogICB4bXA6Q3JlYXRvclRvb2w9IkdJTVAgMi4xMCIKICAgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNToxMjoyM1QxMToyNzoxNyswMTowMCIKICAgeG1wOk1vZGlmeURhdGU9IjIwMjU6MTI6MjNUMTE6Mjc6MTcrMDE6MDAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoxYTNiOWVmMS00ZTQ1LTRiODItYmU5MS03ZjNhMGEzNGU1ZDkiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoTWFjIE9TKSIKICAgICAgc3RFdnQ6d2hlbj0iMjAyNS0xMi0yM1QxMToyNzoxOSswMTowMCIvPgogICAgPC9yZGY6U2VxPgogICA8L3htcE1NOkhpc3Rvcnk+CiAgIDxkYzp0aXRsZT4KICAgIDxyZGY6QWx0PgogICAgIDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+Qmx1ZSBhbmQgQmxhY2sgTW9kZXJuIEdyYWRpZW50IFNvZnR3YXJlIERldmVsb3BtZW50IFRlY2hub2xvZ3kgTG9nbyAtIDE8L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC9kYzp0aXRsZT4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/Pi4HdXkAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAHdElNRQfpDBcKGxPVvm1fAAAFgUlEQVR42u2dW2wUVRjH/98u2wuxrR2QcklMtiqY1gtCNFFfiMVLoj7IC6s+GxOjxkTlwfhoDE8mPGjim/FpLFATfaalaPASMcEoFgigEdqdtuz2tttt5/L5ICT4AHTOzJzdM/P9HjfZmcn89vuf75y5LCAIgiAIgiAIgiAIgiAIgiAIgiAIhkGtcBA7q9WuBdftZd/vygMdrXii/DwzOL/Y3tk5PdHdPZ9KKcWpqUECv8jEewDaaNgv+SLncPDSpq2/pkJK/8zkAHt4B4RdpsdMjvDxhb6tI0ZLuad8ZX8Aej9N+Z8jvHehb+vxWLeprUKcqdfSJgQAOOADe5jbjJPSX558mZlfT2OnxESbLjuTjxsl5b5y+QEG3k1zCxuAdhslxYP/QQamFpYxUvqnp54EaHsGpnurxkhhn/dnYw7O542QUnQcC4QnsqBkHeVPxbq95Ga9wRDH/XtcRQe71Mk+2uBjHVhfS3/TQX4Ji5c/KbxRKFVu/LgB4C8Av7m2dbJlJo/F8uTnAHbHIKLTX6RNvEy9zMi3WpXUf8pj6ftbHtYVAK+4tnWiqfFVdBwrqhD2UPBmqeg6uYGgThtbUQgANM7e9hRuAzBeKFVeaqoUQjAUSYiLDm+a7g+WyUILE1QBb2bNYTNSKFUGmyaFA346yrjhTed2sE9taHEaZ0MX78GmSLnWdSmtALOHNm+GtnOQXAMSq5RzoU/fC4VS5Q79lRIEe1W/6lfpbg6oYMTSSrjoupFHmxBfrCQlWKbuoEE9psxNFKLrOj1apUSJrmABm02aMK6h67oZs3orRTG62EVHsEpdpggJqoA3qzzFO605vhSjq9barW+M0fWda1uL2qREiq5lGCZF+bQd1tsSq0bXKjrZo/aMRNew5nmKYnTVqTdD0eVokyLRFV+VxFcpEl2xjSexSSGorXUZF10TyqfrxFqjKxYpRcexmPBIJqLrXD7xKolFSo49pSqR6EpQCjNlo+vSFF2RpWQqutRb4eGwX4gkJVPRdVU5uo5olcJM2ei6/lQ+TeNhoyuSlGvRtVO6rvgG+MhScuw/I9EVf3RFksKMbHRdmqNLWUqmouu8vq4rkpRMRZf6hPGoVikMZGStS7lKjqtGl5KUouNYDDycja4r2SuMsUkh9p+V6EouulTjKyNrXc2JrtBSIkVXHRuMkqLhCmMsUiJFlwE3bF/Hv0pRJowjWqVA9QqjYfd1rahXyVjU6Aol5b/oooey0HUtT+hd61KWQuw/pxhd642KrlnAryp//SutUiLckmpU17WiviI85tpWRZuUB+fmujMTXWea13WFklJvNHZkIbpWLxH8eTJDCgClCDItumonlZ/qG40rutYuJcdLaY+u5V9ycMt6biGKRUpH+/rfQ0fXijnR5U0TFscjPfs6rF3KHz09CwB+DFUlhqx1BTVgfiTSs6+xRle4lpjyh9IWXe4/hMqXbfBraJkqCSXlUl/feSIcSEt01U7kUR0uIKhH3tThuI8t9MjWXy4/BgQf8S3eBudXaZu/RC33tC83GI0zedRPr4MfT+Acc21rb9zHGXp0u7h5888DzM83ZqYGwXQvGFuA/79ttPZD/kN2W0CCRwjqgL9IUVd+tVWJUqXcjkKpsgvAKWSDDXEP8uEG+rUzlBEh3yQhJCkpuzIi5VBSG05CyvoMCBl1bWvUJClOyoUsAHg1yR0kIWU85VL2ubZVNk3K1wDKKRXypmtbx5LeSexSXNuqA3grZTLKAJ5ybetTHTtL5B2Srm0dAfB2SoQcBTDo2taYrh0m+qc2hVJlCMBnAEx73/3fAL4F8IVrW9onwlr+aahQqtwFYAuAO4Hmv3X7JtQAzAEor+WdXIIgCIIgCIIgCIIgCIIghOdfJT11DF01b20AAAAASUVORK5CYII=' ;

interface ReportFatturazioneOptions {
  movimenti: MovimentoFinanziario[];
  cliente: Cliente | null;
  studio: Studio | null;
  dataInizio?: Date;
  dataFine?: Date;
}

@Injectable()
export class MovimentiFinanziariPdfService {
  constructor(
    @InjectRepository(MovimentoFinanziario)
    private readonly movimentoRepo: Repository<MovimentoFinanziario>,
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(Studio)
    private readonly studioRepo: Repository<Studio>,
  ) {}

  async generaReportFatturazione(options: ReportFatturazioneOptions): Promise<Buffer> {
    const html = this.buildHtml(options);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return Buffer.from(buffer);
    } finally {
      await browser.close();
    }
  }

  private formatDate(value?: Date | string | null): string {
    if (!value) return '-';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleDateString('it-IT');
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }

  private getTipoMovimentoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      capitale: 'Capitale',
      anticipazione: 'Anticipazione',
      compenso: 'Compenso legale',
      interessi: 'Interessi',
      altro: 'Altro',
      recupero_capitale: 'Recupero capitale',
      recupero_anticipazione: 'Recupero anticipazione',
      recupero_compenso: 'Recupero compenso',
      recupero_interessi: 'Recupero interessi',
      recupero_altro: 'Recupero altro',
    };
    return labels[tipo] || tipo;
  }

  private buildHtml(data: ReportFatturazioneOptions): string {
    const { movimenti, cliente, studio, dataInizio, dataFine } = data;

    const totale = movimenti.reduce((sum, m) => sum + (m.importo || 0), 0);

    const logoData = studio?.logo
      ? (studio.logo.includes(',') ? studio.logo : `data:image/png;base64,${studio.logo}`)
      : `data:image/png;base64,${LOGO_RESOLV_DEFAULT}`;

    const periodoLabel = dataInizio && dataFine
      ? `${this.formatDate(dataInizio)} - ${this.formatDate(dataFine)}`
      : 'Tutti i periodi';

    const oggi = this.formatDate(new Date());

    return `
<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      background: #ffffff;
      color: #1c2738;
      font-size: 11pt;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #1f3c88;
    }
    .logo {
      width: 120px;
      height: auto;
    }
    .header-info {
      text-align: right;
    }
    .header-info h1 {
      font-size: 24pt;
      color: #1f3c88;
      margin-bottom: 5px;
    }
    .header-info p {
      font-size: 10pt;
      color: #64748b;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1f3c88;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e0e7ff;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 10px;
      background: #f8fafc;
      border-left: 3px solid #1f3c88;
    }
    .info-label {
      font-size: 9pt;
      color: #64748b;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 11pt;
      color: #1c2738;
      margin-top: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    thead {
      background: #1f3c88;
      color: white;
    }
    thead th {
      padding: 12px 8px;
      text-align: left;
      font-size: 10pt;
      font-weight: bold;
    }
    tbody tr {
      border-bottom: 1px solid #e2e8f0;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    tbody td {
      padding: 10px 8px;
      font-size: 9.5pt;
    }
    .text-right {
      text-align: right;
    }
    .totale-section {
      margin-top: 30px;
      padding: 20px;
      background: #e0f2fe;
      border-radius: 8px;
      border: 2px solid #1f3c88;
    }
    .totale-label {
      font-size: 14pt;
      font-weight: bold;
      color: #1f3c88;
      text-align: right;
    }
    .totale-value {
      font-size: 18pt;
      font-weight: bold;
      color: #1f3c88;
      text-align: right;
      margin-top: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      font-size: 9pt;
      color: #64748b;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: bold;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-warning {
      background: #fed7aa;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoData}" alt="Logo" class="logo" />
    <div class="header-info">
      <h1>Report Fatturazione</h1>
      <p>Generato il ${oggi}</p>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Informazioni Cliente</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Cliente</div>
        <div class="info-value">${cliente?.ragioneSociale || 'Tutti i clienti'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Codice Fiscale / P.IVA</div>
        <div class="info-value">${cliente?.codiceFiscale || cliente?.partitaIva || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Periodo</div>
        <div class="info-value">${periodoLabel}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Numero Movimenti</div>
        <div class="info-value">${movimenti.length}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Dettaglio Movimenti</h2>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Pratica</th>
          <th>Tipo</th>
          <th>Oggetto</th>
          <th>Stato</th>
          <th class="text-right">Importo</th>
        </tr>
      </thead>
      <tbody>
        ${movimenti.map(m => `
          <tr>
            <td>${this.formatDate(m.data)}</td>
            <td>#${m.pratica?.id?.substring(0, 8) || 'N/D'}</td>
            <td>${this.getTipoMovimentoLabel(m.tipo)}</td>
            <td>${m.oggetto || '-'}</td>
            <td>
              ${m.giaFatturato
                ? '<span class="badge badge-success">Già fatturato</span>'
                : '<span class="badge badge-warning">Da fatturare</span>'}
            </td>
            <td class="text-right">${this.formatCurrency(m.importo || 0)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="totale-section">
    <div class="totale-label">TOTALE DA FATTURARE</div>
    <div class="totale-value">${this.formatCurrency(totale)}</div>
  </div>

  <div class="footer">
    <p>Report generato da Resolv - Sistema di gestione recupero crediti</p>
    ${studio?.nome ? `<p>${studio.nome}</p>` : ''}
    ${studio?.indirizzo ? `<p>${studio.indirizzo}</p>` : ''}
  </div>
</body>
</html>
    `;
  }
}

