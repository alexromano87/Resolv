import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMovimentoFinanziarioIdToRata1736910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('rate_ammortamento');

    const movimentoFinanziarioIdCol = table?.findColumnByName('movimentoFinanziarioId');

    if (!movimentoFinanziarioIdCol) {
      await queryRunner.addColumn(
        'rate_ammortamento',
        new TableColumn({
          name: 'movimentoFinanziarioId',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('rate_ammortamento', 'movimentoFinanziarioId');
  }
}
