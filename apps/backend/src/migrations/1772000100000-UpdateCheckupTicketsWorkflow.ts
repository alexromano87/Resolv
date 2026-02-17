import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCheckupTicketsWorkflow1772000100000 implements MigrationInterface {
  name = 'UpdateCheckupTicketsWorkflow1772000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_tickets
      ADD COLUMN assignedToId CHAR(36) NULL,
      ADD COLUMN closeRequestedById CHAR(36) NULL,
      ADD COLUMN closeRequestedAt DATETIME NULL,
      ADD COLUMN closedById CHAR(36) NULL,
      ADD COLUMN closedAt DATETIME NULL
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_tickets
      ADD CONSTRAINT FK_checkup_tickets_assigned_user
        FOREIGN KEY (assignedToId) REFERENCES checkup_users(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_tickets
      ADD CONSTRAINT FK_checkup_tickets_close_requested_user
        FOREIGN KEY (closeRequestedById) REFERENCES checkup_users(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE checkup_tickets
      ADD CONSTRAINT FK_checkup_tickets_closed_user
        FOREIGN KEY (closedById) REFERENCES checkup_users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE checkup_tickets
      DROP FOREIGN KEY FK_checkup_tickets_assigned_user
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_tickets
      DROP FOREIGN KEY FK_checkup_tickets_close_requested_user
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_tickets
      DROP FOREIGN KEY FK_checkup_tickets_closed_user
    `);
    await queryRunner.query(`
      ALTER TABLE checkup_tickets
      DROP COLUMN assignedToId,
      DROP COLUMN closeRequestedById,
      DROP COLUMN closeRequestedAt,
      DROP COLUMN closedById,
      DROP COLUMN closedAt
    `);
  }
}
