import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMovimentoInteressiIdToRata1736915000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verifica se la colonna esiste già
    const table = await queryRunner.getTable('rate_ammortamento');
    const movimentoInteressiIdCol = table?.findColumnByName('movimentoInteressiId');

    if (!movimentoInteressiIdCol) {
      await queryRunner.addColumn(
        'rate_ammortamento',
        new TableColumn({
          name: 'movimentoInteressiId',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('rate_ammortamento');
    const movimentoInteressiIdCol = table?.findColumnByName('movimentoInteressiId');

    if (movimentoInteressiIdCol) {
      await queryRunner.dropColumn('rate_ammortamento', 'movimentoInteressiId');
    }
  }
}
