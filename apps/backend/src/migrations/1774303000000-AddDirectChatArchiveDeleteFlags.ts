import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDirectChatArchiveDeleteFlags1774303000000 implements MigrationInterface {
  name = 'AddDirectChatArchiveDeleteFlags1774303000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('checkup_direct_chat_conversations');
    if (!table) return;

    const columns = [
      'userOneArchivedAt',
      'userTwoArchivedAt',
      'userOneDeletedAt',
      'userTwoDeletedAt',
    ];

    for (const name of columns) {
      if (!table.findColumnByName(name)) {
        await queryRunner.addColumn(
          'checkup_direct_chat_conversations',
          new TableColumn({
            name,
            type: 'datetime',
            isNullable: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('checkup_direct_chat_conversations');
    if (!table) return;

    for (const name of ['userTwoDeletedAt', 'userOneDeletedAt', 'userTwoArchivedAt', 'userOneArchivedAt']) {
      if (table.findColumnByName(name)) {
        await queryRunner.dropColumn('checkup_direct_chat_conversations', name);
      }
    }
  }
}
