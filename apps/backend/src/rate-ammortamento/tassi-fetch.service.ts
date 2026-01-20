import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TassiInteresseService } from './tassi-interesse.service';
import { CacheService } from '../common/cache.service';
import {
  FetchTassiResultDto,
  FetchedRateData,
  ValidationResult,
  DuplicateCheckResult,
  FetchedRateWithStatus,
  FetchError,
  SourceType,
  TipoTasso,
} from './dto/fetch-tassi-result.dto';
import { CreateTassoInteresseDto } from './dto/create-tasso-interesse.dto';
import * as cheerio from 'cheerio';

@Injectable()
export class TassiFetchService {
  private readonly logger = new Logger(TassiFetchService.name);

  constructor(
    private readonly tassiInteresseService: TassiInteresseService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Metodo principale: recupera i tassi correnti da tutte le fonti disponibili
   */
  async fetchCurrentRates(): Promise<FetchTassiResultDto> {
    this.logger.log('Avvio recupero tassi di interesse da fonti esterne...');

    const result = new FetchTassiResultDto();
    const allFetchedRates: FetchedRateData[] = [];

    // Cache disabilitata: esegui sempre un nuovo fetch

    // Strategia multi-source: recupera da tutte le fonti disponibili
    // 1. Prova Banca d'Italia (per tasso BCE → moratorio)
    try {
      const bancaItaliaRates = await this.fetchFromBancaItalia();
      allFetchedRates.push(...bancaItaliaRates);
      this.logger.log(`Recuperati ${bancaItaliaRates.length} tassi da Banca d'Italia (BCE)`);
    } catch (error) {
      this.logger.warn(`Errore fetch Banca d'Italia: ${error.message}`);
      result.fetchErrors.push({
        source: 'Banca d\'Italia (ECB)',
        message: error.message,
      });
    }

    // 2. Prova Banca d'Italia pagina HTML per tasso legale
    try {
      const hasLegale = allFetchedRates.some((rate) => rate.tipo === 'legale');
      if (!hasLegale) {
        const bancaItaliaLegaleRates = await this.fetchFromBancaItaliaLegale();
        allFetchedRates.push(...bancaItaliaLegaleRates);
        this.logger.log(`Recuperati ${bancaItaliaLegaleRates.length} tassi legali da Banca d'Italia`);
      }
    } catch (error) {
      this.logger.warn(`Errore fetch Banca d'Italia tasso legale: ${error.message}`);
      result.fetchErrors.push({
        source: 'Banca d\'Italia (Tasso Legale)',
        message: error.message,
      });
    }

    // 3. Prova MEF (Ministero Economia)
    try {
      const mefRates = await this.fetchFromMEF();
      allFetchedRates.push(...mefRates);
      this.logger.log(`Recuperati ${mefRates.length} tassi da MEF`);
    } catch (error) {
      this.logger.warn(`Errore fetch MEF: ${error.message}`);
      result.fetchErrors.push({
        source: 'MEF',
        message: error.message,
      });
    }

    // 4. Prova Avvocato Andreani (fonte secondaria affidabile)
    try {
      const andreaniRates = await this.fetchFromAvvocatoAndreani();
      allFetchedRates.push(...andreaniRates);
      this.logger.log(`Recuperati ${andreaniRates.length} tassi da Avvocato Andreani`);
    } catch (error) {
      this.logger.warn(`Errore fetch Avvocato Andreani: ${error.message}`);
      result.fetchErrors.push({
        source: 'Avvocato Andreani',
        message: error.message,
      });
    }

    result.totalFetched = allFetchedRates.length;

    // Processamento di ogni tasso recuperato
    for (const rate of allFetchedRates) {
      // Validazione
      const validation = this.validateFetchedRate(rate);

      // Controllo duplicati
      const duplicateCheck = await this.checkIfRateExists(rate);

      let status: FetchedRateWithStatus['status'] = 'needs-approval';
      let savedTassoId: string | undefined;

      // Logica decisionale per auto-save o manual approval
      if (!validation.isValid) {
        status = 'error';
      } else if (duplicateCheck.isDuplicate) {
        status = 'skipped';
      } else {
        // Richiede approvazione manuale (anche per fonti ufficiali)
        status = 'needs-approval';
        result.needsApproval++;
      }

      // Aggiorna contatori
      if (status === 'skipped') result.skipped++;
      if (status === 'error') result.errors++;

      // Aggiungi al risultato
      result.rates.push({
        data: rate,
        validation,
        duplicateCheck,
        status,
        savedTassoId,
      });
    }

    // Cache disabilitata: non salvare risultati

    this.logger.log(
      `Fetch completato: ${result.totalFetched} recuperati, ` +
      `${result.autoSaved} auto-salvati, ${result.needsApproval} richiedono approvazione, ` +
      `${result.skipped} saltati, ${result.errors} errori`,
    );

    return result;
  }

  /**
   * Fetch tasso legale dalla pagina ufficiale Banca d'Italia
   */
  private async fetchFromBancaItaliaLegale(): Promise<FetchedRateData[]> {
    this.logger.debug('Tentativo fetch tasso legale da Banca d\'Italia...');

    const timeout = this.configService.get<number>('TASSI_FETCH_TIMEOUT', 30000);
    const maxRetries = this.configService.get<number>('TASSI_FETCH_RETRIES', 3);
    const url = this.configService.get<string>(
      'TASSI_FETCH_URL_BANCA_ITALIA_LEGALE',
      'https://www.bancaditalia.it/compiti/vigilanza/intermediari/saggio-interesse/index.html',
    );

    try {
      const html = await this.fetchWithRetry(url, timeout, maxRetries);
      const $ = cheerio.load(html);

      // Cerca il tasso legale nella pagina
      const bodyText = $('body').text();

      // Pattern per trovare il tasso legale corrente
      const tassoMatch = bodyText.match(/(\d{1,2}[.,]\d{1,2})\s*%|saggio\s+(?:di\s+)?interesse\s+legale.*?(\d{1,2}[.,]\d{1,2})\s*%/i);
      const dataMatch = bodyText.match(/(?:dal|decorrere\s+dal|a\s+partire\s+dal)\s+(\d{1,2})[°\s]+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i);

      if (!tassoMatch) {
        this.logger.warn('Impossibile estrarre il tasso legale dalla pagina Banca d\'Italia');
        return [];
      }

      const tassoText = tassoMatch[1] || tassoMatch[2];
      const tasso = this.parseTassoPercentuale(tassoText);

      if (tasso === null) {
        return [];
      }

      let dataInizio: Date;
      if (dataMatch) {
        const day = parseInt(dataMatch[1], 10);
        const month = this.parseItalianMonth(dataMatch[2]);
        const year = parseInt(dataMatch[3], 10);
        dataInizio = new Date(year, month || 0, day);
      } else {
        // Fallback: inizio anno corrente
        dataInizio = new Date(new Date().getFullYear(), 0, 1);
      }

      return [
        {
          tipo: 'legale',
          tassoPercentuale: tasso,
          dataInizioValidita: dataInizio,
          dataFineValidita: this.getYearEndDate(dataInizio),
          decretoRiferimento: 'Banca d\'Italia - Saggio di interesse legale',
          source: 'banca-italia',
          sourceUrl: url,
          fetchedAt: new Date(),
          isReliable: true,
          note: 'Recuperato da pagina ufficiale Banca d\'Italia',
        },
      ];
    } catch (error) {
      this.logger.error(`Errore fetch tasso legale Banca d'Italia: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch da API Banca d'Italia (ufficiale)
   * Usa pagina ufficiale ECB per i tassi chiave come fonte BCE.
   */
  private async fetchFromBancaItalia(): Promise<FetchedRateData[]> {
    this.logger.debug('Tentativo fetch da Banca d\'Italia (tassi BCE)...');

    const timeout = this.configService.get<number>('TASSI_FETCH_TIMEOUT', 30000);
    const maxRetries = this.configService.get<number>('TASSI_FETCH_RETRIES', 3);
    const ecbUrl = this.configService.get<string>(
      'TASSI_FETCH_URL_ECB_RATES',
      'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html',
    );

    const html = await this.fetchWithRetry(ecbUrl, timeout, maxRetries);
    const parsed = this.parseEcbMainRefinancingRate(html);
    if (!parsed) {
      this.logger.warn('Impossibile estrarre il tasso BCE dalla pagina ECB');
      return [];
    }

    const { rate, effectiveDate } = parsed;
    const { dataInizio, dataFine } = this.getSemesterRange(effectiveDate);

    return [
      {
        tipo: 'moratorio',
        tassoPercentuale: Number((rate + 8).toFixed(2)),
        dataInizioValidita: dataInizio,
        dataFineValidita: dataFine,
        decretoRiferimento: `Tasso BCE (MRO) ${rate.toFixed(2)}% + 8 punti`,
        source: 'banca-italia',
        sourceUrl: ecbUrl,
        fetchedAt: new Date(),
        isReliable: true,
        calculationDetails: `BCE ${rate.toFixed(2)}% + 8 punti percentuali`,
        note: 'Calcolato da fonte ufficiale ECB (tassi BCE)',
      },
    ];
  }

  /**
   * Fetch da MEF (Ministero Economia e Finanze) - ufficiale
   * Recupera comunicati MEF e tenta il parsing di tasso legale/moratorio.
   */
  private async fetchFromMEF(): Promise<FetchedRateData[]> {
    this.logger.debug('Tentativo fetch da MEF...');

    const timeout = this.configService.get<number>('TASSI_FETCH_TIMEOUT', 30000);
    const maxRetries = this.configService.get<number>('TASSI_FETCH_RETRIES', 3);
    const baseUrl = this.configService.get<string>(
      'TASSI_FETCH_URL_MEF_INDEX',
      'https://www.mef.gov.it/ufficio-stampa/comunicati',
    );
    const currentYear = new Date().getFullYear();
    const yearsToCheck = [currentYear, currentYear - 1, currentYear - 2];
    const maxPages = this.configService.get<number>('TASSI_FETCH_MEF_PAGES', 5);
    const pageSize = this.configService.get<number>('TASSI_FETCH_MEF_PAGE_SIZE', 100);
    const rates: FetchedRateData[] = [];

    for (const year of yearsToCheck) {
      try {
        const allCandidates = new Set<string>();
        for (let page = 1; page <= maxPages; page++) {
          const indexUrl = `${baseUrl}/${year}/index.html?page=${page}&pagesize=${pageSize}`;
          const indexHtml = await this.fetchWithRetry(indexUrl, timeout, maxRetries);
          const candidates = this.extractMefCommuniqueLinks(indexHtml, year, baseUrl);
          candidates.forEach((link) => allCandidates.add(link));
          if (candidates.length < pageSize) {
            break;
          }
        }
        const candidates = Array.from(allCandidates);

        for (const link of candidates) {
          if (rates.some((r) => r.tipo === 'legale') && rates.some((r) => r.tipo === 'moratorio')) {
            break;
          }

          try {
            const pageHtml = await this.fetchWithRetry(link, timeout, maxRetries);
            const parsedRates = this.parseMefCommunique(pageHtml, link);
            parsedRates.forEach((rate) => {
              const already = rates.some(
                (existing) =>
                  existing.tipo === rate.tipo &&
                  existing.dataInizioValidita.getTime() === rate.dataInizioValidita.getTime(),
              );
              if (!already) {
                rates.push(rate);
              }
            });
          } catch (error) {
            this.logger.warn(`Errore parsing comunicato MEF (${link}): ${error.message}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Errore fetch indice MEF ${year}: ${error.message}`);
      }
    }

    return rates;
  }

  /**
   * Fetch da avvocatoandreani.it tramite scraping HTML
   */
  private async fetchFromAvvocatoAndreani(): Promise<FetchedRateData[]> {
    this.logger.debug('Avvio scraping da avvocatoandreani.it...');

    const rates: FetchedRateData[] = [];
    const timeout = this.configService.get<number>('TASSI_FETCH_TIMEOUT', 30000);
    const maxRetries = this.configService.get<number>('TASSI_FETCH_RETRIES', 3);

    // URL configurabili
    const urlLegale = this.configService.get<string>(
      'TASSI_FETCH_URL_AVVOCATO_ANDREANI_LEGALE',
      'https://www.avvocatoandreani.it/servizi/tab_interessi_legali.php',
    );
    const urlMoratorio = this.configService.get<string>(
      'TASSI_FETCH_URL_AVVOCATO_ANDREANI_MORATORIO',
      'https://www.avvocatoandreani.it/servizi/interessi_moratori.php',
    );

    // Fetch tassi legali
    try {
      const legaleHtml = await this.fetchWithRetry(urlLegale, timeout, maxRetries);
      const legaleRate = this.parseAvvocatoAndreaniLegale(legaleHtml, urlLegale);
      if (legaleRate) {
        rates.push(legaleRate);
      }
    } catch (error) {
      this.logger.warn(`Errore fetch tassi legali: ${error.message}`);
    }

    // Fetch tassi moratori
    try {
      const moratorioHtml = await this.fetchWithRetry(urlMoratorio, timeout, maxRetries);
      const moratorioRate = this.parseAvvocatoAndreaniMoratorio(moratorioHtml, urlMoratorio);
      if (moratorioRate) {
        rates.push(moratorioRate);
      }
    } catch (error) {
      this.logger.warn(`Errore fetch tassi moratori: ${error.message}`);
    }

    return rates;
  }

  private parseEcbMainRefinancingRate(html: string): { rate: number; effectiveDate: Date } | null {
    try {
      const $ = cheerio.load(html);
      const rows = $('table tbody tr');
      if (rows.length === 0) {
        return null;
      }

      const firstRow = rows.first();
      const cells = firstRow.find('td');
      if (cells.length < 4) {
        return null;
      }

      const yearText = $(cells[0]).text().trim();
      const dayMonthText = $(cells[1]).text().trim();
      const rateText = $(cells[3]).text().trim();

      const year = Number.parseInt(yearText, 10);
      const effectiveDate = this.parseEcbDate(year, dayMonthText);
      const rate = this.parseTassoPercentuale(rateText);

      if (!effectiveDate || rate === null) {
        return null;
      }

      return { rate, effectiveDate };
    } catch (error) {
      this.logger.warn(`Errore parsing tasso BCE: ${error.message}`);
      return null;
    }
  }

  private parseEcbDate(year: number, dayMonthText: string): Date | null {
    const parts = dayMonthText.replace('.', '').split(' ').filter(Boolean);
    if (parts.length < 2) return null;
    const day = Number.parseInt(parts[0], 10);
    const monthName = parts[1].toLowerCase();
    const monthMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const month = monthMap[monthName];
    if (Number.isNaN(day) || month === undefined) return null;
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private extractMefCommuniqueLinks(html: string, year: number, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links = new Set<string>();
    const keywordLinks = new Set<string>();
    const keywords = ['tasso', 'tassi', 'interesse', 'moratorio', 'legale'];
    const base = baseUrl.startsWith('http') ? baseUrl : `https://www.mef.gov.it${baseUrl}`;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || !href.includes(`/ufficio-stampa/comunicati/${year}/`)) return;
      if (href.includes('index.html')) return;
      const text = $(el).text().toLowerCase();
      try {
        const url = new URL(href, base).toString();
        links.add(url);
        if (keywords.some((k) => text.includes(k))) {
          keywordLinks.add(url);
        }
      } catch {
        return;
      }
    });

    const preferred = keywordLinks.size > 0 ? Array.from(keywordLinks) : Array.from(links);
    return preferred.slice(0, 200);
  }

  private async fetchFromNormattivaLegale(): Promise<FetchedRateData[]> {
    const timeout = this.configService.get<number>('TASSI_FETCH_TIMEOUT', 30000);
    const maxRetries = this.configService.get<number>('TASSI_FETCH_RETRIES', 3);
    const queries = [
      'tasso di interesse legale',
      'saggio di interesse legale',
      'interesse legale',
    ];
    const baseUrl = 'https://www.normattiva.it';
    const result: FetchedRateData[] = [];

    for (const query of queries) {
      const searchUrl = `${baseUrl}/ricerca/veloce/0?testoRicerca=${encodeURIComponent(query)}`;
      const searchHtml = await this.fetchWithRetry(searchUrl, timeout, maxRetries);
      const $ = cheerio.load(searchHtml);
      const links = new Set<string>();

      $('a[href^="/atto/caricaDettaglioAtto"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        links.add(new URL(href, baseUrl).toString());
      });

      const candidates = Array.from(links).slice(0, 10);
      for (const link of candidates) {
        const pageHtml = await this.fetchWithRetry(link, timeout, maxRetries);
        const parsed = this.parseNormattivaLegale(pageHtml, link);
        if (parsed) {
          result.push(parsed);
          return result;
        }
      }
    }

    return result;
  }

