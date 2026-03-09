import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCheckupThreadArchiveFlags1773002500000 implements MigrationInterface {
  name = 'AddCheckupThreadArchiveFlags1773002500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const ticketsTable = await queryRunner.getTable('checkup_tickets');
    const alertsTable = await queryRunner.getTable('checkup_alerts');

    if (ticketsTable && !ticketsTable.findColumnByName('archiviato')) {
      await queryRunner.addColumn(
        'checkup_tickets',
        new TableColumn({
          name: 'archiviato',
          type: 'tinyint',
          width: 1,
          isNullable: false,
          default: '0',
        }),
      );
    }

    if (alertsTable && !alertsTable.findColumnByName('taciuto')) {
      await queryRunner.addColumn(
        'checkup_alerts',
        new TableColumn({
          name: 'taciuto',
          type: 'tinyint',
          width: 1,
          isNullable: false,
          default: '0',
        }),
      );
    }

    if (alertsTable && !alertsTable.findColumnByName('archiviato')) {
      await queryRunner.addColumn(
        'checkup_alerts',
        new TableColumn({
          name: 'archiviato',
          type: 'tinyint',
          width: 1,
          isNullable: false,
          default: '0',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ticketsTable = await queryRunner.getTable('checkup_tickets');
    const alertsTable = await queryRunner.getTable('checkup_alerts');

    if (ticketsTable?.findColumnByName('archiviato')) {
      await queryRunner.dropColumn('checkup_tickets', 'archiviato');
    }

    if (alertsTable?.findColumnByName('archiviato')) {
      await queryRunner.dropColumn('checkup_alerts', 'archiviato');
    }

    if (alertsTable?.findColumnByName('taciuto')) {
      await queryRunner.dropColumn('checkup_alerts', 'taciuto');
    }
  }
}
