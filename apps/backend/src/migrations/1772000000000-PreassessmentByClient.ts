import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreassessmentByClient1772000000000 implements MigrationInterface {
  name = 'PreassessmentByClient1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasClientId = await queryRunner.hasColumn('checkup_preassessments', 'clientId');
    if (!hasClientId) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD COLUMN clientId CHAR(36) NULL
      `);
    }

    await queryRunner.query(`
      UPDATE checkup_preassessments p
      INNER JOIN checkup_users u ON u.id = p.userId
      SET p.clientId = u.clientId
      WHERE p.clientId IS NULL
    `);

    const tableBefore = await queryRunner.getTable('checkup_preassessments');
    const hasUserIndex = tableBefore?.indices?.some((idx) => idx.name === 'IDX_checkup_preassessments_user');
    const hasUserFk = tableBefore?.foreignKeys?.some((fk) => fk.name === 'FK_checkup_preassessments_user');
    if (hasUserFk) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP FOREIGN KEY FK_checkup_preassessments_user
      `);
    }
    if (hasUserIndex) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP INDEX IDX_checkup_preassessments_user
      `);
    }
    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      ADD INDEX IDX_checkup_preassessments_user (userId)
    `);
    if (hasUserFk) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD CONSTRAINT FK_checkup_preassessments_user
          FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE
      `);
    }

    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      MODIFY COLUMN clientId CHAR(36) NOT NULL
    `);

    await queryRunner.query(`
      DELETE p1 FROM checkup_preassessments p1
      INNER JOIN checkup_preassessments p2
        ON p1.clientId = p2.clientId
       AND (
         p1.updatedAt < p2.updatedAt
         OR (p1.updatedAt = p2.updatedAt AND p1.id < p2.id)
       )
    `);

    const tableForClientIndex = await queryRunner.getTable('checkup_preassessments');
    const hasClientIndex = tableForClientIndex?.indices?.some((idx) => idx.name === 'IDX_checkup_preassessments_client');
    if (!hasClientIndex) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD UNIQUE INDEX IDX_checkup_preassessments_client (clientId)
      `);
    }

    const table = await queryRunner.getTable('checkup_preassessments');
    const hasClientFk = table?.foreignKeys?.some((fk) => fk.name === 'FK_checkup_preassessments_client');
    if (!hasClientFk) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        ADD CONSTRAINT FK_checkup_preassessments_client
          FOREIGN KEY (clientId) REFERENCES checkup_clients(id) ON DELETE CASCADE
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('checkup_preassessments');
    const hasClientFk = table?.foreignKeys?.some((fk) => fk.name === 'FK_checkup_preassessments_client');
    if (hasClientFk) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP FOREIGN KEY FK_checkup_preassessments_client
      `);
    }

    const tableForClientDrop = await queryRunner.getTable('checkup_preassessments');
    const hasClientIndex = tableForClientDrop?.indices?.some((idx) => idx.name === 'IDX_checkup_preassessments_client');
    if (hasClientIndex) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP INDEX IDX_checkup_preassessments_client
      `);
    }

    const hasClientId = await queryRunner.hasColumn('checkup_preassessments', 'clientId');
    if (hasClientId) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        MODIFY COLUMN clientId CHAR(36) NULL
      `);
    }

    const tableForUserIndex = await queryRunner.getTable('checkup_preassessments');
    const hasUserIndex = tableForUserIndex?.indices?.some((idx) => idx.name === 'IDX_checkup_preassessments_user');
    const hasUserFk = tableForUserIndex?.foreignKeys?.some((fk) => fk.name === 'FK_checkup_preassessments_user');
    if (hasUserFk) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP FOREIGN KEY FK_checkup_preassessments_user
      `);
    }
    if (hasUserIndex) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP INDEX IDX_checkup_preassessments_user
      `);
    }
    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      ADD UNIQUE INDEX IDX_checkup_preassessments_user (userId)
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_preassessments
      ADD CONSTRAINT FK_checkup_preassessments_user
        FOREIGN KEY (userId) REFERENCES checkup_users(id) ON DELETE CASCADE
    `);

    if (hasClientId) {
      await queryRunner.query(`
        ALTER TABLE checkup_preassessments
        DROP COLUMN clientId
      `);
    }
  }
}
