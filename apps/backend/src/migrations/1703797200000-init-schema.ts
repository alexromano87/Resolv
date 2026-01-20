import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migrazione di bootstrap schema: crea tutte le tabelle principali.
 * GENERATA AUTOMATICAMENTE DALLE ENTITY - NON MODIFICARE MANUALMENTE
 */
export class InitSchema1703797200000 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      SET FOREIGN_KEY_CHECKS = 0;

      -- Drop all tables if exist
      DROP TABLE IF EXISTS pratiche_collaboratori;
      DROP TABLE IF EXISTS pratiche_avvocati;
      DROP TABLE IF EXISTS clienti_debitori;
      DROP TABLE IF EXISTS cartelle_closure;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS documenti;
      DROP TABLE IF EXISTS cartelle;
      DROP TABLE IF EXISTS tickets;
      DROP TABLE IF EXISTS alerts;
      DROP TABLE IF EXISTS movimenti_finanziari;
      DROP TABLE IF EXISTS pratiche;
      DROP TABLE IF EXISTS debitori;
      DROP TABLE IF EXISTS avvocati;
      DROP TABLE IF EXISTS clienti;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS studi;

      -- =============================================
      -- STUDI
      -- =============================================
      CREATE TABLE studi (
        id varchar(36) NOT NULL,
        nome varchar(255) NOT NULL,
        ragioneSociale varchar(255) DEFAULT NULL,
        partitaIva varchar(255) DEFAULT NULL,
        codiceFiscale varchar(255) DEFAULT NULL,
        indirizzo varchar(255) DEFAULT NULL,
        citta varchar(255) DEFAULT NULL,
        cap varchar(255) DEFAULT NULL,
        provincia varchar(255) DEFAULT NULL,
        telefono varchar(255) DEFAULT NULL,
        email varchar(255) DEFAULT NULL,
        pec varchar(255) DEFAULT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- USERS
      -- =============================================
      CREATE TABLE users (
        id varchar(36) NOT NULL,
        email varchar(255) NOT NULL,
        password varchar(255) NOT NULL,
        nome varchar(255) NOT NULL,
        cognome varchar(255) NOT NULL,
        telefono varchar(30) DEFAULT NULL,
        ruolo enum('admin','titolare_studio','avvocato','collaboratore','segreteria','cliente') NOT NULL DEFAULT 'collaboratore',
        clienteId varchar(36) DEFAULT NULL,
        studioId varchar(36) DEFAULT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        tokenVersion int NOT NULL DEFAULT 0,
        twoFactorEnabled tinyint NOT NULL DEFAULT 0,
        twoFactorChannel varchar(10) DEFAULT NULL,
        twoFactorCode varchar(12) DEFAULT NULL,
        twoFactorCodeExpires timestamp NULL DEFAULT NULL,
        twoFactorCodePurpose varchar(12) DEFAULT NULL,
        failedLoginAttempts int NOT NULL DEFAULT 0,
        lockoutUntil timestamp NULL DEFAULT NULL,
        refreshTokenHash varchar(255) DEFAULT NULL,
        refreshTokenExpiresAt timestamp NULL DEFAULT NULL,
        lastLogin timestamp NULL DEFAULT NULL,
        settings json DEFAULT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY IDX_users_email (email),
        KEY IDX_users_cliente (clienteId),
        KEY IDX_users_studio (studioId),
        CONSTRAINT FK_users_cliente FOREIGN KEY (clienteId) REFERENCES clienti (id) ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT FK_users_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- CLIENTI
      -- =============================================
      CREATE TABLE clienti (
        id varchar(36) NOT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        studioId varchar(36) DEFAULT NULL,
        ragioneSociale varchar(255) NOT NULL,
        codiceFiscale varchar(16) DEFAULT NULL,
        partitaIva varchar(11) DEFAULT NULL,
        sedeLegale varchar(255) DEFAULT NULL,
        sedeOperativa varchar(255) DEFAULT NULL,
        indirizzo varchar(255) DEFAULT NULL,
        cap varchar(5) DEFAULT NULL,
        citta varchar(255) DEFAULT NULL,
        provincia varchar(2) DEFAULT NULL,
        nazione varchar(2) DEFAULT NULL,
        tipologia varchar(255) DEFAULT NULL,
        referente varchar(255) DEFAULT NULL,
        referenteNome varchar(255) DEFAULT NULL,
        referenteCognome varchar(255) DEFAULT NULL,
        referenteEmail varchar(255) DEFAULT NULL,
        telefono varchar(255) DEFAULT NULL,
        email varchar(255) NOT NULL,
        pec varchar(255) DEFAULT NULL,
        configurazioneCondivisione json DEFAULT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_clienti_studio (studioId),
        CONSTRAINT FK_clienti_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- DEBITORI
      -- =============================================
      CREATE TABLE debitori (
        id varchar(36) NOT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        studioId varchar(36) DEFAULT NULL,
        tipoSoggetto varchar(20) NOT NULL,
        nome varchar(255) DEFAULT NULL,
        cognome varchar(255) DEFAULT NULL,
        codiceFiscale varchar(16) DEFAULT NULL,
        dataNascita date DEFAULT NULL,
        luogoNascita varchar(255) DEFAULT NULL,
        ragioneSociale varchar(255) DEFAULT NULL,
        partitaIva varchar(11) DEFAULT NULL,
        tipologia varchar(50) DEFAULT NULL,
        sedeLegale varchar(255) DEFAULT NULL,
        sedeOperativa varchar(255) DEFAULT NULL,
        indirizzo varchar(255) DEFAULT NULL,
        cap varchar(10) DEFAULT NULL,
        citta varchar(255) DEFAULT NULL,
        provincia varchar(2) DEFAULT NULL,
        nazione varchar(2) DEFAULT NULL,
        referente varchar(255) DEFAULT NULL,
        telefono varchar(255) DEFAULT NULL,
        email varchar(255) DEFAULT NULL,
        pec varchar(255) DEFAULT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_debitori_studio (studioId),
        CONSTRAINT FK_debitori_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- AVVOCATI
      -- =============================================
      CREATE TABLE avvocati (
        id varchar(36) NOT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        studioId varchar(36) DEFAULT NULL,
        nome varchar(100) NOT NULL,
        cognome varchar(100) NOT NULL,
        codiceFiscale varchar(16) DEFAULT NULL,
        email varchar(255) NOT NULL,
        telefono varchar(255) DEFAULT NULL,
        livelloAccessoPratiche varchar(20) NOT NULL DEFAULT 'solo_proprie',
        livelloPermessi varchar(20) NOT NULL DEFAULT 'modifica',
        note text DEFAULT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY IDX_avvocati_email (email),
        KEY IDX_avvocati_studio (studioId),
        CONSTRAINT FK_avvocati_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- CLIENTI_DEBITORI (tabella di relazione)
      -- =============================================
      CREATE TABLE clienti_debitori (
        id varchar(36) NOT NULL,
        clienteId varchar(36) NOT NULL,
        debitoreId varchar(36) NOT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY UK_cliente_debitore (clienteId, debitoreId),
        KEY IDX_cd_cliente (clienteId),
        KEY IDX_cd_debitore (debitoreId),
        CONSTRAINT FK_cd_cliente FOREIGN KEY (clienteId) REFERENCES clienti (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_cd_debitore FOREIGN KEY (debitoreId) REFERENCES debitori (id) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- PRATICHE
      -- =============================================
      CREATE TABLE pratiche (
        id varchar(36) NOT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        clienteId varchar(36) NOT NULL,
        studioId varchar(36) DEFAULT NULL,
        debitoreId varchar(36) NOT NULL,
        faseId varchar(20) NOT NULL DEFAULT 'fase-001',
        aperta tinyint NOT NULL DEFAULT 1,
        esito varchar(20) DEFAULT NULL,
        capitale decimal(12,2) NOT NULL DEFAULT 0.00,
        importoRecuperatoCapitale decimal(12,2) NOT NULL DEFAULT 0.00,
        anticipazioni decimal(12,2) NOT NULL DEFAULT 0.00,
        importoRecuperatoAnticipazioni decimal(12,2) NOT NULL DEFAULT 0.00,
        compensiLegali decimal(12,2) NOT NULL DEFAULT 0.00,
        compensiLiquidati decimal(12,2) NOT NULL DEFAULT 0.00,
        interessi decimal(12,2) NOT NULL DEFAULT 0.00,
        interessiRecuperati decimal(12,2) NOT NULL DEFAULT 0.00,
        note text DEFAULT NULL,
        riferimentoCredito varchar(255) DEFAULT NULL,
        storico json DEFAULT NULL,
        opposizione json DEFAULT NULL,
        pignoramento json DEFAULT NULL,
        dataAffidamento date DEFAULT NULL,
        dataChiusura date DEFAULT NULL,
        dataScadenza date DEFAULT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_pratiche_cliente (clienteId),
        KEY IDX_pratiche_studio (studioId),
        KEY IDX_pratiche_debitore (debitoreId),
        CONSTRAINT FK_pratiche_cliente FOREIGN KEY (clienteId) REFERENCES clienti (id) ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT FK_pratiche_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT FK_pratiche_debitore FOREIGN KEY (debitoreId) REFERENCES debitori (id) ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- PRATICHE_AVVOCATI (tabella di relazione many-to-many)
      -- =============================================
      CREATE TABLE pratiche_avvocati (
        praticaId varchar(36) NOT NULL,
        avvocatoId varchar(36) NOT NULL,
        PRIMARY KEY (praticaId, avvocatoId),
        KEY IDX_pa_avvocato (avvocatoId),
        CONSTRAINT FK_pa_pratica FOREIGN KEY (praticaId) REFERENCES pratiche (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_pa_avvocato FOREIGN KEY (avvocatoId) REFERENCES avvocati (id) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- PRATICHE_COLLABORATORI (tabella di relazione many-to-many)
      -- =============================================
      CREATE TABLE pratiche_collaboratori (
        praticaId varchar(36) NOT NULL,
        userId varchar(36) NOT NULL,
        PRIMARY KEY (praticaId, userId),
        KEY IDX_pc_user (userId),
        CONSTRAINT FK_pc_pratica FOREIGN KEY (praticaId) REFERENCES pratiche (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_pc_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- MOVIMENTI_FINANZIARI
      -- =============================================
      CREATE TABLE movimenti_finanziari (
        id varchar(36) NOT NULL,
        studioId varchar(36) DEFAULT NULL,
        praticaId varchar(36) NOT NULL,
        tipo varchar(30) NOT NULL,
        importo decimal(12,2) NOT NULL,
        data date NOT NULL,
        oggetto text DEFAULT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_movimenti_pratica (praticaId),
        KEY IDX_movimenti_studio (studioId),
        KEY IDX_movimenti_data (data),
        CONSTRAINT FK_movimenti_pratica FOREIGN KEY (praticaId) REFERENCES pratiche (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_movimenti_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- ALERTS
      -- =============================================
      CREATE TABLE alerts (
        id varchar(36) NOT NULL,
        studioId varchar(36) DEFAULT NULL,
        praticaId varchar(36) NOT NULL,
        titolo varchar(255) NOT NULL,
        descrizione text NOT NULL,
        destinatario enum('studio','cliente') NOT NULL,
        modalitaNotifica enum('popup') NOT NULL DEFAULT 'popup',
        clienteCanClose tinyint NOT NULL DEFAULT 0,
        dataScadenza datetime NOT NULL,
        giorniAnticipo int NOT NULL DEFAULT 3,
        stato enum('in_gestione','chiuso') NOT NULL DEFAULT 'in_gestione',
        messaggi json DEFAULT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        dataCreazione datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        dataAggiornamento datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        dataChiusura timestamp NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY IDX_alerts_pratica (praticaId),
        KEY IDX_alerts_studio (studioId),
        CONSTRAINT FK_alerts_pratica FOREIGN KEY (praticaId) REFERENCES pratiche (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_alerts_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- TICKETS
      -- =============================================
      CREATE TABLE tickets (
        id varchar(36) NOT NULL,
        numeroTicket varchar(36) NOT NULL,
        studioId varchar(36) DEFAULT NULL,
        alertId varchar(36) DEFAULT NULL,
        praticaId varchar(36) DEFAULT NULL,
        oggetto varchar(255) NOT NULL,
        descrizione text NOT NULL,
        autore varchar(100) NOT NULL,
        categoria enum('richiesta_informazioni','documentazione','pagamenti','segnalazione_problema','altro') NOT NULL DEFAULT 'richiesta_informazioni',
        priorita enum('bassa','normale','alta','urgente') NOT NULL DEFAULT 'normale',
        stato enum('aperto','in_gestione','chiuso') NOT NULL DEFAULT 'aperto',
        messaggi json DEFAULT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        dataCreazione datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        dataAggiornamento datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        dataChiusura timestamp NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY IDX_tickets_numero (numeroTicket),
        KEY IDX_tickets_pratica (praticaId),
        KEY IDX_tickets_studio (studioId),
        CONSTRAINT FK_tickets_pratica FOREIGN KEY (praticaId) REFERENCES pratiche (id) ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT FK_tickets_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- CARTELLE
      -- =============================================
      CREATE TABLE cartelle (
        id varchar(36) NOT NULL,
        studioId varchar(36) DEFAULT NULL,
        nome varchar(255) NOT NULL,
        descrizione varchar(500) DEFAULT NULL,
        colore varchar(50) DEFAULT NULL,
        praticaId varchar(36) DEFAULT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        dataCreazione datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        dataAggiornamento datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_cartelle_pratica (praticaId),
        KEY IDX_cartelle_studio (studioId),
        CONSTRAINT FK_cartelle_pratica FOREIGN KEY (praticaId) REFERENCES pratiche (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_cartelle_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- CARTELLE_CLOSURE (per gestione albero closure-table)
      -- =============================================
      CREATE TABLE cartelle_closure (
        id_ancestor varchar(36) NOT NULL,
        id_descendant varchar(36) NOT NULL,
        PRIMARY KEY (id_ancestor, id_descendant),
        KEY IDX_cartelle_closure_descendant (id_descendant),
        CONSTRAINT FK_cartelle_closure_ancestor FOREIGN KEY (id_ancestor) REFERENCES cartelle (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_cartelle_closure_descendant FOREIGN KEY (id_descendant) REFERENCES cartelle (id) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- DOCUMENTI
      -- =============================================
      CREATE TABLE documenti (
        id varchar(36) NOT NULL,
        studioId varchar(36) DEFAULT NULL,
        nome varchar(255) NOT NULL,
        descrizione varchar(500) DEFAULT NULL,
        percorsoFile varchar(500) NOT NULL,
        nomeOriginale varchar(255) NOT NULL,
        estensione varchar(50) NOT NULL,
        tipo enum('pdf','word','excel','immagine','csv','xml','altro') NOT NULL,
        dimensione bigint NOT NULL,
        caricatoDa varchar(100) DEFAULT NULL,
        praticaId varchar(36) DEFAULT NULL,
        cartellaId varchar(36) DEFAULT NULL,
        attivo tinyint NOT NULL DEFAULT 1,
        dataCreazione datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        dataAggiornamento datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_documenti_pratica (praticaId),
        KEY IDX_documenti_cartella (cartellaId),
        KEY IDX_documenti_studio (studioId),
        CONSTRAINT FK_documenti_pratica FOREIGN KEY (praticaId) REFERENCES pratiche (id) ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT FK_documenti_cartella FOREIGN KEY (cartellaId) REFERENCES cartelle (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_documenti_studio FOREIGN KEY (studioId) REFERENCES studi (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- NOTIFICATIONS
      -- =============================================
      CREATE TABLE notifications (
        id varchar(36) NOT NULL,
        userId varchar(36) NOT NULL,
        praticaId varchar(36) DEFAULT NULL,
        type varchar(40) NOT NULL,
        title varchar(200) NOT NULL,
        message text NOT NULL,
        metadata json DEFAULT NULL,
        readAt timestamp NULL DEFAULT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY IDX_notifications_user (userId),
        KEY IDX_notifications_pratica (praticaId),
        CONSTRAINT FK_notifications_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT FK_notifications_pratica FOREIGN KEY (praticaId) REFERENCES pratiche (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- =============================================
      -- AUDIT_LOGS
      -- =============================================
      CREATE TABLE audit_logs (
        id varchar(36) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        userId varchar(36) DEFAULT NULL,
        userEmail varchar(255) DEFAULT NULL,
        userRole varchar(50) DEFAULT NULL,
        action enum('LOGIN','LOGOUT','LOGIN_FAILED','CREATE','UPDATE','DELETE','VIEW','TOGGLE_ACTIVE','RESET_PASSWORD','ASSIGN_STUDIO','UPLOAD_FILE','DOWNLOAD_FILE','DELETE_FILE','EXPORT_DATA','BACKUP_STUDIO','IMPORT_DATA') NOT NULL,
        entityType enum('USER','STUDIO','CLIENTE','DEBITORE','PRATICA','AVVOCATO','MOVIMENTO_FINANZIARIO','ALERT','TICKET','DOCUMENTO','CARTELLA','SYSTEM') NOT NULL,
        entityId varchar(36) DEFAULT NULL,
        entityName varchar(255) DEFAULT NULL,
        description text DEFAULT NULL,
        metadata json DEFAULT NULL,
        ipAddress varchar(45) DEFAULT NULL,
        userAgent text DEFAULT NULL,
        studioId varchar(36) DEFAULT NULL,
        success tinyint NOT NULL DEFAULT 1,
        errorMessage text DEFAULT NULL,
        PRIMARY KEY (id),
        KEY IDX_audit_created (createdAt),
        KEY IDX_audit_user (userId),
        KEY IDX_audit_entity_type (entityType),
        KEY IDX_audit_action (action),
        CONSTRAINT FK_audit_user FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      SET FOREIGN_KEY_CHECKS = 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS pratiche_collaboratori;
      DROP TABLE IF EXISTS pratiche_avvocati;
      DROP TABLE IF EXISTS clienti_debitori;
      DROP TABLE IF EXISTS cartelle_closure;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS documenti;
      DROP TABLE IF EXISTS cartelle;
      DROP TABLE IF EXISTS tickets;
      DROP TABLE IF EXISTS alerts;
      DROP TABLE IF EXISTS movimenti_finanziari;
      DROP TABLE IF EXISTS pratiche;
      DROP TABLE IF EXISTS debitori;
      DROP TABLE IF EXISTS avvocati;
      DROP TABLE IF EXISTS clienti;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS studi;
      SET FOREIGN_KEY_CHECKS = 1;
    `);
  }
}