  private parseNormattivaLegale(html: string, sourceUrl: string): FetchedRateData | null {
    const $ = cheerio.load(html);
    const bodyText = (
      $('#testoNormalizzato').text() ||
      $('.bodyTesto').text() ||
      $('main').text() ||
      $('body').text()
    )
      .replace(/\s+/g, ' ')
      .trim();

    const normalized = bodyText.toLowerCase();
    if (
      !normalized.includes('tasso di interesse legale') &&
      !normalized.includes('saggio di interesse legale') &&
      !normalized.includes('interesse legale')
    ) {
      return null;
    }

    const tasso = this.extractPercentageNearKeyword(
      bodyText,
      /tasso (di interesse )?legale|saggio di interesse legale/i,
    );
    const dataInizio = this.extractStartDate(bodyText);
    if (tasso === null || !dataInizio) {
      return null;
    }

    const title =
      $('h1').first().text().trim() ||
      $('h3').first().text().trim() ||
      $('title').text().trim();

    return {
      tipo: 'legale',
      tassoPercentuale: tasso,
      dataInizioValidita: dataInizio,
      dataFineValidita: this.getYearEndDate(dataInizio),
      decretoRiferimento: title || 'Normattiva',
      source: 'normattiva',
      sourceUrl,
      fetchedAt: new Date(),
      isReliable: true,
      note: 'Recuperato da Normattiva (IPZS)',
    };
  }

