import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientiModule } from './clienti/clienti.module';
import { DebitoriModule } from './debitori/debitori.module';
import { ClientiDebitoriModule } from './relazioni/clienti-debitori.module';
import { FasiModule } from './fasi/fasi.module';
import { PraticheModule } from './pratiche/pratiche.module';
import { AvvocatiModule } from './avvocati/avvocati.module';
import { MovimentiFinanziariModule } from './movimenti-finanziari/movimenti-finanziari.module';
import { AlertsModule } from './alerts/alerts.module';
import { TicketsModule } from './tickets/tickets.module';
import { DocumentiModule } from './documenti/documenti.module';
import { CartelleModule } from './cartelle/cartelle.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StudiModule } from './studi/studi.module';
import { AdminMaintenanceModule } from './admin/admin-maintenance.module';
import { AuditLogModule } from './audit/audit-log.module';
import { ExportModule } from './export/export.module';
import { ImportModule } from './import/import.module';
import { BackupModule } from './backup/backup.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ReportModule } from './report/report.module';
import { RateAmmortamentoModule } from './rate-ammortamento/rate-ammortamento.module';
import { UtilitaModule } from './utilita/utilita.module';
import { NazioniModule } from './nazioni/nazioni.module';
import { APP_GUARD } from '@nestjs/core';
import { RedisRateLimitGuard } from './common/redis-rate-limit.guard';
import { HealthController } from './health/health.controller';
import { CacheService } from './common/cache.service';

@Module({
  imports: [
    // Carica variabili da .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configurazione per cron jobs e task scheduling
    ScheduleModule.forRoot(),

    // Configurazione TypeORM con variabili d'ambiente
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        if (configService.get<string>('DB_USE_SQLITE') === 'true') {
          return {
            type: 'sqlite',
            database: ':memory:',
            autoLoadEntities: true,
            synchronize: true,
          };
        }
        return {
          type: 'mysql',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 3307),
          username: configService.get<string>('DB_USERNAME', 'rc_user'),
          password: configService.get<string>('DB_PASSWORD', 'rc_pass'),
          database: configService.get<string>('DB_DATABASE', 'recupero_crediti'),
          autoLoadEntities: true,
          // Synchronize solo in development
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),

    AuthModule,
    UsersModule,
    StudiModule,
    ClientiModule,
    DebitoriModule,
    ClientiDebitoriModule,
    FasiModule,
    PraticheModule,
    AvvocatiModule,
    MovimentiFinanziariModule,
    AlertsModule,
    TicketsModule,
    DocumentiModule,
    CartelleModule,
    DashboardModule,
    AdminMaintenanceModule,
    AuditLogModule,
    NotificationsModule,
    ExportModule,
    ImportModule,
    BackupModule,
    MonitoringModule,
    ReportModule,
    RateAmmortamentoModule,
    UtilitaModule,
    NazioniModule,
  ],
  controllers: [HealthController],
  providers: [
    CacheService,
    {
      provide: APP_GUARD,
      useClass: RedisRateLimitGuard,
    },
  ],
  exports: [CacheService],
})
export class AppModule {}
