import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckupIndexes1773001300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // checkup_preassessments
    await queryRunner.query(`CREATE INDEX idx_preassessments_clientId ON checkup_preassessments (clientId)`);
    await queryRunner.query(`CREATE INDEX idx_preassessments_clientId_isLatest ON checkup_preassessments (clientId, isLatest)`);
    await queryRunner.query(`CREATE INDEX idx_preassessments_userId ON checkup_preassessments (userId)`);
    await queryRunner.query(`CREATE INDEX idx_preassessments_status ON checkup_preassessments (status)`);

    // checkup_users
    await queryRunner.query(`CREATE INDEX idx_checkup_users_studioId ON checkup_users (studioId)`);
    await queryRunner.query(`CREATE INDEX idx_checkup_users_clientId ON checkup_users (clientId)`);
    await queryRunner.query(`CREATE INDEX idx_checkup_users_ruolo ON checkup_users (ruolo)`);

    // checkup_preassessment_documents
    await queryRunner.query(`CREATE INDEX idx_preassessment_docs_preassessmentId ON checkup_preassessment_documents (preassessmentId)`);
    await queryRunner.query(`CREATE INDEX idx_preassessment_docs_preassessmentId_fieldId ON checkup_preassessment_documents (preassessmentId, fieldId)`);

    // checkup_sublicenses
    await queryRunner.query(`CREATE INDEX idx_sublicenses_licenseId_attiva ON checkup_sublicenses (licenseId, attiva)`);
    await queryRunner.query(`CREATE INDEX idx_sublicenses_clientId ON checkup_sublicenses (clientId)`);

    // checkup_licenses
    await queryRunner.query(`CREATE INDEX idx_checkup_licenses_studioId ON checkup_licenses (studioId)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_preassessments_clientId ON checkup_preassessments`);
    await queryRunner.query(`DROP INDEX idx_preassessments_clientId_isLatest ON checkup_preassessments`);
    await queryRunner.query(`DROP INDEX idx_preassessments_userId ON checkup_preassessments`);
    await queryRunner.query(`DROP INDEX idx_preassessments_status ON checkup_preassessments`);
    await queryRunner.query(`DROP INDEX idx_checkup_users_studioId ON checkup_users`);
    await queryRunner.query(`DROP INDEX idx_checkup_users_clientId ON checkup_users`);
    await queryRunner.query(`DROP INDEX idx_checkup_users_ruolo ON checkup_users`);
    await queryRunner.query(`DROP INDEX idx_preassessment_docs_preassessmentId ON checkup_preassessment_documents`);
    await queryRunner.query(`DROP INDEX idx_preassessment_docs_preassessmentId_fieldId ON checkup_preassessment_documents`);
    await queryRunner.query(`DROP INDEX idx_sublicenses_licenseId_attiva ON checkup_sublicenses`);
    await queryRunner.query(`DROP INDEX idx_sublicenses_clientId ON checkup_sublicenses`);
    await queryRunner.query(`DROP INDEX idx_checkup_licenses_studioId ON checkup_licenses`);
  }
}