  private parseMefCommunique(html: string, sourceUrl: string): FetchedRateData[] {
    const $ = cheerio.load(html);
    const bodyText = (
      $('div[itemprop="articleBody"]').text() ||
      $('article').text() ||
      $('main').text() ||
      $('body').text()
    )
      .replace(/\s+/g, ' ')
      .trim();
    const title =
      $('h1').first().text().trim() ||
      $('h3').first().text().trim() ||
      $('title').text().trim();
    const normalized = bodyText.toLowerCase();
    const rates: FetchedRateData[] = [];

    if (
      normalized.includes('tasso legale') ||
      normalized.includes('tasso di interesse legale') ||
      normalized.includes('saggio di interesse legale')
    ) {
      const tasso = this.extractPercentageNearKeyword(
        bodyText,
        /tasso (di interesse )?legale|saggio di interesse legale/i,
      );
      const dataInizio = this.extractStartDate(bodyText);
      if (tasso !== null && dataInizio) {
        rates.push({
          tipo: 'legale',
          tassoPercentuale: tasso,
          dataInizioValidita: dataInizio,
          dataFineValidita: this.getYearEndDate(dataInizio),
          decretoRiferimento: title || 'Comunicato MEF',
          source: 'mef',
          sourceUrl,
          fetchedAt: new Date(),
          isReliable: true,
          note: 'Recuperato da comunicato MEF',
        });
      }
    }

    if (normalized.includes('tasso moratorio') || normalized.includes('tassi moratori')) {
      const tasso = this.extractPercentageNearKeyword(bodyText, /tasso moratorio|tassi moratori/i);
      const dataInizio = this.extractStartDate(bodyText);
      if (tasso !== null && dataInizio) {
        const range = this.getSemesterRange(dataInizio);
        rates.push({
          tipo: 'moratorio',
          tassoPercentuale: tasso,
          dataInizioValidita: range.dataInizio,
          dataFineValidita: range.dataFine,
          decretoRiferimento: title || 'Comunicato MEF',
          source: 'mef',
          sourceUrl,
          fetchedAt: new Date(),
          isReliable: true,
          note: 'Recuperato da comunicato MEF',
        });
      }
    }

    return rates;
  }

