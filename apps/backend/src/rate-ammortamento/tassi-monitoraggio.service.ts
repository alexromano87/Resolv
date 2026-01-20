import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { TassiFetchService } from './tassi-fetch.service';
import { FetchTassiResultDto } from './dto/fetch-tassi-result.dto';
import { TassoInteresse } from './tasso-interesse.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TassiMonitoraggioService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TassiMonitoraggioService.name);
  private isEnabled: boolean;

  constructor(
    private readonly tassiFetchService: TassiFetchService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(TassoInteresse)
    private readonly tassiRepository: Repository<TassoInteresse>,
  ) {
    this.isEnabled = this.configService.get<string>('TASSI_FETCH_ENABLED', 'true') === 'true';
  }

  onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('Servizio monitoraggio tassi di interesse attivato');
      this.logger.log('Schedulazione automatica: ogni lunedì alle 9:00');
    } else {
      this.logger.warn('Servizio monitoraggio tassi di interesse DISATTIVATO (TASSI_FETCH_ENABLED=false)');
    }
  }

  onModuleDestroy() {
    this.logger.log('Servizio monitoraggio tassi di interesse terminato');
  }

  /**
   * Notifica tassi in scadenza (30 giorni prima) - ogni giorno alle 9:00
   */
  @Cron('0 9 * * *', {
    name: 'tassi-interesse-scadenza',
    timeZone: 'Europe/Rome',
  })
  async checkTassiInScadenza(): Promise<void> {
    const oggi = this.startOfDay(new Date());
    const finoA = new Date(oggi);
    finoA.setDate(finoA.getDate() + 30);

    try {
      const tassi = await this.tassiRepository.find({
        where: {
          dataFineValidita: Between(oggi, finoA),
        },
      });

      if (tassi.length === 0) return;

      for (const tasso of tassi) {
        const dataFine = tasso.dataFineValidita;
        if (!dataFine) continue;
        const message = `Tasso ${tasso.tipo} ${tasso.tassoPercentuale}% in scadenza il ${dataFine.toLocaleDateString('it-IT')}.`;
        await this.notificationsService.notifyAdminsUnique({
          type: 'tasso_interesse_scadenza',
          title: 'Tasso in scadenza',
          message,
          metadata: {
            tassoId: tasso.id,
            tipo: tasso.tipo,
            dataFineValidita: dataFine.toISOString(),
            action: 'fetch-tassi',
          },
        });
      }
    } catch (error) {
      this.logger.error(`Errore controllo tassi in scadenza: ${error.message}`, error.stack);
    }
  }

  /**
   * Notifica tassi scaduti o mancanti - ogni lunedì alle 10:00
   */
  @Cron('0 10 * * 1', {
    name: 'tassi-interesse-scaduto',
    timeZone: 'Europe/Rome',
  })
  async checkTassiScaduti(): Promise<void> {
    const oggi = this.startOfDay(new Date());

    try {
      const hasLegale = await this.hasValidRate('legale', oggi);
      const hasMoratorio = await this.hasValidRate('moratorio', oggi);

      if (!hasLegale) {
        await this.notificationsService.notifyAdminsUnique({
          type: 'tasso_interesse_scaduto_critico',
          title: 'Tasso legale scaduto',
          message: 'Nessun tasso legale valido per il periodo corrente.',
          metadata: { tipo: 'legale', action: 'fetch-tassi' },
        });
      }

      if (!hasMoratorio) {
        await this.notificationsService.notifyAdminsUnique({
          type: 'tasso_interesse_scaduto_critico',
          title: 'Tasso moratorio scaduto',
          message: 'Nessun tasso moratorio valido per il periodo corrente.',
          metadata: { tipo: 'moratorio', action: 'fetch-tassi' },
        });
      }
    } catch (error) {
      this.logger.error(`Errore controllo tassi scaduti: ${error.message}`, error.stack);
    }
  }

  private async hasValidRate(tipo: 'legale' | 'moratorio', oggi: Date): Promise<boolean> {
    const qb = this.tassiRepository.createQueryBuilder('tasso');
    qb.where('tasso.tipo = :tipo', { tipo })
      .andWhere('tasso.dataInizioValidita <= :oggi', { oggi })
      .andWhere('(tasso.dataFineValidita >= :oggi OR tasso.dataFineValidita IS NULL)', { oggi });
    const count = await qb.getCount();
    if (count > 0) return true;

    if (tipo === 'moratorio') {
      const fallback = await this.tassiRepository.findOne({
        where: {
          tipo,
          dataInizioValidita: LessThanOrEqual(oggi),
        },
        order: { dataInizioValidita: 'DESC' },
      });
      return Boolean(fallback);
    }

    return false;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Trigger manuale del fetch (chiamato dall'endpoint API)
   */
  async triggerManualFetch(): Promise<FetchTassiResultDto> {
    this.logger.log('Trigger manuale recupero tassi richiesto');

    try {
      const result = await this.tassiFetchService.fetchCurrentRates();

      // Log risultati
      this.logFetchResult(result, 'MANUALE');

      // Future: inviare notifiche se configurate

      return result;
    } catch (error) {
      this.logger.error(`Errore durante il fetch manuale: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Fetch schedulato automatico (ogni lunedì alle 9:00)
   * Cron expression: "0 9 * * 1" = minuto 0, ora 9, ogni giorno del mese, ogni mese, lunedì (1)
   */
  @Cron('0 9 * * 1', {
    name: 'tassi-interesse-fetch',
    timeZone: 'Europe/Rome',
  })
  async scheduledFetch(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Fetch schedulato saltato (servizio disabilitato)');
      return;
    }

    this.logger.log('=== AVVIO FETCH SCHEDULATO TASSI DI INTERESSE ===');

    try {
      const result = await this.tassiFetchService.fetchCurrentRates();

      // Log risultati
      this.logFetchResult(result, 'SCHEDULATO');

      // Notifica admin se trovati nuovi tassi che richiedono approvazione
      if (result.needsApproval > 0) {
        await this.notifyNewRatesFound(result);
      }

      this.logger.log('=== FETCH SCHEDULATO COMPLETATO CON SUCCESSO ===');
    } catch (error) {
      this.logger.error(
        `=== FETCH SCHEDULATO FALLITO: ${error.message} ===`,
        error.stack,
      );
    }
  }

  /**
   * Log strutturato dei risultati del fetch
   */
  private logFetchResult(result: FetchTassiResultDto, tipo: 'MANUALE' | 'SCHEDULATO'): void {
    this.logger.log(`
┌─────────────────────────────────────────────────────┐
│ RISULTATO FETCH ${tipo} - ${result.fetchedAt.toLocaleString('it-IT')}
├─────────────────────────────────────────────────────┤
│ Totale recuperati:        ${result.totalFetched.toString().padStart(3)}
│ Auto-salvati (ufficiali): ${result.autoSaved.toString().padStart(3)}
│ Richiedono approvazione:  ${result.needsApproval.toString().padStart(3)}
│ Saltati (duplicati):      ${result.skipped.toString().padStart(3)}
│ Errori:                   ${result.errors.toString().padStart(3)}
└─────────────────────────────────────────────────────┘
    `);

    // Log dettagli per tassi auto-salvati
    const autoSavedRates = result.rates.filter(r => r.status === 'auto-saved');
    if (autoSavedRates.length > 0) {
      this.logger.log('Tassi auto-salvati:');
      autoSavedRates.forEach(rate => {
        this.logger.log(
          `  - ${rate.data.tipo.toUpperCase()}: ${rate.data.tassoPercentuale}% ` +
          `(${rate.data.source}, dal ${rate.data.dataInizioValidita.toLocaleDateString('it-IT')})`,
        );
      });
    }

    // Log tassi che richiedono approvazione
    const needsApprovalRates = result.rates.filter(r => r.status === 'needs-approval');
    if (needsApprovalRates.length > 0) {
      this.logger.warn('Tassi che richiedono approvazione manuale:');
      needsApprovalRates.forEach(rate => {
        this.logger.warn(
          `  - ${rate.data.tipo.toUpperCase()}: ${rate.data.tassoPercentuale}% ` +
          `(${rate.data.source}, warnings: ${rate.validation.warnings.join(', ')})`,
        );
      });
    }

    // Log errori di fetch
    if (result.fetchErrors.length > 0) {
      this.logger.error('Errori durante il fetch dalle fonti:');
      result.fetchErrors.forEach(err => {
        this.logger.error(`  - ${err.source}: ${err.message}`);
      });
    }
  }

  /**
   * Notifica quando trovati nuovi tassi che richiedono approvazione
   * Future: implementare invio email agli admin
   */
  private async notifyNewRatesFound(result: FetchTassiResultDto): Promise<void> {
    this.logger.warn(
      `ATTENZIONE: Trovati ${result.needsApproval} nuovi tassi che richiedono approvazione manuale. ` +
      `Accedere al pannello admin per revisione.`,
    );

    // TODO: Implementare notifiche
    // - Email agli admin
    // - Notifiche in-app
    // - Alert nel pannello admin
  }
}
