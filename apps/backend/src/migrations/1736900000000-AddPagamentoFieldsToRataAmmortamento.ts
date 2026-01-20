import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPagamentoFieldsToRataAmmortamento1736900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('rate_ammortamento');

    // Verifica se le colonne esistono già
    const metodoPagamentoCol = table?.findColumnByName('metodoPagamento');
    const codicePagamentoCol = table?.findColumnByName('codicePagamento');
    const ricevutaPathCol = table?.findColumnByName('ricevutaPath');

    if (!metodoPagamentoCol) {
      await queryRunner.addColumn(
        'rate_ammortamento',
        new TableColumn({
          name: 'metodoPagamento',
          type: 'varchar',
          length: '50',
          isNullable: true,
        }),
      );
    }

    if (!codicePagamentoCol) {
      await queryRunner.addColumn(
        'rate_ammortamento',
        new TableColumn({
          name: 'codicePagamento',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    if (!ricevutaPathCol) {
      await queryRunner.addColumn(
        'rate_ammortamento',
        new TableColumn({
          name: 'ricevutaPath',
          type: 'varchar',
          length: '500',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('rate_ammortamento', 'ricevutaPath');
    await queryRunner.dropColumn('rate_ammortamento', 'codicePagamento');
    await queryRunner.dropColumn('rate_ammortamento', 'metodoPagamento');
  }
}