  private extractPercentageNearKeyword(text: string, keyword: RegExp): number | null {
    const match = keyword.exec(text);
    if (!match) return null;
    const start = Math.max(match.index - 50, 0);
    const end = Math.min(match.index + 200, text.length);
    const windowText = text.slice(start, end);
    const percentMatch = windowText.match(/(\d{1,2}[.,]\d{1,2})\s*%|(\d{1,2}[.,]\d{1,2})\s*per\s*cento/i);
    if (!percentMatch) return null;
    const valueText = percentMatch[1] || percentMatch[2];
    return this.parseTassoPercentuale(valueText);
  }

  private extractStartDate(text: string): Date | null {
    const monthPattern =
      '(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)';
    const startRegex = new RegExp(
      `(?:dal|a\\s+decorrere\\s+dal|con\\s+decorrenza\\s+dal)\\s+(\\d{1,2})(?:°)?\\s+${monthPattern}\\s+(\\d{4})`,
      'i',
    );
    const startMatch = text.match(startRegex);
    if (startMatch) {
      const day = Number.parseInt(startMatch[1], 10);
      const month = this.parseItalianMonth(startMatch[2]);
      const year = Number.parseInt(startMatch[3], 10);
      if (!Number.isNaN(day) && month !== null && !Number.isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    const numericMatch = text.match(/(?:dal|a\s+decorrere\s+dal|con\s+decorrenza\s+dal)\s+(\d{1,2})[\\/.-](\d{1,2})[\\/.-](\d{4})/i);
    if (numericMatch) {
      return this.parseItalianDate(`${numericMatch[1]}/${numericMatch[2]}/${numericMatch[3]}`);
    }

    const fallbackMatch = text.match(new RegExp(`(\\d{1,2})(?:°)?\\s+${monthPattern}\\s+(\\d{4})`, 'i'));
    if (fallbackMatch) {
      const day = Number.parseInt(fallbackMatch[1], 10);
      const month = this.parseItalianMonth(fallbackMatch[2]);
      const year = Number.parseInt(fallbackMatch[3], 10);
      if (!Number.isNaN(day) && month !== null && !Number.isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    return null;
  }

  private parseItalianMonth(monthName: string): number | null {
    const map: Record<string, number> = {
      gennaio: 0,
      febbraio: 1,
      marzo: 2,
      aprile: 3,
      maggio: 4,
      giugno: 5,
      luglio: 6,
      agosto: 7,
      settembre: 8,
      ottobre: 9,
      novembre: 10,
      dicembre: 11,
    };
    const key = monthName.toLowerCase();
    return map[key] ?? null;
  }

  private getYearEndDate(date: Date): Date {
    return new Date(date.getFullYear(), 11, 31);
  }

  private getSemesterRange(date: Date): { dataInizio: Date; dataFine: Date | null } {
    const year = date.getFullYear();
    const month = date.getMonth();
    if (month <= 5) {
      return {
        dataInizio: new Date(year, 0, 1),
        dataFine: new Date(year, 5, 30),
      };
    }
    return {
      dataInizio: new Date(year, 6, 1),
      dataFine: new Date(year, 11, 31),
    };
  }

  /**
   * Fetch HTTP con retry e exponential backoff
   */
  private async fetchWithRetry(url: string, timeout: number, maxRetries: number): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ResolvBot/1.0)',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error;
        const delay = Math.min(100 * Math.pow(2, attempt), 2000); // Exponential backoff
        this.logger.debug(`Tentativo ${attempt + 1}/${maxRetries} fallito, retry tra ${delay}ms...`);

        if (attempt < maxRetries - 1) {
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Fetch failed after retries');
  }

  /**
   * Sleep helper per retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parsing HTML per tassi legali da avvocatoandreani.it
   */
  private parseAvvocatoAndreaniLegale(html: string, sourceUrl: string): FetchedRateData | null {
    try {
      const $ = cheerio.load(html);

      // Cerca tabella tassi legali
      const rows = $('table[summary*="tabella interessi legali"] tr, table tr');

      if (rows.length === 0) {
        this.logger.warn('Nessuna tabella trovata nella pagina tassi legali');
        return null;
      }

      type LatestData = {
        dataInizio: Date;
        dataFine: Date | null;
        tassoPercentuale: number;
        decretoText: string;
      };

      let latest: LatestData | null = null;

      rows.each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 4) return;
        const startText = $(cells[0]).text().trim();
        const endText = $(cells[1]).text().trim();
        const tassoText = $(cells[2]).text().trim();
        const decretoText = $(cells[3]).text().trim();

        const dataInizio = this.parseItalianDate(startText);
        if (!dataInizio) return;
        const dataFine = endText === '---' ? null : this.parseItalianDate(endText);
        const tassoPercentuale = this.parseTassoPercentuale(tassoText);
        if (tassoPercentuale === null) return;

        if (!latest || dataInizio > latest.dataInizio) {
          latest = { dataInizio, dataFine, tassoPercentuale, decretoText };
        }
      });

      if (!latest) {
        this.logger.warn('Dati incompleti nel parsing tassi legali');
        return null;
      }

      // Type assertion necessaria perché TypeScript non traccia modifiche in callbacks
      const latestData: LatestData = latest;

      return {
        tipo: 'legale',
        tassoPercentuale: latestData.tassoPercentuale,
        dataInizioValidita: latestData.dataInizio,
        dataFineValidita: latestData.dataFine,
        decretoRiferimento: latestData.decretoText || undefined,
        source: 'avvocato-andreani',
        sourceUrl,
        fetchedAt: new Date(),
        isReliable: false, // Scraping non è affidabile come API ufficiale
        note: 'Recuperato tramite scraping della tabella tassi legali',
      };
    } catch (error) {
      this.logger.error(`Errore parsing tassi legali: ${error.message}`);
      return null;
    }
  }

