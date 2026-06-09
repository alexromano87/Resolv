import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLES = ['checkup_direct_chat_messages', 'checkup_preassessment_messages'];

export class AddCheckupChatMessageLifecycle1775200000000 implements MigrationInterface {
  name = 'AddCheckupChatMessageLifecycle1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of TABLES) {
      const table = await queryRunner.getTable(tableName);
      if (!table) continue;

      if (!table.findColumnByName('editedAt')) {
        await queryRunner.addColumn(tableName, new TableColumn({
          name: 'editedAt',
          type: 'datetime',
          isNullable: true,
        }));
      }
      if (!table.findColumnByName('deletedForEveryoneAt')) {
        await queryRunner.addColumn(tableName, new TableColumn({
          name: 'deletedForEveryoneAt',
          type: 'datetime',
          isNullable: true,
        }));
      }
      if (!table.findColumnByName('deletedForUserIds')) {
        await queryRunner.addColumn(tableName, new TableColumn({
          name: 'deletedForUserIds',
          type: 'json',
          isNullable: true,
        }));
      }
      if (!table.findColumnByName('updatedAt')) {
        await queryRunner.addColumn(tableName, new TableColumn({
          name: 'updatedAt',
          type: 'datetime',
          precision: 6,
          default: 'CURRENT_TIMESTAMP(6)',
          onUpdate: 'CURRENT_TIMESTAMP(6)',
        }));
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of TABLES) {
      const table = await queryRunner.getTable(tableName);
      if (!table) continue;

      for (const columnName of ['updatedAt', 'deletedForUserIds', 'deletedForEveryoneAt', 'editedAt']) {
        if (table.findColumnByName(columnName)) {
          await queryRunner.dropColumn(tableName, columnName);
        }
      }
    }
  }
}
