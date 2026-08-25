import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 2 — modello "appartenenze": una identità (checkup_users, email unica) può
 * avere più appartenenze (ruolo + contesto studio/cliente/sublicenza/anagrafica).
 *
 * Backfill non distruttivo: per ogni utente esistente viene creata un'appartenenza
 * primaria (isPrimary=1) che rispecchia le colonne legacy. Le colonne su
 * checkup_users restano come "appartenenza attiva di default".
 *
 * Aggiunge inoltre checkup_studios.linkedStudioId (Fase 1 — riuso anagrafica).
 */
export class CreateCheckupMemberships1775400000000 implements MigrationInterface {
  name = 'CreateCheckupMemberships1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Fase 1: linkedStudioId su checkup_studios ──────────────────────────────
    const hasLinkedStudio = await queryRunner.hasColumn('checkup_studios', 'linkedStudioId');
    if (!hasLinkedStudio) {
      await queryRunner.query(`ALTER TABLE checkup_studios ADD linkedStudioId char(36) NULL`);
      await queryRunner.query(
        `ALTER TABLE checkup_studios ADD INDEX IDX_checkup_studios_linked (linkedStudioId)`,
      );
    }

    // ── Fase 2: tabella checkup_memberships ────────────────────────────────────
    const hasTable = await queryRunner.hasTable('checkup_memberships');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE checkup_memberships (
          id char(36) NOT NULL,
          userId char(36) NOT NULL,
          ruolo enum('admin_studio','segreteria','collaboratore','cliente') NOT NULL DEFAULT 'cliente',
          studioId char(36) NULL,
          clientId char(36) NULL,
          sublicenseId char(36) NULL,
          anagraficaId char(36) NULL,
          azienda varchar(255) NULL,
          macroAreaOwner json NULL,
          macroAreaAssignments json NULL,
          superOwner tinyint NOT NULL DEFAULT 0,
          isPrimary tinyint NOT NULL DEFAULT 0,
          attiva tinyint NOT NULL DEFAULT 1,
          createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (id),
          INDEX IDX_checkup_memberships_user (userId),
          INDEX IDX_checkup_memberships_studio (studioId),
          INDEX IDX_checkup_memberships_client (clientId),
          CONSTRAINT FK_checkup_memberships_user FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE,
          CONSTRAINT FK_checkup_memberships_studio FOREIGN KEY (studioId) REFERENCES checkup_studios(id) ON DELETE SET NULL,
          CONSTRAINT FK_checkup_memberships_client FOREIGN KEY (clientId) REFERENCES checkup_clients(id) ON DELETE SET NULL,
          CONSTRAINT FK_checkup_memberships_sublicense FOREIGN KEY (sublicenseId) REFERENCES checkup_sublicenses(id) ON DELETE SET NULL,
          CONSTRAINT FK_checkup_memberships_anagrafica FOREIGN KEY (anagraficaId) REFERENCES checkup_anagrafiche_licenziatario(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);

      // Backfill: una membership primaria per ogni utente esistente.
      await queryRunner.query(`
        INSERT INTO checkup_memberships
          (id, userId, ruolo, studioId, clientId, sublicenseId, anagraficaId,
           azienda, macroAreaOwner, macroAreaAssignments, superOwner, isPrimary, attiva)
        SELECT
          UUID(), u.id, u.ruolo, u.studioId, u.clientId, u.sublicenseId, u.anagraficaId,
          u.azienda, u.macroAreaOwner, u.macroAreaAssignments, u.superOwner, 1, u.attivo
        FROM checkup_users u
        WHERE u.ruolo IN ('admin_studio','segreteria','collaboratore','cliente')
          AND NOT EXISTS (
            SELECT 1 FROM checkup_memberships m WHERE m.userId = u.id
          )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('checkup_memberships');
    if (hasTable) {
      await queryRunner.query(`DROP TABLE checkup_memberships`);
    }

    const hasLinkedStudio = await queryRunner.hasColumn('checkup_studios', 'linkedStudioId');
    if (hasLinkedStudio) {
      await queryRunner.query(`ALTER TABLE checkup_studios DROP INDEX IDX_checkup_studios_linked`);
      await queryRunner.query(`ALTER TABLE checkup_studios DROP COLUMN linkedStudioId`);
    }
  }
}