  /**
   * Parsing HTML per tassi moratori da avvocatoandreani.it
   */
  private parseAvvocatoAndreaniMoratorio(html: string, sourceUrl: string): FetchedRateData | null {
    try {
      const $ = cheerio.load(html);

      const rows = $('table tr');

      if (rows.length === 0) {
        this.logger.warn('Nessuna tabella trovata nella pagina tassi moratori');
        return null;
      }

      const lastRow = rows.last();
      const cells = lastRow.find('td');

      if (cells.length < 3) {
        this.logger.warn('Formato tabella non riconosciuto');
        return null;
      }

      const periodoText = $(cells[0]).text().trim();
      const tassoText = $(cells[1]).text().trim();
      const decretoText = $(cells[2]).text().trim();

      const { dataInizio, dataFine } = this.parsePeriodo(periodoText);
      const tassoPercentuale = this.parseTassoPercentuale(tassoText);

      if (!dataInizio || tassoPercentuale === null) {
        this.logger.warn('Dati incompleti nel parsing tassi moratori');
        return null;
      }

      // Nota: tassi moratori spesso calcolati come "BCE + 8 punti"
      const calculationDetails = tassoText.includes('BCE') || tassoText.includes('bce')
        ? 'Tasso BCE + 8 punti percentuali'
        : undefined;

      return {
        tipo: 'moratorio',
        tassoPercentuale,
        dataInizioValidita: dataInizio,
        dataFineValidita: dataFine,
        decretoRiferimento: decretoText || undefined,
        source: 'avvocato-andreani',
        sourceUrl,
        fetchedAt: new Date(),
        isReliable: false,
        calculationDetails,
        note: 'Recuperato tramite scraping HTML da avvocatoandreani.it',
      };
    } catch (error) {
      this.logger.error(`Errore parsing tassi moratori: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse periodo da stringa (es. "01/01/2024 - 31/12/2024" o "dal 01/01/2024")
   */
  private parsePeriodo(text: string): { dataInizio: Date | null; dataFine: Date | null } {
    try {
      // Rimuovi "dal" e spazi extra
      text = text.replace(/dal\s+/gi, '').trim();

      // Cerca pattern "DD/MM/YYYY - DD/MM/YYYY" o "DD/MM/YYYY"
      const rangeMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
      if (rangeMatch) {
        return {
          dataInizio: this.parseItalianDate(rangeMatch[1]),
          dataFine: this.parseItalianDate(rangeMatch[2]),
        };
      }

      const singleMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (singleMatch) {
        return {
          dataInizio: this.parseItalianDate(singleMatch[1]),
          dataFine: null, // Validità indefinita
        };
      }

      return { dataInizio: null, dataFine: null };
    } catch (error) {
      this.logger.warn(`Errore parsing periodo: ${error.message}`);
      return { dataInizio: null, dataFine: null };
    }
  }

  /**
   * Parse data italiana "DD/MM/YYYY" → Date
   */
  private parseItalianDate(dateStr: string): Date | null {
    try {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Mese 0-indexed
      const year = parseInt(parts[2], 10);

      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse tasso percentuale (es. "2,50%" o "2.5%" → 2.5)
   */
  private parseTassoPercentuale(text: string): number | null {
    try {
      // Rimuovi simbolo % e spazi
      text = text.replace(/%/g, '').trim();

      // Sostituisci virgola con punto
      text = text.replace(/,/g, '.');

      const value = parseFloat(text);
      return isNaN(value) ? null : value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validazione di un tasso recuperato
   */
  private validateFetchedRate(rate: FetchedRateData): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Campi obbligatori
    if (!rate.tipo) {
      result.errors.push('Campo "tipo" obbligatorio mancante');
      result.isValid = false;
    }

    if (rate.tassoPercentuale === undefined || rate.tassoPercentuale === null) {
      result.errors.push('Campo "tassoPercentuale" obbligatorio mancante');
      result.isValid = false;
    }

    if (!rate.dataInizioValidita) {
      result.errors.push('Campo "dataInizioValidita" obbligatorio mancante');
      result.isValid = false;
    }

    // Range tasso
    if (rate.tassoPercentuale < 0 || rate.tassoPercentuale > 100) {
      result.errors.push('Tasso percentuale deve essere tra 0 e 100');
      result.isValid = false;
    }

    // Validità date
    if (rate.dataFineValidita) {
      if (rate.dataInizioValidita > rate.dataFineValidita) {
        result.errors.push('Data inizio validità non può essere successiva a data fine');
        result.isValid = false;
      }
    }

    // Warnings
    if (!rate.decretoRiferimento) {
      result.warnings.push('Decreto di riferimento non specificato');
    }

    if (!rate.isReliable) {
      result.warnings.push('Fonte non ufficiale - richiede verifica manuale');
    }

    return result;
  }

  /**
   * Controlla se esiste già un tasso con stesso tipo e periodo sovrapposto
   */
  private async checkIfRateExists(rate: FetchedRateData): Promise<DuplicateCheckResult> {
    try {
      const existing = await this.tassiInteresseService.checkForOverlappingRate(
        rate.tipo,
        rate.dataInizioValidita,
        rate.dataFineValidita ?? null,
      );

      if (existing) {
        return {
          isDuplicate: true,
          existingRateId: existing.id,
          existingRate: {
            id: existing.id,
            tipo: existing.tipo,
            tassoPercentuale: Number(existing.tassoPercentuale),
            dataInizioValidita: existing.dataInizioValidita,
            dataFineValidita: existing.dataFineValidita,
            decretoRiferimento: existing.decretoRiferimento,
            note: existing.note,
          },
          reason: `Esiste già un tasso ${rate.tipo} valido per questo periodo (ID: ${existing.id})`,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      this.logger.error(`Errore controllo duplicati: ${error.message}`);
      return {
        isDuplicate: false,
        reason: `Errore durante il controllo: ${error.message}`,
      };
    }
  }

  /**
   * Salva automaticamente un tasso da fonte affidabile
   */
  private async autoSaveRate(rate: FetchedRateData) {
    const dto: CreateTassoInteresseDto = {
      tipo: rate.tipo,
      tassoPercentuale: rate.tassoPercentuale,
      dataInizioValidita: rate.dataInizioValidita.toISOString().split('T')[0],
      dataFineValidita: rate.dataFineValidita?.toISOString().split('T')[0] || undefined,
      decretoRiferimento: rate.decretoRiferimento,
      note: rate.note || `Auto-importato da ${rate.source} il ${new Date().toLocaleDateString('it-IT')}`,
    };

    return await this.tassiInteresseService.create(dto);
  }
}
