import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aggiunge il soft-delete (deletedAt) a checkup_anagrafiche_licenziatario, per
 * la cancellazione sicura reversibile lato superadmin (le altre entità —
 * studios/clients/users — hanno già la colonna).
 */
export class AddAnagraficaDeletedAt1775500000000 implements MigrationInterface {
  name = 'AddAnagraficaDeletedAt1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.hasColumn('checkup_anagrafiche_licenziatario', 'deletedAt');
    if (!has) {
      await queryRunner.query(
        `ALTER TABLE checkup_anagrafiche_licenziatario ADD deletedAt datetime(6) NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.hasColumn('checkup_anagrafiche_licenziatario', 'deletedAt');
    if (has) {
      await queryRunner.query(`ALTER TABLE checkup_anagrafiche_licenziatario DROP COLUMN deletedAt`);
    }
  }
}
