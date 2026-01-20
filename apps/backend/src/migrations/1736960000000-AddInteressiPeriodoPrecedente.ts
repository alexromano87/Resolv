import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInteressiPeriodoPrecedente1736960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verifica se la colonna esiste già
    const table = await queryRunner.getTable('pratiche');
    const interessiPeriodoPrecedenteCol = table?.findColumnByName('interessiPeriodoPrecedente');

    if (!interessiPeriodoPrecedenteCol) {
      await queryRunner.addColumn(
        'pratiche',
        new TableColumn({
          name: 'interessiPeriodoPrecedente',
          type: 'decimal',
          precision: 12,
          scale: 2,
          default: 0,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('pratiche');
    const interessiPeriodoPrecedenteCol = table?.findColumnByName('interessiPeriodoPrecedente');

    if (interessiPeriodoPrecedenteCol) {
      await queryRunner.dropColumn('pratiche', 'interessiPeriodoPrecedente');
    }
  }
}
